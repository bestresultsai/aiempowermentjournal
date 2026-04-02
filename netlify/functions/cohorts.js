import { queryDatabase, DB_IDS, corsHeaders, jsonResponse, errorResponse, extractRichText, extractSelect, extractRelation, extractDate } from "./notion-client.js";

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response("", { headers: corsHeaders() });

  try {
    const response = await queryDatabase(DB_IDS.COHORTS, {
      sorts: [{ property: "Cohort Name", direction: "ascending" }],
    });

    const cohorts = response.results.map(page => ({
      id: page.id,
      name: extractRichText(page.properties["Cohort Name"]),
      program: extractRelation(page.properties.Program),
      organization: extractRichText(page.properties.Organization),
      startDate: extractDate(page.properties["Start Date"]),
      trainer: extractSelect(page.properties.Trainer),
      status: extractSelect(page.properties.Status),
    }));

    return jsonResponse(cohorts);
  } catch (err) {
    console.error("Error fetching cohorts:", err);
    return errorResponse(err.message);
  }
}

export const config = { path: "/api/cohorts" };
