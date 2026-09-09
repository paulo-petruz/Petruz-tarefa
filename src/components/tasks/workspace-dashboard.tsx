import Link from "next/link";
import { AlertTriangle, CheckCircle2, ListTodo, Timer } from "lucide-react";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import type { WorkspaceSummary } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Paleta por status, alinhada ao restante do app. */
const STATUS_COLORS: Record<string, { stroke: string; dot: string; bar: string }> =
  {
    todo: { stroke: "stroke-slate-400", dot: "bg-slate-400", bar: "bg-slate-400" },
    in_progress: {
      stroke: "stroke-blue-500",
      dot: "bg-blue-500",
      bar: "bg-blue-500",
    },
    review: {
      stroke: "stroke-purple-500",
      dot: "bg-purple-500",
      bar: "bg-purple-500",
    },
    done: {
      stroke: "stroke-emerald-500",
      dot: "bg-emerald-500",
      bar: "bg-emerald-500",
    },
  };

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  urgent: "bg-destructive",
};

function Panel({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  icon: typeof ListTodo;
  tone: string;
  hint?: string;
  /** Quando presente, o cartão vira link para a lista já filtrada. */
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        "flex h-full items-center gap-3 rounded-xl border bg-card p-4",
        href && "transition-colors hover:border-primary/60 hover:bg-muted/40"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          tone
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
          {label}
        </p>
        {hint && (
          <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

/** Rosca em SVG: cada status vira um arco proporcional ao total. */
function StatusDonut({
  segments,
  total,
  hrefFor,
}: {
  segments: { key: string; label: string; value: number }[];
  total: number;
  /** Link da lista filtrada por status. */
  hrefFor: (status: string) => string;
}) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let consumed = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="16"
            className="stroke-muted"
          />
          {total > 0 &&
            segments
              .filter((s) => s.value > 0)
              .map((s) => {
                const length = (s.value / total) * circumference;
                const dash = (
                  <circle
                    key={s.key}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    strokeWidth="16"
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-consumed}
                    className={STATUS_COLORS[s.key]?.stroke ?? "stroke-primary"}
                  />
                );
                consumed += length;
                return dash;
              })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold leading-none">{total}</span>
          <span className="text-[11px] text-muted-foreground">tarefas</span>
        </div>
      </div>

      <ul className="min-w-[9rem] flex-1 space-y-1.5">
        {segments.map((s) => (
          <li key={s.key}>
            <Link
              href={hrefFor(s.key)}
              className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-muted"
              title={`Ver tarefas: ${s.label}`}
            >
              <span
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  STATUS_COLORS[s.key]?.dot ?? "bg-primary"
                )}
              />
              <span className="flex-1 truncate text-muted-foreground">
                {s.label}
              </span>
              <span className="font-semibold tabular-nums">{s.value}</span>
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                {total > 0 ? Math.round((s.value / total) * 100) : 0}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barra empilhada horizontal: concluídas + em aberto, com vencidas em destaque. */
function PersonBar({
  name,
  open,
  done,
  overdue,
  max,
  href,
}: {
  name: string;
  open: number;
  done: number;
  overdue: number;
  max: number;
  /** Pasta da pessoa. */
  href: string;
}) {
  const total = open + done;
  const pct = (n: number) => (max > 0 ? (n / max) * 100 : 0);
  const onTime = Math.max(0, open - overdue);

  return (
    <li>
      <Link
        href={href}
        className="block space-y-1 rounded-md px-1.5 py-1 transition-colors hover:bg-muted"
        title={`Abrir a pasta de ${name}`}
      >
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate font-medium">{name}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {overdue > 0 && (
            <span className="mr-2 font-semibold text-destructive">
              {overdue} vencida{overdue > 1 ? "s" : ""}
            </span>
          )}
          {total}
        </span>
      </div>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
        title={`${done} concluída(s) · ${onTime} em aberto · ${overdue} vencida(s)`}
      >
        <span
          className="bg-emerald-500"
          style={{ width: `${pct(done)}%` }}
        />
        <span className="bg-blue-500" style={{ width: `${pct(onTime)}%` }} />
        <span
          className="bg-destructive"
          style={{ width: `${pct(overdue)}%` }}
        />
      </div>
      </Link>
    </li>
  );
}

/**
 * Painel de resumo do espaço (ou de uma pessoa). Os números vêm agregados do
 * banco sobre todas as tarefas — não sofrem o corte do arquivo.
 */
export function WorkspaceDashboard({
  summary,
  scopeLabel,
  listHref,
  memberHrefBase,
}: {
  summary: WorkspaceSummary;
  /** Nome da pessoa quando o painel é de uma pasta; ausente = espaço todo. */
  scopeLabel?: string;
  /** Destino da lista de tarefas (já com a aba, quando houver). */
  listHref: string;
  /** Base das pastas, ex.: /workspaces/5/membro — habilita clique por pessoa. */
  memberHrefBase?: string;
}) {
  // Acrescenta o filtro preservando querystring já existente no destino.
  const hrefFor = (status: string) =>
    `${listHref}${listHref.includes("?") ? "&" : "?"}status=${status}`;
  const statusMap = new Map(summary.byStatus.map((s) => [s.Status, s]));
  const total = summary.byStatus.reduce((sum, s) => sum + s.Total, 0);
  const done = statusMap.get("done")?.Total ?? 0;
  const overdue = summary.byStatus.reduce((sum, s) => sum + s.Overdue, 0);
  const open = total - done;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const segments = TASK_STATUSES.map((s) => ({
    key: s.value,
    label: s.label,
    value: statusMap.get(s.value)?.Total ?? 0,
  }));

  const priorityMap = new Map(
    summary.byPriority.map((p) => [p.Priority, p.Total])
  );
  const maxPriority = Math.max(1, ...summary.byPriority.map((p) => p.Total));

  // Uma única pessoa não rende comparação — o gráfico só faz sentido no espaço.
  const showPeople = !scopeLabel && summary.byPerson.length > 1;
  const maxPerson = Math.max(
    1,
    ...summary.byPerson.map((p) => p.Open + p.Done)
  );

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        Nenhuma tarefa para resumir
        {scopeLabel ? ` em ${scopeLabel}` : ""}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Total de tarefas"
          value={total}
          icon={ListTodo}
          tone="bg-primary/10 text-primary"
          href={listHref}
        />
        <Kpi
          label="Em aberto"
          value={open}
          icon={Timer}
          tone="bg-blue-500/10 text-blue-500"
        />
        <Kpi
          label="Vencidas"
          value={overdue}
          icon={AlertTriangle}
          tone={
            overdue > 0
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          }
          hint={overdue > 0 ? "precisam de atenção" : "nenhuma em atraso"}
          href={overdue > 0 ? hrefFor("overdue") : undefined}
        />
        <Kpi
          label="Concluídas"
          value={done}
          icon={CheckCircle2}
          tone="bg-emerald-500/10 text-emerald-500"
          hint={`${percent}% do total`}
          href={done > 0 ? hrefFor("done") : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Distribuição por status"
          hint="Clique em um status para ver as tarefas"
        >
          <StatusDonut segments={segments} total={total} hrefFor={hrefFor} />
        </Panel>

        <Panel
          title="Prioridade das tarefas em aberto"
          hint="Concluídas não entram nesta contagem"
        >
          {open === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nada em aberto. 🎉
            </p>
          ) : (
            <ul className="space-y-2.5">
              {TASK_PRIORITIES.map((p) => {
                const value = priorityMap.get(p.value) ?? 0;
                return (
                  <li key={p.value} className="space-y-1">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">{p.label}</span>
                      <span className="font-semibold tabular-nums">{value}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          PRIORITY_COLORS[p.value] ?? "bg-primary"
                        )}
                        style={{ width: `${(value / maxPriority) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {showPeople && memberHrefBase && (
        <Panel
          title="Tarefas por pessoa"
          hint="Clique para abrir a pasta · verde concluídas, azul em aberto, vermelho vencidas"
        >
          <ul className="space-y-2">
            {summary.byPerson.map((person) => (
              <PersonBar
                key={person.UserId ?? "sem-responsavel"}
                name={person.Name ?? "Sem responsável"}
                open={person.Open}
                done={person.Done}
                overdue={person.Overdue}
                max={maxPerson}
                href={`${memberHrefBase}/${person.UserId ?? 0}`}
              />
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
