import { Bell, Brain, Database, Palette, Shield } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { PageHeader, PageShell, Panel, PanelHeader, StatusPill } from "@/components/ui";

const upcoming = [
  {
    title: "Appearance",
    description: "Theme density, chart contrast, and workspace layout preferences.",
    icon: Palette,
  },
  {
    title: "Notifications",
    description: "Mentor alerts, readiness changes, and paper-session reminders.",
    icon: Bell,
  },
  {
    title: "Risk Preferences",
    description: "Default risk per trade, max open risk, and caution thresholds.",
    icon: Shield,
  },
  {
    title: "Data Providers",
    description: "Market data sources and how live versus mock data is labeled.",
    icon: Database,
  },
  {
    title: "AI Preferences",
    description: "Mentor tone, coaching frequency, and explanation depth.",
    icon: Brain,
  },
] as const;

export function SettingsPage() {
  return (
    <main>
      <TopNav />
      <PageShell>
        <PageHeader
          eyebrow="Settings"
          title="Preferences"
          description="Workspace configuration is coming soon. Hermes stays paper-only and local."
          action={<StatusPill tone="gold">Coming soon</StatusPill>}
        />

        <Panel>
          <PanelHeader eyebrow="Roadmap" title="Future sections" />
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((section) => {
              const Icon = section.icon;
              return (
                <article
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3.5"
                  key={section.title}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-9 place-items-center rounded-lg border border-white/10 bg-surface-950/60 text-slate-300">
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{section.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{section.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="Now" title="What works today" />
          <div className="space-y-2 px-4 py-4 text-sm leading-6 text-slate-400">
            <p>Paper account, workspace layout, and mentor memory save in this browser.</p>
            <p>Risk controls for paper size remain available from the trade plan path.</p>
            <p>No broker keys, no live execution, and no generative AI provider settings yet.</p>
          </div>
        </Panel>
      </PageShell>
    </main>
  );
}
