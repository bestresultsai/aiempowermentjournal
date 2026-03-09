const NOTION_API = "https://api.notion.com/v1";

export async function notionFetch(endpoint, options = {}) {
  const res = await fetch(`${NOTION_API}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${process.env.NOTION_API_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Notion API error: ${res.status}`);
  }
  return res.json();
}

export async function queryDatabase(databaseId, { filter, sorts, startCursor, pageSize } = {}) {
  const body = {};
  if (filter) body.filter = filter;
  if (sorts) body.sorts = sorts;
  if (startCursor) body.start_cursor = startCursor;
  if (pageSize) body.page_size = pageSize;
  return notionFetch(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createPage(databaseId, properties) {
  return notionFetch("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });
}

export const DB_IDS = {
  JOURNAL_ENTRIES: "0d984418-48bd-4f1e-adf0-f71c1f0e1dbb",
  PARTICIPANTS: "2fb2af88-8f34-80ce-a486-d8f8f39bdfab",
  COHORTS: "2fa2af88-8f34-8036-beb8-e894172c6a89",
  USERS: "937dfd19-8afa-4e07-bdf3-9974f4fb1093",
};

export const FREQUENCY_MULTIPLIERS = {
  "Daily": 260,
  "Multiple times a week": 156,
  "Once a week": 52,
  "Multiple times a month": 24,
  "Once a month": 12,
  "Multiple times a quarter": 8,
  "Once a quarter": 4,
  "Multiple times a year": 6,
  "Once a year": 1,
  "Less than once a year": 0.5,
};

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

export function extractRichText(prop) {
  if (!prop) return "";
  if (prop.type === "rich_text") return prop.rich_text?.map(t => t.plain_text).join("") || "";
  if (prop.type === "title") return prop.title?.map(t => t.plain_text).join("") || "";
  return "";
}

export function extractSelect(prop) {
  return prop?.select?.name || "";
}

export function extractMultiSelect(prop) {
  return prop?.multi_select?.map(s => s.name) || [];
}

export function extractEmail(prop) {
  return prop?.email || "";
}

export function extractNumber(prop) {
  return prop?.number ?? null;
}

export function extractDate(prop) {
  return prop?.date?.start || "";
}

export function extractRelation(prop) {
  return prop?.relation?.map(r => r.id) || [];
}

export function extractStatus(prop) {
  return prop?.status?.name || "";
}
