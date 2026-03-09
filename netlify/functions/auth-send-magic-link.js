import { queryDatabase, DB_IDS, corsHeaders, jsonResponse, errorResponse, extractRichText, extractSelect, extractMultiSelect, extractEmail } from "./notion-client.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "bestresults-ai-journal-secret-key";
const APP_URL = process.env.URL || "http://localhost:8888";

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response("", { headers: corsHeaders() });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const { email } = await req.json();
    if (!email) return errorResponse("Email is required", 400);

    const response = await queryDatabase(DB_IDS.USERS, {
      filter: {
        property: "Email",
        email: { equals: email.toLowerCase().trim() },
      },
    });

    if (response.results.length === 0) {
      return jsonResponse({ success: true, message: "If this email is registered, a magic link has been sent." });
    }

    const user = response.results[0];
    const props = user.properties;
    const userName = extractRichText(props.Name);
    const role = extractSelect(props.Role);
    const organization = extractSelect(props.Organization);
    const assignedCohorts = extractMultiSelect(props["Assigned Cohorts"]);

    const token = jwt.sign(
      {
        email: email.toLowerCase().trim(),
        name: userName,
        role: role.toLowerCase().replace(" ", "_"),
        organization,
        assignedCohorts,
        userId: user.id,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    const magicLink = `${APP_URL}/auth/verify?token=${token}`;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL || "AI Journal <noreply@bestresults.ai>",
          to: email.toLowerCase().trim(),
          subject: "Your AI Empowerment Journal Login Link",
          html: `
            <div style="font-family: 'DM Sans', system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <span style="font-weight: 800; font-size: 22px; color: #0F172A;">BestResults</span>
                <span style="display: inline-block; width: 28px; height: 28px; border-radius: 50%; background: #2563EB; color: white; font-weight: 800; font-size: 12px; text-align: center; line-height: 28px; margin-left: 4px;">.AI</span>
              </div>
              <h2 style="color: #0F172A; font-size: 20px; margin-bottom: 16px;">Hi ${userName},</h2>
              <p style="color: #64748B; font-size: 15px; line-height: 1.6;">Click the button below to sign in to the AI Empowerment Journal.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${magicLink}" style="display: inline-block; background: #2563EB; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">Sign In to Journal</a>
              </div>
              <p style="color: #94A3B8; font-size: 13px;">This link expires in 30 days. If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("Resend error:", errText);
        return errorResponse("Failed to send email", 500);
      }
    } else {
      console.log("Magic link (no Resend key):", magicLink);
    }

    return jsonResponse({ success: true, message: "If this email is registered, a magic link has been sent." });
  } catch (err) {
    console.error("Error sending magic link:", err);
    return errorResponse(err.message);
  }
}

export const config = { path: "/api/auth/send-magic-link" };
