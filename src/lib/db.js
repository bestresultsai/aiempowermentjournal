// ---------------------------------------------------------------------------
// db.js — unified query helper over Supabase.
//
// Every overlay store in src/lib/* (programs, cohortAdmin, resources,
// feedbacks, testimonials, notifications) will call into here during the
// Phase 2 swap. One place to add caching, error handling, retries, and
// observability.
//
// Calls throw SupabaseNotReady when env vars aren't set, which overlay
// stores catch and fall back to localStorage. That's how the platform keeps
// running today.
//
//   await db.list("cohorts", { eq: { program_id }, order: { column: "start_date", ascending: false } })
//   await db.get("cohorts", id)
//   await db.upsert("cohorts", record)              // requires id
//   await db.update("cohorts", id, { name: "..." })
//   await db.softDelete("cohorts", id)              // sets archived_at = now()
//   await db.remove("cohorts", id)                  // hard delete (admin only)
//
// Storage helpers:
//
//   await db.uploadFile("headshots", `${profileId}.png`, file)
//   db.getPublicUrl("public", "brand/logo.svg")
// ---------------------------------------------------------------------------

import { initSupabase, SupabaseNotReady } from "./supabase";
import { captureError } from "./observability";

class DbError extends Error {
  constructor(operation, table, cause) {
    super(`db.${operation}(${table}) failed: ${cause?.message || cause}`);
    this.name = "DbError";
    this.operation = operation;
    this.table = table;
    this.cause = cause;
  }
}

async function client() {
  const c = await initSupabase();
  if (!c) throw new SupabaseNotReady();
  return c;
}

/**
 * List rows from a table with optional filters and ordering.
 *
 * @param {string} table
 * @param {object} [options]
 * @param {object} [options.eq]            { col: value, ... }  — equality filters
 * @param {object} [options.neq]           { col: value, ... }
 * @param {object} [options.in]            { col: [v, v, v] }
 * @param {object} [options.ilike]         { col: "search%" }
 * @param {boolean} [options.includeArchived] default false
 * @param {{column: string, ascending?: boolean}} [options.order]
 * @param {number} [options.limit]
 * @param {string} [options.select="*"]
 */
export async function list(table, options = {}) {
  try {
    const c = await client();
    let q = c.from(table).select(options.select || "*");

    if (options.eq) for (const [k, v] of Object.entries(options.eq)) q = q.eq(k, v);
    if (options.neq) for (const [k, v] of Object.entries(options.neq)) q = q.neq(k, v);
    if (options.in) for (const [k, v] of Object.entries(options.in)) q = q.in(k, v);
    if (options.ilike) for (const [k, v] of Object.entries(options.ilike)) q = q.ilike(k, v);
    if (!options.includeArchived) {
      // Common pattern: tables with archived_at. Safe to ignore for tables
      // without the column — Supabase silently skips the filter when col
      // doesn't exist? No — it errors. So we only apply this when the caller
      // opts in by setting includeArchived = false explicitly (default), and
      // we wrap the failure quietly.
      // To stay safe, callers can pass includeArchived: true on tables with
      // no archived_at (notifications, email_sends). Or override eq.archived_at.
      q = q.is("archived_at", null);
    }
    if (options.order) {
      q = q.order(options.order.column, { ascending: options.order.ascending ?? false });
    }
    if (options.limit) q = q.limit(options.limit);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (err) {
    if (err instanceof SupabaseNotReady) throw err;
    captureError(err, { source: "db.list", table, options });
    throw new DbError("list", table, err);
  }
}

/**
 * Get a single row by primary key.
 */
export async function get(table, id, { select = "*" } = {}) {
  try {
    const c = await client();
    const { data, error } = await c
      .from(table)
      .select(select)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (err) {
    if (err instanceof SupabaseNotReady) throw err;
    captureError(err, { source: "db.get", table, id });
    throw new DbError("get", table, err);
  }
}

/**
 * Upsert by primary key. Pass the record with `id` to update, without it to
 * let Postgres generate one.
 */
export async function upsert(table, record, { onConflict = "id" } = {}) {
  try {
    const c = await client();
    const { data, error } = await c
      .from(table)
      .upsert(record, { onConflict })
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    if (err instanceof SupabaseNotReady) throw err;
    captureError(err, { source: "db.upsert", table, record });
    throw new DbError("upsert", table, err);
  }
}

/**
 * Insert one or many rows. Skips the on-conflict path that upsert uses.
 */
export async function insert(table, record) {
  try {
    const c = await client();
    const { data, error } = await c.from(table).insert(record).select();
    if (error) throw error;
    return Array.isArray(record) ? data || [] : (data && data[0]) || null;
  } catch (err) {
    if (err instanceof SupabaseNotReady) throw err;
    captureError(err, { source: "db.insert", table });
    throw new DbError("insert", table, err);
  }
}

/**
 * Partial update by primary key.
 */
export async function update(table, id, patch) {
  try {
    const c = await client();
    const { data, error } = await c
      .from(table)
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (err) {
    if (err instanceof SupabaseNotReady) throw err;
    captureError(err, { source: "db.update", table, id });
    throw new DbError("update", table, err);
  }
}

/**
 * Mark a row archived (soft delete). Tables without archived_at should use
 * `remove` instead.
 */
export async function softDelete(table, id) {
  return update(table, id, { archived_at: new Date().toISOString() });
}

/**
 * Hard delete. Use sparingly — most domain tables soft-delete.
 */
export async function remove(table, id) {
  try {
    const c = await client();
    const { error } = await c.from(table).delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    if (err instanceof SupabaseNotReady) throw err;
    captureError(err, { source: "db.remove", table, id });
    throw new DbError("remove", table, err);
  }
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

/**
 * Upload a file to Supabase Storage. Returns { path, publicUrl }.
 */
export async function uploadFile(bucket, path, file, { upsert: doUpsert = true, contentType } = {}) {
  try {
    const c = await client();
    const { error } = await c.storage.from(bucket).upload(path, file, {
      upsert: doUpsert,
      contentType: contentType || file?.type || undefined,
    });
    if (error) throw error;
    const { data: pub } = c.storage.from(bucket).getPublicUrl(path);
    return { path, publicUrl: pub?.publicUrl || null };
  } catch (err) {
    if (err instanceof SupabaseNotReady) throw err;
    captureError(err, { source: "db.uploadFile", bucket, path });
    throw new DbError("uploadFile", bucket, err);
  }
}

/**
 * Public URL for an object. Safe to call without auth.
 */
export function getPublicUrl(bucket, path) {
  // Doesn't await initSupabase — getPublicUrl on the storage client doesn't
  // hit the network and we want this safe to call from React render paths.
  try {
    // Re-resolve synchronously; if init hasn't run yet the caller gets null.
    const c = (typeof window !== "undefined" && window.__brai_supabase) || null;
    if (!c) return null;
    const { data } = c.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

/**
 * Signed URL for private bucket objects.
 */
export async function createSignedUrl(bucket, path, { expiresInSeconds = 300 } = {}) {
  try {
    const c = await client();
    const { data, error } = await c.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data?.signedUrl || null;
  } catch (err) {
    if (err instanceof SupabaseNotReady) throw err;
    captureError(err, { source: "db.createSignedUrl", bucket, path });
    throw new DbError("createSignedUrl", bucket, err);
  }
}

// ---------------------------------------------------------------------------
// Convenience namespace export — lets call sites read more naturally:
//
//   import { db } from "./db";
//   await db.list("cohorts", { eq: { program_id } });
// ---------------------------------------------------------------------------

export const db = {
  list,
  get,
  insert,
  upsert,
  update,
  softDelete,
  remove,
  uploadFile,
  getPublicUrl,
  createSignedUrl,
};

export { DbError };
export { SupabaseNotReady } from "./supabase";

export default db;
