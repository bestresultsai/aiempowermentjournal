import { useState } from "react";

// ---------------------------------------------------------------------------
// Canonical BRAI logos — self-hosted SVGs in public/brand/.
// All variants live in that folder; swap to a different one if a context calls
// for it (e.g. stacked vs horizontal, with/without tagline, grey for muted).
//
// Available variants (all transparent background, vector):
//   horizontal-color.svg              — color, with tagline
//   horizontal-color-no-tagline.svg   — color, no tagline   (← default light)
//   horizontal-grey-no-tagline.svg    — grey, no tagline
//   horizontal-white-no-tagline.svg   — white, no tagline   (← default dark)
//   stacked-black.svg                 — black, stacked, with tagline
//   stacked-color.svg                 — color, stacked, with tagline
//   stacked-white.svg                 — white, stacked, with tagline
//   stacked-color-no-tagline.svg      — color, stacked, no tagline
//   stacked-white-no-tagline.svg      — white, stacked, no tagline
// ---------------------------------------------------------------------------
export const BRAND_LOGO_URL       = "/brand/horizontal-color-no-tagline.svg";
export const BRAND_LOGO_WHITE_URL = "/brand/horizontal-white-no-tagline.svg";

const HAS_REAL_WHITE = BRAND_LOGO_WHITE_URL !== BRAND_LOGO_URL;

// Size variants map to the height of the rendered image. The original glyph
// is a horizontal lockup, so we let the width auto-scale.
const LOGO_HEIGHTS = { sm: 36, md: 64, lg: 112 };
const TAGLINE_FONT_SIZES = { sm: 10, md: 12, lg: 15 };

export default function Logo({ size = "md", dark = false, showTagline = false }) {
  const [errored, setErrored] = useState(false);
  const height = LOGO_HEIGHTS[size] ?? LOGO_HEIGHTS.md;
  const tagFs = TAGLINE_FONT_SIZES[size] ?? TAGLINE_FONT_SIZES.md;
  const taglineColor = dark ? "#FFFFFF" : "#5B5B5B";

  // Use the white asset when available + the surface is dark.
  // If no real white asset yet, fall back to CSS filter inversion (looks OK but
  // not as clean as a real transparent white PNG).
  const useFilterInversion = dark && !HAS_REAL_WHITE;
  const src = dark && HAS_REAL_WHITE ? BRAND_LOGO_WHITE_URL : BRAND_LOGO_URL;

  return (
    <div className="inline-flex flex-col items-start">
      {errored ? (
        <TextFallback size={size} dark={dark} />
      ) : (
        <img
          src={src}
          alt="BestResults.AI"
          height={height}
          onError={() => setErrored(true)}
          style={{
            height,
            width: "auto",
            display: "block",
            filter: useFilterInversion ? "invert(1) brightness(2)" : "none",
          }}
        />
      )}
      {showTagline && (
        <span
          className="font-heading font-medium tracking-wide mt-1.5"
          style={{
            fontSize: tagFs,
            color: dark ? "rgba(255,255,255,0.75)" : taglineColor,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Your People. Your Organization.
        </span>
      )}
    </div>
  );
}

// Text fallback — only renders if the image fails.
function TextFallback({ size, dark }) {
  const fs = { sm: 14, md: 18, lg: 24 }[size] ?? 18;
  const dotSize = { sm: 20, md: 26, lg: 32 }[size] ?? 26;
  const dotFs = { sm: 8.5, md: 10.5, lg: 13 }[size] ?? 10.5;
  const textColor = dark ? "#FFFFFF" : "#0A0A0A";
  return (
    <div className="flex items-center gap-0.5">
      <span style={{ fontFamily: "Inter", fontWeight: 800, fontSize: fs, color: textColor, letterSpacing: -0.5 }}>
        BestResults
      </span>
      <div
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          background: "#2563EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter",
          fontWeight: 800,
          color: "#fff",
          fontSize: dotFs,
          letterSpacing: -0.3,
          marginLeft: 3,
        }}
      >
        .AI
      </div>
    </div>
  );
}
