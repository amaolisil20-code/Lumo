import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, TrendingDown } from "lucide-react";
import { PerformanceIndicator } from "@/types/goals";
import { alertSurfaceClass, alertTextClass } from "@/lib/alertColors";
import type { DashboardPeriod } from "@/lib/dateRangeFilter";
import { periodBelowGoalTitle, periodScopePhrase } from "@/lib/dateRangeFilter";
import { cardItemVariants } from "@/lib/motionVariants";

interface BelowGoalCardProps {
  indicators: PerformanceIndicator[];
  period: DashboardPeriod;
}

export default function BelowGoalCard({ indicators, period }: BelowGoalCardProps) {
  const belowGoal = indicators
    .filter((ind) => ind.alertLevel !== "green")
    .sort((a, b) => a.percentage - b.percentage);

  const uniqueCount = new Set(belowGoal.map((ind) => ind.attendantId)).size;
  const scope = periodScopePhrase(period);

  return (
    <motion.div
      variants={cardItemVariants}
      className="lumo-panel p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-100 dark:bg-red-950/40 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {periodBelowGoalTitle(period)}
          </h2>
          <p className="text-xs text-muted-foreground">
            {uniqueCount} colaborador(es) abaixo da meta {scope}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {belowGoal.length > 0 ? (
            belowGoal.map((indicator, index) => (
              <motion.div
                key={indicator.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${alertSurfaceClass(indicator.alertLevel)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {indicator.attendantName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {indicator.role} • {indicator.channel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className={`h-4 w-4 ${alertTextClass(indicator.alertLevel)}`} />
                    <span className={`text-sm font-bold ${alertTextClass(indicator.alertLevel)}`}>
                      {indicator.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="lumo-inset rounded p-2">
                    <p className="text-xs text-muted-foreground">Meta</p>
                    <p className="text-sm font-semibold text-foreground">
                      {indicator.dailyTarget}
                    </p>
                  </div>
                  <div className="lumo-inset rounded p-2">
                    <p className="text-xs text-muted-foreground">Realizado</p>
                    <p className="text-sm font-semibold text-foreground">
                      {indicator.produced}
                    </p>
                  </div>
                  <div className="lumo-inset rounded p-2">
                    <p className="text-xs text-muted-foreground">Diferença</p>
                    <p className={`text-sm font-semibold ${alertTextClass(indicator.alertLevel)}`}>
                      {indicator.difference > 0 ? "+" : ""}{indicator.difference}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <div className="p-3 bg-green-100 dark:bg-green-950/40 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl text-green-700 dark:text-green-400">✓</span>
              </div>
              <p className="text-muted-foreground font-medium">
                Todos os colaboradores atingiram a meta {scope}!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Excelente desempenho da equipe
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
