import { queryDatabase, DB_IDS, corsHeaders, jsonResponse, errorResponse, extractRichText, extractSelect, extractMultiSelect, extractEmail } from "./notion-client.js";

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
    return jsonResponse({
      found: true,
      participant: {
        id: page.id,
        name: extractRichText(page.properties.Name),
        email: extractEmail(page.properties.Email),
        organization: extractSelect(page.properties.Organization),
        cohorts: extractMultiSelect(page.properties.Cohorts),
      },
    });
  } catch (err) {
    console.error("Error looking up participant:", err);
    return errorResponse(err.message);
  }
}

export const config = { path: "/api/participant-lookup" };
