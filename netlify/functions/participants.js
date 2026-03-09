import { queryDatabase, DB_IDS, corsHeaders, jsonResponse, errorResponse, extractRichText, extractSelect, extractMultiSelect, extractEmail } from "./notion-client.js";

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response("", { headers: corsHeaders() });

  try {
    const url = new URL(req.url);
    const cohort = url.searchParams.get("cohort");

    let filter = undefined;
    if (cohort) {
      filter = { property: "Cohorts", multi_select: { contains: cohort } };
    }

    const response = await queryDatabase(DB_IDS.PARTICIPANTS, {
      filter,
      sorts: [{ property: "Name", direction: "ascending" }],
    });

    const participants = response.results.map(page => ({
      id: page.id,
      name: extractRichText(page.properties.Name),
      email: extractEmail(page.properties.Email),
      organization: extractSelect(page.properties.Organization),
      cohorts: extractMultiSelect(page.properties.Cohorts),
    }));

    return jsonResponse(participants);
  } catch (err) {
    console.error("Error fetching participants:", err);
    return errorResponse(err.message);
  }
}

export const config = { path: "/api/participants" };
