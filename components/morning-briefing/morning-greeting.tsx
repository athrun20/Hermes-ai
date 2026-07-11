import type { MorningBriefing } from "@/lib/morning-briefing";

export function MorningGreeting({
  greeting,
}: {
  greeting: MorningBriefing["greeting"];
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-surface-950/50 px-4 py-4 shadow-insetPanel sm:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mint-300/75">
        Greeting
      </p>
      <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Good morning, {greeting.userName}
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-slate-400">Hermes prepared your market briefing.</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-amberline">{greeting.introduction}</p>
    </section>
  );
}
