// ---------------------------------------------------------------------------
// Display helpers for cases where we know a user's email but not their name.
//
// Used by the WelcomeWizard so that signing in with only an email still gives
// us a reasonable greeting + a pre-filled name field the user can confirm.
//
// Conservative on purpose: only derive a name when the email's local part has
// a clear separator (".", "_", "+", "-"). Single-token locals like "jdoe" or
// "josueacuna" return null so we don't guess wrong.
// ---------------------------------------------------------------------------

// "josue.acuna@me.com"  → "Josue Acuna"
// "josue_acuna@me.com"  → "Josue Acuna"
// "josueacuna@me.com"   → null
// "jdoe@foo.com"        → null
// "jane.smith2@x.com"   → "Jane Smith"
export function deriveFullNameFromEmail(email) {
  if (!email || typeof email !== "string") return null;
  const local = (email.split("@")[0] || "").trim();
  if (!local) return null;
  // Bail out if there's no separator — we can't safely split a name out.
  if (!/[._\-+]/.test(local)) return null;
  const parts = local
    .split(/[._+\-0-9]/)
    .filter(Boolean)
    .filter((p) => p.length >= 2 && /^[a-z]+$/i.test(p))
    .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase());
  if (parts.length === 0) return null;
  return parts.slice(0, 2).join(" ");
}

// Just the first name, or null when we can't derive one safely.
export function deriveFirstNameFromEmail(email) {
  const full = deriveFullNameFromEmail(email);
  return full ? full.split(" ")[0] : null;
}

// Best-effort initials for an avatar bubble.
//   1) From the user's name when set
//   2) Otherwise from a derived email name
//   3) Otherwise first letter of the email
//   4) Otherwise "?"
export function getInitialsForUser({ name, email } = {}) {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }
  const derived = deriveFullNameFromEmail(email);
  if (derived) {
    return derived
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }
  if (email && typeof email === "string") {
    const ch = email.trim()[0];
    if (ch) return ch.toUpperCase();
  }
  return "?";
}
