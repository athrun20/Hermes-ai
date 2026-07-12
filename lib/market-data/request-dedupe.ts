/**
 * In-flight request sharing, abort, and generation-token protection.
 */

export type InFlightEntry<T> = {
  promise: Promise<T>;
  generation: number;
  controller: AbortController;
};

export class RequestDedupe {
  private inflight = new Map<string, InFlightEntry<unknown>>();
  private generation = 0;

  /** Bump generation (e.g. symbol/TF switch). Stale responses must be ignored. */
  bumpGeneration(): number {
    this.generation += 1;
    return this.generation;
  }

  currentGeneration(): number {
    return this.generation;
  }

  /**
   * Share in-flight work for the same key, or start a new one.
   * If generation is provided and differs from the entry's generation after await, throw ABORTED.
   */
  async run<T>(
    key: string,
    factory: (signal: AbortSignal) => Promise<T>,
    options?: { generation?: number; abortPrevious?: boolean },
  ): Promise<T> {
    const generation = options?.generation ?? this.generation;

    if (options?.abortPrevious) {
      const existing = this.inflight.get(key);
      if (existing && existing.generation !== generation) {
        existing.controller.abort();
        this.inflight.delete(key);
      }
    }

    const current = this.inflight.get(key) as InFlightEntry<T> | undefined;
    if (current && current.generation === generation) {
      return current.promise;
    }

    // Abort older generation for same key
    if (current) {
      current.controller.abort();
      this.inflight.delete(key);
    }

    const controller = new AbortController();
    let resolvePromise!: (value: T) => void;
    let rejectPromise!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    this.inflight.set(key, { promise, generation, controller });

    void (async () => {
      try {
        const result = await factory(controller.signal);
        resolvePromise(result);
      } catch (error) {
        rejectPromise(error);
      } finally {
        const entry = this.inflight.get(key);
        if (entry?.promise === promise) {
          this.inflight.delete(key);
        }
      }
    })();

    return promise;
  }

  abortAll(): void {
    for (const entry of this.inflight.values()) {
      entry.controller.abort();
    }
    this.inflight.clear();
  }

  clear(): void {
    this.inflight.clear();
  }

  inflightCount(): number {
    return this.inflight.size;
  }
}

export const defaultRequestDedupe = new RequestDedupe();

/**
 * Out-of-order protection: only accept results matching the expected generation.
 */
export function isStaleGeneration(
  expected: number | undefined,
  actual: number,
): boolean {
  if (expected == null) return false;
  return expected !== actual;
}
