import { Redis } from "ioredis";

export interface LedgerEntry {
  credits: number;
  totalCalls: number;
  createdAt: number;
  lastSeen: number;
}

const REDIS_PREFIX = "atb:credit:";

/**
 * Credit ledger backed by Redis when REDIS_URL is set, falling back to an
 * in-memory Map for local development / testing.
 */
export class CreditLedger {
  private readonly redis: Redis | null;
  private readonly mem = new Map<string, LedgerEntry>();

  constructor() {
    const url = process.env["REDIS_URL"];
    this.redis = url != null ? new Redis(url) : null;
  }

  async getEntry(key: string): Promise<LedgerEntry | null> {
    if (this.redis) {
      const raw = await this.redis.get(`${REDIS_PREFIX}${key}`);
      if (!raw) return null;
      return JSON.parse(raw) as LedgerEntry;
    }
    return this.mem.get(key) ?? null;
  }

  async setEntry(key: string, entry: LedgerEntry): Promise<void> {
    if (this.redis) {
      await this.redis.set(`${REDIS_PREFIX}${key}`, JSON.stringify(entry));
      return;
    }
    this.mem.set(key, entry);
  }

  /**
   * Adds credits to the entry for `key`, creating the entry if necessary.
   */
  async addCredits(key: string, credits: number): Promise<void> {
    const now = Date.now();
    const existing = await this.getEntry(key);
    await this.setEntry(key, {
      credits: (existing?.credits ?? 0) + credits,
      totalCalls: existing?.totalCalls ?? 0,
      createdAt: existing?.createdAt ?? now,
      lastSeen: now,
    });
  }

  /**
   * Attempts to deduct `amount` credits from the entry for `key`.
   * Also increments totalCalls and updates lastSeen on success.
   * Returns `{ success: false }` if credits are insufficient.
   */
  async deductCredit(
    key: string,
    amount: number
  ): Promise<{ success: boolean; remaining: number }> {
    const existing = await this.getEntry(key);
    const current = existing?.credits ?? 0;

    if (current < amount) {
      return { success: false, remaining: current };
    }

    const now = Date.now();
    await this.setEntry(key, {
      credits: current - amount,
      totalCalls: (existing?.totalCalls ?? 0) + 1,
      createdAt: existing?.createdAt ?? now,
      lastSeen: now,
    });

    return { success: true, remaining: current - amount };
  }

  /** Returns aggregate stats across all tracked keys. */
  async stats(): Promise<{ keys: number; totalCalls: number }> {
    if (this.redis) {
      const keys = await this.redis.keys(`${REDIS_PREFIX}*`);
      let totalCalls = 0;
      for (const k of keys) {
        const raw = await this.redis.get(k);
        if (raw) {
          const entry = JSON.parse(raw) as LedgerEntry;
          totalCalls += entry.totalCalls;
        }
      }
      return { keys: keys.length, totalCalls };
    }

    let totalCalls = 0;
    for (const entry of this.mem.values()) {
      totalCalls += entry.totalCalls;
    }
    return { keys: this.mem.size, totalCalls };
  }
}

/** Singleton ledger instance. */
export const ledger = new CreditLedger();
