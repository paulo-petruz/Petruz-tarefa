"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Folder,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ShieldCheck,
} from "lucide-react";
import type { Workspace } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "petruz-sidebar-collapsed";

export function Sidebar({
  workspaces,
  isSuperAdmin = false,
}: {
  workspaces: Workspace[];
  isSuperAdmin?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem(STORAGE_KEY, prev ? "0" : "1");
      return !prev;
    });
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 py-5",
          collapsed ? "justify-center px-2" : "px-5"
        )}
      >
        <Image
          src="/petruz.png"
          alt="Petruz"
          width={collapsed ? 36 : 44}
          height={collapsed ? 36 : 44}
        />
        {!collapsed && (
          <div>
            <p className="text-base font-semibold leading-tight">
              Petruz Tasks
            </p>
            <p className="text-xs text-sidebar-foreground/60">
              Gerenciador de tarefas
            </p>
          </div>
        )}
      </div>

      <nav
        className={cn(
          "flex flex-1 flex-col gap-1 overflow-y-auto py-2",
          collapsed ? "items-center px-2" : "px-3"
        )}
      >
        <Link
          href="/dashboard"
          title="Painel"
          className={cn(
            "flex items-center gap-3 rounded-md text-sm font-medium hover:bg-sidebar-accent",
            collapsed ? "justify-center p-2.5" : "px-3 py-2"
          )}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          {!collapsed && "Painel"}
        </Link>
        <Link
          href="/workspaces"
          title="Espaços de trabalho"
          className={cn(
            "flex items-center gap-3 rounded-md text-sm font-medium hover:bg-sidebar-accent",
            collapsed ? "justify-center p-2.5" : "px-3 py-2"
          )}
        >
          <Folder className="h-4 w-4 shrink-0" />
          {!collapsed && "Espaços de trabalho"}
        </Link>
        {isSuperAdmin && (
          <Link
            href="/admin"
            title="Administração"
            className={cn(
              "flex items-center gap-3 rounded-md text-sm font-medium hover:bg-sidebar-accent",
              collapsed ? "justify-center p-2.5" : "px-3 py-2"
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {!collapsed && "Administração"}
          </Link>
        )}

        {!collapsed && (
          <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Meus espaços
          </p>
        )}
        {collapsed && (
          <div className="my-2 h-px w-8 bg-sidebar-border" />
        )}
        {workspaces.map((ws) => (
          <Link
            key={ws.Id}
            href={`/workspaces/${ws.Id}`}
            title={ws.Name}
            className={cn(
              "flex items-center gap-3 rounded-md text-sm hover:bg-sidebar-accent",
              collapsed ? "justify-center p-2.5" : "px-3 py-2"
            )}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: ws.Color }}
            />
            {!collapsed && <span className="truncate">{ws.Name}</span>}
          </Link>
        ))}
        <Link
          href="/workspaces?new=1"
          title="Novo espaço"
          className={cn(
            "flex items-center gap-3 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent",
            collapsed ? "justify-center p-2.5" : "px-3 py-2"
          )}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && "Novo espaço"}
        </Link>
      </nav>

      <div
        className={cn(
          "border-t border-sidebar-border p-2",
          collapsed ? "flex justify-center" : "flex justify-end"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          title={collapsed ? "Expandir menu" : "Encolher menu"}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
          <span className="sr-only">
            {collapsed ? "Expandir menu" : "Encolher menu"}
          </span>
        </Button>
      </div>
    </aside>
  );
}
