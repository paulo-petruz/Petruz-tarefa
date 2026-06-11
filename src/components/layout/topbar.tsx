import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions";
import type { SessionUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Topbar({ user }: { user: SessionUser }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <span className="font-semibold text-primary">Petruz Tasks</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-sm leading-tight sm:block">
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" asChild title="Minha conta">
          <Link href="/conta">
            <KeyRound className="h-4 w-4" />
            <span className="sr-only">Minha conta</span>
          </Link>
        </Button>
        <form action={logoutAction}>
          <Button variant="ghost" size="icon" title="Sair" type="submit">
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sair</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
