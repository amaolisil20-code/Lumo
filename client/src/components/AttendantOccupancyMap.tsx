import { useMemo } from "react";
import type { Attendant } from "@/types/attendant";
import { formatJornada } from "@/lib/attendantSchedule";
import { buildOccupancyMap, type OccupancyMapData } from "@/lib/occupancyMap";
import { cn } from "@/lib/utils";

interface AttendantOccupancyMapProps {
  attendants: Attendant[];
}

function OccupancySection({ data }: { data: OccupancyMapData }) {
  const accentClass =
    data.channel === "Ligação"
      ? "bg-blue-500/80 dark:bg-blue-500/70"
      : "bg-emerald-500/80 dark:bg-emerald-500/70";
  const headerClass =
    data.channel === "Ligação"
      ? "bg-blue-600 text-white"
      : "bg-emerald-600 text-white";
  const countPeakClass =
    data.channel === "Ligação"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200"
      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200";

  if (data.rows.length === 0) {
    return (
      <section className="lumo-panel-sm overflow-hidden">
        <div className={cn("px-4 py-2 text-sm font-semibold", headerClass)}>{data.channelLabel}</div>
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Nenhum colaborador cadastrado neste canal.
        </p>
      </section>
    );
  }

  return (
    <section className="lumo-panel-sm overflow-hidden">
      <div className={cn("px-4 py-2 text-sm font-semibold", headerClass)}>{data.channelLabel}</div>

      <div className="border-b border-border/60 px-4 py-3 text-xs text-muted-foreground">
        {data.scheduledAttendants} de {data.rows.length} colaborador(es) com jornada definida · pico
        de {data.peakCount} atendente(s) no mesmo horário
        {data.gapSlotIndices.length > 0 && (
          <span className="text-amber-700 dark:text-amber-300">
            {" "}
            · {data.gapSlotIndices.length} faixa(s) sem ninguém escalado
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40">
              <th className="sticky left-0 z-20 min-w-[140px] bg-muted/95 px-3 py-2 text-left font-semibold text-foreground">
                Colaborador
              </th>
              <th className="min-w-[72px] px-2 py-2 text-left font-semibold text-foreground">
                Carga
              </th>
              <th className="min-w-[64px] px-2 py-2 text-left font-semibold text-foreground">
                Início
              </th>
              <th className="min-w-[64px] px-2 py-2 text-left font-semibold text-foreground">
                Saída
              </th>
              {data.slots.map((slot) => (
                <th
                  key={slot.minutes}
                  className="min-w-[44px] px-1 py-2 text-center font-medium text-muted-foreground"
                >
                  {slot.label}
                </th>
              ))}
            </tr>
            <tr className="border-b border-border/60 bg-muted/20">
              <th
                colSpan={4}
                className="sticky left-0 z-20 bg-muted/95 px-3 py-2 text-left font-semibold text-foreground"
              >
                Qtde. atendentes
              </th>
              {data.counts.map((count, index) => (
                <th
                  key={`count-${index}`}
                  className={cn(
                    "px-1 py-2 text-center font-bold",
                    count === 0 && "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
                    count === data.peakCount &&
                      count > 0 &&
                      countPeakClass
                  )}
                >
                  {count}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.attendantId} className="border-b border-border/40 hover:bg-muted/20">
                <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium text-foreground">
                  {row.name}
                </td>
                <td className="px-2 py-2 text-muted-foreground">{row.workingHours || "—"}</td>
                <td className="px-2 py-2 text-muted-foreground">
                  {row.jornadaStart ? row.jornadaStart.slice(0, 5) : "—"}
                </td>
                <td className="px-2 py-2 text-muted-foreground">
                  {row.jornadaEnd ? row.jornadaEnd.slice(0, 5) : "—"}
                </td>
                {row.activeSlots.map((active, index) => (
                  <td key={`${row.attendantId}-${index}`} className="p-0.5">
                    <div
                      className={cn(
                        "h-6 min-w-[40px] rounded-sm border border-transparent",
                        active ? accentClass : "bg-muted/30",
                        !row.hasSchedule && !active && "bg-muted/15"
                      )}
                      title={
                        active
                          ? `${row.name} · ${formatJornada(row)}`
                          : row.hasSchedule
                            ? "Fora da jornada"
                            : "Jornada não informada"
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AttendantOccupancyMap({ attendants }: AttendantOccupancyMapProps) {
  const ligacaoMap = useMemo(
    () => buildOccupancyMap(attendants, "Ligação"),
    [attendants]
  );
  const whatsappMap = useMemo(
    () => buildOccupancyMap(attendants, "WhatsApp"),
    [attendants]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Mapa de ocupação por horário</h2>
        <p className="text-sm text-muted-foreground">
          Visualize a escala de cada colaborador, a quantidade de pessoas por faixa horária e os
          horários sem cobertura. Preencha início e fim da jornada no cadastro para aparecer no mapa.
        </p>
      </div>

      <OccupancySection data={ligacaoMap} />
      <OccupancySection data={whatsappMap} />
    </div>
  );
}
