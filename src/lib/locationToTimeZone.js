// ---------------------------------------------------------------------------
// Location → IANA time zone mapping.
//
// Used by the onboarding wizard + admin user forms to derive a sensible
// default time zone from (country, state). The derived value is editable —
// participants can always override before saving.
//
// Why state-level (not city)? Time zone rules are state-level in the US
// (with a handful of split-state exceptions we ignore for the demo). Going
// city-level would require a real geocoder; not worth it now.
//
// Returns an IANA zone id ("America/New_York"). When the (country, state)
// combo is unknown we fall back to America/New_York for US, and a sensible
// per-country default otherwise.
// ---------------------------------------------------------------------------

const DEFAULT = "America/New_York";

// United States — covers all 50 states + DC + PR + territories.
// Split states (e.g. Florida, Tennessee, Texas) are mapped to their
// majority-population zone; the wizard surfaces an override link.
const US_STATE_TZ = {
  AL: "America/Chicago",
  AK: "America/Anchorage",
  AZ: "America/Phoenix",           // no DST
  AR: "America/Chicago",
  CA: "America/Los_Angeles",
  CO: "America/Denver",
  CT: "America/New_York",
  DE: "America/New_York",
  DC: "America/New_York",
  FL: "America/New_York",          // most of FL; panhandle is Central
  GA: "America/New_York",
  HI: "Pacific/Honolulu",
  ID: "America/Boise",             // most of ID; northern panhandle is Pacific
  IL: "America/Chicago",
  IN: "America/Indiana/Indianapolis",
  IA: "America/Chicago",
  KS: "America/Chicago",           // most of KS; far west is Mountain
  KY: "America/New_York",          // most of KY; western tip is Central
  LA: "America/Chicago",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  MI: "America/Detroit",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  MT: "America/Denver",
  NE: "America/Chicago",           // most of NE; far west is Mountain
  NV: "America/Los_Angeles",
  NH: "America/New_York",
  NJ: "America/New_York",
  NM: "America/Denver",
  NY: "America/New_York",
  NC: "America/New_York",
  ND: "America/Chicago",           // most of ND
  OH: "America/New_York",
  OK: "America/Chicago",
  OR: "America/Los_Angeles",       // most of OR; far east is Mountain
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  SD: "America/Chicago",           // most of SD
  TN: "America/Chicago",           // most of TN; east is Eastern
  TX: "America/Chicago",           // most of TX; far west is Mountain
  UT: "America/Denver",
  VT: "America/New_York",
  VA: "America/New_York",
  WA: "America/Los_Angeles",
  WV: "America/New_York",
  WI: "America/Chicago",
  WY: "America/Denver",
  // Territories
  PR: "America/Puerto_Rico",
  VI: "America/St_Thomas",
  GU: "Pacific/Guam",
  AS: "Pacific/Pago_Pago",
  MP: "Pacific/Saipan",
};

// Canada (most populous zone per province).
const CA_PROVINCE_TZ = {
  AB: "America/Edmonton",
  BC: "America/Vancouver",
  MB: "America/Winnipeg",
  NB: "America/Moncton",
  NL: "America/St_Johns",
  NS: "America/Halifax",
  NT: "America/Yellowknife",
  NU: "America/Iqaluit",
  ON: "America/Toronto",
  PE: "America/Halifax",
  QC: "America/Toronto",          // Most of QC observes Eastern
  SK: "America/Regina",
  YT: "America/Whitehorse",
};

// Default country zone (one each, ignoring intra-country splits).
const COUNTRY_DEFAULT_TZ = {
  US: DEFAULT,
  CA: "America/Toronto",
  MX: "America/Mexico_City",
  GB: "Europe/London",
  IE: "Europe/Dublin",
  FR: "Europe/Paris",
  DE: "Europe/Berlin",
  ES: "Europe/Madrid",
  IT: "Europe/Rome",
  NL: "Europe/Amsterdam",
  CH: "Europe/Zurich",
  SE: "Europe/Stockholm",
  NO: "Europe/Oslo",
  DK: "Europe/Copenhagen",
  FI: "Europe/Helsinki",
  PT: "Europe/Lisbon",
  PL: "Europe/Warsaw",
  AU: "Australia/Sydney",
  NZ: "Pacific/Auckland",
  JP: "Asia/Tokyo",
  KR: "Asia/Seoul",
  CN: "Asia/Shanghai",
  HK: "Asia/Hong_Kong",
  SG: "Asia/Singapore",
  IN: "Asia/Kolkata",
  AE: "Asia/Dubai",
  IL: "Asia/Jerusalem",
  BR: "America/Sao_Paulo",
  AR: "America/Argentina/Buenos_Aires",
  CL: "America/Santiago",
  CO: "America/Bogota",
  PE: "America/Lima",
  ZA: "Africa/Johannesburg",
};

// ---------------------------------------------------------------------------
// Lookup data for the dropdowns in the onboarding wizard.
// Format chosen so it plugs straight into the branded Select component.
// ---------------------------------------------------------------------------

export const COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "MX", label: "Mexico" },
  { value: "GB", label: "United Kingdom" },
  { value: "IE", label: "Ireland" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "NL", label: "Netherlands" },
  { value: "CH", label: "Switzerland" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "PT", label: "Portugal" },
  { value: "PL", label: "Poland" },
  { value: "AU", label: "Australia" },
  { value: "NZ", label: "New Zealand" },
  { value: "JP", label: "Japan" },
  { value: "KR", label: "South Korea" },
  { value: "CN", label: "China" },
  { value: "HK", label: "Hong Kong" },
  { value: "SG", label: "Singapore" },
  { value: "IN", label: "India" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "IL", label: "Israel" },
  { value: "BR", label: "Brazil" },
  { value: "AR", label: "Argentina" },
  { value: "CL", label: "Chile" },
  { value: "CO", label: "Colombia" },
  { value: "PE", label: "Peru" },
  { value: "ZA", label: "South Africa" },
];

export const US_STATE_OPTIONS = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" }, { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" }, { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" }, { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" }, { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" }, { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" }, { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" }, { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" }, { value: "PR", label: "Puerto Rico" },
];

export const CA_PROVINCE_OPTIONS = [
  { value: "AB", label: "Alberta" }, { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" }, { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland & Labrador" }, { value: "NS", label: "Nova Scotia" },
  { value: "NT", label: "Northwest Territories" }, { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" }, { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" }, { value: "SK", label: "Saskatchewan" },
  { value: "YT", label: "Yukon" },
];

// ---------------------------------------------------------------------------
// Core lookup. Returns the IANA zone id.
// ---------------------------------------------------------------------------
export function getTimeZoneForLocation({ country, state } = {}) {
  if (country === "US") {
    if (state && US_STATE_TZ[state]) return US_STATE_TZ[state];
    return DEFAULT;
  }
  if (country === "CA") {
    if (state && CA_PROVINCE_TZ[state]) return CA_PROVINCE_TZ[state];
    return COUNTRY_DEFAULT_TZ.CA;
  }
  if (country && COUNTRY_DEFAULT_TZ[country]) return COUNTRY_DEFAULT_TZ[country];
  return DEFAULT;
}

// Returns the list of state/province options for the given country, or an
// empty array if we don't expose a subdivision selector for that country.
export function getStateOptionsForCountry(country) {
  if (country === "US") return US_STATE_OPTIONS;
  if (country === "CA") return CA_PROVINCE_OPTIONS;
  return [];
}

// Human-friendly label for a location, e.g. "Austin, TX" or "London, United
// Kingdom". Used in cards + profile headers.
export function formatLocation({ city, state, country } = {}) {
  const parts = [];
  if (city) parts.push(city);
  // For US/CA show the state code; for other countries show the country.
  if (country === "US" || country === "CA") {
    if (state) parts.push(state);
  } else if (country) {
    const c = COUNTRY_OPTIONS.find((o) => o.value === country);
    if (c) parts.push(c.label);
  }
  return parts.join(", ");
}
