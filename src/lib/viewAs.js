import { useEffect, useState } from "react";
import { userCapabilities, ROLES } from "./adminRoles";

// ---------------------------------------------------------------------------
// View-as — lets elevated users preview the platform as a lower role.
//
// Reads/writes a single localStorage key. The value is one of the role keys
// in VIEW_AS_ROLES, or null when no view-as is active.
//
// Helpers:
//   useViewAs(user)         — reactive hook returning { mode, set, clear,
//                             availableRoles, effectiveRole }
//   getViewAsMode()         — sync read (e.g. for routing decisions)
//   setViewAsMode(mode)     — sync write (e.g. from dropdown menu)
//
// Available "view as" roles depend on what the user's actual capabilities
// allow them to step down to:
//   - Super: participant, facilitator, org-admin, admin
//   - Admin: participant, facilitator, org-admin
//   - Org Admin: participant, facilitator
//   - Facilitator: participant
//   - Participant: none
//
// We never let a user view as a role *above* their own.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "brai_view_as";
const CHANGE_EVENT = "brai-view-as-changed";

// The roles a user can preview, in display order. Keep in sync with the
// avatar-dropdown options.
export const VIEW_AS_ROLES = ["participant", "facilitator", "org", "admin"];

// Pretty labels (used in the banner + dropdown).
export const VIEW_AS_LABELS = {
  participant: "Participant",
  facilitator: "Facilitator",
  org: "Org Admin",
  admin: "Admin",
};

// Sync getter — also used by routing.
export function getViewAsMode() {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return VIEW_AS_ROLES.includes(v) ? v : null;
  } catch {
    return null;
  }
}

export function setViewAsMode(mode) {
  if (typeof window === "undefined") return;
  try {
    if (!mode) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else if (VIEW_AS_ROLES.includes(mode)) {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } else {
      return;
    }
    // Fan-out so every component using useViewAs() re-reads.
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* ignore — quota / private mode */
  }
}

// ---------------------------------------------------------------------------
// What roles can THIS user step down to?
//
// The model has two parallel ladders:
//
//   INTERNAL (BRAI staff):  Super → Admin → Facilitator
//   EXTERNAL (clients):     Org Admin → Participant
//
// Rules:
//   1. You can preview any role below you on your own ladder
//   2. Internal staff (Super, Admin, Facilitator) can additionally preview
//      external roles for QA — they need to be able to see what their
//      customers experience
//   3. External users (Org Admin, Participant) CANNOT preview internal
//      roles — Org Admin shouldn't see how BRAI runs internally
//   4. Subtract roles the user already has as a capability — no point
//      previewing what you ARE
// ---------------------------------------------------------------------------
export function availableViewAsRoles(user) {
  if (!user) return [];
  const caps = userCapabilities(user);
  const out = new Set();

  // Rule 1+2: anyone elevated can preview Participant (the most universal
  // role to QA — internal staff need to see what learners see, and Org
  // Admins need to see what their own teammates see).
  if (
    caps.has(ROLES.SUPER) ||
    caps.has(ROLES.ADMIN) ||
    caps.has(ROLES.FACILITATOR) ||
    caps.has(ROLES.ORG)
  ) {
    out.add("participant");
  }
  // Rule 2: Internal staff (Super + Admin) can preview Org Admin to QA the
  // customer-admin experience. Facilitators don't need this — they don't
  // own customer-side workflows.
  if (caps.has(ROLES.SUPER) || caps.has(ROLES.ADMIN)) {
    out.add("org");
  }
  // Rule 1: Super + Admin can preview Facilitator (internal step-down).
  if (caps.has(ROLES.SUPER) || caps.has(ROLES.ADMIN)) {
    out.add("facilitator");
  }
  // Rule 1: Super can preview Admin (top of the internal ladder).
  if (caps.has(ROLES.SUPER)) {
    out.add("admin");
  }

  // Rule 4: never offer "view as <role you already have>".
  for (const cap of caps) {
    out.delete(cap);
  }

  return VIEW_AS_ROLES.filter((r) => out.has(r));
}

// ---------------------------------------------------------------------------
// useViewAs() — reactive hook.
// ---------------------------------------------------------------------------
export function useViewAs(user) {
  const [mode, setMode] = useState(getViewAsMode);

  useEffect(() => {
    function onChange() {
      setMode(getViewAsMode());
    }
    window.addEventListener(CHANGE_EVENT, onChange);
    // Cross-tab.
    function onStorage(e) {
      if (!e.key || e.key === STORAGE_KEY) onChange();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const availableRoles = availableViewAsRoles(user);

  // If the user can't view-as the persisted value (e.g. they signed out as
  // admin then back in as participant), silently clear it.
  useEffect(() => {
    if (mode && !availableRoles.includes(mode)) {
      setViewAsMode(null);
    }
  }, [mode, availableRoles]);

  function set(next) {
    setViewAsMode(next || null);
  }

  function clear() {
    setViewAsMode(null);
  }

  // The role we should treat the user as for routing / UI decisions.
  // When mode is set, that wins; otherwise their highest real role.
  const effectiveRole = mode || primaryEffectiveRole(user);

  return { mode, set, clear, availableRoles, effectiveRole };
}

// ---------------------------------------------------------------------------
// Primary role resolution.
//
// `user.role` is an explicit field representing the user's IDENTITY (what
// their job is), distinct from `capabilities` which is what they can DO.
//
// The platform respects user.role when it's set. When it isn't (legacy
// records, freshly-created users without a role), we fall back to the same
// identity-first priority the AdminUserNew form uses by default.
//
// Identity roles vs power roles:
//   - Identity: facilitator, org, participant, cohort-leader
//     (these describe what someone IS)
//   - Power: admin, super
//     (these describe what someone CAN DO on top of an identity)
//
// Mike (capabilities: facilitator + admin) → primary = facilitator
// Pure admin (capabilities: admin) → primary = admin
// Pure org admin (capabilities: org) → primary = org
// ---------------------------------------------------------------------------

const KNOWN_ROLES = new Set([
  "super",
  "admin",
  "org",
  "facilitator",
  "cohort-leader",
  "participant",
]);

// Compute the default primary role from a capability list. Identity-laden
// capabilities win over power capabilities; among identity roles, facilitator
// outranks org outranks cohort-leader outranks participant.
export function defaultPrimaryRole(capabilities) {
  const caps = Array.isArray(capabilities) ? capabilities : [...capabilities];
  // Identity roles first.
  if (caps.includes("facilitator")) return "facilitator";
  if (caps.includes("org")) return "org";
  if (caps.includes("cohort-leader")) return "cohort-leader";
  if (caps.includes("participant")) return "participant";
  // Power roles next.
  if (caps.includes("super")) return "super";
  if (caps.includes("admin")) return "admin";
  return "participant";
}

export function primaryEffectiveRole(user) {
  if (!user) return null;
  // Prefer the explicit primary role when set — it represents the user's
  // job/identity. The capability list says what they CAN do, not what they
  // ARE.
  if (user.role && KNOWN_ROLES.has(user.role)) {
    return user.role;
  }
  // Fallback: derive from capabilities using the identity-first heuristic.
  return defaultPrimaryRole([...userCapabilities(user)]);
}

// Where should this role land when they click "Home"? Used by NavBar and
// the role-aware /home route.
export function homePathForRole(role) {
  switch (role) {
    case "super":
    case "admin":
      return "/admin";
    case "org":
      return "/org/home";
    case "facilitator":
      return "/facilitator/home";
    case "cohort-leader":
    case "participant":
    default:
      return "/home";
  }
}
