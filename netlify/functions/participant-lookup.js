import { queryDatabase, DB_IDS, corsHeaders, jsonResponse, errorResponse, extractRichText, extractRelation, extractEmail, notionFetch } from "./notion-client.js";

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response("", { headers: corsHeaders() });

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email) return errorResponse("Email is required", 400);

    const response = await queryDatabase(DB_IDS.PARTICIPANTS, {
      filter: {
        property: "Email",
        email: { equals: email.toLowerCase().trim() },
      },
    });

    if (response.results.length === 0) {
      return jsonResponse({ found: false });
    }

    const page = response.results[0];
    const cohortRelationIds = extractRelation(page.properties.Cohort);

    // Resolve cohort names from their relation IDs
    const cohortNames = [];
    for (const cohortId of cohortRelationIds) {
      try {
        const cohortPage = await notionFetch(`/pages/${cohortId}`);
        const name = cohortPage.properties?.["Cohort Name"]?.title?.map(t => t.plain_text).join("") || "";
        if (name) cohortNames.push(name);
      } catch (e) {
        console.error("Error resolving cohort:", cohortId, e);
      }
    }

    return jsonResponse({
      found: true,
      participant: {
        id: page.id,
        name: extractRichText(page.properties.Name),
        email: extractEmail(page.properties.Email),
        organization: extractRichText(page.properties.Company),
        cohorts: cohortNames,
      },
    });
  } catch (err) {
    console.error("Error looking up participant:", err);
    return errorResponse(err.message);
  }
}

export const config = { path: "/api/participant-lookup" };
