import "server-only";
import nodemailer from "nodemailer";

type Transporter = ReturnType<typeof nodemailer.createTransport>;

let cached: Transporter | null = null;

/** Cria (uma vez) o transporte SMTP a partir das variáveis de ambiente. */
function getTransporter(): Transporter {
  if (cached) return cached;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error(
      "SMTP não configurado — defina SMTP_HOST, SMTP_USER e SMTP_PASS no .env.local."
    );
  }
  cached = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 465),
    // Porta 465 usa TLS implícito (equivale ao 'ssl' => 'ssl' do Zend).
    secure: (process.env.SMTP_SECURE ?? "true") !== "false",
    auth: { user, pass },
  });
  return cached;
}

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(mail: MailInput): Promise<void> {
  const fromEmail = process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER!;
  const fromName = process.env.SMTP_FROM_NAME ?? "Suporte Petruz";
  await getTransporter().sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}

/** Testa a conexão/autenticação SMTP sem enviar mensagem. */
export async function verifyMail(): Promise<void> {
  await getTransporter().verify();
}
