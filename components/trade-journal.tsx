import type { JournalEntry } from "@/lib/paper-trading";
import { DataTable, Panel, PanelHeader, StatusPill, Td, Th, Tr } from "./ui";

export function TradeJournal({ entries }: { entries: JournalEntry[] }) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        eyebrow="Review"
        title="Trade journal"
        action={<span className="text-xs text-slate-500">{entries.length}</span>}
      />
      <DataTable minWidth="min-w-[640px] md:min-w-[700px]">
        <thead className="bg-surface-950/55">
          <tr>
            {["Date", "Pair", "Setup", "Risk", "Result", "Status"].map((head) => (
              <Th key={head}>{head}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((trade) => (
            <Tr key={trade.id}>
              <Td className="text-slate-400">{trade.date}</Td>
              <Td className="font-semibold text-white">{trade.pair}</Td>
              <Td>{trade.setup}</Td>
              <Td className="tabular-nums">{trade.risk}</Td>
              <Td
                className={`font-semibold tabular-nums ${
                  trade.result.startsWith("+")
                    ? "text-mint-300"
                    : trade.result.startsWith("-")
                      ? "text-rose-300"
                      : "text-slate-200"
                }`}
              >
                {trade.result}
              </Td>
              <Td>
                <StatusPill tone={trade.status === "Active" ? "mint" : "muted"}>
                  {trade.status}
                </StatusPill>
              </Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>
    </Panel>
  );
}
