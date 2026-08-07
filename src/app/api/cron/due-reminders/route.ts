import { NextRequest, NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/notifications";
import { sendMail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const provided = bearer ?? req.nextUrl.searchParams.get("secret") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;

  // ?test=email@dominio → envia um único e-mail de teste (valida o SMTP).
  const test = params.get("test");
  if (test) {
    try {
      await sendMail({
        to: test,
        subject: "Petruz Tarefas — teste de e-mail",
        html: "<p>Envio de teste do Petruz Tarefas funcionando. ✅</p>",
        text: "Envio de teste do Petruz Tarefas funcionando.",
      });
      return NextResponse.json({ ok: true, sentTo: test });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Erro no envio." },
        { status: 500 }
      );
    }
  }

  const daysRaw = Number(params.get("days"));
  const days = Number.isFinite(daysRaw) && daysRaw >= 0 ? daysRaw : 3;
  const dryRun = params.get("dryRun") === "1";

  try {
    const summary = await sendDueReminders({ days, dryRun });
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
