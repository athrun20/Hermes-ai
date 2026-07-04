import { SlidersHorizontal } from "lucide-react";
import type { PaperSettings } from "@/lib/paper-trading";
import { InsightCard, MetricCard, Panel, PanelHeader, ProgressBar } from "./ui";

export function SettingsPanel({
  settings,
  onSettingsChange,
  onReset,
}: {
  settings: PaperSettings;
  onSettingsChange: (settings: PaperSettings) => void;
  onReset: () => void;
}) {
  return (
    <Panel>
      <PanelHeader
        eyebrow="Settings"
        title="Risk Controls"
        action={<SlidersHorizontal className="size-5 text-slate-400" aria-hidden="true" />}
      />
      <div className="space-y-5 p-5">
        <label className="block" htmlFor="risk">
          <span className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Risk per trade</span>
            <span className="font-semibold text-white">{settings.riskPerTrade.toFixed(2)}%</span>
          </span>
          <input
            className="mt-4 h-2 w-full accent-mint-400"
            id="risk"
            max="3"
            min="0.25"
            onChange={(event) =>
              onSettingsChange({
                ...settings,
                riskPerTrade: Number(event.target.value),
              })
            }
            step="0.25"
            type="range"
            value={settings.riskPerTrade}
          />
          <div className="mt-3">
            <ProgressBar value={(settings.riskPerTrade / 3) * 100} />
          </div>
        </label>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetricCard label="Account mode" value="Paper" tone="muted" className="p-3" />
          <MetricCard label="Max daily risk" value={`${settings.maxDailyRisk.toFixed(1)}%`} tone="muted" className="p-3" />
        </div>
        <InsightCard title="Paper Mode" tone="mint">
          Risk settings are paper-mode planning controls only. Hermes does not
          connect brokers, store keys, or place automatic trades.
        </InsightCard>
        <button
          className="w-full rounded-lg border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/15"
          onClick={onReset}
          type="button"
        >
          Reset Paper Account
        </button>
      </div>
    </Panel>
  );
}
