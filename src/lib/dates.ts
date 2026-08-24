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

/** Data de N dias atrás em "yyyy-MM-dd" (fuso local, sem deslocar o dia). */
export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function isoToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export type DueState = "overdue" | "today" | "soon" | "ok";

export interface DueInfo {
  state: DueState;
  /** Texto completo (usado em tooltip). */
  label: string;
  /** Texto curto para o badge compacto ("Vencida", "Hoje", "2 dias"). */
  shortLabel: string;
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
      shortLabel: "Vencida",
    };
  }
  if (days === 0)
    return { state: "today", label: "Vence hoje", shortLabel: "Hoje" };
  if (days <= 3) {
    return {
      state: "soon",
      label: days === 1 ? "Vence amanhã" : `Vence em ${days} dias`,
      shortLabel: days === 1 ? "Amanhã" : `${days} dias`,
    };
  }
  return { state: "ok", label: `Vence em ${days} dias`, shortLabel: `${days} dias` };
}
