// ---------------------------------------------------------------------------
// Programs catalog.
//
// A program is the curriculum template a cohort runs. Each program has:
//   code         — short identifier used in cohort names + internal references
//   name         — human-readable program name (shown in forms / facing copy)
//   methodName   — the umbrella framework label
//   sessionsCount — number of sessions (currently 8 for all; reserved for
//                  programs that may have different lengths later)
//
// When real Notion data ships, replace this static array with a Notion query.
// ---------------------------------------------------------------------------

export const PROGRAMS = [
  {
    code: "AIEW3",
    name: "AI Empowerment Workshop Series 3.0",
    methodName: "AI Empowerment Method",
    sessionsCount: 8,
  },
  {
    code: "APFW",
    name: "AI Power Foundations Workshop",
    methodName: "AI Empowerment Method",
    sessionsCount: 8,
  },
];

export function getProgramByCode(code) {
  return PROGRAMS.find((p) => p.code === code) || null;
}
