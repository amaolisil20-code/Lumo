import { useCallback, useEffect, useRef, useState } from "react";
import {
  appendMovementLog,
  loadStructureLayout,
  saveStructureLayout,
} from "@/lib/structureStorage";
import { syncDeskCounter } from "@/lib/structureFactory";
import type { StructureElement, StructureLayout, StructureSlot } from "@/types/structure";

const SAVE_DELAY_MS = 400;
const MAX_HISTORY = 50;
const MAX_UNDO = 40;

export function useStructureLayout() {
  const [layout, setLayout] = useState<StructureLayout>(() => {
    const loaded = loadStructureLayout();
    syncDeskCounter(loaded.elements);
    return loaded;
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoStack = useRef<StructureLayout[]>([]);
  const redoStack = useRef<StructureLayout[]>([]);

  useEffect(() => {
    const loaded = loadStructureLayout();
    syncDeskCounter(loaded.elements);
    setLayout(loaded);
  }, []);

  const syncUndoState = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const persist = useCallback((next: StructureLayout) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveStructureLayout(next);
    }, SAVE_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const commit = useCallback(
    (updater: (prev: StructureLayout) => StructureLayout, logMessage?: string) => {
      setLayout((prev) => {
        undoStack.current = [...undoStack.current.slice(-(MAX_UNDO - 1)), prev];
        redoStack.current = [];
        syncUndoState();

        let next = updater(prev);
        if (logMessage) {
          const entry = appendMovementLog(next, logMessage);
          next = { ...next, history: [entry, ...prev.history].slice(0, MAX_HISTORY) };
        }
        next = { ...next, updatedAt: new Date().toISOString() };
        persist(next);
        return next;
      });
    },
    [persist, syncUndoState]
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<StructureElement>, skipUndo = false) => {
      if (skipUndo) {
        setLayout((prev) => {
          const next = {
            ...prev,
            elements: prev.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
            updatedAt: new Date().toISOString(),
          };
          persist(next);
          return next;
        });
        return;
      }
      commit((prev) => ({
        ...prev,
        elements: prev.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
      }));
    },
    [commit, persist]
  );

  const addElement = useCallback(
    (element: StructureElement) => {
      commit(
        (prev) => ({ ...prev, elements: [...prev.elements, element] }),
        `${element.label} adicionado ao layout`
      );
    },
    [commit]
  );

  const removeElement = useCallback(
    (id: string) => {
      commit((prev) => {
        const removed = prev.elements.find((el) => el.id === id);
        const elements = prev.elements.filter((el) => el.id !== id);
        if (removed) {
          const entry = appendMovementLog({ ...prev, elements }, `${removed.label} removido`);
          return {
            ...prev,
            elements,
            history: [entry, ...prev.history].slice(0, MAX_HISTORY),
          };
        }
        return { ...prev, elements };
      });
    },
    [commit]
  );

  const updateSlot = useCallback(
    (elementId: string, slotId: string, patch: Partial<StructureSlot>) => {
      commit((prev) => {
        const element = prev.elements.find((el) => el.id === elementId);
        const slot = element?.slots.find((s) => s.id === slotId);
        const elements = prev.elements.map((el) => {
          if (el.id !== elementId) return el;
          return {
            ...el,
            slots: el.slots.map((s) => (s.id === slotId ? { ...s, ...patch } : s)),
          };
        });

        let history = prev.history;
        if (patch.attendantId !== undefined && slot) {
          const message =
            patch.attendantId == null
              ? `Posição ${slot.label ?? "sem nome"} liberada`
              : `Colaborador alocado em ${slot.label ?? "posição"}`;
          const entry = appendMovementLog(prev, message);
          history = [entry, ...history].slice(0, MAX_HISTORY);
        }

        return { ...prev, elements, history };
      });
    },
    [commit]
  );

  const undo = useCallback(() => {
    setLayout((current) => {
      const previous = undoStack.current.pop();
      if (!previous) return current;
      redoStack.current.push(current);
      syncUndoState();
      const next = { ...previous, updatedAt: new Date().toISOString() };
      persist(next);
      syncDeskCounter(next.elements);
      return next;
    });
  }, [persist, syncUndoState]);

  const redo = useCallback(() => {
    setLayout((current) => {
      const nextState = redoStack.current.pop();
      if (!nextState) return current;
      undoStack.current.push(current);
      syncUndoState();
      const next = { ...nextState, updatedAt: new Date().toISOString() };
      persist(next);
      syncDeskCounter(next.elements);
      return next;
    });
  }, [persist, syncUndoState]);

  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveStructureLayout(layout);
  }, [layout]);

  const pushUndoSnapshot = useCallback(
    (snapshot: StructureLayout) => {
      undoStack.current = [...undoStack.current.slice(-(MAX_UNDO - 1)), snapshot];
      redoStack.current = [];
      syncUndoState();
    },
    [syncUndoState]
  );

  return {
    layout,
    canUndo,
    canRedo,
    updateElement,
    addElement,
    removeElement,
    updateSlot,
    undo,
    redo,
    saveNow,
    pushUndoSnapshot,
  };
};
