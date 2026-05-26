// POST /api/progress
// Body: { cohortSlug, sessionOrder, completed }
// Upserts a row in the Session Progress DB. If `completed` is false, removes
// the existing row (Notion's API doesn't archive cleanly via direct fetch —
// we set a Completed checkbox to false instead).

import {
  queryDatabase,
  createPage,
  notionFetch,
  DB_IDS,
  corsHeaders,
  jsonResponse,
  errorResponse,
  extractRichText,
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
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const user = getUserFromAuth(req);
  if (!user?.userId) return errorResponse("Unauthorized", 401);

  try {
    const { cohortSlug, sessionOrder, completed } = await req.json();
    if (!cohortSlug || sessionOrder == null) {
      return errorResponse("cohortSlug and sessionOrder are required", 400);
    }

    // Find the cohort row.
    const cohortResp = await queryDatabase(DB_IDS.COHORTS, {
      filter: { property: "Slug", rich_text: { equals: cohortSlug } },
      page_size: 1,
    });
    if (!cohortResp.results.length) return errorResponse("Cohort not found", 404);
    const cohortId = cohortResp.results[0].id;

    // Look for an existing progress row.
    const existing = await queryDatabase(DB_IDS.SESSION_PROGRESS, {
      filter: {
        and: [
          { property: "User", relation: { contains: user.userId } },
          { property: "Cohort", relation: { contains: cohortId } },
          { property: "Session Order", number: { equals: Number(sessionOrder) } },
        ],
      },
      page_size: 1,
    });

    if (completed) {
      if (existing.results.length) {
        // Already exists. Make sure Completed flag is true + bump timestamp.
        await notionFetch(`/pages/${existing.results[0].id}`, {
          method: "PATCH",
          body: JSON.stringify({
            properties: {
              "Completed": { checkbox: true },
              "Completed At": { date: { start: new Date().toISOString() } },
            },
          }),
        });
      } else {
        await createPage(DB_IDS.SESSION_PROGRESS, {
          "Name": { title: [{ text: { content: `${user.email} · ${cohortSlug} · S${sessionOrder}` } }] },
          "User": { relation: [{ id: user.userId }] },
          "Cohort": { relation: [{ id: cohortId }] },
          "Session Order": { number: Number(sessionOrder) },
          "Completed": { checkbox: true },
          "Completed At": { date: { start: new Date().toISOString() } },
        });
      }
    } else if (existing.results.length) {
      await notionFetch(`/pages/${existing.results[0].id}`, {
        method: "PATCH",
        body: JSON.stringify({ properties: { "Completed": { checkbox: false } } }),
      });
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("progress error:", err);
    return errorResponse(err.message);
  }
}

export const config = { path: "/api/progress" };
