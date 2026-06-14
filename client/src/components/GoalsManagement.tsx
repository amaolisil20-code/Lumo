import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProductionGoal, RoleGoal, AttendanceChannel, JobRole, GoalStatus } from "@/types/goals";
import { useLumoData } from "@/contexts/LumoDataContext";
import { pageContainerVariants, pageItemVariants } from "@/lib/motionVariants";

const channels: AttendanceChannel[] = ["Ligação", "WhatsApp"];
const statuses: GoalStatus[] = ["Ativo", "Inativo"];

interface GoalsManagementProps {
  onDataChange?: (data: { productionGoals: ProductionGoal[]; roleGoals: RoleGoal[] }) => void;
}

export default function GoalsManagement({ onDataChange }: GoalsManagementProps) {
  const { productionGoals, roleGoals, setProductionGoals, setRoleGoals } = useLumoData();
  // Production Goals Modal
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [editingProductionId, setEditingProductionId] = useState<number | null>(null);
  const [productionFormData, setProductionFormData] = useState<Omit<ProductionGoal, "id" | "createdAt" | "updatedAt">>({
    channel: "Ligação",
    dailyTarget: 70,
    status: "Ativo",
  });

  // Role Goals Modal
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [roleFormData, setRoleFormData] = useState<Omit<RoleGoal, "id" | "createdAt" | "updatedAt">>({
    role: "Atendente",
    dailyTarget: 70,
    description: "",
    status: "Ativo",
  });

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "production" | "role"; id: number } | null>(null);

  // Production Goals Handlers
  const handleOpenProductionModal = (goal?: ProductionGoal) => {
    if (goal) {
      setEditingProductionId(goal.id);
      setProductionFormData({
        channel: goal.channel,
        dailyTarget: goal.dailyTarget,
        status: goal.status,
      });
    } else {
      setEditingProductionId(null);
      setProductionFormData({
        channel: "Ligação",
        dailyTarget: 70,
        status: "Ativo",
      });
    }
    setIsProductionModalOpen(true);
  };

  const handleSaveProductionGoal = () => {
    if (!productionFormData.channel || productionFormData.dailyTarget <= 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (editingProductionId) {
      const updated = productionGoals.map((goal) =>
        goal.id === editingProductionId
          ? {
              ...goal,
              channel: productionFormData.channel,
              dailyTarget: productionFormData.dailyTarget,
              status: productionFormData.status,
              updatedAt: new Date().toISOString().split("T")[0],
            }
          : goal
      );
      setProductionGoals(updated);
      toast.success("Meta de produção atualizada!");
    } else {
      const newGoal: ProductionGoal = {
        id: Math.max(...productionGoals.map((g) => g.id), 0) + 1,
        channel: productionFormData.channel,
        dailyTarget: productionFormData.dailyTarget,
        status: productionFormData.status,
        createdAt: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString().split("T")[0],
      };
      setProductionGoals([...productionGoals, newGoal]);
      toast.success("Meta de produção adicionada!");
    }
    setIsProductionModalOpen(false);
    onDataChange?.({ productionGoals, roleGoals });
  };

  const handleDeleteProductionGoal = (id: number) => {
    setProductionGoals(productionGoals.filter((goal) => goal.id !== id));
    setDeleteConfirm(null);
    toast.success("Meta de produção removida!");
    onDataChange?.({ productionGoals, roleGoals });
  };

  // Role Goals Handlers
  const handleOpenRoleModal = (goal?: RoleGoal) => {
    if (goal) {
      setEditingRoleId(goal.id);
      setRoleFormData({
        role: goal.role,
        dailyTarget: goal.dailyTarget,
        description: goal.description || "",
        status: goal.status,
      });
    } else {
      setEditingRoleId(null);
      setRoleFormData({
        role: "Atendente",
        dailyTarget: 70,
        description: "",
        status: "Ativo",
      });
    }
    setIsRoleModalOpen(true);
  };

  const handleSaveRoleGoal = () => {
    if (!roleFormData.role || roleFormData.dailyTarget <= 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (editingRoleId) {
      setRoleGoals(
        roleGoals.map((goal) =>
          goal.id === editingRoleId
            ? {
                ...goal,
                role: roleFormData.role,
                dailyTarget: roleFormData.dailyTarget,
                description: roleFormData.description,
                status: roleFormData.status,
                updatedAt: new Date().toISOString().split("T")[0],
              }
            : goal
        )
      );
      toast.success("Meta por função atualizada!");
    } else {
      const newGoal: RoleGoal = {
        id: Math.max(...roleGoals.map((g) => g.id), 0) + 1,
        role: roleFormData.role,
        dailyTarget: roleFormData.dailyTarget,
        description: roleFormData.description,
        status: roleFormData.status,
        createdAt: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString().split("T")[0],
      };
      setRoleGoals([...roleGoals, newGoal]);
      toast.success("Meta por função adicionada!");
    }
    setIsRoleModalOpen(false);
    onDataChange?.({ productionGoals, roleGoals });
  };

  const handleDeleteRoleGoal = (id: number) => {
    setRoleGoals(roleGoals.filter((goal) => goal.id !== id));
    setDeleteConfirm(null);
    toast.success("Meta por função removida!");
    onDataChange?.({ productionGoals, roleGoals });
  };

  return (
    <motion.div
      className="space-y-6"
      variants={pageContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Production Goals Section */}
      <motion.div variants={pageItemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Metas de Produção</CardTitle>
                <CardDescription>
                  Ligação e WhatsApp — quantidade diária esperada por colaborador
                </CardDescription>
              </div>
              <Button
                onClick={() => handleOpenProductionModal()}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Adicionar Meta
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-muted/30">
                    <TableHead className="font-semibold text-foreground">
                      Tipo de Atendimento
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Quantidade Esperada/Dia
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-foreground text-right">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {productionGoals.length > 0 ? (
                      productionGoals.map((goal, index) => (
                        <motion.tr
                          key={goal.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-border hover:bg-muted/50 transition-colors"
                        >
                          <TableCell className="font-medium text-foreground">
                            {goal.channel}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-semibold text-blue-600">
                              {goal.dailyTarget}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                goal.status === "Ativo"
                                  ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {goal.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleOpenProductionModal(goal)}
                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4 text-blue-600" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDeleteConfirm({ type: "production", id: goal.id })}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </motion.button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))
                    ) : (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-border"
                      >
                        <TableCell colSpan={4} className="text-center py-8">
                          <p className="text-muted-foreground">
                            Nenhuma meta de produção configurada. Clique em Adicionar Meta.
                          </p>
                        </TableCell>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Role Goals Section */}
      <motion.div variants={pageItemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Metas por Função</CardTitle>
                <CardDescription>
                  Meta diária aplicada ao cargo de Atendente
                </CardDescription>
              </div>
              <Button
                onClick={() => handleOpenRoleModal()}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Adicionar Meta
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-muted/30">
                    <TableHead className="font-semibold text-foreground">
                      Função
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Meta Diária
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Descrição
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-foreground text-right">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {roleGoals.length > 0 ? (
                      roleGoals.map((goal, index) => (
                        <motion.tr
                          key={goal.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-border hover:bg-muted/50 transition-colors"
                        >
                          <TableCell className="font-medium text-foreground">
                            {goal.role}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-semibold text-blue-600">
                              {goal.dailyTarget}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {goal.description || "-"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                goal.status === "Ativo"
                                  ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {goal.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleOpenRoleModal(goal)}
                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4 text-blue-600" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDeleteConfirm({ type: "role", id: goal.id })}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </motion.button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))
                    ) : (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-border"
                      >
                        <TableCell colSpan={5} className="text-center py-8">
                          <p className="text-muted-foreground">
                            Nenhuma meta por função configurada
                          </p>
                        </TableCell>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Production Goal Modal */}
      <Dialog open={isProductionModalOpen} onOpenChange={setIsProductionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProductionId ? "Editar Meta de Produção" : "Adicionar Meta de Produção"}
            </DialogTitle>
            <DialogDescription>
              Configure a meta de atendimentos esperados por dia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Tipo de Atendimento</Label>
              <Select
                value={productionFormData.channel}
                onValueChange={(value) =>
                  setProductionFormData({
                    ...productionFormData,
                    channel: value as AttendanceChannel,
                  })
                }
              >
                <SelectTrigger id="channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {channel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyTarget">Quantidade Esperada por Dia</Label>
              <Input
                id="dailyTarget"
                type="number"
                min="1"
                value={productionFormData.dailyTarget}
                onChange={(e) =>
                  setProductionFormData({
                    ...productionFormData,
                    dailyTarget: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={productionFormData.status}
                onValueChange={(value) =>
                  setProductionFormData({
                    ...productionFormData,
                    status: value as GoalStatus,
                  })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsProductionModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveProductionGoal}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Goal Modal */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoleId ? "Editar Meta por Função" : "Adicionar Meta por Função"}
            </DialogTitle>
            <DialogDescription>
              Configure a meta de atendimentos para uma função específica
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Input id="role" value="Atendente" disabled className="bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleTarget">Meta Diária</Label>
              <Input
                id="roleTarget"
                type="number"
                min="1"
                value={roleFormData.dailyTarget}
                onChange={(e) =>
                  setRoleFormData({
                    ...roleFormData,
                    dailyTarget: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Meta reduzida devido a atividades de supervisão"
                value={roleFormData.description}
                onChange={(e) =>
                  setRoleFormData({
                    ...roleFormData,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleStatus">Status</Label>
              <Select
                value={roleFormData.status}
                onValueChange={(value) =>
                  setRoleFormData({
                    ...roleFormData,
                    status: value as GoalStatus,
                  })
                }
              >
                <SelectTrigger id="roleStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsRoleModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveRoleGoal}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirm && (
          <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (deleteConfirm.type === "production") {
                      handleDeleteProductionGoal(deleteConfirm.id);
                    } else {
                      handleDeleteRoleGoal(deleteConfirm.id);
                    }
                  }}
                >
                  Excluir
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
