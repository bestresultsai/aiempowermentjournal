import { jsPDF } from "jspdf";
import { getCertificateConfig, resolveSignatories } from "./programs";

// ---------------------------------------------------------------------------
// Certificate PDF generator.
//
// Builds a landscape-A4 certificate of completion that matches the rest of
// the platform's design system:
//
//   - Surface-paper cream background  (#FAFAF7)
//   - Brand-700 navy double border    (matches the cohort hero treatment)
//   - Sans-serif typography           (helvetica — closest Inter fallback
//                                      built into jsPDF)
//   - Brand-500 blue accents
//   - Real BestResults.AI horizontal-color logo at the top
//
// The logo is fetched as SVG, rasterized to a PNG via canvas, and embedded
// as an image. The async fetch makes the public API async; callers must
// await the build/download functions.
//
// Public API (all async):
//   buildCertificatePdf({ program, cohort, participant, completionDate? })
//     → Promise<jsPDF>
//   downloadCertificate({ ... }) → Promise<void>
//   buildCertificatePreviewUrl({ ... }) → Promise<string>
// ---------------------------------------------------------------------------

const BRAND = {
  // Matches tailwind.config.js
  ink: "#0A0A0A",
  inkMuted: "#5B5B5B",
  inkSubtle: "#8E8E8E",
  brand500: "#2563EB",
  brand600: "#1D4ED8",
  brand700: "#1E3A8A",
  surfacePaper: "#FAFAF7",
  surfaceSoft: "#F1EFE9",
  borderSoft: "#ECEAE2",
  emerald: "#059669",
};

const PAGE = {
  width: 297, // mm — A4 landscape
  height: 210,
  margin: 16,
};

// Public path to the brand logo. Uses the horizontal-color (no tagline)
// variant — cleaner for the certificate header than the tagline version.
const LOGO_URL = "/brand/horizontal-color-no-tagline.svg";

// Logo native aspect — derived from the SVG viewBox. Used to compute the
// printed width given a target height.
const LOGO_ASPECT = 4.0; // ~width / height; close enough for layout

export async function buildCertificatePdf({
  program,
  cohort,
  participant,
  completionDate,
}) {
  if (!program) throw new Error("buildCertificatePdf: program is required");
  if (!participant) throw new Error("buildCertificatePdf: participant is required");

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const cfg = getCertificateConfig(program);
  const signatories = resolveSignatories(program, cohort);
  const dateLabel = formatDate(completionDate || new Date());
  const participantName = (participant.name || "").trim() || "Participant";

  // ---- Background ----
  doc.setFillColor(BRAND.surfacePaper);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");

  // ---- Brand-navy double border ----
  doc.setDrawColor(BRAND.brand700);
  doc.setLineWidth(1.0);
  doc.rect(8, 8, PAGE.width - 16, PAGE.height - 16);
  doc.setLineWidth(0.25);
  doc.rect(11, 11, PAGE.width - 22, PAGE.height - 22);

  // ---- Logo ----
  try {
    const logoPng = await loadLogoAsPng();
    if (logoPng) {
      const logoHeight = 14;
      const logoWidth = logoHeight * LOGO_ASPECT;
      doc.addImage(
        logoPng,
        "PNG",
        PAGE.width / 2 - logoWidth / 2,
        20,
        logoWidth,
        logoHeight,
      );
    } else {
      drawLogoFallback(doc, 27);
    }
  } catch {
    drawLogoFallback(doc, 27);
  }

  // ---- Program code eyebrow ----
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND.inkSubtle);
  doc.setFontSize(8);
  doc.text(
    `${program.code} · ${program.name}`.toUpperCase(),
    PAGE.width / 2,
    44,
    { align: "center" },
  );

  // Subtle divider under the eyebrow.
  doc.setDrawColor(BRAND.borderSoft);
  doc.setLineWidth(0.3);
  const divW = 30;
  doc.line(
    PAGE.width / 2 - divW / 2,
    47.5,
    PAGE.width / 2 + divW / 2,
    47.5,
  );

  // ---- Title ----
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND.ink);
  doc.setFontSize(32);
  doc.text("Certificate of Completion", PAGE.width / 2, 65, { align: "center" });

  // ---- Award script ----
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND.inkMuted);
  doc.setFontSize(12);
  doc.text(
    "This certificate is proudly presented to",
    PAGE.width / 2,
    81,
    { align: "center" },
  );

  // ---- Participant name ----
  // Use bold sans for the name so it reads as a confident statement.
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND.brand600);
  doc.setFontSize(38);
  doc.text(participantName, PAGE.width / 2, 102, { align: "center" });

  // Decorative underline — brand-500 hairline matched to the name width.
  const nameWidth = doc.getTextWidth(participantName);
  doc.setDrawColor(BRAND.brand500);
  doc.setLineWidth(0.5);
  doc.line(
    PAGE.width / 2 - nameWidth / 2,
    106,
    PAGE.width / 2 + nameWidth / 2,
    106,
  );

  // ---- Body copy ----
  const body =
    cfg.bodyCopy ||
    "has successfully completed the program and demonstrated mastery of the AI Empowerment Method.";
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND.ink);
  doc.setFontSize(12);
  wrappedText(doc, body, PAGE.width / 2, 120, PAGE.width - 80, {
    align: "center",
    lineGap: 6,
  });

  // ---- Cohort + date row ----
  // Tucked just under the body copy so context is clear: which cohort,
  // when. Cohort is optional (preview mode might pass null).
  if (cohort?.name) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BRAND.inkMuted);
    doc.setFontSize(10);
    doc.text(cohort.name, PAGE.width / 2, 141, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(BRAND.inkSubtle);
  doc.text("Awarded on", PAGE.width / 2, 150, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(BRAND.ink);
  doc.text(dateLabel, PAGE.width / 2, 156, { align: "center" });

  // ---- Signatories ----
  drawSignatories(doc, signatories);

  return doc;
}

export async function downloadCertificate({
  program,
  cohort,
  participant,
  completionDate,
}) {
  const doc = await buildCertificatePdf({
    program,
    cohort,
    participant,
    completionDate,
  });
  doc.save(certificateFilename({ participant, program }));
}

export async function buildCertificatePreviewUrl({
  program,
  cohort,
  participant,
  completionDate,
}) {
  const doc = await buildCertificatePdf({
    program,
    cohort,
    participant,
    completionDate,
  });
  return doc.output("bloburl");
}

export function certificateFilename({ participant, program }) {
  const name = (participant?.name || "Participant")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  const code = program?.code || "Program";
  return `${code}-${name}-Certificate.pdf`;
}

// ---------------------------------------------------------------------------
// Logo loader — fetches the brand SVG, rasterizes via a canvas at retina
// scale, returns a PNG data URL ready for jsPDF.addImage. Cached so multiple
// generations within a session don't refetch.
// ---------------------------------------------------------------------------
let logoPromise = null;

async function loadLogoAsPng() {
  if (typeof window === "undefined") return null;
  if (logoPromise) return logoPromise;
  logoPromise = (async () => {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const svgText = await res.text();
    // Render the SVG into an image and onto a canvas at 4x scale for crisp
    // print output.
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadImage(url);
      const scale = 4;
      const w = (img.naturalWidth || 800) * scale;
      const h = (img.naturalHeight || 200) * scale;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(url);
    }
  })().catch(() => null);
  return logoPromise;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load logo"));
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

// Fallback wordmark used if the logo fetch fails (offline, blocked, etc.).
function drawLogoFallback(doc, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(BRAND.brand700);
  doc.text("BestResults", PAGE.width / 2 - 2, y, { align: "right" });
  doc.setTextColor(BRAND.brand500);
  doc.text(".AI", PAGE.width / 2 + 2, y, { align: "left" });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function drawSignatories(doc, signatories) {
  const count = signatories.length;
  if (count === 0) return;
  const startY = 178;
  const totalWidth = PAGE.width - 40;
  const slotWidth = totalWidth / count;
  for (let i = 0; i < count; i++) {
    const sig = signatories[i];
    const cx = 20 + slotWidth * i + slotWidth / 2;
    // Signature placeholder line.
    doc.setDrawColor(BRAND.ink);
    doc.setLineWidth(0.4);
    doc.line(cx - 30, startY, cx + 30, startY);
    // Name.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(BRAND.ink);
    doc.text(sig.name || "—", cx, startY + 5, { align: "center" });
    // Title.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(BRAND.inkMuted);
    doc.text(sig.title || "", cx, startY + 10, { align: "center" });
  }
}

function wrappedText(doc, text, x, y, maxWidth, { align = "left", lineGap = 5 } = {}) {
  const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line, i) => {
    doc.text(line, x, y + i * lineGap, { align });
  });
  return lines.length;
}

function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
