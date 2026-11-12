import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 5000;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const MAX_INPUT_CHARS = 12000;
const PLACEHOLDER_KEY = "your_openrouter_api_key_here";

function getApiKey() {
  const key = (process.env.OPENROUTER_API_KEY || "").trim();
  if (!key || key === PLACEHOLDER_KEY) return null;
  return key;
}

app.set("trust proxy", 1);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: "100kb" }));

/* ---------- Prompts for each task ---------- */
const SYSTEM_BASE =
  "You are an expert professional communication assistant. " +
  "Output only the requested result. Do not add explanations, preambles, or notes about what you did.";

const TASK_PROMPTS = {
  reply:
    SYSTEM_BASE +
    " Write a professional, polite, and clear reply to the email the user provides. " +
    "Include a suitable subject line starting with 'Subject:', a greeting, a well-structured body that addresses every point raised, " +
    "and a professional closing. Use placeholders like [Your Name] where details are unknown.",
  rewrite:
    SYSTEM_BASE +
    " Rewrite the user's informal message into polished, professional language. " +
    "Preserve the original meaning and intent. Keep it concise, courteous, and free of slang.",
  summarize:
    SYSTEM_BASE +
    " Summarize the email the user provides. Preserve all important information: sender intent, key facts, " +
    "dates, deadlines, numbers, decisions, and required actions. Format as a one-sentence overview followed by " +
    "short bullet points for key details and a final 'Action items' section (write 'None' if there are no actions).",
  followup:
    SYSTEM_BASE +
    " Using the previous conversation or context the user provides, write a polite, professional follow-up email. " +
    "Include a subject line starting with 'Subject:', reference the earlier communication, politely ask for the needed response or update, " +
    "and close professionally. Use placeholders like [Your Name] where details are unknown.",
};

/* ---------- Simple in-memory rate limiter (per IP) ---------- */
const hits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

function rateLimit(req, res, next) {
  const now = Date.now();
  const entry = hits.get(req.ip);
  if (!entry || now > entry.resetAt) {
    hits.set(req.ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return res
      .status(429)
      .json({ error: "Too many requests. Please wait a minute and try again." });
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) if (now > entry.resetAt) hits.delete(ip);
}, WINDOW_MS).unref();

/* ---------- API routes ---------- */
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", keyConfigured: Boolean(getApiKey()) });
});

app.post("/api/generate", rateLimit, async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(500).json({
      error:
        "OpenRouter API key is not set. Open the .env file, paste your key after OPENROUTER_API_KEY=, then restart the server.",
    });
  }

  const { task, text } = req.body || {};

  if (!task || !TASK_PROMPTS[task]) {
    return res.status(400).json({ error: "Invalid task selected." });
  }
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Please enter some text first." });
  }
  if (text.length > MAX_INPUT_CHARS) {
    return res
      .status(400)
      .json({ error: `Input is too long. Maximum is ${MAX_INPUT_CHARS} characters.` });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || `http://localhost:${PORT}`,
        "X-Title": "AI Email Assistant",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.6,
        max_tokens: 1200,
        messages: [
          { role: "system", content: TASK_PROMPTS[task] },
          { role: "user", content: text.trim() },
        ],
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const upstream = data?.error?.message;
      const messages = {
        401: "Invalid OpenRouter API key. Check OPENROUTER_API_KEY in your .env file.",
        402: "Your OpenRouter account has insufficient credits.",
        429: "The AI service is rate limited right now. Please try again shortly.",
      };
      console.error("OpenRouter error:", response.status, upstream);
      return res
        .status([401, 402, 429].includes(response.status) ? response.status : 502)
        .json({ error: messages[response.status] || upstream || "The AI service returned an error." });
    }

    const result = data?.choices?.[0]?.message?.content?.trim();
    if (!result) {
      return res.status(502).json({ error: "The AI returned an empty response. Please try again." });
    }

    res.json({ result });
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "The AI took too long to respond. Please try again." });
    }
    console.error("Request failed:", err);
    res.status(500).json({ error: "Could not reach the AI service. Please try again." });
  } finally {
    clearTimeout(timeout);
  }
});

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

/* ---------- Serve the built React app in production ---------- */
const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

app.listen(PORT, () => {
  console.log(`AI Email Assistant server running on http://localhost:${PORT}`);
  if (!getApiKey()) {
    console.warn("WARNING: OPENROUTER_API_KEY is not set. Open the .env file and paste your key.");
  }
});
