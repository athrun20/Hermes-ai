import type { JournalEntry } from "@/lib/paper-trading";
import { Panel, PanelHeader } from "./ui";

export function TradeJournal({ entries }: { entries: JournalEntry[] }) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="Review"
        title="Trade Journal"
        action={
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-300">
            {entries.length} entries
          </span>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
          <thead className="bg-surface-950/55 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              {["Date", "Pair", "Setup", "Risk", "Result", "Status"].map((head) => (
                <th className="border-b border-white/10 px-5 py-3 font-semibold" key={head}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((trade) => (
              <tr
                className="group text-slate-300 transition hover:bg-white/[0.025]"
                key={trade.id}
              >
                <td className="border-b border-white/10 px-5 py-4 text-slate-400">
                  {trade.date}
                </td>
                <td className="border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-mint-300" />
                    <span className="font-semibold text-white">{trade.pair}</span>
                  </div>
                </td>
                <td className="border-b border-white/10 px-5 py-4 text-slate-300">
                  {trade.setup}
                </td>
                <td className="border-b border-white/10 px-5 py-4">{trade.risk}</td>
                <td
                  className={`border-b border-white/10 px-5 py-4 font-semibold ${
                    trade.result.startsWith("+")
                      ? "text-mint-300"
                      : trade.result.startsWith("-")
                        ? "text-rose-300"
                        : "text-slate-200"
                  }`}
                >
                  {trade.result}
                </td>
                <td className="border-b border-white/10 px-5 py-4">
                  <span
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                      trade.status === "Active"
                        ? "border-mint-300/20 bg-mint-300/10 text-mint-300"
                        : "border-white/10 bg-white/[0.04] text-slate-300"
                    }`}
                  >
                    {trade.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
