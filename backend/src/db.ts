import pg from "pg";
import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

try {
  const dotenv = await import("dotenv");
  dotenv?.default?.config?.();
} catch {
  // In docker-compose / production we rely on process.env.
}

const { Pool: PgPool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/freegull_flow";

export const pool: Pool = new PgPool({
  connectionString,
});

/**
 * Wrap every top-level pool.query in a transaction that pins
 * `search_path = public` for the connection. We override `pool.query`
 * directly so existing call sites (and consumers in `apps/api`) continue to
 * work, while still benefiting from the schema-pinning behaviour.
 *
 * The cast to `typeof pool.query` is needed because we forward a single
 * dynamic argument list to one of `pg`'s many overloads.
 */
const originalQuery = pool.query.bind(pool);

pool.query = (async (...args: unknown[]) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path TO public");
    const result = await (client.query as (...a: unknown[]) => Promise<unknown>)(
      ...args
    );
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Swallow rollback failures so we surface the original error.
    }
    throw error;
  } finally {
    client.release();
  }
}) as typeof pool.query;

void originalQuery; // retained for potential future use; intentional no-op reference

/**
 * Run an async function inside a database transaction with `search_path` pinned
 * to `public`. The provided callback receives a checked-out client and may run
 * any number of queries; the transaction is committed on success and rolled
 * back on any thrown error.
 */
export async function withTx<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path TO public");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type { Pool, PoolClient, QueryResult, QueryResultRow };
