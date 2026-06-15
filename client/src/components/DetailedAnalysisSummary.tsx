import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DetailedAnalysisReport } from "@/lib/detailedAnalysisSummary";
import { saveAnalysisNote } from "@/lib/analysisNoteStorage";

interface DetailedAnalysisSummaryProps {
  report: DetailedAnalysisReport;
  note: string;
  onNoteChange: (note: string) => void;
}

function DaySection({
  heading,
  blocks,
}: {
  heading: string;
  blocks: DetailedAnalysisReport["criticalDays"];
}) {
  if (blocks.length === 0) return null;

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
      {blocks.map((block) => (
        <article
          key={block.date}
          className="space-y-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-3"
        >
          <h4 className="text-sm font-medium text-foreground">{block.title}</h4>
          <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            {block.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

export default function DetailedAnalysisSummary({
  report,
  note,
  onNoteChange,
}: DetailedAnalysisSummaryProps) {
  const [draft, setDraft] = useState(note);

  useEffect(() => {
    setDraft(note);
  }, [note]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft === note) return;
      saveAnalysisNote(draft);
      onNoteChange(draft);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [draft, note, onNoteChange]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Label htmlFor="analysis-note">Observação</Label>
        <Textarea
          id="analysis-note"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ex.: O total de atendimentos depende do dia — sábado e sexta com 300 atendimentos é normal. O que importa é cada colaborador bater a meta."
          rows={4}
          className="resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Suas observações ficam salvas e aparecem no resumo. A análise automática prioriza meta
          individual, não volume total do dia.
        </p>
      </section>

      {!report.hasData ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ainda não há dados suficientes no período selecionado para gerar o resumo. Importe
          produção ou selecione outro intervalo.
        </p>
      ) : (
        <>
          {report.managerNote && (
            <section className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Sua observação</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {report.managerNote}
              </p>
            </section>
          )}

          {report.intro && (
            <p className="text-sm leading-relaxed text-muted-foreground">{report.intro}</p>
          )}

          {report.periodInsights.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Destaques do período</h3>
              <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                {report.periodInsights.map((insight) => (
                  <li key={insight} className="rounded-lg bg-muted/30 px-3 py-2">
                    {insight}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <DaySection heading="Dias que pedem atenção (meta individual)" blocks={report.criticalDays} />
          <DaySection heading="Melhores dias (meta individual)" blocks={report.bestDays} />

          {report.criticalDays.length === 0 && report.bestDays.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum dia com colaboradores abaixo da meta no período selecionado.
            </p>
          )}
        </>
      )}
    </div>
  );
}
