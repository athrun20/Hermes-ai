import { SlidersHorizontal } from "lucide-react";
import { Panel, PanelHeader } from "./ui";

export function SettingsPanel() {
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
            <span className="font-semibold text-white">1.0%</span>
          </span>
          <input
            className="mt-4 h-2 w-full accent-mint-400"
            defaultValue="1"
            id="risk"
            max="3"
            min="0.25"
            step="0.25"
            type="range"
          />
        </label>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="text-slate-500">Account mode</p>
            <p className="mt-1 font-medium text-slate-200">Paper</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="text-slate-500">Max daily risk</p>
            <p className="mt-1 font-medium text-slate-200">3.0%</p>
          </div>
        </div>
        <div className="rounded-lg border border-mint-300/15 bg-mint-300/10 p-4 text-sm leading-6 text-slate-300">
          Risk settings are paper-mode planning controls only. Hermes does not
          connect brokers, store keys, or place automatic trades.
        </div>
      </div>
    </Panel>
  );
}
