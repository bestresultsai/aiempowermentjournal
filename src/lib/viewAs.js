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
// We let users step down to any role whose default capabilities are a strict
// subset of theirs. The simple heuristic below is correct for our role
// model today.
// ---------------------------------------------------------------------------
export function availableViewAsRoles(user) {
  if (!user) return [];
  const caps = userCapabilities(user);
  const out = new Set();

  // Anyone with elevated capabilities can preview as participant.
  if (
    caps.has(ROLES.SUPER) ||
    caps.has(ROLES.ADMIN) ||
    caps.has(ROLES.ORG) ||
    caps.has(ROLES.FACILITATOR)
  ) {
    out.add("participant");
  }
  // Org / Admin / Super can preview as facilitator.
  if (caps.has(ROLES.SUPER) || caps.has(ROLES.ADMIN) || caps.has(ROLES.ORG)) {
    out.add("facilitator");
  }
  // Admin + Super can preview as org admin.
  if (caps.has(ROLES.SUPER) || caps.has(ROLES.ADMIN)) {
    out.add("org");
  }
  // Super only: preview as admin (because Admin still has elevated powers).
  if (caps.has(ROLES.SUPER)) {
    out.add("admin");
  }

  // Filter to the canonical order.
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

// Pick the role the UI should treat the user as when no view-as is active.
// Highest leverage wins (admin > org > facilitator > cohort-leader > participant).
export function primaryEffectiveRole(user) {
  if (!user) return null;
  const caps = userCapabilities(user);
  if (caps.has(ROLES.SUPER)) return "super";
  if (caps.has(ROLES.ADMIN)) return "admin";
  if (caps.has(ROLES.ORG)) return "org";
  if (caps.has(ROLES.FACILITATOR)) return "facilitator";
  if (caps.has("cohort-leader")) return "cohort-leader";
  return "participant";
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
