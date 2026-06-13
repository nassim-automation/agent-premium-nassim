// =============================================================
//  Agent IA Premium — Option C (Ultimate Premium)
//  Multi‑Client + Business Intelligence + Context Interpreter
//  Optimisé pour Claude Opus 4.8 + OpenAI fallback
//  Version Pro + Humain (Signature Nassim)
// =============================================================

const CONFIG = {
  provider: process.env.AI_PROVIDER || "hybrid",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,

  // 🔥 Claude Opus 4.8 (modèle premium)
  modelClaude: "claude-3-opus-20240229",

  // Fallback OpenAI
  modelOpenAI: "gpt-4.1-mini",

  maxTokens: 800,
  timeoutMs: 25000,
};

// =============================================================
//  Helpers
// =============================================================

function cleanText(text) {
  if (!text) return "";
  return text.toString().trim();
}

// =============================================================
//  SYSTEM PROMPT — OPTION C (ULTIMATE PREMIUM)
//  Consultant Senior + Humain + Business Intelligence
// =============================================================

function buildSystemPrompt(context) {
  return `
You are Nassim’s Premium AI Agent — Option C (Ultimate Edition).

Your identity:
- You speak with the clarity of a senior consultant and the warmth of a human expert.
- You adapt instantly to the user's language (French or English).
- You never switch languages unless the user switches first.
- You are concise, structured, and focused on delivering value fast.

Your mission:
- Understand the user's intent deeply.
- Provide actionable, high‑impact answers.
- Think like a strategist, communicate like a pro, and guide like a mentor.
- Always prioritize clarity, precision, and efficiency.
- If information is missing, ask briefly.
- If something is uncertain, state it transparently.

Business Intelligence Layer:
- Detect the user’s goal, constraints, and context.
- Provide insights, recommendations, and next steps.
- Adapt your tone and examples to the industry of the client.

Context Interpreter:
- Read the CLIENT CONTEXT below.
- Adapt your expertise, tone, and suggestions to match the business.
- If the context is vague, infer the most likely needs without hallucinating.

Quality Layer:
- No fluff. No generic answers. No repetition.
- Structure your answers clearly.
- Prioritize usefulness over length.
- Always deliver premium‑grade output.

Anti‑Hallucination Layer:
- Never invent facts.
- Never assume data not provided.
- If unsure, say so and propose how to clarify.

CLIENT CONTEXT (dynamic):
${context || "No client context provided."}
`;
}

function safeJson(res, status, payload) {
  return res.status(status).json(payload);
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (h) =>
        h &&
        typeof h === "object" &&
        ["user", "assistant"].includes(h.role) &&
        typeof h.content === "string"
    )
    .map((h) => ({
      role: h.role,
      content: cleanText(h.content).slice(0, 4000),
    }))
    .slice(-10);
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// =============================================================
//  Providers
// =============================================================

async function callClaude(message, history, context) {
  if (!CONFIG.anthropicApiKey) throw new Error("Missing Claude API key.");

  const body = {
    model: CONFIG.modelClaude,
    max_tokens: CONFIG.maxTokens,
    system: buildSystemPrompt(context),
    messages: [...history, { role: "user", content: cleanText(message) }],
  };

  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": CONFIG.anthropicApiKey,
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Claude error ${res.status}`);

  const data = await res.json();
  return cleanText(data?.content?.[0]?.text || "");
}

async function callOpenAI(message, history, context) {
  if (!CONFIG.openaiApiKey) throw new Error("Missing OpenAI API key.");

  const body = {
    model: CONFIG.modelOpenAI,
    max_completion_tokens: CONFIG.maxTokens,
    messages: [
      { role: "system", content: buildSystemPrompt(context) },
      ...history,
      { role: "user", content: cleanText(message) },
    ],
  };

  const res = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.openaiApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);

  const data = await res.json();
  return cleanText(data?.choices?.[0]?.message?.content || "");
}

// =============================================================
//  Orchestration
// =============================================================

async function generateAnswer({ message, history, context }) {
  if (CONFIG.provider === "claude")
    return callClaude(message, history, context);

  if (CONFIG.provider === "openai")
    return callOpenAI(message, history, context);

  // HYBRID
  try {
    return await callClaude(message, history, context);
  } catch {
    return await callOpenAI(message, history, context);
  }
}

// =============================================================
//  Handler
// =============================================================

export default async function handler(req, res) {

  // 🔐 Security: token verification
  const clientToken = req.headers["x-auth-token"];
  if (!clientToken || clientToken !== process.env.AUTH_TOKEN) {
    return safeJson(res, 401, { 
      error: "Unauthorized access. Missing or invalid authentication token." 
    });
  }

  if (req.method !== "POST") {
    return safeJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const { message, history, context } = req.body || {};

    if (!message || typeof message !== "string") {
      return safeJson(res, 400, { error: "The 'message' field is required." });
    }

    const safeHistory = sanitizeHistory(history);

    const reply = await generateAnswer({
      message,
      history: safeHistory,
      context: cleanText(context),
    });

    return safeJson(res, 200, { success: true, reply });
  } catch (err) {
    console.error("Erreur /api/ask :", err);
    return safeJson(res, 500, { success: false, error: "Internal server error." });
  }
}

