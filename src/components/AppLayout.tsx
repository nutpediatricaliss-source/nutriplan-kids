import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut, CalendarDays, UtensilsCrossed, Users, Apple, Calculator } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: CalendarDays, tone: "bg-lavender text-lavender-foreground" },
  { to: "/recetas", label: "Recetas", icon: UtensilsCrossed, tone: "bg-peach text-peach-foreground" },
  { to: "/pacientes", label: "Pacientes", icon: Users, tone: "bg-sky text-sky-foreground" },
  { to: "/alimentos", label: "Alimentos", icon: Apple, tone: "bg-sage text-sage-foreground" },
  { to: "/calculadora", label: "Calculadora", icon: Calculator, tone: "bg-lavender text-lavender-foreground" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3 lg:gap-6">
            <Link to="/" className="text-xl font-bold text-primary">
              NutriPlan
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map(({ to, label, icon: Icon, tone }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "relative flex items-center gap-2 px-2 py-2 lg:px-3 text-sm font-medium transition-colors rounded-lg",
                    location.pathname === to
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <span className={cn("rounded-md p-1", location.pathname === to ? "bg-primary/10 text-primary" : tone)}><Icon className="h-3.5 w-3.5" /></span>
                  {label}
                  {location.pathname === to && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
                  )}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground xl:block">
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
