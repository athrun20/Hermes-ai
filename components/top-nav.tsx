"use client";

import { usePathname } from "next/navigation";
import { Bell, Bot, Search, ShieldCheck } from "lucide-react";

export function TopNav() {
  const pathname = usePathname();
  const navItems = [
    { label: "Dashboard", href: "/" },
    { label: "Morning Briefing", href: "/morning-briefing" },
    { label: "Opportunity Scanner", href: "/opportunity-scanner" },
    { label: "Learning Journey", href: "/learning-journey" },
    { label: "Replay Mode", href: "/replay-mode" },
    { label: "Journal", href: "/decision-journal" },
    { label: "Settings", href: "#" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-surface-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg border border-mint-300/30 bg-mint-400 text-surface-950 shadow-glow">
            <Bot className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight tracking-tight text-white">
              Hermes
            </p>
            <p className="text-xs text-slate-500">Paper market intelligence</p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1 md:flex">
          {navItems.map((item) => (
            <a
              className={`rounded-md px-4 py-2 text-sm transition ${
                pathname === item.href
                  ? "bg-white/10 text-white shadow-insetPanel"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
              href={item.href}
              key={item.label}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            className="hidden h-10 min-w-56 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-left text-sm text-slate-500 transition hover:border-white/15 hover:bg-white/[0.055] sm:flex"
            type="button"
            title="Search markets"
          >
            <Search className="size-4" aria-hidden="true" />
            Search markets
          </button>
          <button
            className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 transition hover:bg-white/10 hover:text-white"
            type="button"
            title="Alerts"
          >
            <Bell className="size-4" aria-hidden="true" />
          </button>
          <div className="hidden items-center gap-2 rounded-lg border border-mint-300/20 bg-mint-300/10 px-3 py-2 text-sm font-medium text-mint-300 lg:flex">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Paper mode
          </div>
        </div>
      </div>
    </header>
  );
}
