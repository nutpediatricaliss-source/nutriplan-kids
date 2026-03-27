import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/recetas", label: "Recetas" },
  { to: "/alimentos", label: "Alimentos" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold tracking-tight text-primary">
              NutriPlan
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "relative px-4 py-2 text-sm font-medium transition-colors rounded-lg",
                    location.pathname === to
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {label}
                  {location.pathname === to && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
                  )}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground hover:text-foreground">
              <LogOut className="mr-1 h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
