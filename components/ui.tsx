import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { hermesTokens } from "@/lib/design-tokens";

type Tone = "neutral" | "mint" | "gold" | "danger" | "muted";

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
      className={`${hermesTokens.radius.panel} ${hermesTokens.surfaces.panel} ${hermesTokens.shadows.panel} ${hermesTokens.motion.lift} ${hermesTokens.surfaces.cardHover} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SectionHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
      <div>
        {eyebrow ? (
          <p className={`${hermesTokens.typography.eyebrow} text-mint-300/75`}>
            {eyebrow}
          </p>
        ) : null}
        <h2 className={`mt-1 ${hermesTokens.typography.title} text-white`}>
          {title}
        </h2>
      </div>
      {action}
    </div>
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
    <div className={`${hermesTokens.radius.panel} ${hermesTokens.surfaces.card} p-4 ${className}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 ${hermesTokens.typography.metric} ${toneText(tone)}`}>{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p> : null}
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
    <div className={`${hermesTokens.radius.panel} border p-4 ${toneSurface(tone)} ${className}`}>
      <p className={`${hermesTokens.typography.eyebrow} ${tone === "neutral" ? "text-slate-500" : toneText(tone)}`}>
        {title}
      </p>
      <div className={`mt-3 ${hermesTokens.typography.body} text-slate-300`}>{children}</div>
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
    <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold ${toneSurface(tone)} ${className}`}>
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
    <div className="grid place-items-center gap-2">
      <div
        className="grid size-16 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${scoreColor(normalizedScore)} ${normalizedScore * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
        }}
      >
        <div className="grid size-12 place-items-center rounded-full bg-surface-950 text-sm font-semibold text-white">
          {normalizedScore}
        </div>
      </div>
      {label ? <p className="text-xs text-slate-500">{label}</p> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "mint",
}: {
  value: number;
  tone?: Tone;
}) {
  const normalizedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full ${toneBackground(tone)} transition-all duration-500`}
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
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-center">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SkeletonLoader({
  lines = 3,
}: {
  lines?: number;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          className="h-4 animate-pulse rounded-full bg-white/[0.07]"
          key={index}
          style={{ width: `${Math.max(42, 92 - index * 18)}%` }}
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
