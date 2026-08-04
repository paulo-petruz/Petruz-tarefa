export type MetaKind = "teto" | "piso";
export type MetaState = "within" | "exceeded" | "below";

export interface MetaInfo {
  kind: MetaKind;
  state: MetaState;
  /** true quando está dentro da meta. */
  ok: boolean;
  /** Subtarefas em aberto (não concluídas). */
  open: number;
  /** Valor da meta. */
  target: number;
  /** Texto completo (tooltip). */
  label: string;
  /** Texto curto para o badge ("8/10"). */
  shortLabel: string;
}

/**
 * Avalia a meta de subtarefas em aberto de uma tarefa-mãe recorrente.
 * "Em aberto" = subtarefas não concluídas (total − concluídas).
 * - teto: dentro quando em aberto ≤ meta; estoura acima.
 * - piso: dentro quando em aberto ≥ meta; fica abaixo.
 * Retorna null quando a tarefa não usa meta.
 */
export function getMetaInfo(
  metaType: string | null,
  metaValue: number | null,
  subtaskCount: number,
  subtaskDone: number
): MetaInfo | null {
  if ((metaType !== "teto" && metaType !== "piso") || metaValue == null) {
    return null;
  }
  const open = Math.max(0, subtaskCount - subtaskDone);
  const target = metaValue;

  if (metaType === "teto") {
    const ok = open <= target;
    return {
      kind: "teto",
      state: ok ? "within" : "exceeded",
      ok,
      open,
      target,
      label: ok
        ? `Dentro da meta: ${open} em aberto (teto ${target})`
        : `Acima da meta: ${open} em aberto (teto ${target})`,
      shortLabel: `${open}/${target}`,
    };
  }

  const ok = open >= target;
  return {
    kind: "piso",
    state: ok ? "within" : "below",
    ok,
    open,
    target,
    label: ok
      ? `Dentro da meta: ${open} em aberto (piso ${target})`
      : `Abaixo da meta: ${open} em aberto (piso ${target})`,
    shortLabel: `${open}/${target}`,
  };
}
