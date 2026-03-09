import { createPage, DB_IDS, corsHeaders, jsonResponse, errorResponse } from "./notion-client.js";

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response("", { headers: corsHeaders() });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const body = await req.json();
    const {
      participantName, participantEmail, organization, cohort, program,
      projectName, description, scope, frequency,
      hoursWithoutAI, hoursWithAI, qualityOutcome,
      innovationTitle, innovationDescription,
    } = body;

    if (!participantName || !participantEmail || !projectName || !hoursWithoutAI || !hoursWithAI) {
      return errorResponse("Missing required fields", 400);
    }

    const title = `${projectName} — ${participantName}`;

    const properties = {
      "Journal Entry": { title: [{ text: { content: title } }] },
      "Participant Name": { rich_text: [{ text: { content: participantName } }] },
      "Participant Email": { email: participantEmail },
      "Organization": { select: { name: organization } },
      "Cohort": { select: { name: cohort } },
      "Program": { select: { name: program || "BBWS" } },
      "Project Name": { rich_text: [{ text: { content: projectName } }] },
      "Description": { rich_text: [{ text: { content: description || "" } }] },
      "Scope": { select: { name: scope } },
      "Frequency": { select: { name: frequency } },
      "Hours Without AI": { number: parseFloat(hoursWithoutAI) },
      "Hours With AI": { number: parseFloat(hoursWithAI) },
      "Quality Outcome": { select: { name: qualityOutcome } },
      "Submission Date": { date: { start: new Date().toISOString().split("T")[0] } },
    };

    if (innovationTitle) {
      properties["Innovation Title"] = { rich_text: [{ text: { content: innovationTitle } }] };
    }
    if (innovationDescription) {
      properties["Innovation Description"] = { rich_text: [{ text: { content: innovationDescription } }] };
    }

    const page = await createPage(DB_IDS.JOURNAL_ENTRIES, properties);

    return jsonResponse({ id: page.id, title, success: true }, 201);
  } catch (err) {
    console.error("Error creating journal entry:", err);
    return errorResponse(err.message);
  }
}

export const config = { path: "/api/journal" };
