// =============================================================
//  Agent IA Premium — Version Ultimate Simple
//  Hybrid Claude + OpenAI (fallback)
//  Optimisé pour Vercel (serverless friendly)
// =============================================================

const CONFIG = {
  provider: process.env.AI_PROVIDER || "hybrid",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  modelClaude: "claude-3-5-sonnet-20240620",
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

function buildSystemPrompt() {
  return `
Tu es l’agent IA premium de Nassim.
Tu t’adaptes automatiquement à la langue de l’utilisateur.
Si l’utilisateur parle français, tu réponds en français.
S’il parle anglais, tu réponds en anglais.
Tu ne changes jamais de langue sauf si l’utilisateur change lui-même.
Tu es clair, structuré, professionnel et orienté action.
Tu expliques comme à quelqu’un d’intelligent mais pressé.
Pas de blabla inutile.
Si tu ne sais pas, tu le dis clairement.
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

async function callClaude(message, history) {
  if (!CONFIG.anthropicApiKey) throw new Error("Clé API Claude manquante.");

  const body = {
    model: CONFIG.modelClaude,
    max_tokens: CONFIG.maxTokens,
    system: buildSystemPrompt(),
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

async function callOpenAI(message, history) {
  if (!CONFIG.openaiApiKey) throw new Error("Clé API OpenAI manquante.");

  const body = {
    model: CONFIG.modelOpenAI,
    max_completion_tokens: CONFIG.maxTokens,
    messages: [
      { role: "system", content: buildSystemPrompt() },
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

async function generateAnswer({ message, history }) {
  if (CONFIG.provider === "claude") return callClaude(message, history);
  if (CONFIG.provider === "openai") return callOpenAI(message, history);

  // HYBRID
  try {
    return await callClaude(message, history);
  } catch {
    return await callOpenAI(message, history);
  }
}

// =============================================================
//  Handler
// =============================================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return safeJson(res, 405, { error: "Méthode non autorisée." });
  }

  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== "string") {
      return safeJson(res, 400, { error: "Le champ 'message' est requis." });
    }

    const safeHistory = sanitizeHistory(history);

    const reply = await generateAnswer({
      message,
      history: safeHistory,
    });

    return safeJson(res, 200, { success: true, reply });
  } catch (err) {
    console.error("Erreur /api/ask :", err);
    return safeJson(res, 500, { success: false, error: "Erreur interne." });
  }
}

