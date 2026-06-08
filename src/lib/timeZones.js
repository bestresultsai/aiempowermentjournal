// ---------------------------------------------------------------------------
// Curated time zones used across the admin panel + profile settings.
//
// Grouped so a dropdown can render <optgroup> labels. Picks the zones that
// cover where our facilitators and participants actually run cohorts. Extend
// as the program expands.
// ---------------------------------------------------------------------------

export const TIME_ZONES = [
  { group: "US",            value: "America/New_York",     label: "Eastern (New York)" },
  { group: "US",            value: "America/Chicago",      label: "Central (Chicago)" },
  { group: "US",            value: "America/Denver",       label: "Mountain (Denver)" },
  { group: "US",            value: "America/Los_Angeles",  label: "Pacific (Los Angeles)" },
  { group: "US",            value: "America/Phoenix",      label: "Arizona (Phoenix)" },
  { group: "Americas",      value: "America/Mexico_City",  label: "Mexico City" },
  { group: "Americas",      value: "America/Sao_Paulo",    label: "São Paulo" },
  { group: "Europe",        value: "Europe/London",        label: "London" },
  { group: "Europe",        value: "Europe/Berlin",        label: "Central Europe (Berlin)" },
  { group: "Europe",        value: "Europe/Madrid",        label: "Madrid" },
  { group: "Middle East",   value: "Asia/Dubai",           label: "Dubai" },
  { group: "Asia",          value: "Asia/Singapore",       label: "Singapore" },
  { group: "Asia",          value: "Asia/Tokyo",           label: "Tokyo" },
  { group: "Australia",     value: "Australia/Sydney",     label: "Sydney" },
  { group: "Other",         value: "UTC",                  label: "UTC" },
];

export function groupTimeZones() {
  const groups = {};
  for (const z of TIME_ZONES) {
    if (!groups[z.group]) groups[z.group] = [];
    groups[z.group].push(z);
  }
  return Object.entries(groups);
}

export function guessLocalTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}
