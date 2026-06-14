import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalRanking } from "@/types/goals";
import { alertSoftBgClass } from "@/lib/alertColors";
import type { DashboardPeriod } from "@/lib/dateRangeFilter";
import { periodRankingSubtitle } from "@/lib/dateRangeFilter";
import { cardItemVariants } from "@/lib/motionVariants";

interface GoalRankingCardProps {
  rankings: GoalRanking[];
  period: DashboardPeriod;
}

const getMedalEmoji = (position: number) => {
  switch (position) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return `${position}º`;
  }
};

export default function GoalRankingCard({ rankings, period }: GoalRankingCardProps) {
  const exceeded = rankings.filter((r) => r.type === "exceeded");
  const below = rankings.filter((r) => r.type === "below");

  return (
    <motion.div
      variants={cardItemVariants}
      className="lumo-panel p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 dark:bg-purple-950/40 rounded-lg">
          <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Ranking de Metas
          </h2>
          <p className="text-xs text-muted-foreground">
            {periodRankingSubtitle(period)}
          </p>
        </div>
      </div>

      <Tabs defaultValue="exceeded" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="exceeded" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Acima da Meta
          </TabsTrigger>
          <TabsTrigger value="below" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Abaixo da Meta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exceeded" className="space-y-3">
          <AnimatePresence>
            {exceeded.length > 0 ? (
              exceeded.map((ranking, index) => (
                <motion.div
                  key={ranking.attendantId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border border-green-200 dark:border-green-800 ${alertSoftBgClass(ranking.alertLevel)} hover:shadow-md transition-all`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400 w-8">
                        {getMedalEmoji(ranking.position)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {ranking.attendantName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {ranking.role}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        {ranking.percentage.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ranking.produced}/{ranking.dailyTarget}
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
                <p className="text-muted-foreground">
                  Nenhum colaborador acima da meta
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="below" className="space-y-3">
          <AnimatePresence>
            {below.length > 0 ? (
              below.map((ranking, index) => (
                <motion.div
                  key={ranking.attendantId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border border-red-200 dark:border-red-800 ${alertSoftBgClass(ranking.alertLevel)} hover:shadow-md transition-all`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-xl font-bold text-red-600 dark:text-red-400 w-8">
                        ⚠️
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {ranking.attendantName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {ranking.role}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">
                        {ranking.percentage.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ranking.produced}/{ranking.dailyTarget}
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
                <p className="text-muted-foreground">
                  Nenhum colaborador abaixo da meta
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
