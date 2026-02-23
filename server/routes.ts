import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  insertPathwaySchema, insertProgramSchema, insertResourceSchema,
  insertResearchTaskSchema
} from "@shared/schema";
import { textToSpeech } from "./replit_integrations/audio/client";

const replitOpenai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

let knowledgeCache: string | null = null;
let knowledgeCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getCachedKnowledge(): Promise<string> {
  const now = Date.now();
  if (knowledgeCache && now - knowledgeCacheTime < CACHE_TTL) {
    return knowledgeCache;
  }
  knowledgeCache = await storage.getPathwayKnowledge();
  knowledgeCacheTime = now;
  return knowledgeCache;
}

function invalidateKnowledgeCache() {
  knowledgeCache = null;
  knowledgeCacheTime = 0;
}

const DEFAULT_CHAT_MODEL = "gpt-4o-mini";

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-5-mini": { input: 0.30, output: 1.20 },
  "gpt-5-nano": { input: 0.10, output: 0.40 },
  "gpt-4.1-mini": { input: 0.40, output: 1.60 },
  "gpt-4.1-nano": { input: 0.10, output: 0.40 },
  "claude-sonnet-4-20250514": { input: 3.00, output: 15.00 },
  "claude-haiku-3-5-20241022": { input: 0.80, output: 4.00 },
  "deepseek/deepseek-chat-v3-0324": { input: 0.14, output: 0.28 },
  "deepseek/deepseek-r1": { input: 0.55, output: 2.19 },
  "qwen/qwen-2.5-72b-instruct": { input: 0.36, output: 0.36 },
  "mistralai/mistral-small-3.1-24b-instruct": { input: 0.10, output: 0.30 },
  "google/gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "google/gemini-2.5-pro-preview": { input: 1.25, output: 10.00 },
  "meta-llama/llama-4-maverick": { input: 0.20, output: 0.60 },
  "x-ai/grok-3-mini-beta": { input: 0.30, output: 0.50 },
  "perplexity/sonar-pro": { input: 3.00, output: 15.00 },
  "perplexity/sonar": { input: 1.00, output: 1.00 },
  "perplexity/sonar-deep-research": { input: 2.00, output: 8.00 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const costs = MODEL_COSTS[model] || { input: 0.50, output: 1.50 };
  return (promptTokens * costs.input + completionTokens * costs.output) / 1_000_000;
}

function getProviderFromModelId(modelId: string): string {
  if (modelId.startsWith("openai-direct/")) return "openai";
  if (modelId.startsWith("anthropic/")) return "anthropic";
  if (modelId.startsWith("openrouter/")) return "openrouter";
  if (modelId.startsWith("perplexity/")) return "perplexity";
  return "replit";
}

async function checkBudget(): Promise<{ allowed: boolean; reason?: string }> {
  const dailyBudget = await storage.getSetting("daily_token_budget");
  const monthlyBudget = await storage.getSetting("monthly_token_budget");

  if (dailyBudget) {
    const dailyStats = await storage.getTokenUsageStats("day");
    if (dailyStats.totalTokens >= parseInt(dailyBudget)) {
      return { allowed: false, reason: `Daily token budget exceeded (${dailyStats.totalTokens.toLocaleString()} / ${parseInt(dailyBudget).toLocaleString()})` };
    }
  }

  if (monthlyBudget) {
    const monthlyStats = await storage.getTokenUsageStats("month");
    if (monthlyStats.totalTokens >= parseInt(monthlyBudget)) {
      return { allowed: false, reason: `Monthly token budget exceeded (${monthlyStats.totalTokens.toLocaleString()} / ${parseInt(monthlyBudget).toLocaleString()})` };
    }
  }

  return { allowed: true };
}

async function trackTokens(modelId: string, usageType: string, usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined) {
  if (!usage) return;
  const prompt = usage.prompt_tokens || 0;
  const completion = usage.completion_tokens || 0;
  const total = usage.total_tokens || prompt + completion;
  const provider = getProviderFromModelId(modelId);
  const rawModel = modelId.replace(/^(openai-direct|anthropic|openrouter|perplexity)\//, "");
  const cost = estimateCost(rawModel, prompt, completion);

  try {
    await storage.recordTokenUsage({
      model: rawModel,
      provider,
      usageType,
      promptTokens: prompt,
      completionTokens: completion,
      totalTokens: total,
      estimatedCost: cost,
    });
  } catch (err) {
    console.error("Failed to record token usage:", err);
  }
}

async function getAIClient(modelId: string): Promise<{ client: OpenAI; model: string }> {
  const settings = await storage.getAllSettings();
  const settingsMap: Record<string, string> = {};
  for (const s of settings) settingsMap[s.key] = s.value;

  if (modelId.startsWith("anthropic/")) {
    const apiKey = settingsMap["anthropic_api_key"];
    if (!apiKey) throw new Error("Anthropic API key not configured. Set it in Admin Settings.");
    return {
      client: new OpenAI({ apiKey, baseURL: "https://api.anthropic.com/v1/" }),
      model: modelId.replace("anthropic/", ""),
    };
  }

  if (modelId.startsWith("openrouter/")) {
    const apiKey = settingsMap["openrouter_api_key"];
    if (!apiKey) throw new Error("OpenRouter API key not configured. Set it in Admin Settings.");
    return {
      client: new OpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" }),
      model: modelId.replace("openrouter/", ""),
    };
  }

  if (modelId.startsWith("perplexity/")) {
    const apiKey = settingsMap["openrouter_api_key"];
    if (!apiKey) throw new Error("OpenRouter API key not configured (used for Perplexity models). Set it in Admin Settings.");
    return {
      client: new OpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" }),
      model: modelId.replace("perplexity/", ""),
    };
  }

  if (modelId.startsWith("openai-direct/")) {
    const apiKey = settingsMap["openai_api_key"];
    if (!apiKey) throw new Error("OpenAI API key not configured. Set it in Admin Settings.");
    return {
      client: new OpenAI({ apiKey }),
      model: modelId.replace("openai-direct/", ""),
    };
  }

  return { client: replitOpenai, model: modelId };
}

const SYSTEM_PROMPT = `You are the North State Pathways AI Assistant — a warm, knowledgeable career advisor for students in Northern California.

FORMAT RULES (STRICT):
- Use **bold** for program names, institution names, and key terms
- Use bullet points (•) when listing 2+ items
- Use short paragraphs (2-3 sentences each), separated by blank lines
- Structure longer answers with a brief intro line, then bullets, then a follow-up question
- NEVER write walls of text — break everything into scannable chunks
- Keep total response to 4-8 lines max (including bullets)

LINK RULES (IMPORTANT):
- When mentioning a program or institution that has a URL in the knowledge base, ALWAYS include a clickable markdown link
- Format links as: [Program Name](url) or [Institution Name](url)
- Example: **[CNA Program](https://www.shastacollege.edu/academics/programs/nursing/)** at **[Shasta College](https://www.shastacollege.edu)**
- For resources with URLs (scholarships, financial aid), always include the link so students can apply or learn more
- Never fabricate URLs — only use URLs provided in the knowledge base below

CONVERSATION RULES:
- Lead with your top 1-2 recommendations, specific to their county and pathway
- Always name the specific institution and program with links when available
- End most responses with ONE focused follow-up question to guide them deeper
- Never repeat what the student already told you
- Be encouraging but brief — like a helpful advisor in a quick meeting

EXAMPLE GOOD RESPONSE:
Great news! Based on your interest in healthcare in Shasta County, here are your best options:

• **[CNA Certificate](https://www.shastacollege.edu/academics/programs/nursing/)** at **[Shasta College](https://www.shastacollege.edu)** — 1 semester, gets you working fast
• **[LVN Program](https://www.shastacollege.edu/academics/divisions-departments/health-sciences-hsup/health-sciences-programs/vocational-nursing-vn-program/)** at **[Shasta College](https://www.shastacollege.edu)** — 1 year, higher earning potential

Both programs have financial aid available through the **[California Promise Grant](https://www.csac.ca.gov)**. Would you like to explore the quick CNA path, or are you more interested in the LVN program?

Counties: Butte, Glenn, Lassen, Modoc, Plumas, Shasta, Sierra, Siskiyou, Tehama, Trinity
Healthcare: Nursing (CNA/LVN/RN/BSN), Medical Assisting, EMS, Allied Health
Education: Teaching credentials, paraprofessional, education degrees

You are an informational guide. Always recommend verifying details with institutions directly.`;

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ========== AUTH API ==========
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME || "SCAILE";
    const adminPass = process.env.ADMIN_PASSWORD || "";

    if (username === adminUser && password === adminPass) {
      req.session.isAdmin = true;
      req.session.save((err) => {
        if (err) {
          res.status(500).json({ error: "Session save failed" });
        } else {
          res.json({ success: true });
        }
      });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/check", (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json({ authenticated: !!req.session?.isAdmin });
  });

  // ========== PUBLIC RESOURCES API ==========
  app.get("/api/resources", async (req, res) => {
    try {
      const allResources = await storage.getResources();
      const { pathway, county } = req.query;
      let filtered = allResources;
      if (pathway && typeof pathway === "string") {
        const allPathways = await storage.getPathways();
        const match = allPathways.find(p => p.name.toLowerCase().includes(pathway.toLowerCase()));
        if (match) {
          filtered = filtered.filter(r => !r.pathwayId || r.pathwayId === match.id);
        }
      }
      if (county && typeof county === "string") {
        filtered = filtered.filter(r => !r.county || r.county.toLowerCase() === county.toLowerCase());
      }
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  });

  // ========== TTS API ==========
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text required" });
      }
      const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
      const selectedVoice = validVoices.includes(voice) ? voice : "nova";
      const audioBuffer = await textToSpeech(text, selectedVoice, "mp3");
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", audioBuffer.length.toString());
      res.send(audioBuffer);
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // ========== CHAT API ==========
  app.post("/api/chat/sessions", async (req, res) => {
    try {
      const session = await storage.createChatSession({
        sessionId: randomUUID(),
        userType: req.body.userType || null,
        county: req.body.county || null,
        interests: req.body.interests || null,
        metadata: req.body.metadata || null,
      });
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.post("/api/chat/sessions/:id/messages", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id as string);
      const { content } = req.body;
      if (!content || typeof content !== "string") return res.status(400).json({ error: "Content required" });

      const budgetCheck = await checkBudget();
      if (!budgetCheck.allowed) {
        return res.status(429).json({ error: budgetCheck.reason });
      }

      await storage.createChatMessage({ sessionId, role: "user", content });

      const history = await storage.getChatMessagesBySession(sessionId);
      const knowledge = await getCachedKnowledge();
      const chatModelSetting = (await storage.getSetting("chat_model")) || DEFAULT_CHAT_MODEL;

      let aiClient: OpenAI;
      let modelName: string;
      try {
        const result = await getAIClient(chatModelSetting);
        aiClient = result.client;
        modelName = result.model;
      } catch {
        aiClient = replitOpenai;
        modelName = DEFAULT_CHAT_MODEL;
      }

      const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\n--- PATHWAY KNOWLEDGE BASE ---\n${knowledge}\n--- END KNOWLEDGE BASE ---`,
        },
        ...history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let clientDisconnected = false;
      req.on("close", () => { clientDisconnected = true; });

      const stream = await aiClient.chat.completions.create({
        model: modelName,
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 4096,
      });

      let fullResponse = "";
      try {
        for await (const chunk of stream) {
          if (clientDisconnected) break;
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }
      } catch (streamError: any) {
        console.error("Stream error:", streamError?.message || streamError);
        if (!fullResponse) {
          res.write(`data: ${JSON.stringify({ content: "I'm sorry, I encountered an issue. Please try again." })}\n\n`);
          fullResponse = "I'm sorry, I encountered an issue. Please try again.";
        }
      }

      if (fullResponse) {
        await storage.createChatMessage({ sessionId, role: "assistant", content: fullResponse });
        const systemContent = `${SYSTEM_PROMPT}\n\n--- PATHWAY KNOWLEDGE BASE ---\n${knowledge}\n--- END KNOWLEDGE BASE ---`;
        const inputText = systemContent + history.map(m => m.content).join(" ");
        const estPrompt = Math.ceil(inputText.length / 4);
        const estCompletion = Math.ceil(fullResponse.length / 4);
        trackTokens(chatModelSetting, "chat", { prompt_tokens: estPrompt, completion_tokens: estCompletion, total_tokens: estPrompt + estCompletion });
      }

      if (!clientDisconnected) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

        const session = await storage.getChatSession(sessionId);
        if (session && !session.userType && history.length <= 2) {
          const fullConversation = [...history.map((m) => `${m.role}: ${m.content}`), `assistant: ${fullResponse}`].join("\n");
          (async () => {
            try {
              const profilingModelSetting = (await storage.getSetting("profiling_model")) || "gpt-4o-mini";
              let profClient: OpenAI;
              let profModel: string;
              try {
                const result = await getAIClient(profilingModelSetting);
                profClient = result.client;
                profModel = result.model;
              } catch {
                profClient = replitOpenai;
                profModel = "gpt-4o-mini";
              }
              const extractRes = await profClient.chat.completions.create({
                model: profModel,
                messages: [
                  {
                    role: "system",
                    content: 'Extract user info from this conversation. Return JSON: {"userType":"high school student|college student|adult learner|parent|counselor|unknown","county":"county name or null","interests":["interest1"]}',
                  },
                  { role: "user", content: fullConversation },
                ],
                response_format: { type: "json_object" },
              });
              trackTokens(profilingModelSetting, "profiling", extractRes.usage as any);
              const extracted = JSON.parse(extractRes.choices[0]?.message?.content || "{}");
              if (extracted.userType || extracted.county) {
                await storage.updateChatSession(sessionId, {
                  userType: extracted.userType || null,
                  county: extracted.county || null,
                  interests: extracted.interests || null,
                });
              }
            } catch (err) {
              console.error("Background profiling error:", err);
            }
          })();
        }
      }
    } catch (error) {
      console.error("Error in chat:", error);
      if (res.headersSent) {
        try {
          res.write(`data: ${JSON.stringify({ error: "Chat error" })}\n\n`);
          res.end();
        } catch {}
      } else {
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  });

  // ========== ADMIN API (protected) ==========
  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/sessions", requireAdmin, async (_req, res) => {
    try {
      const sessions = await storage.getAllChatSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/admin/sessions/:id/messages", requireAdmin, async (req, res) => {
    try {
      const messages = await storage.getChatMessagesBySession(parseInt(req.params.id as string));
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Pathways CRUD
  app.get("/api/admin/pathways", requireAdmin, async (_req, res) => {
    try { res.json(await storage.getPathways()); }
    catch (error) { res.status(500).json({ error: "Failed to fetch pathways" }); }
  });

  app.post("/api/admin/pathways", requireAdmin, async (req, res) => {
    try {
      const parsed = insertPathwaySchema.parse(req.body);
      const pathway = await storage.createPathway(parsed);
      invalidateKnowledgeCache();
      res.status(201).json(pathway);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to create pathway" });
    }
  });

  app.patch("/api/admin/pathways/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = insertPathwaySchema.partial().parse(req.body);
      const pathway = await storage.updatePathway(parseInt(req.params.id as string), parsed);
      invalidateKnowledgeCache();
      res.json(pathway);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to update pathway" });
    }
  });

  app.delete("/api/admin/pathways/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deletePathway(parseInt(req.params.id as string));
      invalidateKnowledgeCache();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete pathway" });
    }
  });

  // Programs CRUD
  app.get("/api/admin/programs", requireAdmin, async (_req, res) => {
    try { res.json(await storage.getPrograms()); }
    catch (error) { res.status(500).json({ error: "Failed to fetch programs" }); }
  });

  app.post("/api/admin/programs", requireAdmin, async (req, res) => {
    try {
      const parsed = insertProgramSchema.parse(req.body);
      const program = await storage.createProgram(parsed);
      invalidateKnowledgeCache();
      res.status(201).json(program);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to create program" });
    }
  });

  app.patch("/api/admin/programs/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateProgram(parseInt(req.params.id as string), req.body);
      invalidateKnowledgeCache();
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update program" });
    }
  });

  app.delete("/api/admin/programs/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProgram(parseInt(req.params.id as string));
      invalidateKnowledgeCache();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete program" });
    }
  });

  // Institutions
  app.get("/api/admin/institutions", requireAdmin, async (_req, res) => {
    try { res.json(await storage.getInstitutions()); }
    catch (error) { res.status(500).json({ error: "Failed to fetch institutions" }); }
  });

  // Resources CRUD
  app.get("/api/admin/resources", requireAdmin, async (_req, res) => {
    try { res.json(await storage.getResources()); }
    catch (error) { res.status(500).json({ error: "Failed to fetch resources" }); }
  });

  app.post("/api/admin/resources", requireAdmin, async (req, res) => {
    try {
      const parsed = insertResourceSchema.parse(req.body);
      const resource = await storage.createResource(parsed);
      invalidateKnowledgeCache();
      res.status(201).json(resource);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to create resource" });
    }
  });

  app.patch("/api/admin/resources/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = insertResourceSchema.partial().parse(req.body);
      const resource = await storage.updateResource(parseInt(req.params.id as string), parsed);
      if (!resource) return res.status(404).json({ error: "Resource not found" });
      invalidateKnowledgeCache();
      res.json(resource);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to update resource" });
    }
  });

  app.delete("/api/admin/resources/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteResource(parseInt(req.params.id as string));
      invalidateKnowledgeCache();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete resource" });
    }
  });

  // ========== SETTINGS API ==========
  const API_KEY_SETTINGS = ["openai_api_key", "anthropic_api_key", "openrouter_api_key"];

  app.post("/api/admin/test-api-key", requireAdmin, async (req, res) => {
    try {
      const { provider } = req.body;
      const settings = await storage.getAllSettings();
      const settingsMap: Record<string, string> = {};
      for (const s of settings) settingsMap[s.key] = s.value;

      let client: OpenAI;
      let model: string;

      if (provider === "openai") {
        const apiKey = settingsMap["openai_api_key"];
        if (!apiKey) return res.status(400).json({ error: "No OpenAI API key configured" });
        client = new OpenAI({ apiKey });
        model = "gpt-4o-mini";
      } else if (provider === "anthropic") {
        const apiKey = settingsMap["anthropic_api_key"];
        if (!apiKey) return res.status(400).json({ error: "No Anthropic API key configured" });
        client = new OpenAI({ apiKey, baseURL: "https://api.anthropic.com/v1/" });
        model = "claude-haiku-3-5-20241022";
      } else if (provider === "openrouter") {
        const apiKey = settingsMap["openrouter_api_key"];
        if (!apiKey) return res.status(400).json({ error: "No OpenRouter API key configured" });
        client = new OpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" });
        model = "openai/gpt-4o-mini";
      } else {
        return res.status(400).json({ error: "Unknown provider" });
      }

      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: "Say hello in one word." }],
        max_tokens: 10,
      });

      const reply = response.choices[0]?.message?.content;
      if (reply) {
        res.json({ success: true, model });
      } else {
        res.status(500).json({ error: "No response from model" });
      }
    } catch (error: any) {
      const msg = error?.message || "Connection failed";
      res.status(500).json({ error: msg.length > 200 ? msg.slice(0, 200) : msg });
    }
  });

  app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
    try {
      const settings = await storage.getAllSettings();
      const settingsMap: Record<string, string> = {};
      for (const s of settings) {
        if (API_KEY_SETTINGS.includes(s.key) && s.value) {
          settingsMap[s.key] = s.value.slice(0, 4) + "•".repeat(Math.max(0, s.value.length - 8)) + s.value.slice(-4);
        } else {
          settingsMap[s.key] = s.value;
        }
      }
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  const validSettingKeys = [
    "chat_model", "profiling_model", "research_model",
    "openai_api_key", "anthropic_api_key", "openrouter_api_key",
    "daily_token_budget", "monthly_token_budget",
  ] as const;

  const settingSchema = z.object({
    key: z.enum(validSettingKeys),
    value: z.string(),
  });

  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const parsed = settingSchema.parse(req.body);
      if (API_KEY_SETTINGS.includes(parsed.key) && parsed.value.includes("•")) {
        return res.json({ skipped: true });
      }
      const setting = await storage.setSetting(parsed.key, parsed.value);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  // Research Tasks
  app.get("/api/admin/research", requireAdmin, async (_req, res) => {
    try { res.json(await storage.getResearchTasks()); }
    catch (error) { res.status(500).json({ error: "Failed to fetch research tasks" }); }
  });

  app.post("/api/admin/research", requireAdmin, async (req, res) => {
    try {
      const parsed = insertResearchTaskSchema.parse(req.body);
      const task = await storage.createResearchTask(parsed);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to create research task" });
    }
  });

  app.post("/api/admin/research/:id/run", requireAdmin, async (req, res) => {
    try {
      const task = await storage.getResearchTask(parseInt(req.params.id as string));
      if (!task) return res.status(404).json({ error: "Task not found" });

      await storage.updateResearchTask(task.id, { status: "researching" });

      const knowledge = await storage.getPathwayKnowledge();
      const researchModelSetting = (await storage.getSetting("research_model")) || "gpt-5-mini";

      let researchClient: OpenAI;
      let researchModel: string;
      try {
        const result = await getAIClient(researchModelSetting);
        researchClient = result.client;
        researchModel = result.model;
      } catch {
        researchClient = replitOpenai;
        researchModel = "gpt-5-mini";
      }

      const countyScope = task.county ? `Focus EXCLUSIVELY on ${task.county}.` : "Cover all 10 North State counties: Butte, Glenn, Lassen, Modoc, Plumas, Shasta, Sierra, Siskiyou, Tehama, and Trinity.";
      const allPathways = await storage.getPathways();
      const pathwayName = task.pathwayId ? allPathways.find((p: any) => p.id === task.pathwayId)?.name : null;

      const response = await researchClient.chat.completions.create({
        model: researchModel,
        messages: [
          {
            role: "system",
            content: `You are a research assistant for North State Pathways, focused on education and career pathways in Northern California.

SCOPE: ${countyScope}
${pathwayName ? `PATHWAY FOCUS: ${pathwayName}` : ""}
Do NOT include institutions or programs outside the specified county/region.

Current knowledge base:
${knowledge}

RESPONSE FORMAT — Follow this EXACTLY:

## Findings
Concise summary of verified findings (2-4 paragraphs max). State only facts — do NOT suggest next steps, options, or ask follow-up questions.

## Programs Found
For each program discovered, list on a single line:
- **[Program Name]** at [Institution] — [Level] — [Brief description] — [URL if known]

## Resources Found
For each resource (scholarship, financial aid, support service):
- **[Resource Name]** ([Type]) — [Description] — Eligibility: [who qualifies] — [URL if known]

---ACTIONS---
After the separator above, output a JSON array of recommended actions. Each action creates a program or resource in the knowledge base. Use this exact format:
\`\`\`json
[
  {
    "type": "program",
    "name": "Program Name",
    "institution": "Institution Name",
    "county": "County Name",
    "level": "Certificate|Associate|Bachelor|Master|Training",
    "description": "Brief description",
    "url": "https://..."
  },
  {
    "type": "resource",
    "name": "Resource Name",
    "resourceType": "Scholarship|Grant|Financial Aid|Support Service|Internship",
    "description": "What it provides",
    "eligibility": "Who qualifies",
    "url": "https://...",
    "counties": ["County1", "County2"]
  }
]
\`\`\`

RULES:
- Be concise and factual. No suggestions, no follow-up questions, no "options to consider."
- Only include programs/resources you have actual information about.
- The JSON actions block is for structured data extraction — include every item from your findings.`,
          },
          {
            role: "user",
            content: `Research task: ${task.title}\n\nDescription: ${task.description || "No additional description"}\n\nCounty: ${task.county || "All North State counties"}`,
          },
        ],
        max_completion_tokens: 4096,
      });

      trackTokens(researchModelSetting, "research", response.usage as any);

      const aiResponse = response.choices[0]?.message?.content || "No findings generated.";
      await storage.updateResearchTask(task.id, {
        status: "completed",
        aiResponse,
      });

      const updated = await storage.getResearchTask(task.id);
      res.json(updated);
    } catch (error) {
      console.error("Research error:", error);
      res.status(500).json({ error: "Failed to run research" });
    }
  });

  app.post("/api/admin/research/:id/approve", requireAdmin, async (req, res) => {
    try {
      const task = await storage.getResearchTask(parseInt(req.params.id as string));
      if (!task) return res.status(404).json({ error: "Task not found" });
      await storage.updateResearchTask(task.id, {
        status: "approved",
        approved: true,
        findings: task.aiResponse,
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to approve task" });
    }
  });

  app.post("/api/admin/research/:id/reject", requireAdmin, async (req, res) => {
    try {
      await storage.updateResearchTask(parseInt(req.params.id as string), {
        status: "rejected",
        approved: false,
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reject task" });
    }
  });

  app.patch("/api/admin/research/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateResearchTask(parseInt(req.params.id as string), req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update research task" });
    }
  });

  app.delete("/api/admin/research/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteResearchTask(parseInt(req.params.id as string));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete research task" });
    }
  });

  // ========== TOKEN USAGE API ==========
  app.get("/api/admin/token-usage", requireAdmin, async (_req, res) => {
    try {
      const [daily, monthly] = await Promise.all([
        storage.getTokenUsageStats("day"),
        storage.getTokenUsageStats("month"),
      ]);
      const dailyBudget = await storage.getSetting("daily_token_budget");
      const monthlyBudget = await storage.getSetting("monthly_token_budget");
      res.json({
        daily,
        monthly,
        budgets: {
          daily: dailyBudget ? parseInt(dailyBudget) : null,
          monthly: monthlyBudget ? parseInt(monthlyBudget) : null,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch token usage" });
    }
  });

  return httpServer;
}
