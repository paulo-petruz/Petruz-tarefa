export interface ProductionInfo {
  /** Total de unidades apontadas. */
  totalQty: number;
  /** Tempo total apontado (segundos). */
  totalSeconds: number;
  /** Tempo-padrão por unidade (segundos) — a meta. */
  standardSeconds: number;
  /** Ritmo real (segundos por unidade); null quando não há apontamentos. */
  perUnitSeconds: number | null;
  /** true = dentro da meta, false = acima, null = sem apontamentos. */
  withinMeta: boolean | null;
}

/**
 * Avalia a produção de uma tarefa mensurável.
 * Ritmo real = tempo total ÷ unidades; comparado ao tempo-padrão (meta).
 * Retorna null quando a tarefa não está configurada para medir produção.
 */
export function getProductionInfo(
  standardSeconds: number | null,
  totalQty: number,
  totalSeconds: number
): ProductionInfo | null {
  if (!standardSeconds) return null;
  const qty = totalQty ?? 0;
  const secs = totalSeconds ?? 0;
  const perUnitSeconds = qty > 0 ? secs / qty : null;
  const withinMeta =
    perUnitSeconds == null ? null : perUnitSeconds <= standardSeconds;
  return {
    totalQty: qty,
    totalSeconds: secs,
    standardSeconds,
    perUnitSeconds,
    withinMeta,
  };
}

/** Segundos → "4h10", "50min" ou "45s". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const totalMin = Math.round(s / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  return `${totalMin}min`;
}

/** Segundos por unidade → "4,2 min" (ou "48s" quando abaixo de 1 min). */
export function formatPace(perUnitSeconds: number): string {
  if (perUnitSeconds < 60) return `${Math.round(perUnitSeconds)}s`;
  return `${(perUnitSeconds / 60).toFixed(1).replace(".", ",")} min`;
}
