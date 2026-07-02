// One-off codemod: subscribe read-only pages to activity/cohort mutations so
// they re-render when hydrateActivityFromSupabase / cohort mirrors complete.
// See commit "Force re-render on hydrate/mutation across admin + role homes".
//
// Usage: node scripts/inject-live-hooks.mjs
//
// For each target file the script:
//   1. Adds imports for useParticipantVersion + useCohortVersion when missing.
//      Reads either from ../../lib/adminMockData + ../../lib/cohortAdmin (pages)
//      or ../lib/... (components), whichever the file already uses.
//   2. Inserts the two hook calls at the top of the default-export function body.
//
// Safe to re-run — checks for existing hook references before inserting.

import fs from "node:fs";
import path from "node:path";

const targets = [
  { file: "src/pages/admin/AdminDashboard.jsx",           adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/admin/AdminHomeworkQueue.jsx",       adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/admin/AdminInnovations.jsx",         adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/admin/AdminJournalDashboard.jsx",    adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/admin/AdminParticipants.jsx",        adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/admin/AdminParticipantDetail.jsx",   adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/admin/AdminFeedback.jsx",            adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/admin/AdminCalendar.jsx",            adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/admin/AdminLayout.jsx",              adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/facilitator/FacilitatorHome.jsx",    adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/facilitator/FacilitatorJournal.jsx", adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/facilitator/FacilitatorJourney.jsx", adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/orgadmin/OrgAdminHome.jsx",          adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/orgadmin/OrgAdminJournal.jsx",       adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/orgadmin/OrgAdminJourney.jsx",       adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/pages/leader/CohortLeaderDashboard.jsx",   adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/components/cohort/CohortStats.jsx",        adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/components/cohort/JournalGameCard.jsx",    adminMock: "../../lib/adminMockData", cohortAdmin: "../../lib/cohortAdmin" },
  { file: "src/dashboards/IndividualDashboard.jsx",       adminMock: "../lib/adminMockData",    cohortAdmin: "../lib/cohortAdmin" },
];

function ensureImport(src, hookName, fromPath) {
  if (new RegExp(`\\b${hookName}\\b`).test(src)) return { src, added: false };
  const importRe = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*["']${fromPath.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}["'];?`,
  );
  if (importRe.test(src)) {
    src = src.replace(importRe, (m, inner) => {
      const items = inner.split(",").map((s) => s.trim()).filter(Boolean);
      if (items.includes(hookName)) return m;
      items.push(hookName);
      return `import { ${items.join(", ")} } from "${fromPath}";`;
    });
    return { src, added: true };
  }
  const lastImport = src.lastIndexOf("\nimport ");
  const endOfLast = src.indexOf("\n", lastImport + 1);
  const insertAt = endOfLast === -1 ? 0 : endOfLast + 1;
  const line = `import { ${hookName} } from "${fromPath}";\n`;
  return { src: src.slice(0, insertAt) + line + src.slice(insertAt), added: true };
}

function injectHookCalls(src) {
  if (/useParticipantVersion\(\)/.test(src) && /useCohortVersion\(\)/.test(src)) {
    return { src, added: false };
  }
  const re = /export\s+default\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{/;
  const m = re.exec(src);
  if (!m) return { src, added: false };
  const insertAt = m.index + m[0].length;
  const call =
    `\n  // Subscribe to activity + cohort mutations so this page re-renders\n` +
    `  // when hydrateActivityFromSupabase or cohort mirrors emit. Without\n` +
    `  // this the initial render captures the pre-hydrate empty snapshot\n` +
    `  // (0 journal entries, 0 homework, etc.) and never refreshes.\n` +
    `  useParticipantVersion();\n` +
    `  useCohortVersion();\n`;
  return { src: src.slice(0, insertAt) + call + src.slice(insertAt), added: true };
}

let changed = 0;
for (const t of targets) {
  const abs = path.resolve(t.file);
  if (!fs.existsSync(abs)) { console.log(`- skip (missing): ${t.file}`); continue; }
  let src = fs.readFileSync(abs, "utf8");
  const orig = src;
  ({ src } = ensureImport(src, "useParticipantVersion", t.adminMock));
  ({ src } = ensureImport(src, "useCohortVersion",      t.cohortAdmin));
  ({ src } = injectHookCalls(src));
  if (src !== orig) {
    fs.writeFileSync(abs, src);
    console.log(`✓ ${t.file}`);
    changed++;
  } else {
    console.log(`- already OK: ${t.file}`);
  }
}
console.log(`\nDone. Modified ${changed} of ${targets.length} files.`);
