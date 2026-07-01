// ---------------------------------------------------------------------------
// Session state — the canonical lifecycle of a cohort session.
//
// States (program-level, no participant context):
//
//   "upcoming"             Date is in the future. Card is preview-only.
//   "live"                 The session is HAPPENING right now (within its
//                          duration window). Show a join-Zoom CTA, pulse
//                          indicator, etc.
//   "awaiting-recording"   The session date is in the past but no video
//                          URL has been uploaded yet. Facilitator owes the
//                          recording. Participants see a "recording coming"
//                          placeholder instead of a broken video.
//   "completed"            Past date AND videoUrl is set. The session is
//                          fully available — recording, materials, homework.
//
// Participant-overlay state:
//
//   "locked"               Returned by getSessionStateForParticipant() when
//                          the program rules require a previous session to
//                          be completed first. Not used yet — reserved for
//                          a future round once we define prerequisite rules.
// ---------------------------------------------------------------------------

export const SESSION_STATES = {
  UPCOMING: "upcoming",
  LIVE: "live",
  AWAITING_RECORDING: "awaiting-recording",
  COMPLETED: "completed",
  LOCKED: "locked",
};

// UI-ready metadata for each state. Keeps every consumer using the same
// label/copy/accent and means we can swap wording globally if we want.
export const SESSION_STATE_META = {
  upcoming: {
    label: "Upcoming",
    short: "Upcoming",
    description: "Scheduled. Materials and recording open after the session.",
    pillBg: "bg-brand-50",
    pillText: "text-brand-700",
  },
  live: {
    label: "Live now",
    short: "Live",
    description: "Happening right now.",
    pillBg: "bg-rose-50",
    pillText: "text-rose-700",
  },
  "awaiting-recording": {
    label: "Awaiting recording",
    short: "Awaiting recording",
    description: "Session is over. Recording will be uploaded soon.",
    pillBg: "bg-amber-50",
    pillText: "text-amber-800",
  },
  completed: {
    label: "Completed",
    short: "Completed",
    description: "Recording and materials available.",
    pillBg: "bg-emerald-50",
    pillText: "text-emerald-700",
  },
  locked: {
    label: "Locked",
    short: "Locked",
    description: "Complete the previous session first.",
    pillBg: "bg-ink/5",
    pillText: "text-ink-muted",
  },
};

// Compute the state for a single session.
//   session: { date, durationMinutes, videoUrl, manualLockState? }
//   options.now: optional override for testing
export function getSessionState(session, { now = Date.now() } = {}) {
  if (!session?.date) return SESSION_STATES.UPCOMING;
  // Facilitator manual lock wins over any date-based state. This is the
  // "postpone / hide this session" escape hatch we surface on the
  // per-cohort session edit page.
  if (session.manualLockState === "locked") return SESSION_STATES.LOCKED;
  const start = new Date(session.date).getTime();
  if (Number.isNaN(start)) return SESSION_STATES.UPCOMING;
  const durationMs = (Number(session.durationMinutes) || 75) * 60 * 1000;
  const end = start + durationMs;

  if (now < start) return SESSION_STATES.UPCOMING;
  if (now >= start && now < end) return SESSION_STATES.LIVE;
  // Past the end of the session window.
  if (session.videoUrl) return SESSION_STATES.COMPLETED;
  return SESSION_STATES.AWAITING_RECORDING;
}

// Participant overlay — wraps the program-level state and applies the
// optional "locked" gate. Reserved for future use; today this is a
// pass-through unless `lockRule` is provided.
//
// lockRule: function(prevSession, participant) => boolean
//   Return true to mark the session locked for this participant.
//   Example: require prior homework submitted before unlocking the next.
export function getSessionStateForParticipant(session, prevSession, participant, options = {}) {
  const base = getSessionState(session, options);
  const { lockRule } = options;
  // Only "upcoming" sessions can be locked — past sessions are already done.
  if (base === SESSION_STATES.UPCOMING && prevSession && participant && lockRule) {
    if (lockRule(prevSession, participant)) return SESSION_STATES.LOCKED;
  }
  return base;
}

// Convenience — flatten a sessions array into { session, state, isNext }
// for views that want a single iteration pass. Marks the FIRST upcoming
// session with isNext: true so callers can highlight "Next live".
export function annotateSessions(sessions, options = {}) {
  let nextMarked = false;
  return (sessions || []).map((s) => {
    const state = getSessionState(s, options);
    const isNext =
      !nextMarked && (state === SESSION_STATES.UPCOMING || state === SESSION_STATES.LIVE);
    if (isNext) nextMarked = true;
    return { session: s, state, isNext };
  });
}

// Returns the single session currently in its LIVE window, or null.
// Used by the participant "LIVE NOW" hero card and the calendar.
export function findLiveSession(sessions, options = {}) {
  for (const s of sessions || []) {
    if (getSessionState(s, options) === SESSION_STATES.LIVE) return s;
  }
  return null;
}

// Returns sessions in "awaiting-recording" state — facilitator's to-do list.
export function findAwaitingRecording(sessions, options = {}) {
  return (sessions || []).filter(
    (s) => getSessionState(s, options) === SESSION_STATES.AWAITING_RECORDING,
  );
}
