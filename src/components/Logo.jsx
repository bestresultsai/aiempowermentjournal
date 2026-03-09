export default function Logo({ size = "md", dark = false, showTagline = false }) {
  const fs = { sm: 14, md: 18, lg: 24 }[size];
  const dotSize = { sm: 20, md: 26, lg: 32 }[size];
  const dotFs = { sm: 8.5, md: 10.5, lg: 13 }[size];
  const tagFs = { sm: 7, md: 8.5, lg: 10.5 }[size];
  const textColor = dark ? "#FFFFFF" : "#0F172A";

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <span style={{ fontWeight: 800, fontSize: fs, color: textColor, letterSpacing: -0.5 }}>
          BestResults
        </span>
        <div
          style={{
            width: dotSize, height: dotSize, borderRadius: "50%",
            background: "#2563EB", display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: 800, color: "#fff",
            fontSize: dotFs, letterSpacing: -0.3, marginLeft: 3,
          }}
        >
          .AI
        </div>
      </div>
      {showTagline && (
        <span style={{ fontSize: tagFs, fontWeight: 500, color: dark ? "#94A3B8" : "#6B7280", letterSpacing: 0.5, marginTop: 1 }}>
          Your People. Your Organization.
        </span>
      )}
    </div>
  );
}
