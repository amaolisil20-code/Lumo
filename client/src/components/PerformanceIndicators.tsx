import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { AlertCircle, TrendingUp, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PerformanceIndicator, AlertLevel } from "@/types/goals";
import {
  alertSoftBgClass,
  alertTextClass,
  chartTooltipClass,
} from "@/lib/alertColors";
import { pageContainerVariants, pageItemVariants } from "@/lib/motionVariants";

interface PerformanceIndicatorsProps {
  indicators: PerformanceIndicator[];
  periodScope?: string;
}

const getAlertColor = (level: AlertLevel) => {
  switch (level) {
    case "green":
      return "#10b981";
    case "yellow":
      return "#f59e0b";
    case "red":
      return "#ef4444";
    default:
      return "#6b7280";
  }
};

const getAlertBgColor = alertSoftBgClass;
const getAlertTextColor = alertTextClass;

export default function PerformanceIndicators({ indicators, periodScope }: PerformanceIndicatorsProps) {
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");

  // Get unique roles and channels
  const roles = Array.from(new Set(indicators.map((i) => i.role)));
  const channels = Array.from(new Set(indicators.map((i) => i.channel)));

  // Filter indicators
  const filteredIndicators = useMemo(() => {
    return indicators.filter((ind) => {
      const roleMatch = filterRole === "all" || ind.role === filterRole;
      const channelMatch = filterChannel === "all" || ind.channel === filterChannel;
      return roleMatch && channelMatch;
    });
  }, [indicators, filterRole, filterChannel]);

  // Prepare data for charts
  const chartData = filteredIndicators.map((ind) => ({
    name: ind.attendantName.split(" ")[0],
    meta: ind.dailyTarget,
    realizado: ind.produced,
    percentual: parseFloat(ind.percentage.toFixed(1)),
    alertLevel: ind.alertLevel,
  }));

  // Calculate statistics
  const stats = {
    total: filteredIndicators.length,
    above: filteredIndicators.filter((i) => i.alertLevel === "green").length,
    warning: filteredIndicators.filter((i) => i.alertLevel === "yellow").length,
    below: filteredIndicators.filter((i) => i.alertLevel === "red").length,
    average: filteredIndicators.length > 0
      ? (filteredIndicators.reduce((sum, i) => sum + i.percentage, 0) / filteredIndicators.length).toFixed(1)
      : 0,
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={chartTooltipClass}
        >
          <p className="font-semibold text-foreground text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              style={{ color: entry.color }}
              className="text-sm font-medium"
            >
              {entry.name}: <span className="font-bold">{entry.value}</span>
            </p>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="space-y-6"
      variants={pageContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Stats Cards */}
      <motion.div
        variants={pageItemVariants}
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <p className="text-xs opacity-90">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <p className="text-xs opacity-90">Acima da Meta</p>
          <p className="text-2xl font-bold">{stats.above}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
          <p className="text-xs opacity-90">Atenção</p>
          <p className="text-2xl font-bold">{stats.warning}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
          <p className="text-xs opacity-90">Abaixo da Meta</p>
          <p className="text-2xl font-bold">{stats.below}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <p className="text-xs opacity-90">Média</p>
          <p className="text-2xl font-bold">{stats.average}%</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={pageItemVariants} className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Funções</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Canais</SelectItem>
            {channels.map((channel) => (
              <SelectItem key={channel} value={channel}>
                {channel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Charts */}
      <motion.div variants={pageItemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Meta vs Realizado</CardTitle>
            <CardDescription>
              Comparação entre meta e produção {periodScope ?? "no período selecionado"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="meta" fill="#3b82f6" name="Meta" />
                <Bar dataKey="realizado" fill="#10b981" name="Realizado" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Percentage Chart */}
      <motion.div variants={pageItemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Percentual de Atingimento</CardTitle>
            <CardDescription>
              Evolução do desempenho {periodScope ?? "no período selecionado"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="percentual"
                  stroke="#8b5cf6"
                  name="Percentual (%)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detailed Table */}
      <motion.div variants={pageItemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Indicadores Detalhados</CardTitle>
            <CardDescription>Desempenho individual de cada colaborador</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AnimatePresence>
                {filteredIndicators.length > 0 ? (
                  filteredIndicators.map((indicator, index) => (
                    <motion.div
                      key={indicator.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border-2 transition-all ${getAlertBgColor(indicator.alertLevel)} border-opacity-50`}
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
                        <div className="text-right">
                          <p className={`text-lg font-bold ${getAlertTextColor(indicator.alertLevel)}`}>
                            {indicator.percentage.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {indicator.produced}/{indicator.dailyTarget}
                          </p>
                        </div>
                      </div>

                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(indicator.percentage, 100)}%` }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                          className={`h-full rounded-full transition-all`}
                          style={{
                            backgroundColor: getAlertColor(indicator.alertLevel),
                          }}
                        />
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
                      Nenhum indicador encontrado com os filtros selecionados
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

