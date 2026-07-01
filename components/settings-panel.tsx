import { SlidersHorizontal } from "lucide-react";
import type { PaperSettings } from "@/lib/paper-trading";
import { Panel, PanelHeader } from "./ui";

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
        </label>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="text-slate-500">Account mode</p>
            <p className="mt-1 font-medium text-slate-200">Paper</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="text-slate-500">Max daily risk</p>
            <p className="mt-1 font-medium text-slate-200">
              {settings.maxDailyRisk.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-mint-300/15 bg-mint-300/10 p-4 text-sm leading-6 text-slate-300">
          Risk settings are paper-mode planning controls only. Hermes does not
          connect brokers, store keys, or place automatic trades.
        </div>
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
