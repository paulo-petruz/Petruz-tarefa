import { differenceInCalendarDays } from "date-fns";

/**
 * Colunas DATE chegam do driver como Date em meia-noite UTC; usar métodos
 * locais deslocaria um dia em fusos negativos (ex.: Brasil). Normalizamos
 * tudo para a string ISO "yyyy-MM-dd" antes de comparar/exibir.
 */
export function toISODate(date: Date | string | null): string | null {
  if (!date) return null;
  if (typeof date === "string") return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function formatDate(date: Date | string | null): string {
  const iso = toISODate(date);
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** Formato curto dd/MM para exibição resumida das datas das tarefas. */
export function formatDateShort(date: Date | string | null): string {
  const iso = toISODate(date);
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

function isoToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export type DueState = "overdue" | "today" | "soon" | "ok";

export interface DueInfo {
  state: DueState;
  label: string;
}

/** Classifica o vencimento de uma tarefa para exibir alertas. */
export function getDueInfo(
  dueDate: Date | string | null,
  status: string
): DueInfo | null {
  const iso = toISODate(dueDate);
  if (!iso || status === "done") return null;

  const days = differenceInCalendarDays(isoToLocalDate(iso), new Date());
  if (days < 0) {
    return {
      state: "overdue",
      label: days === -1 ? "Venceu ontem" : `Vencida há ${-days} dias`,
    };
  }
  if (days === 0) return { state: "today", label: "Vence hoje" };
  if (days <= 3) {
    return {
      state: "soon",
      label: days === 1 ? "Vence amanhã" : `Vence em ${days} dias`,
    };
  }
  return { state: "ok", label: `Vence em ${days} dias` };
}
