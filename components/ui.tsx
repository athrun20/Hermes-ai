import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { hermesTokens, type HermesTone } from "@/lib/design-tokens";

type Tone = HermesTone;

export function PremiumCard({
  children,
  className = "",
  interactive = false,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  interactive?: boolean;
}) {
  return (
    <section
      className={`${hermesTokens.radius.panel} ${hermesTokens.surfaces.panel} ${hermesTokens.shadows.panel} ${
        interactive ? `${hermesTokens.motion.lift} ${hermesTokens.surfaces.cardHover}` : ""
      } ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

export function PremiumButtonCard({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
}) {
  return (
    <button
      className={`${hermesTokens.radius.panel} ${hermesTokens.surfaces.panel} ${hermesTokens.shadows.panel} ${hermesTokens.motion.lift} ${hermesTokens.surfaces.cardHover} ${hermesTokens.control.focus} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Standard page chrome: TopNav sibling content container */
export function PageShell({
  children,
  wide = false,
  className = "",
}: {
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto ${wide ? hermesTokens.layout.maxWidthWide : hermesTokens.layout.maxWidth} ${hermesTokens.layout.pageX} ${hermesTokens.layout.pageY} ${hermesTokens.layout.pageGap} ${className}`}
    >
      {children}
    </div>
  );
}

/** Compact, consistent page title block — avoids oversized marketing heroes */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`${hermesTokens.radius.panel} ${hermesTokens.surfaces.inset} px-4 py-4 sm:px-5 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className={hermesTokens.typography.pageEyebrow}>{eyebrow}</p> : null}
          <h1 className={`${eyebrow ? "mt-1.5" : ""} ${hermesTokens.typography.pageTitle}`}>{title}</h1>
          {description ? <p className={hermesTokens.typography.pageLead}>{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

export function SectionHeader({
  title,
  eyebrow,
  action,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-3 border-b border-white/10 ${hermesTokens.spacing.headerPadding} ${className}`}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className={`${hermesTokens.typography.eyebrow} text-mint-300/75`}>{eyebrow}</p>
        ) : null}
        <h2 className={`${eyebrow ? "mt-1" : ""} ${hermesTokens.typography.sectionTitle}`}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";

export function Button({
  children,
  className = "",
  variant = "secondary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "h-8 px-2.5 text-xs"
      : size === "lg"
        ? "h-10 px-4 text-sm"
        : "h-9 px-3 text-xs sm:text-sm";

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border font-semibold ${hermesTokens.motion.calm} ${hermesTokens.control.focus} disabled:cursor-not-allowed disabled:opacity-45 ${sizeClass} ${buttonVariant(variant)} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  className = "",
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      className={`grid ${hermesTokens.control.icon} place-items-center rounded-md border border-white/10 bg-white/[0.035] text-slate-400 ${hermesTokens.motion.calm} hover:bg-white/10 hover:text-white ${hermesTokens.control.focus} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex flex-wrap gap-1 rounded-lg border border-white/10 bg-white/[0.025] p-1 ${className}`}
      role="tablist"
    >
      {options.map((option) => (
        <button
          className={`rounded-md px-3 py-1.5 text-xs font-semibold ${hermesTokens.motion.calm} ${hermesTokens.control.focus} ${
            value === option.value
              ? hermesTokens.surfaces.active
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
          key={option.value}
          onClick={() => onChange(option.value)}
          role="tab"
          type="button"
          aria-selected={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className={hermesTokens.typography.label}>{label}</span>
      {children}
      {hint ? <span className={hermesTokens.typography.caption}>{hint}</span> : null}
    </label>
  );
}

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-white/10 bg-surface-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-600 ${hermesTokens.motion.calm} hover:border-white/15 ${hermesTokens.control.focus} ${className}`}
      {...props}
    />
  );
}

export function PrefixInput({
  prefix,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { prefix: string }) {
  return (
    <div
      className={`flex items-center rounded-md border border-white/10 bg-surface-950/60 px-3 ${hermesTokens.motion.calm} hover:border-white/15 focus-within:border-mint-300/40 focus-within:ring-2 focus-within:ring-mint-300/25 ${className}`}
    >
      <span className="shrink-0 text-sm text-slate-500">{prefix}</span>
      <input
        className="h-9 w-full bg-transparent px-2 text-sm font-semibold tabular-nums text-white outline-none placeholder:text-slate-600"
        {...props}
      />
    </div>
  );
}

export function Tooltip({
  content,
  children,
  className = "",
}: {
  content: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`group relative inline-flex ${className}`} title={content}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-40 hidden w-max max-w-[220px] -translate-x-1/2 rounded-md border border-white/10 bg-surface-950 px-2 py-1.5 text-[11px] leading-4 text-slate-300 shadow-panel group-hover:block group-focus-within:block"
      >
        {content}
      </span>
    </span>
  );
}

export function DataTable({
  children,
  minWidth = "min-w-[720px]",
  className = "",
}: {
  children: ReactNode;
  minWidth?: string;
  className?: string;
}) {
  return (
    <div className={`hermes-scroll overflow-x-auto ${className}`}>
      <table className={`w-full ${minWidth} border-separate border-spacing-0 text-left text-sm`}>
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`border-b border-white/10 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:px-4 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      className={`border-b border-white/10 px-3 py-3 text-slate-300 sm:px-4 ${className}`}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={`text-slate-300 transition duration-150 hover:bg-white/[0.025] ${className}`}>
      {children}
    </tr>
  );
}

export function MetricCard({
  label,
  value,
  tone = "neutral",
  detail,
  className = "",
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${hermesTokens.radius.card} ${hermesTokens.surfaces.card} p-3.5 ${className}`}>
      <p className={hermesTokens.typography.label}>{label}</p>
      <p className={`mt-1.5 ${hermesTokens.typography.metric} ${toneText(tone)}`}>{value}</p>
      {detail ? <p className={`mt-1 ${hermesTokens.typography.caption}`}>{detail}</p> : null}
    </div>
  );
}

export function InsightCard({
  title,
  children,
  tone = "neutral",
  className = "",
}: {
  title: string;
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={`${hermesTokens.radius.card} border p-3.5 ${toneSurface(tone)} ${className}`}>
      <p
        className={`${hermesTokens.typography.eyebrow} ${
          tone === "neutral" ? "text-slate-500" : toneText(tone)
        }`}
      >
        {title}
      </p>
      <div className={`mt-2 ${hermesTokens.typography.body}`}>{children}</div>
    </div>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${toneSurface(tone)} ${className}`}
    >
      {children}
    </span>
  );
}

export function ConfidenceBadge({
  confidence,
  label,
}: {
  confidence: number;
  label?: string;
}) {
  return (
    <StatusPill tone={confidence >= 75 ? "mint" : confidence >= 55 ? "gold" : "danger"}>
      {label ?? `${confidence}% confidence`}
    </StatusPill>
  );
}

export function ScoreRing({
  score,
  label,
}: {
  score: number;
  label?: string;
}) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div className="grid place-items-center gap-1.5">
      <div
        className="grid size-14 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${scoreColor(normalizedScore)} ${normalizedScore * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
        }}
      >
        <div className="grid size-11 place-items-center rounded-full bg-surface-950 text-sm font-semibold tabular-nums text-white">
          {normalizedScore}
        </div>
      </div>
      {label ? <p className={hermesTokens.typography.caption}>{label}</p> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "mint",
  className = "",
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  const normalizedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-white/10 ${className}`}>
      <div
        className={`h-full rounded-full ${toneBackground(tone)} transition-all duration-300 ease-out`}
        style={{ width: `${normalizedValue}%` }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className={`${hermesTokens.radius.panel} ${hermesTokens.surfaces.card} px-5 py-8 text-center`}>
      <p className={hermesTokens.typography.cardTitle}>{title}</p>
      <p className={`mx-auto mt-2 max-w-md ${hermesTokens.typography.body}`}>{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function SkeletonLoader({
  lines = 3,
}: {
  lines?: number;
}) {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          className="h-3.5 animate-pulse rounded-full bg-white/[0.06]"
          key={index}
          style={{ width: `${Math.max(40, 90 - index * 16)}%` }}
        />
      ))}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <PremiumCard className={className}>{children}</PremiumCard>;
}

export const PanelHeader = SectionHeader;

function buttonVariant(variant: ButtonVariant) {
  if (variant === "primary") {
    return "border-mint-400/80 bg-mint-400 text-surface-950 hover:bg-mint-300 active:bg-mint-300/90";
  }
  if (variant === "gold") {
    return "border-amberline/30 bg-amberline/12 text-amber-100 hover:bg-amberline/18";
  }
  if (variant === "danger") {
    return "border-rose-300/25 bg-rose-400/10 text-rose-100 hover:bg-rose-400/15";
  }
  if (variant === "ghost") {
    return "border-transparent bg-transparent text-slate-400 hover:bg-white/5 hover:text-white";
  }
  return "border-white/10 bg-white/[0.035] text-slate-200 hover:border-white/18 hover:bg-white/[0.06] hover:text-white";
}

function toneText(tone: Tone) {
  if (tone === "mint") return "text-mint-300";
  if (tone === "gold") return "text-amberline";
  if (tone === "danger") return "text-rose-300";
  if (tone === "muted") return "text-slate-300";
  return "text-white";
}

function toneSurface(tone: Tone) {
  if (tone === "mint") return "border-mint-300/20 bg-mint-300/10 text-mint-200";
  if (tone === "gold") return "border-amberline/20 bg-amberline/10 text-amber-100";
  if (tone === "danger") return "border-rose-300/20 bg-rose-400/10 text-rose-200";
  if (tone === "muted") return "border-white/10 bg-surface-950/45 text-slate-300";
  return "border-white/10 bg-white/[0.035] text-slate-200";
}

function toneBackground(tone: Tone) {
  if (tone === "gold") return "bg-amberline";
  if (tone === "danger") return "bg-rose-300";
  if (tone === "muted") return "bg-slate-400";
  return "bg-mint-300";
}

function scoreColor(score: number) {
  if (score >= 75) return "#79F2C0";
  if (score >= 55) return "#F5B84B";
  return "#FDA4AF";
}
