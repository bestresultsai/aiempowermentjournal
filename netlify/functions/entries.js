import { queryDatabase, DB_IDS, corsHeaders, jsonResponse, errorResponse, extractRichText, extractSelect, extractEmail, extractNumber, extractDate } from "./notion-client.js";

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response("", { headers: corsHeaders() });

  try {
    const url = new URL(req.url);
    const cohort = url.searchParams.get("cohort");
    const org = url.searchParams.get("org");
    const email = url.searchParams.get("email");

    const filters = [];
    if (cohort) filters.push({ property: "Cohort", select: { equals: cohort } });
    if (org) filters.push({ property: "Organization", select: { equals: org } });
    if (email) filters.push({ property: "Participant Email", email: { equals: email } });

    let filter = undefined;
    if (filters.length === 1) filter = filters[0];
    else if (filters.length > 1) filter = { and: filters };

    let allResults = [];
    let startCursor = undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await queryDatabase(DB_IDS.JOURNAL_ENTRIES, {
        filter,
        startCursor,
        pageSize: 100,
        sorts: [{ property: "Submission Date", direction: "descending" }],
      });
      allResults = allResults.concat(response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }

    const entries = allResults.map(page => {
      const p = page.properties;
      return {
        id: page.id,
        title: extractRichText(p["Journal Entry"]),
        participantName: extractRichText(p["Participant Name"]),
        participantEmail: extractEmail(p["Participant Email"]),
        organization: extractSelect(p.Organization),
        cohort: extractSelect(p.Cohort),
        program: extractSelect(p.Program),
        projectName: extractRichText(p["Project Name"]),
        description: extractRichText(p.Description),
        scope: extractSelect(p.Scope),
        frequency: extractSelect(p.Frequency),
        hoursWithoutAI: extractNumber(p["Hours Without AI"]),
        hoursWithAI: extractNumber(p["Hours With AI"]),
        qualityOutcome: extractSelect(p["Quality Outcome"]),
        innovationTitle: extractRichText(p["Innovation Title"]),
        innovationDescription: extractRichText(p["Innovation Description"]),
        submissionDate: extractDate(p["Submission Date"]),
      };
    });

    return jsonResponse(entries);
  } catch (err) {
    console.error("Error fetching entries:", err);
    return errorResponse(err.message);
  }
}

export const config = { path: "/api/entries" };
