/**
 * Hermes design tokens — single source of visual truth.
 * Prefer these over ad-hoc Tailwind strings in feature UI.
 */
export const hermesTokens = {
  layout: {
    maxWidth: "max-w-[1440px]",
    maxWidthWide: "max-w-[1920px]",
    pageX: "px-4 sm:px-6 lg:px-8",
    pageY: "py-4 sm:py-5",
    pageGap: "space-y-5",
    sectionGap: "gap-4",
    denseGap: "gap-3",
  },
  spacing: {
    panelPadding: "p-4 sm:p-5",
    cardPadding: "p-3.5 sm:p-4",
    headerPadding: "px-4 py-3.5 sm:px-5",
    controlY: "py-2",
    controlX: "px-3",
    sectionGap: "gap-4",
    denseGap: "gap-3",
    tightGap: "gap-2",
  },
  radius: {
    panel: "rounded-xl",
    card: "rounded-lg",
    control: "rounded-md",
    pill: "rounded-full",
  },
  typography: {
    pageEyebrow: "text-[10px] font-semibold uppercase tracking-[0.2em] text-mint-300/75",
    pageTitle: "text-xl font-semibold tracking-tight text-white sm:text-2xl",
    pageLead: "mt-1.5 max-w-2xl text-sm leading-6 text-slate-400",
    eyebrow: "text-[10px] font-semibold uppercase tracking-[0.16em]",
    sectionTitle: "text-base font-semibold tracking-tight text-white",
    title: "text-[15px] font-semibold tracking-tight text-white",
    cardTitle: "text-sm font-semibold tracking-tight text-white",
    metric: "text-lg font-semibold tracking-tight tabular-nums sm:text-xl",
    body: "text-sm leading-6 text-slate-300",
    caption: "text-xs leading-5 text-slate-500",
    label: "text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500",
  },
  control: {
    height: "h-9",
    heightLg: "h-10",
    icon: "size-9",
    iconSm: "size-8",
    iconGlyph: "size-4",
    focus:
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-300/40 focus-visible:ring-offset-0",
  },
  icon: {
    sm: "size-3.5",
    md: "size-4",
    lg: "size-5",
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
    calm: "transition duration-200 ease-out",
    lift: "transition duration-200 ease-out hover:-translate-y-px",
    expand: "transition-[max-height,opacity,transform] duration-200 ease-out",
  },
  surfaces: {
    page: "bg-transparent",
    panel: "border border-white/10 bg-surface-900/90 backdrop-blur-xl",
    card: "border border-white/10 bg-white/[0.035]",
    cardHover: "hover:border-white/18 hover:bg-white/[0.05]",
    muted: "border border-white/10 bg-surface-950/50",
    inset: "border border-white/10 bg-surface-950/60 shadow-insetPanel",
    interactive:
      "border border-white/10 bg-white/[0.035] hover:border-white/18 hover:bg-white/[0.055] hover:text-white",
    active: "border-mint-300/30 bg-mint-300/10 text-mint-200",
    activeGold: "border-amberline/30 bg-amberline/10 text-amber-100",
  },
} as const;

export type HermesTone = "neutral" | "mint" | "gold" | "danger" | "muted";
