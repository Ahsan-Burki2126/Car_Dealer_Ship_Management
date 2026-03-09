/**
 * Cloud Sync Service
 * Handles delta-based synchronization between local SQLite and remote PostgreSQL.
 * Uses sync_log table to track changes and synced flags on entity tables.
 */

interface SyncConfig {
  apiUrl: string;
  apiKey: string;
  enabled: boolean;
}

interface SyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
}

const SYNC_TABLES = [
  "users",
  "vehicles",
  "vehicle_expenses",
  "customers",
  "sales",
  "installments",
  "payments",
  "showroom_expenses",
  "inspections",
  "inspection_items",
  "damage_map",
  "audit_logs",
];

export class CloudSyncService {
  private config: SyncConfig;
  private db: any;

  constructor(db: any, config: SyncConfig) {
    this.db = db;
    this.config = config;
  }

  async sync(): Promise<SyncResult> {
    if (!this.config.enabled) {
      return { pushed: 0, pulled: 0, errors: ["Sync is disabled"] };
    }

    const result: SyncResult = { pushed: 0, pulled: 0, errors: [] };

    try {
      // Phase 1: Push local changes to cloud
      const pushResult = await this.pushChanges();
      result.pushed = pushResult.count;
      result.errors.push(...pushResult.errors);

      // Phase 2: Pull remote changes
      const pullResult = await this.pullChanges();
      result.pulled = pullResult.count;
      result.errors.push(...pullResult.errors);
    } catch (err: any) {
      result.errors.push(`Sync failed: ${err.message}`);
    }

    return result;
  }

  private async pushChanges(): Promise<{ count: number; errors: string[] }> {
    let count = 0;
    const errors: string[] = [];

    for (const table of SYNC_TABLES) {
      try {
        // Get unsynced records
        const unsyncedRows = this.db
          .prepare(`SELECT * FROM ${table} WHERE synced = 0`)
          .all();

        if (unsyncedRows.length === 0) continue;

        // Push batch to cloud
        const response = await fetch(`${this.config.apiUrl}/sync/push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({ table, rows: unsyncedRows }),
        });

        if (!response.ok) {
          errors.push(`Failed to push ${table}: ${response.statusText}`);
          continue;
        }

        // Mark as synced
        const ids = unsyncedRows.map((r: any) => r.id);
        const placeholders = ids.map(() => "?").join(",");
        this.db
          .prepare(
            `UPDATE ${table} SET synced = 1 WHERE id IN (${placeholders})`,
          )
          .run(...ids);

        count += unsyncedRows.length;

        // Log sync
        this.db
          .prepare(
            `INSERT INTO sync_log (id, entity_type, entity_id, action, synced_at) VALUES (?, ?, ?, 'push', datetime('now'))`,
          )
          .run(crypto.randomUUID(), table, "batch");
      } catch (err: any) {
        errors.push(`Error pushing ${table}: ${err.message}`);
      }
    }

    return { count, errors };
  }

  private async pullChanges(): Promise<{ count: number; errors: string[] }> {
    let count = 0;
    const errors: string[] = [];

    try {
      // Get last sync timestamp
      const lastSync = this.db
        .prepare(
          `SELECT MAX(synced_at) as last_sync FROM sync_log WHERE action = 'pull'`,
        )
        .get();

      const since = lastSync?.last_sync || "1970-01-01T00:00:00Z";

      const response = await fetch(
        `${this.config.apiUrl}/sync/pull?since=${encodeURIComponent(since)}`,
        {
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
        },
      );

      if (!response.ok) {
        errors.push(`Failed to pull: ${response.statusText}`);
        return { count, errors };
      }

      const data = (await response.json()) as {
        changes?: Record<string, any[]>;
      };

      // Apply changes using upsert for each table
      for (const [table, rows] of Object.entries(data.changes || {})) {
        if (!SYNC_TABLES.includes(table)) continue;

        const tableRows = rows as any[];
        for (const row of tableRows) {
          try {
            const columns = Object.keys(row);
            const values = Object.values(row);
            const placeholders = columns.map(() => "?").join(",");
            const updateSet = columns
              .map((c) => `${c} = excluded.${c}`)
              .join(",");

            this.db
              .prepare(
                `INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})
               ON CONFLICT(id) DO UPDATE SET ${updateSet}`,
              )
              .run(...values);
            count++;
          } catch (err: any) {
            errors.push(`Error applying row in ${table}: ${err.message}`);
          }
        }
      }

      // Log pull
      this.db
        .prepare(
          `INSERT INTO sync_log (id, entity_type, entity_id, action, synced_at) VALUES (?, 'all', 'pull', 'pull', datetime('now'))`,
        )
        .run(crypto.randomUUID());
    } catch (err: any) {
      errors.push(`Pull failed: ${err.message}`);
    }

    return { count, errors };
  }

  getLastSyncTime(): string | null {
    const row = this.db
      .prepare(`SELECT MAX(synced_at) as last_sync FROM sync_log`)
      .get();
    return row?.last_sync || null;
  }

  getSyncStatus(): { pending: number; lastSync: string | null } {
    let pending = 0;
    for (const table of SYNC_TABLES) {
      try {
        const row = this.db
          .prepare(`SELECT COUNT(*) as cnt FROM ${table} WHERE synced = 0`)
          .get();
        pending += row?.cnt || 0;
      } catch {
        // Table might not have synced column
      }
    }
    return { pending, lastSync: this.getLastSyncTime() };
  }
}
