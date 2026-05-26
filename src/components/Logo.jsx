import { useState } from "react";

// Canonical BRAI logo. Hosted on HubSpot's CDN for now. If/when we want to
// self-host (so we're not dependent on HubSpot), drop the file at
// `public/brand/brai-logo-black.png` and change this to "/brand/brai-logo-black.png".
export const BRAND_LOGO_URL =
  "https://48031831.fs1.hubspotusercontent-na1.net/hubfs/48031831/Brand/BRAI%20Logo%20Black.png";

// Size variants map to the height of the rendered image. The original glyph
// is a horizontal lockup, so we let the width auto-scale.
const LOGO_HEIGHTS = { sm: 24, md: 32, lg: 44 };
const TAGLINE_FONT_SIZES = { sm: 9, md: 10, lg: 11 };

export default function Logo({ size = "md", dark = false, showTagline = false }) {
  const [errored, setErrored] = useState(false);
  const height = LOGO_HEIGHTS[size] ?? LOGO_HEIGHTS.md;
  const tagFs = TAGLINE_FONT_SIZES[size] ?? TAGLINE_FONT_SIZES.md;
  const taglineColor = dark ? "#94A3B8" : "#6B7280";

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start" }}>
      {errored ? (
        <TextFallback size={size} dark={dark} />
      ) : (
        <img
          src={BRAND_LOGO_URL}
          alt="BestResults.AI"
          height={height}
          onError={() => setErrored(true)}
          style={{
            height,
            width: "auto",
            display: "block",
            // The black PNG won't be visible on a dark background. Until we have
            // a white variant, invert it via a CSS filter when `dark` is true.
            filter: dark ? "invert(1) brightness(2)" : "none",
          }}
        />
      )}
      {showTagline && (
        <span
          style={{
            fontSize: tagFs,
            fontWeight: 500,
            color: taglineColor,
            letterSpacing: 0.5,
            marginTop: 4,
          }}
        >
          Your People. Your Organization.
        </span>
      )}
    </div>
  );
}

// Text fallback — only renders if the image fails to load.
function TextFallback({ size, dark }) {
  const fs = { sm: 14, md: 18, lg: 24 }[size] ?? 18;
  const dotSize = { sm: 20, md: 26, lg: 32 }[size] ?? 26;
  const dotFs = { sm: 8.5, md: 10.5, lg: 13 }[size] ?? 10.5;
  const textColor = dark ? "#FFFFFF" : "#0F172A";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <span style={{ fontWeight: 800, fontSize: fs, color: textColor, letterSpacing: -0.5 }}>
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
