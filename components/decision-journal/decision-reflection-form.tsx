"use client";

import { useState } from "react";
import type {
  DecisionEmotion,
  DecisionReason,
  DecisionReflection,
  PlanFollowResponse,
} from "@/lib/decision-journal-types";

const reasons: DecisionReason[] = [
  "Trend continuation",
  "Support bounce",
  "Breakout",
  "Pullback",
  "News / catalyst",
  "Impulse",
  "Practice setup",
  "Other",
];

const emotions: DecisionEmotion[] = [
  "Calm",
  "Confident",
  "Nervous",
  "Frustrated",
  "Tired",
  "FOMO",
];

const followOptions: PlanFollowResponse[] = ["Yes", "Partially", "No"];

export function DecisionReflectionForm({
  tradeId,
  reflection,
  onSave,
}: {
  tradeId: string;
  reflection?: DecisionReflection;
  onSave: (reflection: DecisionReflection) => void;
}) {
  const [reason, setReason] = useState<DecisionReason>(
    reflection?.reason ?? "Practice setup",
  );
  const [emotion, setEmotion] = useState<DecisionEmotion>(reflection?.emotion ?? "Calm");
  const [followedPlan, setFollowedPlan] = useState<PlanFollowResponse>(
    reflection?.followedPlan ?? "Partially",
  );
  const [lesson, setLesson] = useState(reflection?.lesson ?? "");

  return (
    <div className="rounded-lg border border-white/10 bg-surface-950/45 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        Trader Reflection
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <SelectField
          label="Why did you take this trade?"
          value={reason}
          options={reasons}
          onChange={(value) => setReason(value as DecisionReason)}
        />
        <SelectField
          label="Emotional state before trade"
          value={emotion}
          options={emotions}
          onChange={(value) => setEmotion(value as DecisionEmotion)}
        />
        <SelectField
          label="Did you follow your plan?"
          value={followedPlan}
          options={followOptions}
          onChange={(value) => setFollowedPlan(value as PlanFollowResponse)}
        />
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          One lesson learned
        </span>
        <textarea
          className="mt-2 min-h-24 w-full rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-mint-300/40"
          onChange={(event) => setLesson(event.target.value)}
          placeholder="Write the judgment lesson this trade taught you."
          value={lesson}
        />
      </label>
      <button
        className="mt-3 rounded-lg bg-mint-400 px-4 py-2.5 text-sm font-bold text-surface-950 transition hover:bg-mint-300"
        onClick={() =>
          onSave({
            tradeId,
            reason,
            emotion,
            followedPlan,
            lesson,
            updatedAt: Date.now(),
          })
        }
        type="button"
      >
        Save Reflection
      </button>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <select
        className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-surface-950 px-3 text-sm font-semibold text-white outline-none transition focus:border-mint-300/40"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
