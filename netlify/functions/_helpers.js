// ---------------------------------------------------------------------------
// _helpers.js — shared utilities for the BestResults.AI Netlify Functions.
//
// Two Supabase clients live in here:
//
//   getAdminClient()   — uses SUPABASE_SECRET_KEY, bypasses RLS. Use for the
//                        privileged operations (creating auth users,
//                        inserting profile rows, logging email_sends).
//
//   getUserClient(jwt) — uses VITE_SUPABASE_PUBLISHABLE_KEY + the caller's
//                        access-token JWT. Used to identify WHO is calling
//                        the function so we can authorize.
//
// requireAdmin(event) is the gatekeeper: it pulls the Authorization header,
// asks Supabase who that token belongs to, looks up their profile, and
// returns the auth user if they have an `admin` or `super` capability.
// Throws an HttpError otherwise.
// ---------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || null;
  }
}

export function ok(body) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function bad(err) {
  const status = err instanceof HttpError ? err.status : 500;
  const payload = {
    error: err.message || "Internal error",
    details: err.details || undefined,
  };
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

// ---------------------------------------------------------------------------
// Supabase clients
// ---------------------------------------------------------------------------

let _adminClient = null;
export function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new HttpError(500, "Supabase admin credentials are not configured.");
  }
  if (!_adminClient) {
    _adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _adminClient;
}

export function getUserClient(jwt) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new HttpError(500, "Supabase user credentials are not configured.");
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : undefined,
  });
}

// ---------------------------------------------------------------------------
// Auth — verify the caller is an authenticated admin/super.
// ---------------------------------------------------------------------------

export async function requireAdmin(event) {
  const auth = event?.headers?.authorization || event?.headers?.Authorization;
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    throw new HttpError(401, "Missing Authorization Bearer token.");
  }
  const jwt = auth.slice("bearer ".length).trim();
  if (!jwt) throw new HttpError(401, "Empty Bearer token.");

  const client = getUserClient(jwt);
  const { data, error } = await client.auth.getUser(jwt);
  if (error || !data?.user) {
    throw new HttpError(401, "Invalid or expired token.");
  }
  const authUser = data.user;

  // Look up the caller's profile to check capabilities. Use the admin
  // client so RLS doesn't get in the way of the gatekeeping check.
  const admin = getAdminClient();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, email, capabilities")
    .eq("id", authUser.id)
    .maybeSingle();
  if (profileErr) {
    throw new HttpError(500, "Failed to load profile for auth check.", profileErr.message);
  }
  if (!profile) {
    throw new HttpError(403, "No profile for caller.");
  }
  const caps = Array.isArray(profile.capabilities) ? profile.capabilities : [];
  if (!caps.includes("admin") && !caps.includes("super")) {
    throw new HttpError(403, "Admin or super capability required.");
  }
  return { authUser, profile };
}

// requireAuthenticated — like requireAdmin but only asserts a valid Supabase
// session, not any specific capability. Used for user-lifecycle transactional
// emails (onboarding-confirmed, homework-reviewed, new-homework-submitted,
// belt-earned) that a participant fires from their own session as part of
// completing an action. Callers should independently verify the recipient
// makes sense for the caller (e.g. self-email, or their own facilitator).
export async function requireAuthenticated(event) {
  const auth = event?.headers?.authorization || event?.headers?.Authorization;
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    throw new HttpError(401, "Missing Authorization Bearer token.");
  }
  const jwt = auth.slice("bearer ".length).trim();
  if (!jwt) throw new HttpError(401, "Empty Bearer token.");

  const client = getUserClient(jwt);
  const { data, error } = await client.auth.getUser(jwt);
  if (error || !data?.user) {
    throw new HttpError(401, "Invalid or expired token.");
  }
  const authUser = data.user;

  const admin = getAdminClient();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, email, capabilities, org_id")
    .eq("id", authUser.id)
    .maybeSingle();
  if (profileErr) {
    throw new HttpError(500, "Failed to load profile for auth check.", profileErr.message);
  }
  if (!profile) {
    throw new HttpError(403, "No profile for caller.");
  }
  return { authUser, profile };
}

// ---------------------------------------------------------------------------
// Body parser — safely parse the function event body as JSON.
// ---------------------------------------------------------------------------

export function parseJson(event) {
  if (!event?.body) return {};
  try {
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch (err) {
    throw new HttpError(400, "Invalid JSON body.", err.message);
  }
}
