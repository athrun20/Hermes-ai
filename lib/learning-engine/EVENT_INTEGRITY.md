# Learning Engine — Event Integrity (Phase 2.1) + Phase 3 notes

## Phase 3 coaching (internal only)

- `buildPersonalizedCoachingSummary` and `buildWeeklyLearningReview` read TraderLearningProfile + memory only.
- Not user-facing chrome yet; inspect via `__hermesLearningEngine()`.
- Does not change market scores or paper execution.

---

## Replay completion policy

**Status: not wired**

`ReplayCompleted` is **not** emitted from the product today.

Reason: the only existing replay hook runs when a replay session is first **announced / selected** (`replay-mode-page` effect). That is a start/view signal, not a completion signal.

- Replay start / first announcement → **must not** emit `ReplayCompleted`
- Adapter `replayToLearningEvent` remains available for future wiring
- Future integration requires a reliable completion state (finalized grade/summary workflow). Do **not** add a button solely for Learning Engine.

## Partial-close policy

| Action | Learning event |
|--------|----------------|
| Full position close | `TradeCompleted` (one event) |
| Partial reduction | **No** Phase 1 `TradeCompleted` |
| Final close after partials | One `TradeCompleted` for the final full close of remaining size |

Partial reductions create paper history rows for accounting but are **not** counted as completed-trade learning samples.

## Event ID policy

IDs use `buildLearningEventId`:

```
sourceType:action:sourceRecordId:completedTimestamp
```

Examples:

- `paper-trading:trade-completed:{positionId}:{closedAt}`
- `decision-journal:trade-reviewed:{tradeId}:{updatedAt}`
- `decision-journal:journal-reflection:{tradeId}:{updatedAt}`
- `paper-replay:replay-completed:{tradeId}:{completedAt}` (future)

No random IDs. No `Date.now()` as identity without a source completion timestamp.

## Review / journal overlap

One reflection save emits both:

1. `TradeReviewed` — plan adherence, grade, reason (process)
2. `JournalReflectionAdded` — emotion / impulse context only

Behavior counts:

- Plan followed/broken → **review only**
- Early entry / FOMO → **journal only**

This prevents double-counting strengths/weaknesses from one user action.

## Persistence / cross-tab

- Namespace: `hermes-trader-memory-v1` (not `hermes-memory`)
- Reload before ingest reduces duplicate acceptance across tabs
- Limitation: true multi-tab races can still last-write-win; no full sync protocol
- Malformed storage → empty recovery, non-blocking
- Caps and schema version enforced on serialize/deserialize
