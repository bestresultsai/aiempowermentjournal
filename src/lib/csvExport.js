// ---------------------------------------------------------------------------
// Tiny CSV export utility — no dependency, no backend round-trip.
//
// usage:
//   downloadCSV("roster.csv", [
//     ["Name", "Email", "Progress"],
//     ["Josue Acuna", "josue@me.com", "4/8"],
//   ]);
//
// Rows are arrays. First row is treated as the header. Values are quoted +
// double-quotes are escaped per RFC 4180.
// ---------------------------------------------------------------------------

function escapeCell(value) {
  if (value == null) return "";
  const s = String(value);
  // Quote when the cell contains a comma, quote, newline, or leading/trailing whitespace.
  if (/[",\n\r]/.test(s) || /^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSVText(rows) {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export function downloadCSV(filename, rows) {
  if (typeof window === "undefined") return;
  const text = toCSVText(rows);
  // Prepend UTF-8 BOM so Excel opens accented chars cleanly.
  const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari has a beat to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
