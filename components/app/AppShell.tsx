"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  User,
  Zap,
} from "lucide-react";
import { clearAuthTokens } from "@/lib/auth";
import { getUserDisplayName } from "@/lib/user-display";

type UserLike = {
  name?: string | null;
  email?: string | null;
} | null | undefined;

type MenuId = "home" | "properties" | "analysis" | "billing" | "help";

const menuItems: Array<{
  id: MenuId;
  label: string;
  path: string;
  icon: typeof Home;
}> = [
  { id: "home", label: "Home", path: "/appin/dashboard", icon: Home },
  { id: "properties", label: "Properties", path: "/appin/properties", icon: Building },
  { id: "analysis", label: "Analysis", path: "/appin/analysis", icon: BarChart3 },
  { id: "billing", label: "Billing", path: "/appin/billing", icon: FileText },
  { id: "help", label: "Help", path: "/appin/help", icon: HelpCircle },
];

export function AppShell({
  title,
  current,
  user,
  actions,
  children,
}: {
  title: string;
  current: MenuId;
  user?: UserLike;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = () => {
    clearAuthTokens();
    router.push("/");
  };

  return (
    <div className="app-shell min-h-screen">
      <div className="app-shell__orb app-shell__orb--left" />
      <div className="app-shell__orb app-shell__orb--right" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="app-sidebar hidden w-72 shrink-0 lg:flex lg:flex-col">
          <Link href="/" className="flex items-center gap-3 px-1">
            <div className="landing-logo-mark">
              <Zap className="h-4 w-4 fill-current" />
            </div>
            <div className="text-lg font-semibold tracking-tight text-white">
              Power<span className="text-cyan-400">Fusion</span>
            </div>
          </Link>

          <div className="app-user-card mt-8">
            <div className="app-user-avatar">
              <User className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-slate-400">Signed in as</div>
              <div className="mt-1 truncate text-lg font-semibold text-white">
                {getUserDisplayName(user ?? undefined)}
              </div>
              <div className="mt-1 truncate text-sm text-slate-500">{user?.email || "No email"}</div>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(item.path)}
                  className={`app-nav-item ${current === item.id ? "app-nav-item--active" : ""}`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <button type="button" onClick={handleLogout} className="app-logout mt-auto">
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="app-topbar">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
                Power Fusion
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</h1>
            </div>
            <div className="flex items-center gap-3">{actions}</div>
          </header>

          <main className="mt-6 min-h-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
