import type { MorningBriefing } from "@/lib/morning-briefing";

export function MorningGreeting({
  greeting,
}: {
  greeting: MorningBriefing["greeting"];
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.025] px-5 py-7 shadow-insetPanel">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300/80">
        Morning Briefing
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Good Morning, {greeting.userName}.
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
        Hermes has prepared your market briefing.
      </p>
      <p className="mt-4 text-lg font-semibold tracking-tight text-amberline">
        {greeting.introduction}
      </p>
    </section>
  );
}
