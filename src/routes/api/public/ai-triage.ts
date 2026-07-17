import { createFileRoute } from "@tanstack/react-router";

type TriageOut = {
  title: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  possible_causes: string[];
  initial_checks: string[];
  recurring_pattern_warning: string | null;
};

const SYSTEM = `You are a maintenance triage assistant. Given a user's complaint about an asset,
produce a compact structured ticket. Respond with ONLY a JSON object matching this schema:
{ "title": string (short, <= 80 chars), "category": string (e.g. Electrical, Mechanical, Cooling, Optical, Software),
  "priority": "low" | "medium" | "high" | "critical",
  "possible_causes": string[] (2-4 items),
  "initial_checks": string[] (2-4 SAFE checks a non-technician can do),
  "recurring_pattern_warning": string | null }
Never include markdown or prose outside JSON.`;

export const Route = createFileRoute("/api/public/ai-triage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return json({ error: "AI not configured" }, 500);
        const body = (await request.json().catch(() => null)) as {
          complaint?: string;
          asset_name?: string;
          category?: string | null;
          location?: string | null;
          condition?: string | null;
        } | null;
        if (!body?.complaint || body.complaint.trim().length < 4)
          return json({ error: "complaint required" }, 400);

        const user = `Asset: ${body.asset_name ?? "(unknown)"}${body.category ? ` [${body.category}]` : ""}${body.location ? ` at ${body.location}` : ""}${body.condition ? `\nCondition notes: ${body.condition}` : ""}\n\nComplaint: ${body.complaint}`;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: user },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          return json({ error: `ai upstream ${res.status}`, detail: t.slice(0, 200) }, 502);
        }
        const data = await res.json();
        const raw = data?.choices?.[0]?.message?.content;
        if (!raw) return json({ error: "empty ai response" }, 502);
        let parsed: TriageOut;
        try {
          parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
          return json({ error: "invalid ai json" }, 502);
        }
        // Minimal shape sanitization
        const out: TriageOut = {
          title: String(parsed.title ?? "").slice(0, 120) || "Issue reported",
          category: String(parsed.category ?? "General"),
          priority: (["low", "medium", "high", "critical"].includes(parsed.priority)
            ? parsed.priority
            : "medium") as TriageOut["priority"],
          possible_causes: Array.isArray(parsed.possible_causes) ? parsed.possible_causes.slice(0, 5).map(String) : [],
          initial_checks: Array.isArray(parsed.initial_checks) ? parsed.initial_checks.slice(0, 5).map(String) : [],
          recurring_pattern_warning: parsed.recurring_pattern_warning ? String(parsed.recurring_pattern_warning) : null,
        };
        return json(out);
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
