"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  createTaskAction,
  updateTaskAction,
  type ActionState,
} from "@/lib/actions";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import type { WorkspaceMember } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface TaskFormValues {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: number | null;
  startDate: string | null; // yyyy-MM-dd
  dueDate: string | null; // yyyy-MM-dd
  completedDate: string | null; // yyyy-MM-dd
  progress: number;
  entry: number | null;
  collaboratorIds: number[];
  supervisorIds: number[];
  metaType: string | null; // 'teto' | 'piso' | null
  metaValue: number | null;
  standardMinutes: number | null;
}

/**
 * Seleção de vários membros em dropdown. Mantém inputs ocultos para o form
 * action continuar recebendo os ids como antes (getAll no servidor).
 */
function MemberMultiSelect({
  members,
  selected,
  onChange,
  name,
  placeholder,
  selectedClassName,
}: {
  members: WorkspaceMember[];
  selected: number[];
  onChange: (ids: number[]) => void;
  /** Nome do campo enviado no formulário. */
  name: string;
  placeholder: string;
  /** Destaque do resumo quando há seleção. */
  selectedClassName?: string;
}) {
  const chosen = members.filter((m) => selected.includes(m.UserId));
  const label =
    chosen.length === 0
      ? placeholder
      : chosen.length <= 2
        ? chosen.map((m) => m.Name).join(", ")
        : `${chosen[0].Name} +${chosen.length - 1}`;

  const toggle = (userId: number) =>
    onChange(
      selected.includes(userId)
        ? selected.filter((id) => id !== userId)
        : [...selected, userId]
    );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-between font-normal",
              chosen.length === 0 && "text-muted-foreground",
              chosen.length > 0 && selectedClassName
            )}
          >
            <span className="truncate">{label}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-64 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
        >
          {members.map((m) => (
            <DropdownMenuCheckboxItem
              key={m.UserId}
              checked={selected.includes(m.UserId)}
              // Evita fechar o menu a cada marcação (seleção múltipla).
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => toggle(m.UserId)}
            >
              {m.Name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
    </>
  );
}

function SubmitButton({
  isEdit,
  isSubtask,
}: {
  isEdit: boolean;
  isSubtask: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending
        ? "Salvando..."
        : isEdit
          ? "Salvar alterações"
          : isSubtask
            ? "Criar subtarefa"
            : "Criar tarefa"}
    </Button>
  );
}

const initialState: ActionState = {};

export function TaskDialog({
  workspaceId,
  members,
  task,
  hasSubtasks = false,
  entryId,
  defaultAssigneeId,
  currentUserId,
  isAdmin,
  trigger,
}: {
  workspaceId: number;
  members: WorkspaceMember[];
  task?: TaskFormValues;
  /** True quando a tarefa-mãe possui subtarefas (progresso vem delas). */
  hasSubtasks?: boolean;
  /** Id da tarefa-mãe ao criar uma subtarefa. */
  entryId?: number;
  defaultAssigneeId?: number;
  currentUserId: number;
  isAdmin: boolean;
  trigger: ReactNode;
}) {
  const isSubtask = entryId !== undefined && !task;
  // Compartilhamento só existe em tarefa-mãe.
  const isMotherTask = !isSubtask && !(task && task.entry != null);
  // Membros comuns só podem atribuir tarefas a si mesmos; mantém o
  // responsável atual visível em modo edição.
  const selectableMembers = isAdmin
    ? members
    : members.filter(
        (m) => m.UserId === currentUserId || m.UserId === task?.assigneeId
      );
  const [open, setOpen] = useState(false);
  const [collabs, setCollabs] = useState<number[]>(
    task?.collaboratorIds ?? []
  );
  const [supervisors, setSupervisors] = useState<number[]>(
    task?.supervisorIds ?? []
  );
  const [metaType, setMetaType] = useState<string>(task?.metaType ?? "none");
  const [measure, setMeasure] = useState(task?.standardMinutes != null);
  const action = task
    ? updateTaskAction.bind(null, task.id)
    : createTaskAction;
  const [state, formAction] = useFormState(action, initialState);

  useEffect(() => {
    if (open && state.success) {
      toast.success(task ? "Tarefa atualizada." : "Tarefa criada.");
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {task
              ? "Editar tarefa"
              : isSubtask
                ? "Nova subtarefa"
                : "Nova tarefa"}
          </DialogTitle>
          <DialogDescription>
            {task
              ? "Atualize as informações da tarefa."
              : isSubtask
                ? "A subtarefa tem os mesmos atributos de uma tarefa."
                : "Descreva a tarefa, defina prazos e o responsável."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <input type="hidden" name="workspaceId" value={workspaceId} />
          {entryId !== undefined && (
            <input type="hidden" name="entry" value={entryId} />
          )}
          <div className="space-y-2">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              name="title"
              defaultValue={task?.title}
              placeholder="O que precisa ser feito?"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Descrição (opcional)</Label>
            <Textarea
              id="task-description"
              name="description"
              rows={3}
              defaultValue={task?.description ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue={task?.status ?? "todo"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select name="priority" defaultValue={task?.priority ?? "medium"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select
              name="assigneeId"
              defaultValue={
                task?.assigneeId
                  ? String(task.assigneeId)
                  : defaultAssigneeId
                    ? String(defaultAssigneeId)
                    : undefined
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem responsável" />
              </SelectTrigger>
              <SelectContent>
                {selectableMembers.map((m) => (
                  <SelectItem key={m.UserId} value={String(m.UserId)}>
                    {m.Name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isMotherTask && members.length > 1 && (
            <div className="space-y-2">
              <Label>Compartilhar com</Label>
              <MemberMultiSelect
                members={members}
                selected={collabs}
                onChange={setCollabs}
                name="collaborators"
                placeholder="Ninguém — só o responsável"
              />
              <p className="text-xs text-muted-foreground">
                Quem for marcado também vê e edita a tarefa, e ela aparece na
                pasta dele. O responsável não precisa ser marcado.
              </p>
            </div>
          )}
          {isMotherTask && members.length > 1 && (
            <div className="space-y-2">
              <Label>Supervisores</Label>
              <MemberMultiSelect
                members={members}
                selected={supervisors}
                onChange={setSupervisors}
                name="supervisors"
                placeholder="Nenhum supervisor"
                selectedClassName="border-amber-500/60 text-amber-700 dark:text-amber-400"
              />
              <p className="text-xs text-muted-foreground">
                O supervisor acompanha a tarefa na aba “Supervisionadas”, sem
                que ela entre na pasta nem nos números dele.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-start">Início</Label>
              <Input
                id="task-start"
                name="startDate"
                type="date"
                defaultValue={task?.startDate ?? ""}
                disabled={Boolean(task)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">Previsão de término</Label>
              <Input
                id="task-due"
                name="dueDate"
                type="date"
                defaultValue={task?.dueDate ?? ""}
                disabled={Boolean(task)}
              />
            </div>
          </div>
          {task && (
            <p className="-mt-2 text-xs text-muted-foreground">
              Início e previsão de término não podem ser alterados após a
              criação.
            </p>
          )}
          {task?.completedDate && (
            <div className="space-y-2">
              <Label htmlFor="task-completed">Concluída em</Label>
              <Input
                id="task-completed"
                type="date"
                defaultValue={task.completedDate}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Preenchida automaticamente ao concluir a tarefa.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="task-progress">Progresso (%)</Label>
            <Input
              id="task-progress"
              name="progress"
              type="number"
              min={0}
              max={100}
              defaultValue={task?.progress ?? 0}
              disabled={hasSubtasks}
            />
            <p className="text-xs text-muted-foreground">
              {hasSubtasks
                ? "Calculado automaticamente pelas subtarefas."
                : "Digite quanto da tarefa já foi concluído (0 a 100)."}
            </p>
          </div>
          {isMotherTask && (
            <>
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Meta de subtarefas em aberto</Label>
                    <Select
                      name="metaType"
                      value={metaType}
                      onValueChange={setMetaType}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem meta</SelectItem>
                        <SelectItem value="teto">Teto (máximo)</SelectItem>
                        <SelectItem value="piso">Piso (mínimo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-meta-value">Quantidade</Label>
                    <Input
                      id="task-meta-value"
                      name="metaValue"
                      type="number"
                      min={1}
                      defaultValue={task?.metaValue ?? ""}
                      disabled={metaType === "none"}
                      placeholder="Ex.: 10"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {metaType === "teto"
                    ? "Fica fora da meta quando houver mais subtarefas em aberto que o teto."
                    : metaType === "piso"
                      ? "Fica fora da meta quando houver menos subtarefas em aberto que o piso."
                      : "Defina um teto (máximo) ou piso (mínimo) de subtarefas em aberto."}
                </p>
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={measure}
                    onCheckedChange={(v) => setMeasure(v === true)}
                  />
                  Medir em produção
                </label>
                {measure && (
                  <Input
                    name="standardMinutes"
                    type="number"
                    min={0}
                    step="any"
                    required
                    defaultValue={task?.standardMinutes ?? ""}
                    placeholder="Tempo-padrão por unidade, em minutos (ex.: 5)"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Registre a produção por lote (quantidade + tempo) na própria
                  tarefa. Quando o ritmo ultrapassar o tempo-padrão, ela entra em
                  “Fora da meta”.
                </p>
              </div>
            </>
          )}
          <SubmitButton isEdit={Boolean(task)} isSubtask={isSubtask} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
