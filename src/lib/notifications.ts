import "server-only";
import { getDueTaskNotifications, type DueNotificationRow } from "./data";
import { sendMail } from "./email";
import { formatDate, getDueInfo } from "./dates";

export interface ReminderSummary {
  dryRun: boolean;
  days: number;
  usersMatched: number;
  emailsSent: number;
  tasks: number;
  errors: string[];
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}

function taskRow(t: DueNotificationRow, color: string): string {
  return `<tr>
    <td style="padding:6px 10px;border-bottom:1px solid #eee;">${esc(t.Title)}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#666;">${esc(t.WorkspaceName)}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee;color:${color};font-weight:600;white-space:nowrap;">${formatDate(t.DueDate)}</td>
  </tr>`;
}

function buildEmail(name: string, tasks: DueNotificationRow[]) {
  const overdue = tasks.filter(
    (t) => getDueInfo(t.DueDate, t.Status)?.state === "overdue"
  );
  const upcoming = tasks.filter(
    (t) => getDueInfo(t.DueDate, t.Status)?.state !== "overdue"
  );
  const subject =
    overdue.length > 0
      ? `Petruz Tarefas — ${overdue.length} tarefa(s) vencida(s)`
      : "Petruz Tarefas — tarefas próximas do vencimento";

  const section = (title: string, color: string, rows: DueNotificationRow[]) =>
    rows.length === 0
      ? ""
      : `<p style="margin:18px 0 6px;font-weight:600;color:${color};">${title} (${rows.length})</p>
         <table style="border-collapse:collapse;width:100%;font-size:14px;">
           ${rows.map((t) => taskRow(t, color)).join("")}
         </table>`;

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:560px;">
    <p>Olá, ${esc(name)}.</p>
    <p>Você tem tarefas que precisam de atenção:</p>
    ${section("Vencidas", "#dc2626", overdue)}
    ${section("Próximas do vencimento", "#d97706", upcoming)}
    <p style="margin-top:20px;font-size:12px;color:#999;">Petruz Tarefas — aviso automático.</p>
  </div>`;

  const line = (t: DueNotificationRow) =>
    `- ${t.Title} (${t.WorkspaceName}) — ${formatDate(t.DueDate)}`;
  const text = [
    `Olá, ${name}.`,
    ...(overdue.length ? ["", "Vencidas:", ...overdue.map(line)] : []),
    ...(upcoming.length
      ? ["", "Próximas do vencimento:", ...upcoming.map(line)]
      : []),
  ].join("\n");

  return { subject, html, text };
}

/**
 * Envia (ou simula, com dryRun) um e-mail-resumo por usuário com suas tarefas
 * vencidas / próximas do vencimento nos próximos @days dias.
 */
export async function sendDueReminders(
  opts: { days?: number; dryRun?: boolean } = {}
): Promise<ReminderSummary> {
  const days = opts.days ?? 3;
  const dryRun = opts.dryRun ?? false;
  const rows = await getDueTaskNotifications(days);

  const byUser = new Map<
    number,
    { name: string; email: string; tasks: DueNotificationRow[] }
  >();
  for (const r of rows) {
    const u = byUser.get(r.UserId);
    if (u) u.tasks.push(r);
    else byUser.set(r.UserId, { name: r.Name, email: r.Email, tasks: [r] });
  }

  const summary: ReminderSummary = {
    dryRun,
    days,
    usersMatched: byUser.size,
    emailsSent: 0,
    tasks: rows.length,
    errors: [],
  };

  for (const u of Array.from(byUser.values())) {
    if (!u.email) continue;
    const { subject, html, text } = buildEmail(u.name, u.tasks);
    if (dryRun) continue;
    try {
      await sendMail({ to: u.email, subject, html, text });
      summary.emailsSent++;
    } catch (e) {
      summary.errors.push(
        `${u.email}: ${e instanceof Error ? e.message : "erro"}`
      );
    }
  }
  return summary;
}
