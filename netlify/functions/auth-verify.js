import { corsHeaders, jsonResponse, errorResponse } from "./notion-client.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "bestresults-ai-journal-secret-key";

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response("", { headers: corsHeaders() });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) return errorResponse("Token is required", 400);

    const decoded = jwt.verify(token, JWT_SECRET);
    return jsonResponse({
      success: true,
      user: {
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        organization: decoded.organization,
        assignedCohorts: decoded.assignedCohorts,
        userId: decoded.userId,
      },
      token,
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return errorResponse("Magic link has expired. Please request a new one.", 401);
    }
    if (err.name === "JsonWebTokenError") {
      return errorResponse("Invalid magic link.", 401);
    }
    console.error("Error verifying token:", err);
    return errorResponse(err.message);
  }
}

export const config = { path: "/api/auth/verify" };
