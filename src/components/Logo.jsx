import { useState } from "react";

// Canonical BRAI logo, hosted on HubSpot's CDN. To self-host later, drop the
// file at `public/brand/brai-logo-black.png` and update this constant.
export const BRAND_LOGO_URL =
  "https://48031831.fs1.hubspotusercontent-na1.net/hubfs/48031831/Brand/BRAI%20Logo%20Black.png";

const LOGO_HEIGHTS = { sm: 36, md: 64, lg: 112 };
const TAGLINE_FONT_SIZES = { sm: 10, md: 12, lg: 15 };

export default function Logo({ size = "md", dark = false, showTagline = false }) {
  const [errored, setErrored] = useState(false);
  const height = LOGO_HEIGHTS[size] ?? LOGO_HEIGHTS.md;
  const tagFs = TAGLINE_FONT_SIZES[size] ?? TAGLINE_FONT_SIZES.md;

  return (
    <div className="inline-flex flex-col items-start">
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
            // Invert the black PNG for dark backgrounds until we have a white variant.
            filter: dark ? "invert(1) brightness(2)" : "none",
          }}
        />
      )}
      {showTagline && (
        <span
          className="font-heading font-medium tracking-wide mt-1.5"
          style={{
            fontSize: tagFs,
            color: dark ? "#94A3B8" : "#5B5B5B",
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
