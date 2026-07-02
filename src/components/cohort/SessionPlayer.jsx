import { useState } from "react";
import { Play, KeyRound, ClipboardCheck, Clock, ExternalLink } from "lucide-react";

// SessionPlayer — renders the session recording.
//
// Three modes, picked by the shape of the URL:
//   • Vimeo / YouTube → inline iframe embed (native player experience).
//   • Zoom cloud recording (/rec/share/…) → belt-clean "Watch on Zoom" card
//     with the passcode surfaced next to the CTA (Zoom recordings require a
//     passcode; embedding is unreliable so we open in a new tab).
//   • Everything else with a URL → treat as an embedded video.
//   • No URL → empty-state placeholder.
//
// Once the full Zoom integration ships (see docs/zoom-integration-spec.md
// Round 3), Zoom recordings will be transcoded to Vimeo automatically and
// this component will render them via the Vimeo path. Until then, the Zoom
// card is the stopgap.

function detectProvider(url) {
  if (!url) return null;
  if (/vimeo\.com\/(?:video\/)?\d+/.test(url)) return "vimeo";
  if (/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))[\w-]+/.test(url)) return "youtube";
  if (/zoom\.us\/rec\/(?:share|play)\//i.test(url)) return "zoom";
  return "embed";
}

function toEmbedUrl(url, provider) {
  if (!url) return null;
  if (provider === "vimeo") {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? `https://player.vimeo.com/video/${m[1]}` : url;
  }
  if (provider === "youtube") {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
  }
  return url;
}

function formatDuration(sec) {
  if (!sec || !Number.isFinite(Number(sec))) return null;
  const s = Math.max(0, Math.round(Number(sec)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m recording`;
  if (m > 0) return `${m} min recording`;
  return `${s}s recording`;
}

export default function SessionPlayer({ session }) {
  const url = session?.videoUrl;
  const provider = detectProvider(url);

  if (!provider) {
    return (
      <div className="aspect-video rounded-3xl bg-ink text-white/60 flex items-center justify-center text-[13px] font-body mb-5">
        Recording will be posted after the live session.
      </div>
    );
  }

  if (provider === "zoom") {
    return (
      <ZoomRecordingCard
        url={url}
        passcode={session?.videoPasscode}
        durationSec={session?.videoDurationSec}
        title={session?.title}
      />
    );
  }

  const embed = toEmbedUrl(url, provider);
  return (
    <div className="aspect-video rounded-3xl overflow-hidden bg-black mb-5 shadow-lift">
      <iframe
        src={embed}
        title={session?.title || "Session recording"}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        style={{ border: 0, display: "block" }}
      />
    </div>
  );
}

// Zoom cloud recordings can't be embedded reliably (X-Frame-Options is
// inconsistent across accounts + Zoom releases), so we render a purpose-built
// card that opens the recording in a new tab AND surfaces the passcode with
// a one-click Copy — because pasting it into Zoom's viewer is the friction
// point participants hit otherwise.
function ZoomRecordingCard({ url, passcode, durationSec, title }) {
  const [copied, setCopied] = useState(false);
  const durationLabel = formatDuration(durationSec);

  async function copyPasscode() {
    if (!passcode) return;
    try {
      await navigator.clipboard.writeText(passcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (e.g. iframe embed context) — no-op; user can
      // still triple-click the passcode text and copy manually.
    }
  }

  return (
    <div className="aspect-video rounded-3xl bg-gradient-to-br from-brand-700 to-ink text-white overflow-hidden relative mb-5 shadow-lift">
      <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
      <div className="relative h-full flex flex-col items-center justify-center text-center p-6 lg:p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15 mb-5">
          <Play className="w-3 h-3" strokeWidth={2.5} fill="currentColor" />
          <span className="text-[11px] font-heading font-bold uppercase tracking-[0.18em]">
            Session recording
          </span>
        </div>

        <h3 className="font-heading text-[22px] lg:text-[26px] font-extrabold mb-2 max-w-xl">
          Ready to watch
        </h3>
        <p className="text-[13px] text-white/75 max-w-md leading-relaxed mb-5">
          Opens in a new tab. Use the passcode below when Zoom asks for it.
          {durationLabel && (
            <>
              {" "}
              <span className="inline-flex items-center gap-1 text-white/85">
                <Clock className="w-3 h-3" strokeWidth={2.5} />
                {durationLabel}
              </span>
              .
            </>
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full max-w-lg">
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="group flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-ink text-[14px] font-heading font-bold hover:bg-surface-soft transition-colors"
          >
            <Play className="w-4 h-4" strokeWidth={2.5} fill="currentColor" />
            Watch recording
            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" strokeWidth={2.5} />
          </a>
          {passcode && (
            <button
              type="button"
              onClick={copyPasscode}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 backdrop-blur border border-white/25 text-white text-[13.5px] font-heading font-semibold hover:bg-white/15 transition-colors"
              title="Copy passcode to clipboard"
            >
              {copied ? (
                <>
                  <ClipboardCheck className="w-4 h-4 text-emerald-300" strokeWidth={2.5} />
                  <span className="text-emerald-200">Copied</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" strokeWidth={2.5} />
                  <span>Passcode:</span>
                  <span className="font-mono tracking-wider text-white/95">{passcode}</span>
                </>
              )}
            </button>
          )}
        </div>

        {!passcode && (
          <div className="mt-4 text-[11.5px] text-amber-200/90 max-w-md">
            Facilitator hasn't posted the passcode yet — try opening the link; if
            Zoom asks for one, ask your facilitator for it.
          </div>
        )}
      </div>
    </div>
  );
}
