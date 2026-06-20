import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Opportunity {
  priority: number;
  title: string;
  category: string;
  detail: string;
  why_it_matters: string;
  effort: string;
  impact: string;
  quick_wins: string[];
}

interface AnalysisResult {
  summary: string;
  opportunities: Opportunity[];
}

interface NotifyRequest {
  to: string;
  businessName: string;
  analysis: AnalysisResult;
  submissionId?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildEmailHtml(businessName: string, analysis: AnalysisResult): string {
  // Try to use opportunities, fallback to old automation_opportunities format if present
  const opps = analysis.opportunities || (analysis as any).automation_opportunities || [];

  const automationHtml = opps
    .map(
      (a: any) => {
        // Handle both new Opportunity format and old AutomationOpportunity format
        const title = a.title || "Opportunity";
        const detail = a.detail || "";
        const impact = a.impact || "High ROI";
        const category = a.category || "Workflow";
        const priority = a.priority || 1;

        return `
      <tr>
        <td style="padding:16px;border-bottom:1px solid #2d2d2d;">
          <div style="display:inline-block;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;color:#8b5cf6;background:rgba(139,92,246,0.15);text-transform:uppercase;margin-bottom:8px;">${category}</div>
          <div style="font-weight:700;color:#f0f0f0;margin-bottom:8px;font-size:16px;">${priority}. ${title}</div>
          <div style="color:#a0a0a0;font-size:14px;line-height:1.6;margin-bottom:12px;">${detail}</div>
          <div style="font-size:13px;color:#d0d0d0;"><strong style="color:#ffffff;">Impact:</strong> ${impact}</div>
        </td>
      </tr>`;
      }
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Build Catalyst — Business Audit Report</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%);border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
              <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">⚡ Build Catalyst</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:8px;letter-spacing:0.5px;">AI-POWERED BUSINESS AUDIT REPORT</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#141414;padding:0;">

              <!-- Business Name -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 32px 24px;">
                    <div style="color:#a0a0a0;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Audit For</div>
                    <div style="color:#ffffff;font-size:22px;font-weight:700;">${businessName}</div>
                  </td>
                </tr>
              </table>

              <!-- Summary -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 32px;">
                    <div style="background:#1a1a2e;border-radius:12px;padding:24px;border-left:4px solid #6366f1;">
                      <div style="color:#a0a0a0;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Executive Summary</div>
                      <div style="color:#d0d0d0;font-size:14px;line-height:1.7;">${analysis.summary}</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Automation Opportunities -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 32px 32px;">
                    <div style="color:#ffffff;font-size:16px;font-weight:700;margin-bottom:16px;">⚙️ Automation Opportunities</div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;overflow:hidden;">
                      ${automationHtml}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 32px 40px;">
                    <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:12px;padding:32px;text-align:center;border:1px solid #2d2d4d;">
                      <div style="color:#f0f0f0;font-size:18px;font-weight:700;margin-bottom:8px;">Ready to transform your business?</div>
                      <div style="color:#a0a0a0;font-size:14px;margin-bottom:20px;">Let's discuss your personalized roadmap.</div>
                      <a href="https://buildcatalyst.com" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;">Book a Strategy Call</a>
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f0f0f;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;">
              <div style="color:#666;font-size:12px;line-height:1.6;">
                © ${new Date().getFullYear()} Build Catalyst. All rights reserved.<br>
                This report was generated by AI and is intended for informational purposes only.<br>
                <a href="https://buildcatalyst.com" style="color:#6366f1;text-decoration:none;">buildcatalyst.com</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ── Validate environment variables ──────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    if (!resendApiKey) {
      throw new Error("Missing Resend API key");
    }

    // ── Parse and validate request body ─────────────────────────────────
    let body: NotifyRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, businessName, analysis, submissionId } = body;

    if (!to || !validateEmail(to)) {
      return new Response(
        JSON.stringify({ error: "Valid recipient email address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!businessName || typeof businessName !== "string") {
      return new Response(
        JSON.stringify({ error: "Business name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!analysis || typeof analysis !== "object" || !Array.isArray(analysis.opportunities)) {
      return new Response(
        JSON.stringify({ error: "Valid analysis object with opportunities is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Build email ─────────────────────────────────────────────────────
    const subject = `Your Build Catalyst Business Audit — Top Automation Opportunities`;
    const htmlBody = buildEmailHtml(businessName, analysis);

    // ── Send via Resend ─────────────────────────────────────────────────
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Build Catalyst <onboarding@resend.dev>",
        to: [to],
        subject,
        html: htmlBody,
      }),
    });

    const resendData = await resendResponse.json();

    // ── Initialize Supabase admin client ────────────────────────────────
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Log email to database ───────────────────────────────────────────
    const emailLogEntry: Record<string, unknown> = {
      recipient: to,
      subject,
      status: resendResponse.ok ? "sent" : "failed",
      resend_id: resendData?.id || null,
    };

    if (submissionId) {
      emailLogEntry.submission_id = submissionId;
    }

    const { error: logError } = await supabase
      .from("email_log")
      .insert(emailLogEntry);

    if (logError) {
      console.error("Email log insert error:", logError);
      // Non-fatal: don't fail the response over a logging issue
    }

    // ── Return result ───────────────────────────────────────────────────
    if (!resendResponse.ok) {
      console.error("Resend API error:", resendResponse.status, resendData);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send email",
          details: resendData,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: resendData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Notify function error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
