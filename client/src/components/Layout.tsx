import { Link, useLocation } from "wouter";
import { useState, useEffect, createContext, useContext } from "react";
import { LayoutDashboard, ListFilter, Star, Bell, TrendingUp, Moon, Sun, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---- Theme ----
const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({ dark: true, toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>{children}</ThemeContext.Provider>;
}

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/screener", label: "Screener", icon: ListFilter },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

function Logo() {
  return (
    <div className="flex items-center gap-2" data-testid="link-home">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="Edge Signals logo" className="text-primary">
        <rect x="2" y="2" width="24" height="24" rx="6" stroke="currentColor" strokeWidth="2" />
        <path d="M7 18L11.5 12L15 15.5L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="21" cy="8" r="2" fill="currentColor" />
      </svg>
      <span className="font-semibold text-base tracking-tight">Edge Signals</span>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dark, toggle } = useTheme();

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = location === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            data-testid={`link-nav-${item.label.toLowerCase()}`}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover-elevate",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <div className="mb-8 px-1">
          <Logo />
        </div>
        {nav}
        <div className="mt-auto">
          <Button variant="ghost" size="sm" onClick={toggle} data-testid="button-theme" className="w-full justify-start gap-3">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {dark ? "Light mode" : "Dark mode"}
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggle} data-testid="button-theme-mobile">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen((o) => !o)} data-testid="button-menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>
      {mobileOpen && (
        <div className="border-b border-border bg-sidebar px-4 py-3 lg:hidden">{nav}</div>
      )}

      <main className="lg:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <TrendingUp className="h-5 w-5 text-primary" />
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
