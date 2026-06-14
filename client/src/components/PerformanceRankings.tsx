import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { compareAttendantSummaries, type AttendantPerformanceSummary } from "@/lib/performanceMetrics";
import { formatAverageTime } from "@/lib/performanceStorage";
import { periodScopeLabel, type DashboardPeriod } from "@/lib/dateRangeFilter";

const medals = ["🥇", "🥈", "🥉"];

type PerformanceRankingsProps = {
  ligacaoSummaries: AttendantPerformanceSummary[];
  whatsappSummaries: AttendantPerformanceSummary[];
  overallSummaries?: AttendantPerformanceSummary[];
  period: DashboardPeriod;
  compact?: boolean;
};

function RankingList({
  title,
  subtitle,
  items,
  renderBadge,
  accentClass = "bg-primary/10 text-primary",
}: {
  title: string;
  subtitle: string;
  items: Array<{ name: string; primary: string; secondary: string }>;
  renderBadge: (index: number) => ReactNode;
  accentClass?: string;
}) {
  return (
    <div className="lumo-panel p-4 h-full">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item, index) => (
            <motion.div
              key={`${item.name}-${index}`}
              whileHover={{ x: 4 }}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="text-xl w-8 shrink-0 text-center">{renderBadge(index)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{item.name}</p>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded ${accentClass}`}>
                    {item.primary}
                  </span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                    {item.secondary}
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum atendimento neste canal no período.
          </p>
        )}
      </div>
    </div>
  );
}

function buildRankingItems(
  summaries: AttendantPerformanceSummary[],
  limit: number
) {
  return [...summaries]
    .filter((summary) => summary.totalAttendances > 0)
    .sort(compareAttendantSummaries)
    .slice(0, limit)
    .map((summary) => ({
      name: summary.name,
      primary: `${summary.performanceScore.toFixed(1)} pts`,
      secondary: `${summary.totalAttendances} atend. · ${formatAverageTime(summary.averageTimeMinutes)} · ${Math.round(summary.averagePercentage)}% meta`,
    }));
}

export default function PerformanceRankings({
  ligacaoSummaries,
  whatsappSummaries,
  overallSummaries,
  period,
  compact = false,
}: PerformanceRankingsProps) {
  const limit = compact ? 3 : 5;
  const scope = periodScopeLabel(period);

  const ligacaoItems = buildRankingItems(ligacaoSummaries, limit);
  const whatsappItems = buildRankingItems(whatsappSummaries, limit);
  const overallItems = overallSummaries
    ? buildRankingItems(overallSummaries, limit)
    : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingList
          title="📞 Ranking Ligação"
          subtitle={`Melhor desempenho em ligações ${scope.toLowerCase()} (volume ÷ TMA × meta)`}
          items={ligacaoItems}
          renderBadge={(index) => medals[index] ?? `#${index + 1}`}
          accentClass="bg-blue-500/10 text-blue-700 dark:text-blue-300"
        />
        <RankingList
          title="💬 Ranking WhatsApp"
          subtitle={`Melhor desempenho no WhatsApp ${scope.toLowerCase()} (volume ÷ TMA × meta)`}
          items={whatsappItems}
          renderBadge={(index) => medals[index] ?? `#${index + 1}`}
          accentClass="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        />
      </div>

      {overallItems.length > 0 && (
        <RankingList
          title="🏆 Ranking Geral"
          subtitle={`Soma dos dois canais ${scope.toLowerCase()} — visão consolidada`}
          items={overallItems}
          renderBadge={(index) => `#${index + 1}`}
        />
      )}
    </div>
  );
}
