import Link from "next/link";
import { Archive, ArchiveRestore } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";

/**
 * Aviso do arquivo de concluídas: por padrão a listagem traz apenas as
 * concluídas recentes; as anteriores ficam aqui, carregadas sob demanda.
 */
export function ArchiveNotice({
  hiddenCount,
  cutoffDate,
  showingAll,
  baseHref,
}: {
  /** Concluídas fora da janela padrão. */
  hiddenCount: number;
  /** Início da janela (yyyy-MM-dd). */
  cutoffDate: string;
  /** True quando o arquivo já está sendo exibido. */
  showingAll: boolean;
  /** Caminho da página, sem query. */
  baseHref: string;
}) {
  if (showingAll) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArchiveRestore className="h-4 w-4 shrink-0" />
          Exibindo todo o histórico de tarefas concluídas.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={baseHref}>Voltar ao período padrão</Link>
        </Button>
      </div>
    );
  }

  if (hiddenCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Archive className="h-4 w-4 shrink-0" />
        <span>
          <strong className="font-semibold text-foreground">
            {hiddenCount}
          </strong>{" "}
          {hiddenCount === 1 ? "tarefa concluída" : "tarefas concluídas"} antes
          de {formatDate(cutoffDate)}{" "}
          {hiddenCount === 1 ? "está" : "estão"} no arquivo.
        </span>
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href={`${baseHref}?arquivo=1`}>Ver arquivo</Link>
      </Button>
    </div>
  );
}
