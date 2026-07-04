export const hermesTokens = {
  spacing: {
    panelPadding: "p-5",
    cardPadding: "p-4",
    sectionGap: "gap-4",
    denseGap: "gap-3",
  },
  radius: {
    panel: "rounded-lg",
    card: "rounded-xl",
    control: "rounded-md",
    pill: "rounded-full",
  },
  typography: {
    eyebrow: "text-[11px] font-semibold uppercase tracking-[0.18em]",
    title: "text-[15px] font-semibold tracking-tight",
    metric: "text-xl font-semibold tracking-tight",
    body: "text-sm leading-6",
  },
  shadows: {
    panel: "shadow-panel",
    inset: "shadow-insetPanel",
  },
  accents: {
    gold: "text-amberline",
    goldSurface: "border-amberline/20 bg-amberline/10 text-amber-100",
    mintSurface: "border-mint-300/20 bg-mint-300/10 text-mint-200",
    dangerSurface: "border-rose-300/20 bg-rose-400/10 text-rose-200",
  },
  motion: {
    calm: "transition duration-300",
    lift: "transition duration-300 hover:-translate-y-0.5",
  },
  surfaces: {
    panel: "border border-white/10 bg-surface-900/90 backdrop-blur-xl",
    card: "border border-white/10 bg-white/[0.035]",
    cardHover: "hover:border-white/20 hover:bg-white/[0.055]",
    muted: "border border-white/10 bg-surface-950/45",
  },
} as const;
