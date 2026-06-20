import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FormData {
  businessName: string;
  industry: string;
  revenue: string;
  teamSize: string;
  painPoints: string;
  email: string;
}

interface Opportunity {
  id: number;
  title: string;
  category: string;
  description: string;
  whyMatters: string;
  effortWeeks: string;
  estimatedImpact: string;
  quickWinSteps: string[];
  priority: number;
}

interface AnalysisResponse {
  success: boolean;
  businessName: string;
  executiveSummary: string;
  opportunities: Opportunity[];
  nextSteps: string[];
}

function validateFormData(formData: unknown): formData is FormData {
  if (!formData || typeof formData !== "object") return false;
  const fd = formData as Record<string, unknown>;
  const requiredFields = [
    "businessName",
    "industry",
    "revenue",
    "teamSize",
    "painPoints",
    "email",
  ];
  return requiredFields.every(
    (field) => typeof fd[field] === "string" && (fd[field] as string).trim() !== ""
  );
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildSystemPrompt(): string {
  return `You are an AI business consultant. Analyze the business details below and identify 5 automation opportunities specific to their industry and pain points. Rank by ROI/effort ratio. Respond ONLY in valid JSON format with no additional text or markdown.`;
}

function buildUserPrompt(formData: FormData): string {
  return `Business Name: ${formData.businessName}
Industry: ${formData.industry}
Annual Revenue: ${formData.revenue}
Team Size: ${formData.teamSize}
Pain Points: ${formData.painPoints}

Generate 5 automation opportunities in this JSON format:
{
  "success": true,
  "businessName": "${formData.businessName}",
  "executiveSummary": "Strategic insight about their business",
  "opportunities": [
    {
      "id": 1,
      "title": "Opportunity Name",
      "category": "workflow|data|integration|reporting|customer-facing",
      "description": "What it solves",
      "whyMatters": "Why this matters for ${formData.industry}",
      "effortWeeks": "2-4",
      "estimatedImpact": "X% time saved or $Y/year savings",
      "quickWinSteps": ["step 1", "step 2", "step 3"],
      "priority": 1
    }
  ],
  "nextSteps": ["Schedule consultation", "Create roadmap", "Start quick win"]
}`;
}

function extractJson(text: string): AnalysisResponse {
  try {
    return JSON.parse(text);
  } catch {
    // Fall through to regex extraction
  }

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    return JSON.parse(braceMatch[0]);
  }

  throw new Error("Failed to extract valid JSON from Claude response");
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ── Validate environment variables ──────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey || !resendApiKey) {
      throw new Error("Missing server configuration");
    }

    // ── STEP 1: Parse and validate request body ─────────────────────────
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { formData } = body;

    // ── STEP 2: Validate Input ──────────────────────────────────────────
    if (!validateFormData(formData)) {
      return new Response(
        JSON.stringify({ error: "Invalid form data. All fields are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!validateEmail(formData.email)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 3: Call Gemini API ─────────────────────────────────────────
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt() }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildUserPrompt(formData) }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errBody = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errBody);
      throw new Error(`Gemini API returned status ${geminiResponse.status}: ${errBody}`);
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) throw new Error("Empty response from Gemini API");

    // ── STEP 4: Parse Gemini Response ───────────────────────────────────
    const analysis: AnalysisResponse = extractJson(rawText);

    // ── STEP 5: Store in Supabase ───────────────────────────────────────
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert into audits table
    const { data: audit, error: auditError } = await supabase
      .from("audits")
      .insert({
        business_name: formData.businessName,
        industry: formData.industry,
        annual_revenue: formData.revenue,
        team_size: formData.teamSize,
        pain_points: formData.painPoints,
        email: formData.email,
        report: analysis,
        status: "completed",
      })
      .select("id")
      .single();

    if (auditError || !audit) {
      console.error("Audit insert error:", auditError);
      throw new Error("Failed to save audit report");
    }

    const auditId = audit.id;
    const bestOpportunity = analysis.opportunities?.[0]?.title || "Multiple opportunities identified";

    // Insert or update lead record
    const { error: leadError } = await supabase.from("leads").upsert({
      email: formData.email,
      business_name: formData.businessName,
      industry: formData.industry,
      best_opportunity: bestOpportunity,
      contacted: false,
    }, { onConflict: "email" });

    if (leadError) console.error("Lead insert error:", leadError); // non-fatal

    // ── STEP 6: Send Confirmation Email ─────────────────────────────────
    const emailHtml = `Hi ${formData.businessName},<br><br>
We've analyzed your business and identified 5 automation opportunities.<br><br>
<b>Executive Summary:</b><br>
${analysis.executiveSummary}<br><br>
<b>Top Opportunity:</b><br>
${bestOpportunity}<br>
- ${analysis.opportunities?.[0]?.description || ''}<br>
- Impact: ${analysis.opportunities?.[0]?.estimatedImpact || ''}<br><br>
View your full report and schedule a free consultation at:<br>
<a href="https://buildcatalyst.ai/audit/${auditId}">https://buildcatalyst.ai/audit/${auditId}</a><br><br>
- Build Catalyst Team`;

    const emailText = `Hi ${formData.businessName},

We've analyzed your business and identified 5 automation opportunities.

Executive Summary:
${analysis.executiveSummary}

Top Opportunity:
${bestOpportunity}
- ${analysis.opportunities?.[0]?.description || ''}
- Impact: ${analysis.opportunities?.[0]?.estimatedImpact || ''}

View your full report and schedule a free consultation at:
https://buildcatalyst.ai/audit/${auditId}

- Build Catalyst Team`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Build Catalyst <onboarding@resend.dev>", // Sandbox domain (requires no custom domain)
        to: [formData.email],
        subject: "Your Business Audit Report is Ready",
        text: emailText,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      console.error("Resend error:", await resendResponse.text());
      // non-fatal, still return response
    }

    // ── STEP 7: Return Response to Frontend ─────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        report: analysis,
        audit_id: auditId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Analyze function error:", err);
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
