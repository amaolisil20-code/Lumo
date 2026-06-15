import { Link } from "wouter";
import { compareAttendantSummaries, formatGoalPercentage, goalPercentageTone, type AttendantPerformanceSummary } from "@/lib/performanceMetrics";
import { formatAverageTime } from "@/lib/performanceStorage";
import { periodScopeLabel, type DashboardPeriod } from "@/lib/dateRangeFilter";
import { cn } from "@/lib/utils";

type PerformanceRankingsProps = {
  ligacaoSummaries: AttendantPerformanceSummary[];
  whatsappSummaries: AttendantPerformanceSummary[];
  overallSummaries?: AttendantPerformanceSummary[];
  period: DashboardPeriod;
  compact?: boolean;
};

const positionStyles = [
  "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-100",
  "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  "bg-muted text-muted-foreground",
];

function PositionBadge({ position }: { position: number }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
        positionStyles[Math.min(position - 1, 3)]
      )}
    >
      {position}
    </span>
  );
}

function PerformanceBar({ value }: { value: number }) {
  const rounded = Math.round(value);
  const barWidth = Math.max(0, Math.min(100, value));
  const barColor =
    value >= 100 ? "bg-emerald-500" : value >= 85 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${barWidth}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-semibold text-foreground">{rounded}%</span>
    </div>
  );
}

const goalToneClasses = {
  green: "text-green-600 dark:text-green-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  red: "text-red-600 dark:text-red-400",
  muted: "text-muted-foreground",
} as const;

function GoalMetaValue({ value }: { value: number }) {
  const tone = goalPercentageTone(value);
  return (
    <span className={cn("font-medium", goalToneClasses[tone])}>
      {formatGoalPercentage(value)}
    </span>
  );
}

function RankingTable({
  title,
  summaries,
  limit,
  viewAllHref,
}: {
  title: string;
  summaries: AttendantPerformanceSummary[];
  limit: number;
  viewAllHref: string;
}) {
  const rows = [...summaries]
    .filter((summary) => summary.totalAttendances > 0)
    .sort(compareAttendantSummaries)
    .slice(0, limit);

  return (
    <div className="lumo-panel-sm p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <Link
          href={viewAllHref}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
        >
          Ver todos
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground">
              <th className="pb-3 pr-3 text-left font-medium">Posição</th>
              <th className="pb-3 pr-3 text-left font-medium">Pontuação</th>
              <th className="pb-3 pr-3 text-center font-medium">Atendimentos</th>
              <th className="pb-3 pr-3 text-center font-medium">TMA</th>
              <th className="pb-3 pr-3 text-center font-medium">Meta</th>
              <th className="pb-3 text-left font-medium">Desempenho</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((summary, index) => (
                <tr
                  key={summary.attendantId}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2.5">
                      <PositionBadge position={index + 1} />
                      <span className="font-medium text-foreground">{summary.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 font-semibold text-foreground">
                    {summary.performanceScore.toFixed(1)}
                  </td>
                  <td className="py-3 pr-3 text-center text-muted-foreground">
                    {summary.totalAttendances}
                  </td>
                  <td className="py-3 pr-3 text-center text-muted-foreground">
                    {formatAverageTime(summary.averageTimeMinutes)}
                  </td>
                  <td className="py-3 pr-3 text-center">
                    <GoalMetaValue value={summary.averagePercentage} />
                  </td>
                  <td className="py-3">
                    <PerformanceBar value={summary.averagePercentage} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhum atendimento neste canal no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PerformanceRankings({
  ligacaoSummaries,
  whatsappSummaries,
  period,
  compact = false,
}: PerformanceRankingsProps) {
  const limit = compact ? 3 : 4;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <RankingTable
        title="Ranking Ligação"
        summaries={ligacaoSummaries}
        limit={limit}
        viewAllHref="/performance"
      />
      <RankingTable
        title="Ranking WhatsApp"
        summaries={whatsappSummaries}
        limit={limit}
        viewAllHref="/performance"
      />
    </div>
  );
}

export { periodScopeLabel };
