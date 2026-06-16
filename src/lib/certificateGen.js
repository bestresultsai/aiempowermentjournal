import { jsPDF } from "jspdf";
import { getCertificateConfig, resolveSignatories } from "./programs";

// ---------------------------------------------------------------------------
// Certificate PDF generator.
//
// Builds a landscape-A4 certificate of completion from a program + cohort +
// participant. Uses jsPDF text + shape primitives (no html2canvas needed)
// so files stay small and font rendering is crisp.
//
// Public API:
//   buildCertificatePdf({ program, cohort, participant, completionDate? })
//     → jsPDF instance (caller can preview() or save())
//   downloadCertificate({ ... })           → triggers a save
//   certificateFilename({ participant, program }) → "AIEW3-Josue-Acuna.pdf"
// ---------------------------------------------------------------------------

const BRAND = {
  ink: "#0F172A",
  inkMuted: "#475569",
  emerald: "#059669",
  brand: "#2563EB",
  paper: "#FAFAF7",
};

const PAGE = {
  width: 297, // mm — A4 landscape
  height: 210,
  margin: 16,
};

export function buildCertificatePdf({
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

  // Background tint.
  doc.setFillColor(BRAND.paper);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");

  // Double border — outer hairline, inner accent.
  doc.setDrawColor(BRAND.ink);
  doc.setLineWidth(0.8);
  doc.rect(8, 8, PAGE.width - 16, PAGE.height - 16);
  doc.setLineWidth(0.3);
  doc.rect(11, 11, PAGE.width - 22, PAGE.height - 22);

  // Top eyebrow — brand mark + program code.
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND.emerald);
  doc.setFontSize(10);
  doc.text("BESTRESULTS.AI", PAGE.width / 2, 28, { align: "center" });

  doc.setTextColor(BRAND.inkMuted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `${program.code} · ${program.name}`,
    PAGE.width / 2,
    34,
    { align: "center" },
  );

  // Title.
  doc.setFont("times", "bold");
  doc.setTextColor(BRAND.ink);
  doc.setFontSize(36);
  doc.text("Certificate of Completion", PAGE.width / 2, 56, { align: "center" });

  // Award script.
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND.inkMuted);
  doc.setFontSize(13);
  doc.text("This certificate is proudly presented to", PAGE.width / 2, 73, {
    align: "center",
  });

  // Participant name (big calligraphic feel via times-italic).
  doc.setFont("times", "italic");
  doc.setTextColor(BRAND.brand);
  doc.setFontSize(42);
  doc.text(participantName, PAGE.width / 2, 95, { align: "center" });

  // Underline under the name — visual flourish.
  const nameWidth = doc.getTextWidth(participantName);
  const underlineY = 99;
  doc.setDrawColor(BRAND.brand);
  doc.setLineWidth(0.4);
  doc.line(
    PAGE.width / 2 - nameWidth / 2,
    underlineY,
    PAGE.width / 2 + nameWidth / 2,
    underlineY,
  );

  // Body copy from the program cert config.
  const body =
    cfg.bodyCopy ||
    "has successfully completed the program and demonstrated mastery of the AI Empowerment Method.";
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND.ink);
  doc.setFontSize(13);
  wrappedText(doc, body, PAGE.width / 2, 113, PAGE.width - 80, {
    align: "center",
    lineGap: 6,
  });

  // Date row.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(BRAND.inkMuted);
  doc.text("Awarded on", PAGE.width / 2, 144, { align: "center" });
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(BRAND.ink);
  doc.text(dateLabel, PAGE.width / 2, 152, { align: "center" });

  // Signatories along the bottom.
  drawSignatories(doc, signatories);

  return doc;
}

export function downloadCertificate({ program, cohort, participant, completionDate }) {
  const doc = buildCertificatePdf({ program, cohort, participant, completionDate });
  doc.save(certificateFilename({ participant, program }));
}

// Returns a Blob URL the caller can drop into an <iframe> for preview.
export function buildCertificatePreviewUrl({
  program,
  cohort,
  participant,
  completionDate,
}) {
  const doc = buildCertificatePdf({
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
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(BRAND.ink);
    doc.text(sig.name || "—", cx, startY + 6, { align: "center" });
    // Title.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(BRAND.inkMuted);
    doc.text(sig.title || "", cx, startY + 11, { align: "center" });
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
