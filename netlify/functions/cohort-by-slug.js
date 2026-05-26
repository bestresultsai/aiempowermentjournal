// GET /api/cohort/:slug
// Returns the cohort + its sessions (decorated with per-user completion).
//
// Expects two new Notion databases (IDs added to notion-client.js DB_IDS):
//   - SESSIONS:          one row per session in a cohort
//   - SESSION_PROGRESS:  one row per (user, session) completion
//
// See COHORT_MODULE_README.md for the Notion schema.

import {
  queryDatabase,
  DB_IDS,
  corsHeaders,
  jsonResponse,
  errorResponse,
  extractRichText,
  extractSelect,
  extractRelation,
  extractDate,
  extractNumber,
} from "./notion-client.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "bestresults-ai-journal-secret-key";

function getUserFromAuth(req) {
  try {
    const auth = req.headers.get?.("authorization") || req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return null;
    return jwt.verify(auth.slice(7), JWT_SECRET);
  } catch {
    return null;
  }
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response("", { headers: corsHeaders() });

  try {
    const url = new URL(req.url);
    const slug = url.pathname.split("/").pop();
    if (!slug) return errorResponse("Cohort slug is required", 400);

    // 1. Find the cohort by slug.
    const cohortResp = await queryDatabase(DB_IDS.COHORTS, {
      filter: { property: "Slug", rich_text: { equals: slug } },
      page_size: 1,
    });
    if (!cohortResp.results.length) return errorResponse(`Cohort "${slug}" not found`, 404);

    const cohortPage = cohortResp.results[0];
    const cp = cohortPage.properties;

    const cohort = {
      id: cohortPage.id,
      slug,
      name: extractRichText(cp["Cohort Name"]),
      programCode: extractSelect(cp["Program Code"]),
      programName: extractRichText(cp["Program Name"]) || extractSelect(cp["Program Code"]),
      organization: { name: extractRichText(cp.Organization) },
      trainer: { name: extractSelect(cp.Trainer) },
      startDate: extractDate(cp["Start Date"]),
      endDate: extractDate(cp["End Date"]),
      meetingDay: extractRichText(cp["Meeting Day"]),
      meetingTime: extractRichText(cp["Meeting Time"]),
      ndaRequired: cp["NDA Required"]?.checkbox === true,
      journeyIntro: extractRichText(cp["Journey Intro"]),
      coachingNote: extractRichText(cp["Coaching Note"]),
    };

    // 2. Fetch the sessions for this cohort.
    const sessionsResp = await queryDatabase(DB_IDS.SESSIONS, {
      filter: { property: "Cohort", relation: { contains: cohortPage.id } },
      sorts: [{ property: "Order", direction: "ascending" }],
    });
    const sessions = sessionsResp.results.map((s) => {
      const p = s.properties;
      const materialsRaw = p.Materials?.files || [];
      return {
        id: s.id,
        order: extractNumber(p.Order) ?? 0,
        title: extractRichText(p.Title),
        summary: extractRichText(p.Summary),
        date: extractDate(p.Date),
        durationMinutes: extractNumber(p["Duration (min)"]) ?? 75,
        videoUrl: extractRichText(p["Video URL"]),
        objectives: extractRichText(p.Objectives)
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
        materials: materialsRaw.map((f) => ({
          label: f.name,
          url: f.type === "external" ? f.external?.url : f.file?.url,
          type: (f.name || "").toLowerCase().endsWith(".pdf") ? "pdf" : "doc",
        })),
      };
    });

    // 3. Fetch per-user progress (if authed).
    const user = getUserFromAuth(req);
    let completedOrders = [];
    if (user?.userId) {
      const progResp = await queryDatabase(DB_IDS.SESSION_PROGRESS, {
        filter: {
          and: [
            { property: "User", relation: { contains: user.userId } },
            { property: "Cohort", relation: { contains: cohortPage.id } },
          ],
        },
      });
      completedOrders = progResp.results
        .map((r) => extractNumber(r.properties["Session Order"]))
        .filter((n) => n != null);
    }

    const today = new Date();
    const decorated = sessions.map((s) => ({
      ...s,
      unlocked: !s.date || new Date(s.date) <= today,
      completed: completedOrders.includes(s.order),
    }));

    return jsonResponse({
      ...cohort,
      sessions: decorated,
      progress: {
        completed: completedOrders.length,
        total: sessions.length,
        percent: sessions.length ? Math.round((completedOrders.length / sessions.length) * 100) : 0,
      },
    });
  } catch (err) {
    console.error("cohort-by-slug error:", err);
    return errorResponse(err.message);
  }
}

export const config = { path: "/api/cohort/:slug" };
