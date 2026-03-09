import { corsHeaders, jsonResponse, errorResponse } from "./notion-client.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "bestresults-ai-journal-secret-key";

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response("", { headers: corsHeaders() });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse("Not authenticated", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    return jsonResponse({
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      organization: decoded.organization,
      assignedCohorts: decoded.assignedCohorts,
      userId: decoded.userId,
    });
  } catch (err) {
    return errorResponse("Invalid or expired token", 401);
  }
}

export const config = { path: "/api/auth/me" };
