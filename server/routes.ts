import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  insertPathwaySchema, insertProgramSchema, insertResourceSchema,
  insertResearchTaskSchema, insertOnboardingScriptSchema
} from "@shared/schema";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
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
    const budgetDollars = parseFloat(dailyBudget);
    if (budgetDollars > 0) {
      const dailyStats = await storage.getTokenUsageStats("day");
      if (dailyStats.estimatedCost >= budgetDollars) {
        return { allowed: false, reason: `Daily spending budget exceeded ($${dailyStats.estimatedCost.toFixed(4)} / $${budgetDollars.toFixed(2)})` };
      }
    }
  }

  if (monthlyBudget) {
    const budgetDollars = parseFloat(monthlyBudget);
    if (budgetDollars > 0) {
      const monthlyStats = await storage.getTokenUsageStats("month");
      if (monthlyStats.estimatedCost >= budgetDollars) {
        return { allowed: false, reason: `Monthly spending budget exceeded ($${monthlyStats.estimatedCost.toFixed(4)} / $${budgetDollars.toFixed(2)})` };
      }
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
      client: new OpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: { "HTTP-Referer": "https://northstatepathways.org", "X-Title": "North State Pathways" },
      }),
      model: modelId.replace("openrouter/", ""),
    };
  }

  if (modelId.startsWith("perplexity/")) {
    const apiKey = settingsMap["openrouter_api_key"];
    if (!apiKey) throw new Error("OpenRouter API key not configured (used for Perplexity models). Set it in Admin Settings.");
    return {
      client: new OpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: { "HTTP-Referer": "https://northstatepathways.org", "X-Title": "North State Pathways" },
      }),
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

const SYSTEM_PROMPT_SPANISH = `Eres el Asistente de IA de North State Pathways — un asesor de carreras cálido y conocedor para estudiantes en el norte de California. DEBES responder SIEMPRE en español.

REGLAS DE FORMATO (ESTRICTAS):
- Usa **negritas** para nombres de programas, instituciones y términos clave
- Usa viñetas (•) al listar 2 o más elementos
- Usa párrafos cortos (2-3 oraciones cada uno), separados por líneas en blanco
- Estructura respuestas largas con una línea de introducción, luego viñetas, luego una pregunta de seguimiento
- NUNCA escribas bloques largos de texto — divide todo en secciones fáciles de leer
- Mantén la respuesta total a 4-8 líneas máximo (incluyendo viñetas)

REGLAS DE ENLACES (IMPORTANTE):
- Cuando menciones un programa o institución que tiene URL en la base de conocimiento, SIEMPRE incluye un enlace markdown
- Formato de enlaces: [Nombre del Programa](url) o [Nombre de la Institución](url)
- Ejemplo: **[Programa CNA](https://www.shastacollege.edu/academics/programs/nursing/)** en **[Shasta College](https://www.shastacollege.edu)**
- Para recursos con URLs (becas, ayuda financiera), siempre incluye el enlace
- Nunca inventes URLs — solo usa las URLs proporcionadas en la base de conocimiento

REGLAS DE CONVERSACIÓN:
- Comienza con tus 1-2 mejores recomendaciones, específicas para su condado y ruta
- Siempre nombra la institución y programa específicos con enlaces cuando estén disponibles
- Termina la mayoría de respuestas con UNA pregunta de seguimiento enfocada
- Nunca repitas lo que el estudiante ya te dijo
- Sé alentador pero breve — como un asesor útil en una reunión rápida

EJEMPLO DE BUENA RESPUESTA:
¡Excelentes noticias! Basándome en tu interés en salud en el Condado de Shasta, aquí están tus mejores opciones:

• **[Certificado CNA](https://www.shastacollege.edu/academics/programs/nursing/)** en **[Shasta College](https://www.shastacollege.edu)** — 1 semestre, te permite trabajar rápidamente
• **[Programa LVN](https://www.shastacollege.edu/academics/divisions-departments/health-sciences-hsup/health-sciences-programs/vocational-nursing-vn-program/)** en **[Shasta College](https://www.shastacollege.edu)** — 1 año, mayor potencial de ingresos

Ambos programas tienen ayuda financiera disponible a través del **[California Promise Grant](https://www.csac.ca.gov)**. ¿Te gustaría explorar el camino rápido del CNA o estás más interesado en el programa LVN?

Condados: Butte, Glenn, Lassen, Modoc, Plumas, Shasta, Sierra, Siskiyou, Tehama, Trinity
Salud: Enfermería (CNA/LVN/RN/BSN), Asistencia Médica, Servicios de Emergencia, Salud Afín
Educación: Credenciales de enseñanza, paraprofesional, títulos en educación

Eres una guía informativa. Siempre recomienda verificar los detalles directamente con las instituciones.`;

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
    const adminUser = (process.env.ADMIN_USERNAME || "SCAILE").trim();
    const adminPass = (process.env.ADMIN_PASSWORD || "").trim();
    const inputUser = (username || "").trim();
    const inputPass = (password || "").trim();

    if (inputUser === adminUser && inputPass === adminPass) {
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

  // ========== MAP API ==========
  app.get("/api/map/institutions", async (req, res) => {
    try {
      const institutions = await storage.getInstitutions();
      const programs = await storage.getPrograms();
      const pathways = await storage.getPathways();

      const result = institutions.map(inst => {
        const instPrograms = programs
          .filter(p => p.institutionId === inst.id)
          .map(p => ({
            id: p.id,
            name: p.name,
            level: p.level,
            pathway: pathways.find(pw => pw.id === p.pathwayId)?.name || null,
            pathwaySlug: pathways.find(pw => pw.id === p.pathwayId)?.slug || null,
            url: p.url,
          }));
        return {
          id: inst.id,
          name: inst.name,
          type: inst.type,
          county: inst.county,
          website: inst.website,
          description: inst.description,
          programs: instPrograms,
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching map institutions:", error);
      res.status(500).json({ error: "Failed to fetch map data" });
    }
  });

  // ========== SELF-ASSESSMENT API ==========

  interface CareerProfile {
    id: string;
    title: { en: string; es: string };
    description: { en: string; es: string };
    salary: { en: string; es: string };
    education: { en: string; es: string };
    outlook: { en: string; es: string };
    scoring: Record<string, Record<string, number>>;
  }

  const healthcareCareers: CareerProfile[] = [
    {
      id: "registered_nurse",
      title: { en: "Registered Nurse (RN)", es: "Enfermero/a Registrado/a (RN)" },
      description: { en: "Provide direct patient care in hospitals, clinics, and community health settings. Assess patients, administer treatments, and coordinate care plans.", es: "Brinda atención directa al paciente en hospitales, clínicas y entornos de salud comunitaria." },
      salary: { en: "$80,000 – $120,000/year", es: "$80,000 – $120,000/año" },
      education: { en: "Associate or Bachelor's Degree in Nursing (2–4 years)", es: "Título de asociado o licenciatura en enfermería (2-4 años)" },
      outlook: { en: "High demand — 6% growth expected through 2032", es: "Alta demanda — crecimiento del 6% esperado hasta 2032" },
      scoring: { hc_motivation: { passion: 15, growth: 10, money: 5, balance: 0 }, hc_education: { medium: 15, short: 10, long: 5, minimal: 0 }, hc_patients: { all_the_time: 15, some: 5, minimal: 0 }, hc_medical: { very: 15, somewhat: 10, not_really: 0 }, hc_emergency: { moderate: 10, fast: 10, calm: 0 }, hc_age_group: { all: 10, elderly: 10, adults: 8, children: 8 }, hc_setting: { hospital: 15, clinic: 10, community: 5, office: 0 }, hc_tasks: { hands_on: 15, technology: 5, counseling: 5, administrative: 0 } },
    },
    {
      id: "licensed_vocational_nurse",
      title: { en: "Licensed Vocational Nurse (LVN)", es: "Enfermero/a Vocacional con Licencia (LVN)" },
      description: { en: "Provide basic nursing care under supervision of RNs and doctors in long-term care, clinics, and home health settings.", es: "Brinda cuidados básicos de enfermería bajo supervisión de RNs y médicos." },
      salary: { en: "$50,000 – $65,000/year", es: "$50,000 – $65,000/año" },
      education: { en: "Certificate or Diploma (12–18 months)", es: "Certificado o diploma (12-18 meses)" },
      outlook: { en: "Steady demand — especially in rural and long-term care", es: "Demanda constante — especialmente en áreas rurales" },
      scoring: { hc_motivation: { passion: 15, balance: 10, money: 5, growth: 5 }, hc_education: { short: 15, minimal: 10, medium: 0, long: 0 }, hc_patients: { all_the_time: 15, some: 10, minimal: 0 }, hc_medical: { somewhat: 15, very: 10, not_really: 0 }, hc_emergency: { calm: 10, moderate: 10, fast: 0 }, hc_age_group: { elderly: 15, all: 8, adults: 5, children: 5 }, hc_setting: { clinic: 15, community: 10, hospital: 5, office: 0 }, hc_tasks: { hands_on: 15, counseling: 5, technology: 0, administrative: 0 } },
    },
    {
      id: "certified_nursing_assistant",
      title: { en: "Certified Nursing Assistant (CNA)", es: "Asistente de Enfermería Certificado (CNA)" },
      description: { en: "Help patients with daily activities like bathing, dressing, and eating in nursing homes, hospitals, and home care.", es: "Ayuda a pacientes con actividades diarias en hogares de ancianos, hospitales y cuidado en el hogar." },
      salary: { en: "$32,000 – $42,000/year", es: "$32,000 – $42,000/año" },
      education: { en: "Certificate program (4–12 weeks)", es: "Programa de certificado (4-12 semanas)" },
      outlook: { en: "Very high demand — great entry point into healthcare", es: "Muy alta demanda — excelente punto de entrada al sector salud" },
      scoring: { hc_motivation: { passion: 15, balance: 10, money: 0, growth: 5 }, hc_education: { minimal: 15, short: 10, medium: 0, long: 0 }, hc_patients: { all_the_time: 15, some: 5, minimal: 0 }, hc_medical: { somewhat: 10, very: 5, not_really: 5 }, hc_emergency: { calm: 15, moderate: 5, fast: 0 }, hc_age_group: { elderly: 15, all: 8, adults: 5, children: 3 }, hc_setting: { community: 15, hospital: 10, clinic: 5, office: 0 }, hc_tasks: { hands_on: 15, counseling: 5, technology: 0, administrative: 0 } },
    },
    {
      id: "emt_paramedic",
      title: { en: "EMT / Paramedic", es: "Técnico de Emergencias Médicas / Paramédico" },
      description: { en: "Respond to emergency calls, provide pre-hospital care, and transport patients. Work in ambulances, fire departments, and emergency rooms.", es: "Responde a llamadas de emergencia, brinda atención prehospitalaria y transporta pacientes." },
      salary: { en: "$38,000 – $65,000/year", es: "$38,000 – $65,000/año" },
      education: { en: "Certificate to Associate Degree (6 months – 2 years)", es: "Certificado a título de asociado (6 meses – 2 años)" },
      outlook: { en: "Growing demand — especially in rural communities", es: "Demanda creciente — especialmente en comunidades rurales" },
      scoring: { hc_motivation: { passion: 15, growth: 10, money: 5, balance: 0 }, hc_education: { minimal: 10, short: 15, medium: 0, long: 0 }, hc_patients: { all_the_time: 15, some: 5, minimal: 0 }, hc_medical: { very: 15, somewhat: 5, not_really: 0 }, hc_emergency: { fast: 15, moderate: 0, calm: 0 }, hc_age_group: { all: 15, adults: 8, children: 5, elderly: 5 }, hc_setting: { hospital: 15, community: 10, clinic: 0, office: 0 }, hc_tasks: { hands_on: 15, technology: 10, counseling: 0, administrative: 0 } },
    },
    {
      id: "medical_assistant",
      title: { en: "Medical Assistant", es: "Asistente Médico" },
      description: { en: "Support physicians in clinics by taking vitals, preparing patients, scheduling appointments, and managing medical records.", es: "Apoya a médicos en clínicas tomando signos vitales, preparando pacientes y gestionando registros." },
      salary: { en: "$35,000 – $45,000/year", es: "$35,000 – $45,000/año" },
      education: { en: "Certificate or Associate Degree (9 months – 2 years)", es: "Certificado o título de asociado (9 meses – 2 años)" },
      outlook: { en: "Very high demand — 14% growth expected", es: "Muy alta demanda — crecimiento del 14% esperado" },
      scoring: { hc_motivation: { balance: 15, passion: 10, money: 5, growth: 5 }, hc_education: { short: 15, minimal: 10, medium: 0, long: 0 }, hc_patients: { some: 15, all_the_time: 10, minimal: 0 }, hc_medical: { somewhat: 15, very: 5, not_really: 5 }, hc_emergency: { moderate: 15, calm: 10, fast: 0 }, hc_age_group: { all: 10, adults: 10, children: 5, elderly: 5 }, hc_setting: { clinic: 15, hospital: 5, community: 0, office: 5 }, hc_tasks: { hands_on: 10, administrative: 10, technology: 5, counseling: 0 } },
    },
    {
      id: "phlebotomist",
      title: { en: "Phlebotomist", es: "Flebotomista" },
      description: { en: "Draw blood from patients for lab tests, transfusions, and donations. Work in hospitals, clinics, blood banks, and diagnostic laboratories.", es: "Extrae sangre de pacientes para pruebas de laboratorio, transfusiones y donaciones." },
      salary: { en: "$30,000 – $40,000/year", es: "$30,000 – $40,000/año" },
      education: { en: "Certificate program (4–8 months)", es: "Programa de certificado (4-8 meses)" },
      outlook: { en: "High demand — 8% growth, quick entry into healthcare", es: "Alta demanda — crecimiento del 8%, entrada rápida al sector salud" },
      scoring: { hc_motivation: { passion: 10, balance: 15, money: 5, growth: 5 }, hc_education: { minimal: 15, short: 10, medium: 0, long: 0 }, hc_patients: { some: 15, all_the_time: 10, minimal: 0 }, hc_medical: { very: 15, somewhat: 10, not_really: 0 }, hc_emergency: { calm: 15, moderate: 10, fast: 0 }, hc_age_group: { all: 12, adults: 10, elderly: 8, children: 5 }, hc_setting: { clinic: 15, hospital: 15, community: 0, office: 0 }, hc_tasks: { hands_on: 15, technology: 10, counseling: 0, administrative: 0 } },
    },
    {
      id: "pharmacy_technician",
      title: { en: "Pharmacy Technician", es: "Técnico de Farmacia" },
      description: { en: "Assist pharmacists in preparing and dispensing medications, managing inventory, and serving patients at retail and hospital pharmacies.", es: "Asiste a farmacéuticos en la preparación y dispensación de medicamentos y atención al paciente." },
      salary: { en: "$33,000 – $44,000/year", es: "$33,000 – $44,000/año" },
      education: { en: "Certificate program (6–12 months)", es: "Programa de certificado (6-12 meses)" },
      outlook: { en: "Steady demand — essential in every community", es: "Demanda constante — esencial en cada comunidad" },
      scoring: { hc_motivation: { balance: 15, money: 10, passion: 5, growth: 5 }, hc_education: { minimal: 10, short: 15, medium: 0, long: 0 }, hc_patients: { some: 15, all_the_time: 5, minimal: 10 }, hc_medical: { somewhat: 10, not_really: 15, very: 0 }, hc_emergency: { calm: 15, moderate: 10, fast: 0 }, hc_age_group: { all: 12, adults: 10, elderly: 10, children: 5 }, hc_setting: { clinic: 10, hospital: 10, community: 5, office: 5 }, hc_tasks: { administrative: 10, technology: 10, hands_on: 5, counseling: 5 } },
    },
    {
      id: "dental_assistant",
      title: { en: "Dental Assistant", es: "Asistente Dental" },
      description: { en: "Support dentists during procedures, prepare patients, take X-rays, and manage dental office operations.", es: "Apoya a dentistas durante procedimientos, prepara pacientes, toma radiografías y gestiona operaciones." },
      salary: { en: "$34,000 – $46,000/year", es: "$34,000 – $46,000/año" },
      education: { en: "Certificate program (9–12 months)", es: "Programa de certificado (9-12 meses)" },
      outlook: { en: "Growing demand — 7% growth expected", es: "Demanda creciente — crecimiento del 7% esperado" },
      scoring: { hc_motivation: { balance: 15, passion: 10, money: 5, growth: 5 }, hc_education: { minimal: 10, short: 15, medium: 0, long: 0 }, hc_patients: { some: 15, all_the_time: 10, minimal: 0 }, hc_medical: { somewhat: 15, very: 5, not_really: 5 }, hc_emergency: { calm: 15, moderate: 10, fast: 0 }, hc_age_group: { all: 12, children: 10, adults: 8, elderly: 5 }, hc_setting: { clinic: 15, hospital: 0, community: 0, office: 5 }, hc_tasks: { hands_on: 15, technology: 10, administrative: 5, counseling: 0 } },
    },
    {
      id: "home_health_aide",
      title: { en: "Home Health Aide", es: "Asistente de Salud en el Hogar" },
      description: { en: "Provide in-home personal care and basic health services to elderly and disabled clients, helping them maintain independence.", es: "Brinda cuidado personal y servicios básicos de salud a clientes ancianos y discapacitados en sus hogares." },
      salary: { en: "$28,000 – $36,000/year", es: "$28,000 – $36,000/año" },
      education: { en: "Certificate program (75–120 hours)", es: "Programa de certificado (75-120 horas)" },
      outlook: { en: "Very high demand — 22% growth, fastest in healthcare", es: "Muy alta demanda — crecimiento del 22%, el más rápido en salud" },
      scoring: { hc_motivation: { passion: 15, balance: 10, money: 0, growth: 0 }, hc_education: { minimal: 15, short: 10, medium: 0, long: 0 }, hc_patients: { all_the_time: 15, some: 5, minimal: 0 }, hc_medical: { not_really: 10, somewhat: 10, very: 0 }, hc_emergency: { calm: 15, moderate: 5, fast: 0 }, hc_age_group: { elderly: 15, adults: 5, all: 5, children: 0 }, hc_setting: { community: 15, clinic: 0, hospital: 0, office: 0 }, hc_tasks: { hands_on: 15, counseling: 10, technology: 0, administrative: 0 } },
    },
    {
      id: "medical_biller_coder",
      title: { en: "Medical Biller / Coding Specialist", es: "Especialista en Facturación / Codificación Médica" },
      description: { en: "Translate medical procedures and diagnoses into billing codes, process insurance claims, and ensure accurate healthcare reimbursement.", es: "Traduce procedimientos y diagnósticos médicos en códigos de facturación y procesa reclamaciones de seguros." },
      salary: { en: "$38,000 – $52,000/year", es: "$38,000 – $52,000/año" },
      education: { en: "Certificate program (6–12 months)", es: "Programa de certificado (6-12 meses)" },
      outlook: { en: "Strong demand — critical role in every healthcare facility", es: "Fuerte demanda — rol crítico en cada centro de salud" },
      scoring: { hc_motivation: { money: 10, balance: 15, growth: 10, passion: 0 }, hc_education: { minimal: 10, short: 15, medium: 0, long: 0 }, hc_patients: { minimal: 15, some: 5, all_the_time: 0 }, hc_medical: { not_really: 15, somewhat: 5, very: 0 }, hc_emergency: { calm: 15, moderate: 5, fast: 0 }, hc_age_group: { all: 10, adults: 5, elderly: 3, children: 3 }, hc_setting: { office: 15, clinic: 5, hospital: 5, community: 0 }, hc_tasks: { administrative: 15, technology: 10, counseling: 0, hands_on: 0 } },
    },
    {
      id: "health_info_tech",
      title: { en: "Health Information Technologist", es: "Tecnólogo en Información de Salud" },
      description: { en: "Manage patient records, electronic health systems, and clinical data. Ensure data accuracy and compliance with healthcare regulations.", es: "Gestiona registros de pacientes, sistemas electrónicos de salud y datos clínicos." },
      salary: { en: "$42,000 – $58,000/year", es: "$42,000 – $58,000/año" },
      education: { en: "Associate Degree (2 years)", es: "Título de asociado (2 años)" },
      outlook: { en: "Strong demand — healthcare digitization driving growth", es: "Fuerte demanda — la digitalización impulsa el crecimiento" },
      scoring: { hc_motivation: { money: 10, balance: 15, growth: 10, passion: 0 }, hc_education: { short: 15, medium: 10, minimal: 5, long: 0 }, hc_patients: { minimal: 15, some: 5, all_the_time: 0 }, hc_medical: { not_really: 15, somewhat: 5, very: 0 }, hc_emergency: { calm: 15, moderate: 5, fast: 0 }, hc_age_group: { all: 10, adults: 5, elderly: 3, children: 3 }, hc_setting: { office: 15, hospital: 5, clinic: 5, community: 0 }, hc_tasks: { administrative: 15, technology: 15, counseling: 0, hands_on: 0 } },
    },
    {
      id: "dental_hygienist",
      title: { en: "Dental Hygienist", es: "Higienista Dental" },
      description: { en: "Clean teeth, examine patients for oral diseases, take X-rays, and educate patients on oral health in dental offices.", es: "Limpia dientes, examina pacientes para enfermedades orales, toma radiografías y educa sobre salud oral." },
      salary: { en: "$65,000 – $90,000/year", es: "$65,000 – $90,000/año" },
      education: { en: "Associate Degree (2–3 years)", es: "Título de asociado (2-3 años)" },
      outlook: { en: "High demand — 7% growth expected", es: "Alta demanda — crecimiento del 7% esperado" },
      scoring: { hc_motivation: { balance: 15, money: 15, passion: 5, growth: 5 }, hc_education: { short: 15, medium: 10, minimal: 0, long: 0 }, hc_patients: { some: 15, all_the_time: 10, minimal: 0 }, hc_medical: { somewhat: 15, very: 5, not_really: 5 }, hc_emergency: { calm: 15, moderate: 10, fast: 0 }, hc_age_group: { all: 12, children: 10, adults: 8, elderly: 8 }, hc_setting: { clinic: 15, hospital: 0, community: 0, office: 0 }, hc_tasks: { hands_on: 15, counseling: 10, technology: 5, administrative: 0 } },
    },
    {
      id: "respiratory_therapist",
      title: { en: "Respiratory Therapist", es: "Terapeuta Respiratorio" },
      description: { en: "Treat patients with breathing disorders, manage ventilators, and provide emergency airway care in hospitals and clinics.", es: "Trata pacientes con trastornos respiratorios, gestiona ventiladores y brinda cuidado de emergencia de vías aéreas." },
      salary: { en: "$55,000 – $80,000/year", es: "$55,000 – $80,000/año" },
      education: { en: "Associate Degree (2 years)", es: "Título de asociado (2 años)" },
      outlook: { en: "High demand — 13% growth, critical in hospitals", es: "Alta demanda — crecimiento del 13%, crítico en hospitales" },
      scoring: { hc_motivation: { passion: 15, growth: 10, money: 5, balance: 0 }, hc_education: { short: 15, medium: 10, minimal: 0, long: 0 }, hc_patients: { all_the_time: 15, some: 5, minimal: 0 }, hc_medical: { very: 15, somewhat: 10, not_really: 0 }, hc_emergency: { fast: 15, moderate: 10, calm: 0 }, hc_age_group: { all: 12, elderly: 10, adults: 8, children: 8 }, hc_setting: { hospital: 15, clinic: 5, community: 0, office: 0 }, hc_tasks: { hands_on: 10, technology: 15, counseling: 5, administrative: 0 } },
    },
    {
      id: "radiologic_technologist",
      title: { en: "Radiologic Technologist", es: "Tecnólogo Radiológico" },
      description: { en: "Perform diagnostic imaging procedures like X-rays, CT scans, and MRIs. Work in hospitals, clinics, and imaging centers.", es: "Realiza procedimientos de imagen diagnóstica como rayos X, tomografías y resonancias magnéticas." },
      salary: { en: "$55,000 – $78,000/year", es: "$55,000 – $78,000/año" },
      education: { en: "Associate Degree (2 years)", es: "Título de asociado (2 años)" },
      outlook: { en: "Growing demand — 6% growth, essential diagnostic role", es: "Demanda creciente — crecimiento del 6%, rol diagnóstico esencial" },
      scoring: { hc_motivation: { growth: 15, money: 10, passion: 5, balance: 5 }, hc_education: { short: 15, medium: 10, minimal: 0, long: 0 }, hc_patients: { some: 15, all_the_time: 5, minimal: 5 }, hc_medical: { very: 10, somewhat: 15, not_really: 0 }, hc_emergency: { moderate: 15, calm: 10, fast: 5 }, hc_age_group: { all: 12, adults: 10, elderly: 8, children: 5 }, hc_setting: { hospital: 15, clinic: 10, community: 0, office: 0 }, hc_tasks: { technology: 15, hands_on: 10, administrative: 0, counseling: 0 } },
    },
    {
      id: "surgical_technician",
      title: { en: "Surgical Technician", es: "Técnico Quirúrgico" },
      description: { en: "Assist surgeons during operations by preparing instruments, maintaining sterile environments, and supporting the surgical team.", es: "Asiste a cirujanos durante operaciones preparando instrumentos y manteniendo ambientes estériles." },
      salary: { en: "$45,000 – $62,000/year", es: "$45,000 – $62,000/año" },
      education: { en: "Associate Degree or Certificate (1–2 years)", es: "Título de asociado o certificado (1-2 años)" },
      outlook: { en: "Growing demand — 5% growth expected", es: "Demanda creciente — crecimiento del 5% esperado" },
      scoring: { hc_motivation: { passion: 10, growth: 15, money: 5, balance: 0 }, hc_education: { short: 15, minimal: 5, medium: 0, long: 0 }, hc_patients: { some: 10, all_the_time: 10, minimal: 5 }, hc_medical: { very: 15, somewhat: 5, not_really: 0 }, hc_emergency: { fast: 15, moderate: 10, calm: 0 }, hc_age_group: { all: 12, adults: 10, elderly: 8, children: 5 }, hc_setting: { hospital: 15, clinic: 0, community: 0, office: 0 }, hc_tasks: { hands_on: 15, technology: 10, administrative: 0, counseling: 0 } },
    },
    {
      id: "physical_therapist_assistant",
      title: { en: "Physical Therapist Assistant", es: "Asistente de Terapia Física" },
      description: { en: "Help patients recover from injuries and surgeries through therapeutic exercises and treatments under a physical therapist's direction.", es: "Ayuda a pacientes a recuperarse de lesiones y cirugías mediante ejercicios terapéuticos." },
      salary: { en: "$50,000 – $68,000/year", es: "$50,000 – $68,000/año" },
      education: { en: "Associate Degree (2 years)", es: "Título de asociado (2 años)" },
      outlook: { en: "High demand — 24% growth, excellent outlook", es: "Alta demanda — crecimiento del 24%, excelente perspectiva" },
      scoring: { hc_motivation: { passion: 15, growth: 10, balance: 5, money: 5 }, hc_education: { short: 15, medium: 5, minimal: 0, long: 0 }, hc_patients: { all_the_time: 15, some: 10, minimal: 0 }, hc_medical: { somewhat: 15, very: 5, not_really: 5 }, hc_emergency: { calm: 10, moderate: 15, fast: 0 }, hc_age_group: { elderly: 12, adults: 12, all: 10, children: 8 }, hc_setting: { clinic: 15, hospital: 10, community: 5, office: 0 }, hc_tasks: { hands_on: 15, counseling: 10, technology: 0, administrative: 0 } },
    },
    {
      id: "diagnostic_ultrasound_tech",
      title: { en: "Diagnostic Technician (Ultrasound)", es: "Técnico de Diagnóstico (Ultrasonido)" },
      description: { en: "Use specialized imaging equipment like ultrasound to create images of organs and tissues, helping doctors diagnose medical conditions.", es: "Usa equipo de imagen especializado como ultrasonido para crear imágenes de órganos y tejidos." },
      salary: { en: "$58,000 – $82,000/year", es: "$58,000 – $82,000/año" },
      education: { en: "Associate Degree (2 years)", es: "Título de asociado (2 años)" },
      outlook: { en: "High demand — 10% growth expected", es: "Alta demanda — crecimiento del 10% esperado" },
      scoring: { hc_motivation: { growth: 15, money: 10, passion: 5, balance: 5 }, hc_education: { short: 15, medium: 10, minimal: 0, long: 0 }, hc_patients: { some: 15, all_the_time: 5, minimal: 5 }, hc_medical: { somewhat: 15, very: 10, not_really: 0 }, hc_emergency: { moderate: 15, calm: 10, fast: 0 }, hc_age_group: { all: 12, adults: 10, elderly: 8, children: 8 }, hc_setting: { hospital: 15, clinic: 10, community: 0, office: 0 }, hc_tasks: { technology: 15, hands_on: 10, administrative: 0, counseling: 0 } },
    },
    {
      id: "patient_health_navigator",
      title: { en: "Patient Representative / Health Navigator", es: "Representante del Paciente / Navegador de Salud" },
      description: { en: "Guide patients through the healthcare system, connect them with resources, and advocate for their needs and rights.", es: "Guía a pacientes a través del sistema de salud, los conecta con recursos y aboga por sus necesidades." },
      salary: { en: "$36,000 – $50,000/year", es: "$36,000 – $50,000/año" },
      education: { en: "Associate Degree or Certificate (1–2 years)", es: "Título de asociado o certificado (1-2 años)" },
      outlook: { en: "Growing demand — essential in community health", es: "Demanda creciente — esencial en salud comunitaria" },
      scoring: { hc_motivation: { passion: 15, balance: 10, growth: 5, money: 0 }, hc_education: { short: 15, minimal: 10, medium: 0, long: 0 }, hc_patients: { some: 15, all_the_time: 10, minimal: 0 }, hc_medical: { not_really: 15, somewhat: 10, very: 0 }, hc_emergency: { calm: 15, moderate: 10, fast: 0 }, hc_age_group: { all: 15, elderly: 10, adults: 8, children: 5 }, hc_setting: { community: 15, clinic: 10, hospital: 5, office: 5 }, hc_tasks: { counseling: 15, administrative: 10, hands_on: 0, technology: 0 } },
    },
    {
      id: "community_health_worker",
      title: { en: "Community Health Worker", es: "Trabajador de Salud Comunitaria" },
      description: { en: "Connect communities with health services, conduct outreach, and promote wellness education in underserved populations.", es: "Conecta comunidades con servicios de salud, realiza difusión y promueve educación sobre bienestar." },
      salary: { en: "$35,000 – $50,000/year", es: "$35,000 – $50,000/año" },
      education: { en: "Certificate to Bachelor's Degree (varies)", es: "Certificado a licenciatura (varía)" },
      outlook: { en: "Fast growing — 14% growth, critical in rural areas", es: "Crecimiento rápido — 14%, crucial en áreas rurales" },
      scoring: { hc_motivation: { passion: 15, growth: 5, balance: 10, money: 0 }, hc_education: { minimal: 10, short: 15, medium: 10, long: 0 }, hc_patients: { some: 15, all_the_time: 10, minimal: 0 }, hc_medical: { not_really: 10, somewhat: 10, very: 0 }, hc_emergency: { calm: 15, moderate: 10, fast: 0 }, hc_age_group: { all: 15, elderly: 8, children: 8, adults: 8 }, hc_setting: { community: 15, clinic: 5, hospital: 0, office: 0 }, hc_tasks: { counseling: 15, administrative: 5, hands_on: 5, technology: 0 } },
    },
    {
      id: "health_education_specialist",
      title: { en: "Health Education Specialist", es: "Especialista en Educación de Salud" },
      description: { en: "Develop and implement programs to promote healthy behaviors and prevent disease in communities and organizations.", es: "Desarrolla e implementa programas para promover comportamientos saludables y prevenir enfermedades." },
      salary: { en: "$48,000 – $65,000/year", es: "$48,000 – $65,000/año" },
      education: { en: "Associate to Bachelor's Degree (2–4 years)", es: "Título de asociado a licenciatura (2-4 años)" },
      outlook: { en: "Growing demand — 7% growth, increasing public health focus", es: "Demanda creciente — crecimiento del 7%, mayor enfoque en salud pública" },
      scoring: { hc_motivation: { passion: 15, growth: 10, balance: 5, money: 0 }, hc_education: { short: 10, medium: 15, minimal: 0, long: 5 }, hc_patients: { some: 15, minimal: 10, all_the_time: 0 }, hc_medical: { not_really: 15, somewhat: 10, very: 0 }, hc_emergency: { calm: 15, moderate: 10, fast: 0 }, hc_age_group: { all: 15, adults: 10, children: 8, elderly: 8 }, hc_setting: { community: 15, office: 10, clinic: 5, hospital: 0 }, hc_tasks: { counseling: 15, administrative: 10, hands_on: 0, technology: 0 } },
    },
    {
      id: "substance_abuse_counselor",
      title: { en: "Substance Abuse Counselor", es: "Consejero de Abuso de Sustancias" },
      description: { en: "Help individuals overcome addiction and substance use disorders through counseling, treatment planning, and support services.", es: "Ayuda a individuos a superar la adicción mediante consejería, planificación de tratamiento y servicios de apoyo." },
      salary: { en: "$42,000 – $60,000/year", es: "$42,000 – $60,000/año" },
      education: { en: "Bachelor's Degree (4 years)", es: "Licenciatura (4 años)" },
      outlook: { en: "High demand — 18% growth, critical need in rural areas", es: "Alta demanda — crecimiento del 18%, necesidad crítica en áreas rurales" },
      scoring: { hc_motivation: { passion: 15, growth: 10, balance: 0, money: 0 }, hc_education: { medium: 15, long: 10, short: 5, minimal: 0 }, hc_patients: { all_the_time: 15, some: 10, minimal: 0 }, hc_medical: { not_really: 10, somewhat: 15, very: 0 }, hc_emergency: { moderate: 10, calm: 15, fast: 0 }, hc_age_group: { adults: 15, all: 10, elderly: 5, children: 5 }, hc_setting: { community: 15, clinic: 10, hospital: 5, office: 5 }, hc_tasks: { counseling: 15, administrative: 5, hands_on: 0, technology: 0 } },
    },
    {
      id: "healthcare_administrator",
      title: { en: "Healthcare Administrator", es: "Administrador de Servicios de Salud" },
      description: { en: "Manage healthcare facilities, departments, or practices. Oversee operations, budgets, staffing, and regulatory compliance.", es: "Gestiona instalaciones, departamentos o prácticas de salud. Supervisa operaciones, presupuestos y personal." },
      salary: { en: "$65,000 – $115,000/year", es: "$65,000 – $115,000/año" },
      education: { en: "Bachelor's or Master's Degree (4–6 years)", es: "Licenciatura o maestría (4-6 años)" },
      outlook: { en: "Strong demand — 28% growth, one of the fastest growing", es: "Fuerte demanda — crecimiento del 28%, uno de los de mayor crecimiento" },
      scoring: { hc_motivation: { money: 15, growth: 15, balance: 5, passion: 0 }, hc_education: { medium: 15, long: 15, short: 0, minimal: 0 }, hc_patients: { minimal: 15, some: 10, all_the_time: 0 }, hc_medical: { not_really: 15, somewhat: 5, very: 0 }, hc_emergency: { moderate: 15, calm: 10, fast: 0 }, hc_age_group: { all: 10, adults: 8, elderly: 5, children: 5 }, hc_setting: { office: 15, hospital: 10, clinic: 10, community: 0 }, hc_tasks: { administrative: 15, counseling: 5, technology: 5, hands_on: 0 } },
    },
    {
      id: "clinical_research_coordinator",
      title: { en: "Clinical Research Coordinator", es: "Coordinador de Investigación Clínica" },
      description: { en: "Manage clinical trials and research studies, recruit participants, collect data, and ensure compliance with research protocols.", es: "Gestiona ensayos clínicos y estudios de investigación, recluta participantes y recopila datos." },
      salary: { en: "$50,000 – $72,000/year", es: "$50,000 – $72,000/año" },
      education: { en: "Bachelor's Degree (4 years)", es: "Licenciatura (4 años)" },
      outlook: { en: "Growing demand — expanding research needs in healthcare", es: "Demanda creciente — necesidades de investigación en expansión" },
      scoring: { hc_motivation: { growth: 15, money: 10, passion: 5, balance: 5 }, hc_education: { medium: 15, long: 10, short: 0, minimal: 0 }, hc_patients: { some: 10, minimal: 15, all_the_time: 0 }, hc_medical: { somewhat: 15, not_really: 10, very: 0 }, hc_emergency: { calm: 15, moderate: 10, fast: 0 }, hc_age_group: { all: 10, adults: 10, elderly: 5, children: 5 }, hc_setting: { office: 15, hospital: 10, clinic: 5, community: 0 }, hc_tasks: { administrative: 15, technology: 10, counseling: 0, hands_on: 0 } },
    },
    {
      id: "nutritionist",
      title: { en: "Nutritionist / Dietary Aide", es: "Nutricionista / Asistente Dietético" },
      description: { en: "Plan and recommend dietary programs, counsel patients on nutrition, and work in hospitals, clinics, and community health organizations.", es: "Planifica y recomienda programas dietéticos, asesora pacientes sobre nutrición en hospitales y clínicas." },
      salary: { en: "$45,000 – $68,000/year", es: "$45,000 – $68,000/año" },
      education: { en: "Associate to Bachelor's Degree (2–4 years)", es: "Título de asociado a licenciatura (2-4 años)" },
      outlook: { en: "Growing demand — 7% growth, increasing health awareness", es: "Demanda creciente — crecimiento del 7%, mayor conciencia sobre salud" },
      scoring: { hc_motivation: { passion: 15, balance: 10, growth: 5, money: 0 }, hc_education: { short: 10, medium: 15, minimal: 0, long: 0 }, hc_patients: { some: 15, all_the_time: 5, minimal: 5 }, hc_medical: { not_really: 15, somewhat: 10, very: 0 }, hc_emergency: { calm: 15, moderate: 10, fast: 0 }, hc_age_group: { all: 12, elderly: 10, adults: 10, children: 8 }, hc_setting: { clinic: 15, community: 10, hospital: 5, office: 5 }, hc_tasks: { counseling: 15, administrative: 5, hands_on: 0, technology: 0 } },
    },
    {
      id: "speech_language_pathologist",
      title: { en: "Speech-Language Pathologist", es: "Patólogo del Habla y Lenguaje" },
      description: { en: "Diagnose and treat speech, language, and swallowing disorders in children and adults across healthcare and school settings.", es: "Diagnostica y trata trastornos del habla, lenguaje y deglución en niños y adultos." },
      salary: { en: "$70,000 – $100,000/year", es: "$70,000 – $100,000/año" },
      education: { en: "Master's Degree (6 years total)", es: "Maestría (6 años en total)" },
      outlook: { en: "High demand — 19% growth, critical shortage in schools", es: "Alta demanda — crecimiento del 19%, escasez crítica en escuelas" },
      scoring: { hc_motivation: { passion: 15, growth: 10, money: 5, balance: 5 }, hc_education: { long: 15, medium: 10, short: 0, minimal: 0 }, hc_patients: { all_the_time: 15, some: 10, minimal: 0 }, hc_medical: { somewhat: 15, not_really: 5, very: 5 }, hc_emergency: { calm: 15, moderate: 10, fast: 0 }, hc_age_group: { children: 15, all: 10, elderly: 8, adults: 8 }, hc_setting: { clinic: 15, hospital: 5, community: 10, office: 0 }, hc_tasks: { counseling: 15, hands_on: 10, technology: 0, administrative: 0 } },
    },
    {
      id: "occupational_therapist",
      title: { en: "Occupational Therapist", es: "Terapeuta Ocupacional" },
      description: { en: "Help patients develop, recover, and improve skills needed for daily living and working through therapeutic activities.", es: "Ayuda a pacientes a desarrollar, recuperar y mejorar habilidades para la vida diaria mediante actividades terapéuticas." },
      salary: { en: "$75,000 – $100,000/year", es: "$75,000 – $100,000/año" },
      education: { en: "Master's or Doctoral Degree (5–7 years)", es: "Maestría o doctorado (5-7 años)" },
      outlook: { en: "High demand — 12% growth expected", es: "Alta demanda — crecimiento del 12% esperado" },
      scoring: { hc_motivation: { passion: 15, growth: 10, money: 5, balance: 0 }, hc_education: { long: 15, medium: 10, short: 0, minimal: 0 }, hc_patients: { all_the_time: 15, some: 10, minimal: 0 }, hc_medical: { somewhat: 15, very: 5, not_really: 5 }, hc_emergency: { calm: 15, moderate: 10, fast: 0 }, hc_age_group: { all: 12, children: 10, elderly: 10, adults: 8 }, hc_setting: { clinic: 15, hospital: 10, community: 5, office: 0 }, hc_tasks: { hands_on: 15, counseling: 10, technology: 0, administrative: 0 } },
    },
    {
      id: "physician_assistant",
      title: { en: "Physician Assistant (PA)", es: "Asistente Médico (PA)" },
      description: { en: "Examine patients, diagnose illnesses, prescribe medications, and develop treatment plans under physician collaboration.", es: "Examina pacientes, diagnostica enfermedades, prescribe medicamentos y desarrolla planes de tratamiento." },
      salary: { en: "$105,000 – $145,000/year", es: "$105,000 – $145,000/año" },
      education: { en: "Master's Degree (6–7 years total)", es: "Maestría (6-7 años en total)" },
      outlook: { en: "Very high demand — 27% growth, critical in rural areas", es: "Muy alta demanda — crecimiento del 27%, crítico en áreas rurales" },
      scoring: { hc_motivation: { money: 15, growth: 15, passion: 10, balance: 0 }, hc_education: { long: 15, medium: 5, short: 0, minimal: 0 }, hc_patients: { all_the_time: 15, some: 10, minimal: 0 }, hc_medical: { very: 15, somewhat: 5, not_really: 0 }, hc_emergency: { fast: 10, moderate: 15, calm: 0 }, hc_age_group: { all: 15, adults: 10, elderly: 8, children: 8 }, hc_setting: { clinic: 15, hospital: 15, community: 5, office: 0 }, hc_tasks: { hands_on: 15, technology: 5, counseling: 5, administrative: 0 } },
    },
    {
      id: "nurse_practitioner",
      title: { en: "Nurse Practitioner (NP)", es: "Enfermero/a Practicante (NP)" },
      description: { en: "Provide advanced nursing care including diagnosing conditions, prescribing medications, and managing patient care independently.", es: "Brinda atención de enfermería avanzada incluyendo diagnósticos, prescripción de medicamentos y gestión de pacientes." },
      salary: { en: "$100,000 – $140,000/year", es: "$100,000 – $140,000/año" },
      education: { en: "Master's or Doctoral Degree in Nursing (6–8 years)", es: "Maestría o doctorado en enfermería (6-8 años)" },
      outlook: { en: "Very high demand — 40% growth, fastest in healthcare", es: "Muy alta demanda — crecimiento del 40%, el más rápido en salud" },
      scoring: { hc_motivation: { passion: 15, money: 10, growth: 10, balance: 0 }, hc_education: { long: 15, medium: 5, short: 0, minimal: 0 }, hc_patients: { all_the_time: 15, some: 10, minimal: 0 }, hc_medical: { very: 15, somewhat: 5, not_really: 0 }, hc_emergency: { moderate: 15, fast: 10, calm: 0 }, hc_age_group: { all: 15, elderly: 10, adults: 8, children: 8 }, hc_setting: { clinic: 15, hospital: 10, community: 10, office: 0 }, hc_tasks: { hands_on: 15, counseling: 10, technology: 0, administrative: 0 } },
    },
    {
      id: "pharmacist",
      title: { en: "Pharmacist", es: "Farmacéutico/a" },
      description: { en: "Dispense prescription medications, counsel patients on proper use, monitor drug interactions, and promote wellness.", es: "Dispensa medicamentos recetados, asesora pacientes sobre uso adecuado y monitorea interacciones." },
      salary: { en: "$120,000 – $160,000/year", es: "$120,000 – $160,000/año" },
      education: { en: "Doctor of Pharmacy (PharmD) (6–8 years)", es: "Doctorado en Farmacia (PharmD) (6-8 años)" },
      outlook: { en: "Steady demand — essential community role", es: "Demanda constante — rol esencial en la comunidad" },
      scoring: { hc_motivation: { money: 15, growth: 10, balance: 10, passion: 5 }, hc_education: { long: 15, medium: 0, short: 0, minimal: 0 }, hc_patients: { some: 15, all_the_time: 5, minimal: 5 }, hc_medical: { very: 10, somewhat: 15, not_really: 0 }, hc_emergency: { calm: 15, moderate: 10, fast: 0 }, hc_age_group: { all: 12, elderly: 10, adults: 10, children: 5 }, hc_setting: { clinic: 10, hospital: 10, community: 5, office: 5 }, hc_tasks: { counseling: 10, technology: 10, administrative: 10, hands_on: 5 } },
    },
    {
      id: "physical_therapist",
      title: { en: "Physical Therapist (PT)", es: "Fisioterapeuta (PT)" },
      description: { en: "Evaluate and treat patients with injuries, disabilities, or health conditions to improve movement and manage pain.", es: "Evalúa y trata pacientes con lesiones, discapacidades o condiciones de salud para mejorar el movimiento." },
      salary: { en: "$80,000 – $110,000/year", es: "$80,000 – $110,000/año" },
      education: { en: "Doctor of Physical Therapy (DPT) (6–7 years)", es: "Doctorado en Terapia Física (DPT) (6-7 años)" },
      outlook: { en: "High demand — 15% growth expected", es: "Alta demanda — crecimiento del 15% esperado" },
      scoring: { hc_motivation: { passion: 15, growth: 10, money: 10, balance: 0 }, hc_education: { long: 15, medium: 5, short: 0, minimal: 0 }, hc_patients: { all_the_time: 15, some: 10, minimal: 0 }, hc_medical: { somewhat: 15, very: 5, not_really: 0 }, hc_emergency: { calm: 10, moderate: 15, fast: 0 }, hc_age_group: { all: 12, elderly: 12, adults: 10, children: 8 }, hc_setting: { clinic: 15, hospital: 10, community: 5, office: 0 }, hc_tasks: { hands_on: 15, counseling: 10, technology: 0, administrative: 0 } },
    },
  ];

  const educationCareers: CareerProfile[] = [
    {
      id: "k12_paraprofessional",
      title: { en: "K-12 Paraprofessional / Teacher's Aide", es: "Paraprofesional K-12 / Asistente de Maestro" },
      description: { en: "Support lead teachers in classrooms by helping students one-on-one, managing activities, and assisting with special needs students.", es: "Apoya a maestros en aulas ayudando a estudiantes individualmente y asistiendo con necesidades especiales." },
      salary: { en: "$28,000 – $38,000/year", es: "$28,000 – $38,000/año" },
      education: { en: "Certificate or Permit (varies)", es: "Certificado o permiso (varía)" },
      outlook: { en: "Consistent demand — great stepping stone to teaching", es: "Demanda constante — excelente paso hacia la enseñanza" },
      scoring: { ed_motivation: { community: 15, inspire: 10, stability: 10, subject: 0 }, ed_age_group: { elementary: 12, early_childhood: 10, secondary: 5, adult: 0 }, ed_education_level: { certificate: 15, associates: 10, bachelors: 0, masters: 0 }, ed_role: { support: 15, childcare: 10, classroom: 5, specialist: 0 }, ed_environment: { structured: 15, dynamic: 5, flexible: 5 }, ed_location: { local: 15, willing_travel: 5, online: 0 }, ed_focus: { teaching: 10, wellbeing: 10, leadership: 0, resources: 0 }, ed_special_needs: { open: 15, love_it: 10, general: 5 } },
    },
    {
      id: "child_development_assistant",
      title: { en: "Child Development Assistant", es: "Asistente de Desarrollo Infantil" },
      description: { en: "Assist in early learning settings by supporting children's daily activities, play-based learning, and developmental milestones.", es: "Asiste en entornos de aprendizaje temprano apoyando actividades diarias y desarrollo de niños." },
      salary: { en: "$26,000 – $34,000/year", es: "$26,000 – $34,000/año" },
      education: { en: "Certificate or Permit (6 units minimum)", es: "Certificado o permiso (6 unidades mínimo)" },
      outlook: { en: "Steady demand — entry point into early childhood education", es: "Demanda constante — punto de entrada a educación infantil" },
      scoring: { ed_motivation: { inspire: 15, community: 10, stability: 5, subject: 0 }, ed_age_group: { early_childhood: 15, elementary: 5, secondary: 0, adult: 0 }, ed_education_level: { certificate: 15, associates: 10, bachelors: 0, masters: 0 }, ed_role: { childcare: 15, support: 15, classroom: 5, specialist: 0 }, ed_environment: { dynamic: 15, flexible: 10, structured: 5 }, ed_location: { local: 15, online: 0, willing_travel: 0 }, ed_focus: { teaching: 15, wellbeing: 10, leadership: 0, resources: 0 }, ed_special_needs: { open: 10, general: 10, love_it: 5 } },
    },
    {
      id: "bilingual_assistant",
      title: { en: "Bilingual Assistant / Interpreter", es: "Asistente Bilingüe / Intérprete" },
      description: { en: "Provide language support in schools for students and families with limited English. Assist with translation, communication, and cultural bridging.", es: "Brinda apoyo lingüístico en escuelas para estudiantes y familias con inglés limitado." },
      salary: { en: "$30,000 – $42,000/year", es: "$30,000 – $42,000/año" },
      education: { en: "Certificate or Permit + Bilingual proficiency", es: "Certificado o permiso + dominio bilingüe" },
      outlook: { en: "Growing demand — essential in diverse North State communities", es: "Demanda creciente — esencial en comunidades diversas del Norte del Estado" },
      scoring: { ed_motivation: { community: 15, inspire: 10, stability: 5, subject: 5 }, ed_age_group: { elementary: 10, early_childhood: 10, secondary: 10, adult: 5 }, ed_education_level: { certificate: 15, associates: 10, bachelors: 5, masters: 0 }, ed_role: { support: 15, specialist: 10, classroom: 5, childcare: 0 }, ed_environment: { flexible: 15, dynamic: 10, structured: 5 }, ed_location: { local: 15, willing_travel: 5, online: 0 }, ed_focus: { teaching: 10, wellbeing: 10, resources: 10, leadership: 0 }, ed_special_needs: { open: 15, general: 10, love_it: 5 } },
    },
    {
      id: "bus_driver",
      title: { en: "School Bus Driver", es: "Conductor de Autobús Escolar" },
      description: { en: "Safely transport students to and from school and activities. A vital support role for rural North State communities.", es: "Transporta estudiantes de manera segura hacia y desde la escuela y actividades." },
      salary: { en: "$28,000 – $40,000/year", es: "$28,000 – $40,000/año" },
      education: { en: "Commercial Driver's License (CDL) + training", es: "Licencia de conducir comercial (CDL) + capacitación" },
      outlook: { en: "High demand — critical shortage in rural districts", es: "Alta demanda — escasez crítica en distritos rurales" },
      scoring: { ed_motivation: { community: 15, stability: 15, inspire: 0, subject: 0 }, ed_age_group: { elementary: 10, secondary: 10, early_childhood: 5, adult: 0 }, ed_education_level: { certificate: 15, associates: 5, bachelors: 0, masters: 0 }, ed_role: { support: 15, childcare: 5, classroom: 0, specialist: 0 }, ed_environment: { structured: 15, flexible: 10, dynamic: 0 }, ed_location: { local: 15, willing_travel: 10, online: 0 }, ed_focus: { wellbeing: 5, teaching: 0, leadership: 0, resources: 0 }, ed_special_needs: { general: 15, open: 10, love_it: 0 } },
    },
    {
      id: "instructional_assistant",
      title: { en: "Instructional Assistant", es: "Asistente de Instrucción" },
      description: { en: "Work alongside teachers to support student learning, prepare materials, tutor individuals, and help manage classroom activities.", es: "Trabaja junto a maestros para apoyar el aprendizaje, preparar materiales y tutorizar estudiantes." },
      salary: { en: "$30,000 – $40,000/year", es: "$30,000 – $40,000/año" },
      education: { en: "Associate Degree or equivalent (2 years)", es: "Título de asociado o equivalente (2 años)" },
      outlook: { en: "Steady demand — valued support role in schools", es: "Demanda constante — rol de apoyo valorado en escuelas" },
      scoring: { ed_motivation: { inspire: 15, community: 10, stability: 10, subject: 0 }, ed_age_group: { elementary: 12, secondary: 10, early_childhood: 5, adult: 0 }, ed_education_level: { associates: 15, certificate: 10, bachelors: 5, masters: 0 }, ed_role: { support: 15, classroom: 10, childcare: 5, specialist: 0 }, ed_environment: { structured: 15, dynamic: 10, flexible: 0 }, ed_location: { local: 15, willing_travel: 5, online: 0 }, ed_focus: { teaching: 15, wellbeing: 5, leadership: 0, resources: 5 }, ed_special_needs: { open: 15, love_it: 10, general: 5 } },
    },
    {
      id: "special_education_assistant",
      title: { en: "Special Education Assistant", es: "Asistente de Educación Especial" },
      description: { en: "Support students with disabilities in classrooms, help implement IEP goals, and provide one-on-one learning assistance.", es: "Apoya a estudiantes con discapacidades en aulas, implementa metas de IEP y brinda asistencia individual." },
      salary: { en: "$30,000 – $42,000/year", es: "$30,000 – $42,000/año" },
      education: { en: "Associate Degree (2 years)", es: "Título de asociado (2 años)" },
      outlook: { en: "High demand — critical need in all school districts", es: "Alta demanda — necesidad crítica en todos los distritos escolares" },
      scoring: { ed_motivation: { inspire: 15, community: 15, stability: 5, subject: 0 }, ed_age_group: { elementary: 12, secondary: 10, early_childhood: 10, adult: 0 }, ed_education_level: { associates: 15, certificate: 10, bachelors: 5, masters: 0 }, ed_role: { support: 15, specialist: 10, classroom: 5, childcare: 0 }, ed_environment: { dynamic: 15, structured: 10, flexible: 5 }, ed_location: { local: 15, willing_travel: 5, online: 0 }, ed_focus: { wellbeing: 15, teaching: 10, leadership: 0, resources: 0 }, ed_special_needs: { love_it: 15, open: 10, general: 0 } },
    },
    {
      id: "afterschool_site_manager",
      title: { en: "Afterschool Site Manager", es: "Gerente de Sitio de Programa Extraescolar" },
      description: { en: "Oversee afterschool programs, manage staff, coordinate activities, and ensure a safe enrichment environment for students.", es: "Supervisa programas extraescolares, gestiona personal y coordina actividades para estudiantes." },
      salary: { en: "$32,000 – $45,000/year", es: "$32,000 – $45,000/año" },
      education: { en: "Associate Degree (2 years)", es: "Título de asociado (2 años)" },
      outlook: { en: "Growing demand — expanding afterschool programs", es: "Demanda creciente — programas extraescolares en expansión" },
      scoring: { ed_motivation: { community: 15, inspire: 10, stability: 10, subject: 0 }, ed_age_group: { elementary: 12, secondary: 12, early_childhood: 5, adult: 0 }, ed_education_level: { associates: 15, certificate: 10, bachelors: 5, masters: 0 }, ed_role: { support: 10, childcare: 15, classroom: 5, specialist: 0 }, ed_environment: { dynamic: 15, flexible: 10, structured: 5 }, ed_location: { local: 15, willing_travel: 5, online: 0 }, ed_focus: { leadership: 15, teaching: 5, wellbeing: 10, resources: 0 }, ed_special_needs: { open: 10, general: 10, love_it: 5 } },
    },
    {
      id: "library_technician",
      title: { en: "Library Technician", es: "Técnico de Biblioteca" },
      description: { en: "Manage school library collections, assist students with research, organize resources, and promote literacy programs.", es: "Gestiona colecciones de bibliotecas escolares, asiste a estudiantes con investigación y promueve programas de lectura." },
      salary: { en: "$30,000 – $42,000/year", es: "$30,000 – $42,000/año" },
      education: { en: "Associate Degree (2 years)", es: "Título de asociado (2 años)" },
      outlook: { en: "Steady demand — valued support role in schools", es: "Demanda constante — rol de apoyo valorado en escuelas" },
      scoring: { ed_motivation: { subject: 15, stability: 10, community: 5, inspire: 5 }, ed_age_group: { elementary: 10, secondary: 10, adult: 5, early_childhood: 0 }, ed_education_level: { associates: 15, certificate: 10, bachelors: 5, masters: 0 }, ed_role: { support: 15, specialist: 10, classroom: 0, childcare: 0 }, ed_environment: { structured: 15, flexible: 10, dynamic: 0 }, ed_location: { local: 15, online: 5, willing_travel: 0 }, ed_focus: { resources: 15, teaching: 5, wellbeing: 0, leadership: 0 }, ed_special_needs: { general: 15, open: 10, love_it: 0 } },
    },
    {
      id: "child_development_teacher",
      title: { en: "Child Development Teacher", es: "Maestro/a de Desarrollo Infantil" },
      description: { en: "Lead early childhood classrooms, plan developmentally appropriate curriculum, and guide young children's social-emotional growth.", es: "Dirige aulas de primera infancia, planifica currículo apropiado y guía el desarrollo socioemocional." },
      salary: { en: "$32,000 – $48,000/year", es: "$32,000 – $48,000/año" },
      education: { en: "Associate Degree or Child Development Permit (2 years)", es: "Título de asociado o permiso de desarrollo infantil (2 años)" },
      outlook: { en: "High demand — critical need in North State communities", es: "Alta demanda — necesidad crítica en comunidades del Norte del Estado" },
      scoring: { ed_motivation: { inspire: 15, community: 10, stability: 5, subject: 0 }, ed_age_group: { early_childhood: 15, elementary: 5, secondary: 0, adult: 0 }, ed_education_level: { associates: 15, certificate: 15, bachelors: 5, masters: 0 }, ed_role: { childcare: 15, classroom: 15, support: 5, specialist: 0 }, ed_environment: { dynamic: 15, flexible: 10, structured: 5 }, ed_location: { local: 15, online: 0, willing_travel: 5 }, ed_focus: { teaching: 15, wellbeing: 10, leadership: 0, resources: 0 }, ed_special_needs: { open: 10, general: 10, love_it: 5 } },
    },
    {
      id: "career_technical_education_instructor",
      title: { en: "Career Technical Education (CTE) Instructor", es: "Instructor de Educación Técnica Profesional (CTE)" },
      description: { en: "Teach hands-on vocational and technical skills to students at the middle school, high school, or community college level.", es: "Enseña habilidades vocacionales y técnicas prácticas a estudiantes de secundaria o universidad comunitaria." },
      salary: { en: "$50,000 – $80,000/year", es: "$50,000 – $80,000/año" },
      education: { en: "Industry experience + CTE Credential or Associate Degree", es: "Experiencia en la industria + Credencial CTE o título de asociado" },
      outlook: { en: "Growing demand — emphasis on career readiness pathways", es: "Demanda creciente — énfasis en vías de preparación profesional" },
      scoring: { ed_motivation: { subject: 15, community: 10, stability: 5, inspire: 10 }, ed_age_group: { secondary: 15, adult: 10, elementary: 0, early_childhood: 0 }, ed_education_level: { associates: 10, certificate: 15, bachelors: 5, masters: 0 }, ed_role: { classroom: 15, specialist: 10, support: 0, childcare: 0 }, ed_environment: { dynamic: 15, structured: 10, flexible: 5 }, ed_location: { local: 15, willing_travel: 5, online: 0 }, ed_focus: { teaching: 15, resources: 5, leadership: 5, wellbeing: 0 }, ed_special_needs: { general: 15, open: 10, love_it: 0 } },
    },
    {
      id: "substitute_teacher",
      title: { en: "Substitute Teacher", es: "Maestro/a Sustituto/a" },
      description: { en: "Fill in for absent teachers across grade levels and subjects. A flexible role and common pathway into full-time teaching.", es: "Reemplaza a maestros ausentes en diferentes grados y materias. Un rol flexible y camino común hacia la enseñanza." },
      salary: { en: "$28,000 – $45,000/year", es: "$28,000 – $45,000/año" },
      education: { en: "Bachelor's Degree + Substitute Permit", es: "Licenciatura + permiso de sustituto" },
      outlook: { en: "Very high demand — perpetual need across all districts", es: "Muy alta demanda — necesidad perpetua en todos los distritos" },
      scoring: { ed_motivation: { inspire: 10, community: 10, stability: 5, subject: 10 }, ed_age_group: { elementary: 10, secondary: 10, early_childhood: 5, adult: 0 }, ed_education_level: { bachelors: 15, associates: 5, certificate: 0, masters: 0 }, ed_role: { classroom: 15, support: 10, specialist: 0, childcare: 0 }, ed_environment: { flexible: 15, dynamic: 15, structured: 0 }, ed_location: { local: 15, willing_travel: 10, online: 0 }, ed_focus: { teaching: 15, wellbeing: 5, leadership: 0, resources: 0 }, ed_special_needs: { open: 15, general: 10, love_it: 5 } },
    },
    {
      id: "child_development_site_supervisor",
      title: { en: "Child Development Site Supervisor", es: "Supervisor de Sitio de Desarrollo Infantil" },
      description: { en: "Oversee daily operations of a childcare site, supervise staff, ensure licensing compliance, and coordinate family engagement.", es: "Supervisa operaciones diarias de un sitio de cuidado infantil, personal y cumplimiento de licencias." },
      salary: { en: "$38,000 – $52,000/year", es: "$38,000 – $52,000/año" },
      education: { en: "Bachelor's Degree in Child Development or related", es: "Licenciatura en desarrollo infantil o relacionado" },
      outlook: { en: "High demand — leadership roles critical for quality programs", es: "Alta demanda — roles de liderazgo críticos para programas de calidad" },
      scoring: { ed_motivation: { community: 15, inspire: 10, stability: 10, subject: 0 }, ed_age_group: { early_childhood: 15, elementary: 5, secondary: 0, adult: 0 }, ed_education_level: { bachelors: 15, associates: 5, certificate: 0, masters: 5 }, ed_role: { childcare: 15, specialist: 10, classroom: 5, support: 5 }, ed_environment: { structured: 10, dynamic: 15, flexible: 10 }, ed_location: { local: 15, willing_travel: 5, online: 0 }, ed_focus: { leadership: 15, teaching: 5, wellbeing: 10, resources: 0 }, ed_special_needs: { open: 10, general: 10, love_it: 5 } },
    },
    {
      id: "elementary_teacher",
      title: { en: "Elementary School Teacher (K-6)", es: "Maestro/a de Escuela Primaria (K-6)" },
      description: { en: "Teach core subjects to young students, foster curiosity, and create engaging learning environments in elementary schools.", es: "Enseña materias básicas a estudiantes jóvenes y crea ambientes de aprendizaje atractivos." },
      salary: { en: "$55,000 – $85,000/year", es: "$55,000 – $85,000/año" },
      education: { en: "Bachelor's Degree + Teaching Credential (4–5 years)", es: "Licenciatura + Credencial de enseñanza (4-5 años)" },
      outlook: { en: "Steady demand — especially in rural districts", es: "Demanda constante — especialmente en distritos rurales" },
      scoring: { ed_motivation: { inspire: 15, community: 10, subject: 5, stability: 5 }, ed_age_group: { elementary: 15, early_childhood: 5, secondary: 0, adult: 0 }, ed_education_level: { bachelors: 15, masters: 10, associates: 0, certificate: 0 }, ed_role: { classroom: 15, specialist: 5, support: 0, childcare: 0 }, ed_environment: { structured: 15, dynamic: 10, flexible: 0 }, ed_location: { local: 10, willing_travel: 5, online: 0 }, ed_focus: { teaching: 15, wellbeing: 5, leadership: 0, resources: 5 }, ed_special_needs: { open: 10, general: 15, love_it: 5 } },
    },
    {
      id: "secondary_teacher",
      title: { en: "Middle/High School Teacher (7-12)", es: "Maestro/a de Secundaria/Preparatoria (7-12)" },
      description: { en: "Teach specialized subjects to teenagers, prepare students for college and careers, and serve as a mentor during formative years.", es: "Enseña materias especializadas a adolescentes y prepara estudiantes para la universidad y carreras." },
      salary: { en: "$58,000 – $90,000/year", es: "$58,000 – $90,000/año" },
      education: { en: "Bachelor's Degree + Teaching Credential (4–5 years)", es: "Licenciatura + Credencial de enseñanza (4-5 años)" },
      outlook: { en: "Good demand — especially in STEM and special education", es: "Buena demanda — especialmente en STEM y educación especial" },
      scoring: { ed_motivation: { subject: 15, inspire: 10, community: 5, stability: 5 }, ed_age_group: { secondary: 15, adult: 5, elementary: 0, early_childhood: 0 }, ed_education_level: { bachelors: 15, masters: 10, associates: 0, certificate: 0 }, ed_role: { classroom: 15, specialist: 10, support: 0, childcare: 0 }, ed_environment: { dynamic: 15, structured: 10, flexible: 0 }, ed_location: { local: 10, willing_travel: 10, online: 0 }, ed_focus: { teaching: 15, resources: 5, wellbeing: 5, leadership: 0 }, ed_special_needs: { general: 15, open: 10, love_it: 0 } },
    },
    {
      id: "special_education_teacher",
      title: { en: "Special Education Teacher", es: "Maestro/a de Educación Especial" },
      description: { en: "Work with students who have learning disabilities, autism, or other special needs. Develop IEPs and adapt curriculum.", es: "Trabaja con estudiantes con discapacidades de aprendizaje, autismo u otras necesidades especiales." },
      salary: { en: "$55,000 – $85,000/year", es: "$55,000 – $85,000/año" },
      education: { en: "Bachelor's Degree + Education Specialist Credential", es: "Licenciatura + Credencial de Especialista en Educación" },
      outlook: { en: "Very high demand — critical shortage in California", es: "Muy alta demanda — escasez crítica en California" },
      scoring: { ed_motivation: { inspire: 15, community: 10, stability: 5, subject: 0 }, ed_age_group: { elementary: 10, secondary: 10, early_childhood: 5, adult: 0 }, ed_education_level: { bachelors: 10, masters: 15, associates: 0, certificate: 0 }, ed_role: { specialist: 15, classroom: 10, support: 5, childcare: 0 }, ed_environment: { dynamic: 15, structured: 10, flexible: 5 }, ed_location: { local: 10, willing_travel: 10, online: 0 }, ed_focus: { teaching: 10, wellbeing: 15, leadership: 0, resources: 0 }, ed_special_needs: { love_it: 15, open: 10, general: 0 } },
    },
    {
      id: "reading_literacy_teacher",
      title: { en: "Reading and Literacy Teacher", es: "Maestro/a de Lectura y Alfabetización" },
      description: { en: "Specialize in teaching reading skills, support struggling readers, and develop literacy programs across grade levels.", es: "Se especializa en enseñar habilidades de lectura, apoyar lectores con dificultades y desarrollar programas de alfabetización." },
      salary: { en: "$55,000 – $82,000/year", es: "$55,000 – $82,000/año" },
      education: { en: "Bachelor's Degree + Reading/Literacy Credential", es: "Licenciatura + Credencial de Lectura/Alfabetización" },
      outlook: { en: "High demand — literacy focus growing in all districts", es: "Alta demanda — enfoque en alfabetización crece en todos los distritos" },
      scoring: { ed_motivation: { inspire: 15, subject: 10, community: 10, stability: 5 }, ed_age_group: { elementary: 15, early_childhood: 10, secondary: 5, adult: 0 }, ed_education_level: { bachelors: 15, masters: 10, associates: 0, certificate: 0 }, ed_role: { specialist: 15, classroom: 10, support: 5, childcare: 0 }, ed_environment: { structured: 10, dynamic: 15, flexible: 5 }, ed_location: { local: 10, willing_travel: 5, online: 5 }, ed_focus: { teaching: 15, resources: 10, wellbeing: 5, leadership: 0 }, ed_special_needs: { open: 15, love_it: 10, general: 5 } },
    },
    {
      id: "pk3_teacher",
      title: { en: "PK-3 Teacher (Age 3 through 3rd Grade)", es: "Maestro/a PK-3 (Edad 3 hasta 3er Grado)" },
      description: { en: "Teach in the critical early years from preschool through third grade, bridging early childhood and elementary education.", es: "Enseña en los años críticos desde preescolar hasta tercer grado, conectando educación infantil y primaria." },
      salary: { en: "$48,000 – $75,000/year", es: "$48,000 – $75,000/año" },
      education: { en: "Bachelor's Degree + PK-3 Teaching Credential", es: "Licenciatura + Credencial de enseñanza PK-3" },
      outlook: { en: "Growing demand — new credential with increasing adoption", es: "Demanda creciente — nueva credencial con adopción creciente" },
      scoring: { ed_motivation: { inspire: 15, community: 10, stability: 5, subject: 0 }, ed_age_group: { early_childhood: 15, elementary: 15, secondary: 0, adult: 0 }, ed_education_level: { bachelors: 15, masters: 5, associates: 0, certificate: 0 }, ed_role: { classroom: 15, childcare: 10, support: 0, specialist: 5 }, ed_environment: { dynamic: 15, structured: 10, flexible: 0 }, ed_location: { local: 15, willing_travel: 5, online: 0 }, ed_focus: { teaching: 15, wellbeing: 10, leadership: 0, resources: 0 }, ed_special_needs: { open: 10, general: 10, love_it: 5 } },
    },
    {
      id: "school_counselor",
      title: { en: "School Counselor / Career Advisor", es: "Consejero/a Escolar / Asesor de Carreras" },
      description: { en: "Guide students through academic planning, social-emotional challenges, and career exploration in K-12 or college settings.", es: "Guía a estudiantes en planificación académica, desafíos socioemocionales y exploración de carreras." },
      salary: { en: "$55,000 – $80,000/year", es: "$55,000 – $80,000/año" },
      education: { en: "Master's Degree + PPS Credential", es: "Maestría + Credencial PPS" },
      outlook: { en: "Growing demand — increased focus on student mental health", es: "Demanda creciente — mayor enfoque en salud mental estudiantil" },
      scoring: { ed_motivation: { inspire: 10, community: 15, stability: 10, subject: 0 }, ed_age_group: { secondary: 12, elementary: 10, adult: 5, early_childhood: 0 }, ed_education_level: { masters: 15, bachelors: 5, associates: 0, certificate: 0 }, ed_role: { specialist: 15, support: 10, classroom: 0, childcare: 0 }, ed_environment: { flexible: 15, structured: 5, dynamic: 5 }, ed_location: { local: 10, willing_travel: 10, online: 5 }, ed_focus: { wellbeing: 15, teaching: 0, leadership: 5, resources: 5 }, ed_special_needs: { open: 15, love_it: 10, general: 5 } },
    },
    {
      id: "school_social_worker",
      title: { en: "School Social Worker", es: "Trabajador/a Social Escolar" },
      description: { en: "Address students' social, emotional, and family challenges that affect learning. Connect families with community resources.", es: "Aborda desafíos sociales, emocionales y familiares que afectan el aprendizaje. Conecta familias con recursos." },
      salary: { en: "$55,000 – $78,000/year", es: "$55,000 – $78,000/año" },
      education: { en: "Master's Degree in Social Work (MSW)", es: "Maestría en Trabajo Social (MSW)" },
      outlook: { en: "High demand — growing mental health needs in schools", es: "Alta demanda — crecientes necesidades de salud mental en escuelas" },
      scoring: { ed_motivation: { community: 15, inspire: 10, stability: 5, subject: 0 }, ed_age_group: { elementary: 10, secondary: 12, early_childhood: 5, adult: 0 }, ed_education_level: { masters: 15, bachelors: 5, associates: 0, certificate: 0 }, ed_role: { specialist: 15, support: 15, classroom: 0, childcare: 0 }, ed_environment: { flexible: 15, dynamic: 10, structured: 5 }, ed_location: { local: 15, willing_travel: 5, online: 0 }, ed_focus: { wellbeing: 15, leadership: 5, teaching: 0, resources: 0 }, ed_special_needs: { love_it: 10, open: 15, general: 0 } },
    },
    {
      id: "instructional_coordinator",
      title: { en: "Instructional Coordinator", es: "Coordinador/a de Instrucción" },
      description: { en: "Develop curricula, train teachers, analyze student data, and oversee educational standards at the district or county level.", es: "Desarrolla currículo, capacita maestros, analiza datos estudiantiles y supervisa estándares educativos." },
      salary: { en: "$65,000 – $95,000/year", es: "$65,000 – $95,000/año" },
      education: { en: "Master's Degree + teaching experience", es: "Maestría + experiencia docente" },
      outlook: { en: "Growing demand — emphasis on educational quality", es: "Demanda creciente — énfasis en calidad educativa" },
      scoring: { ed_motivation: { subject: 15, inspire: 10, community: 5, stability: 5 }, ed_age_group: { elementary: 10, secondary: 10, adult: 5, early_childhood: 5 }, ed_education_level: { masters: 15, bachelors: 5, associates: 0, certificate: 0 }, ed_role: { specialist: 15, classroom: 5, support: 5, childcare: 0 }, ed_environment: { structured: 15, flexible: 10, dynamic: 5 }, ed_location: { local: 10, willing_travel: 10, online: 5 }, ed_focus: { resources: 15, teaching: 10, leadership: 10, wellbeing: 0 }, ed_special_needs: { general: 10, open: 15, love_it: 5 } },
    },
    {
      id: "school_psychologist",
      title: { en: "K-12 School Psychologist", es: "Psicólogo/a Escolar K-12" },
      description: { en: "Assess students' learning and behavioral needs, provide psychological services, and support special education evaluations.", es: "Evalúa necesidades de aprendizaje y comportamiento, brinda servicios psicológicos y apoya evaluaciones de educación especial." },
      salary: { en: "$70,000 – $100,000/year", es: "$70,000 – $100,000/año" },
      education: { en: "Master's or Specialist Degree (3+ years graduate)", es: "Maestría o título de especialista (3+ años de posgrado)" },
      outlook: { en: "Very high demand — severe shortage across California", es: "Muy alta demanda — escasez severa en California" },
      scoring: { ed_motivation: { inspire: 10, community: 15, stability: 10, subject: 5 }, ed_age_group: { elementary: 12, secondary: 12, early_childhood: 5, adult: 0 }, ed_education_level: { masters: 15, bachelors: 0, associates: 0, certificate: 0 }, ed_role: { specialist: 15, support: 10, classroom: 0, childcare: 0 }, ed_environment: { flexible: 15, structured: 10, dynamic: 5 }, ed_location: { local: 10, willing_travel: 10, online: 0 }, ed_focus: { wellbeing: 15, resources: 5, leadership: 5, teaching: 0 }, ed_special_needs: { love_it: 15, open: 10, general: 0 } },
    },
    {
      id: "principal_vice_principal",
      title: { en: "Principal / Vice Principal", es: "Director/a / Subdirector/a" },
      description: { en: "Lead a school's academic programs, manage staff, ensure student safety, and drive school improvement as an administrator.", es: "Dirige programas académicos de una escuela, gestiona personal y impulsa la mejora escolar." },
      salary: { en: "$95,000 – $145,000/year", es: "$95,000 – $145,000/año" },
      education: { en: "Master's Degree + Administrative Credential", es: "Maestría + Credencial administrativa" },
      outlook: { en: "Steady demand — leadership openings in rural districts", es: "Demanda constante — vacantes de liderazgo en distritos rurales" },
      scoring: { ed_motivation: { community: 15, inspire: 10, stability: 10, subject: 0 }, ed_age_group: { elementary: 10, secondary: 12, early_childhood: 0, adult: 5 }, ed_education_level: { masters: 15, bachelors: 0, associates: 0, certificate: 0 }, ed_role: { specialist: 15, classroom: 5, support: 5, childcare: 0 }, ed_environment: { structured: 15, dynamic: 10, flexible: 0 }, ed_location: { local: 10, willing_travel: 10, online: 0 }, ed_focus: { leadership: 15, wellbeing: 10, teaching: 5, resources: 0 }, ed_special_needs: { open: 10, general: 10, love_it: 5 } },
    },
    {
      id: "community_college_faculty",
      title: { en: "Community College Faculty", es: "Profesorado de Universidad Comunitaria" },
      description: { en: "Teach college-level courses at community colleges, develop curriculum, and mentor adult learners pursuing degrees and certificates.", es: "Enseña cursos universitarios en universidades comunitarias, desarrolla currículo y guía estudiantes adultos." },
      salary: { en: "$60,000 – $100,000/year", es: "$60,000 – $100,000/año" },
      education: { en: "Master's Degree in subject area", es: "Maestría en el área de especialidad" },
      outlook: { en: "Steady demand — retirements creating openings", es: "Demanda constante — jubilaciones creando vacantes" },
      scoring: { ed_motivation: { subject: 15, inspire: 10, stability: 10, community: 5 }, ed_age_group: { adult: 15, secondary: 5, elementary: 0, early_childhood: 0 }, ed_education_level: { masters: 15, bachelors: 5, associates: 0, certificate: 0 }, ed_role: { classroom: 15, specialist: 10, support: 0, childcare: 0 }, ed_environment: { flexible: 15, dynamic: 10, structured: 5 }, ed_location: { local: 10, willing_travel: 5, online: 10 }, ed_focus: { teaching: 15, resources: 10, leadership: 5, wellbeing: 0 }, ed_special_needs: { general: 15, open: 10, love_it: 0 } },
    },
    {
      id: "librarian_media_specialist",
      title: { en: "Librarian / Media Specialist", es: "Bibliotecario/a / Especialista en Medios" },
      description: { en: "Manage school or college library programs, curate collections, teach research skills, and integrate technology in learning.", es: "Gestiona programas de biblioteca, cura colecciones, enseña habilidades de investigación e integra tecnología." },
      salary: { en: "$55,000 – $80,000/year", es: "$55,000 – $80,000/año" },
      education: { en: "Master's Degree in Library Science (MLIS)", es: "Maestría en Ciencias Bibliotecarias (MLIS)" },
      outlook: { en: "Moderate demand — valued role in academic settings", es: "Demanda moderada — rol valorado en entornos académicos" },
      scoring: { ed_motivation: { subject: 15, stability: 10, community: 5, inspire: 5 }, ed_age_group: { secondary: 10, elementary: 10, adult: 10, early_childhood: 0 }, ed_education_level: { masters: 15, bachelors: 5, associates: 0, certificate: 0 }, ed_role: { specialist: 15, support: 10, classroom: 5, childcare: 0 }, ed_environment: { structured: 15, flexible: 10, dynamic: 0 }, ed_location: { local: 10, online: 10, willing_travel: 0 }, ed_focus: { resources: 15, teaching: 5, leadership: 5, wellbeing: 0 }, ed_special_needs: { general: 15, open: 10, love_it: 0 } },
    },
    {
      id: "early_childhood_program_director",
      title: { en: "Early Childhood Education Program Director", es: "Director/a de Programa de Educación Infantil" },
      description: { en: "Oversee early childhood education programs, manage staff, ensure curriculum quality, and maintain licensing and accreditation.", es: "Supervisa programas de educación infantil, gestiona personal y asegura calidad curricular y acreditación." },
      salary: { en: "$50,000 – $75,000/year", es: "$50,000 – $75,000/año" },
      education: { en: "Master's Degree in Early Childhood Education or related", es: "Maestría en educación infantil o relacionado" },
      outlook: { en: "High demand — expanding early childhood initiatives", es: "Alta demanda — iniciativas de primera infancia en expansión" },
      scoring: { ed_motivation: { community: 15, inspire: 15, stability: 5, subject: 0 }, ed_age_group: { early_childhood: 15, elementary: 5, secondary: 0, adult: 0 }, ed_education_level: { masters: 15, bachelors: 10, associates: 0, certificate: 0 }, ed_role: { specialist: 15, childcare: 10, classroom: 5, support: 0 }, ed_environment: { structured: 10, dynamic: 15, flexible: 10 }, ed_location: { local: 15, willing_travel: 5, online: 0 }, ed_focus: { leadership: 15, teaching: 5, wellbeing: 10, resources: 0 }, ed_special_needs: { open: 10, love_it: 5, general: 10 } },
    },
    {
      id: "superintendent",
      title: { en: "Superintendent / Assistant Superintendent", es: "Superintendente / Superintendente Asistente" },
      description: { en: "Lead an entire school district's operations, set strategic vision, manage budgets, and oversee all schools and programs.", es: "Dirige operaciones de un distrito escolar completo, establece visión estratégica y gestiona presupuestos." },
      salary: { en: "$130,000 – $200,000/year", es: "$130,000 – $200,000/año" },
      education: { en: "Master's or Doctorate + Administrative Credential", es: "Maestría o doctorado + Credencial administrativa" },
      outlook: { en: "Steady demand — leadership pipeline needed in rural areas", es: "Demanda constante — se necesita desarrollo de liderazgo en áreas rurales" },
      scoring: { ed_motivation: { community: 15, stability: 10, inspire: 5, subject: 0 }, ed_age_group: { elementary: 5, secondary: 5, adult: 10, early_childhood: 5 }, ed_education_level: { masters: 15, bachelors: 0, associates: 0, certificate: 0 }, ed_role: { specialist: 15, classroom: 0, support: 5, childcare: 0 }, ed_environment: { structured: 15, dynamic: 5, flexible: 5 }, ed_location: { local: 10, willing_travel: 10, online: 0 }, ed_focus: { leadership: 15, resources: 5, wellbeing: 5, teaching: 0 }, ed_special_needs: { general: 10, open: 10, love_it: 5 } },
    },
  ];

  app.post("/api/assessment/results", async (req, res) => {
    try {
      const { track, answers, language } = req.body;
      if (!track || !answers || typeof answers !== "object") {
        return res.status(400).json({ error: "Track and answers required" });
      }

      const lang = language === "es" ? "es" : "en";
      const careers = track === "healthcare" ? healthcareCareers : educationCareers;

      const scored = careers.map(career => {
        let score = 0;
        for (const [questionId, weights] of Object.entries(career.scoring)) {
          const answer = answers[questionId];
          if (Array.isArray(answer)) {
            for (const val of answer) {
              score += (weights as Record<string, number>)[val] || 0;
            }
          } else if (answer && typeof answer === "string") {
            score += (weights as Record<string, number>)[answer] || 0;
          }
        }
        return { career, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const topCareers = scored.slice(0, 3);
      const maxScore = scored[0]?.score || 1;

      const careerResults = topCareers.map(sc => ({
        id: sc.career.id,
        title: sc.career.title[lang],
        description: sc.career.description[lang],
        salary: sc.career.salary[lang],
        education: sc.career.education[lang],
        outlook: sc.career.outlook[lang],
        matchPercent: Math.round((sc.score / maxScore) * 100),
      }));

      const answerSummary = Object.entries(answers)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("; ");

      let aiInsight = "";
      try {
        const topCareerNames = topCareers.map(c => c.career.title[lang]).join(", ");
        const prompt = lang === "es"
          ? `Eres un orientador de carreras amigable para el programa North State Pathways en el norte de California rural. Un estudiante potencial tomó un cuestionario de autoevaluación de ${track === "healthcare" ? "salud" : "educación"}. Sus respuestas: ${answerSummary}. Sus carreras más compatibles son: ${topCareerNames}. Escribe un párrafo corto (3-4 oraciones) personalizado y motivador sobre por qué estas carreras encajan bien según sus respuestas. Sé cálido, específico a sus respuestas, y menciona oportunidades en la región del Norte del Estado de California. No uses viñetas.`
          : `You are a friendly career counselor for the North State Pathways program in rural Northern California. A prospective student took a ${track} career self-assessment quiz. Their answers: ${answerSummary}. Their top career matches are: ${topCareerNames}. Write a short paragraph (3-4 sentences) that is personalized and encouraging about why these careers are a good fit based on their specific answers. Be warm, specific to their responses, and mention opportunities in the North State region of California. Do not use bullet points.`;

        const aiPromise = replitOpenai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 250,
          temperature: 0.8,
        });
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));
        const completion = await Promise.race([aiPromise, timeout]);
        if (completion && "choices" in completion) {
          aiInsight = completion.choices[0]?.message?.content?.trim() || "";
        }
      } catch (aiErr) {
        console.error("AI insight generation failed (non-blocking):", aiErr);
      }

      const nextSteps = lang === "es"
        ? [
            "Explora los detalles de cada carrera — requisitos, salarios y perspectivas",
            "Chatea con nuestro asistente de IA para obtener orientación personalizada sobre programas locales",
            "Visita nuestra sección de recursos para becas y ayuda financiera",
            "Conecta con instituciones del Norte del Estado que ofrecen estos programas",
          ]
        : [
            "Explore each career's details — requirements, salary, and outlook",
            "Chat with our AI assistant for personalized guidance on local programs",
            "Visit our resources section for scholarships and financial aid",
            "Connect with North State institutions offering these programs",
          ];

      res.json({ careers: careerResults, aiInsight, nextSteps });
    } catch (error) {
      console.error("Assessment error:", error);
      res.status(500).json({ error: "Failed to process assessment" });
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
      const { content, language } = req.body;
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

      const systemPrompt = language === "es" ? SYSTEM_PROMPT_SPANISH : SYSTEM_PROMPT;

      const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `${systemPrompt}\n\n--- PATHWAY KNOWLEDGE BASE ---\n${knowledge}\n--- END KNOWLEDGE BASE ---`,
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

  let narrativeCache: { text: string; generatedAt: number } | null = null;
  const NARRATIVE_TTL = 30 * 60 * 1000;

  app.get("/api/admin/narrative", requireAdmin, async (_req, res) => {
    try {
      if (narrativeCache && Date.now() - narrativeCache.generatedAt < NARRATIVE_TTL) {
        return res.json({ narrative: narrativeCache.text, cached: true });
      }

      const sessions = await storage.getAllChatSessions();
      const stats = await storage.getStats();

      if (!sessions || sessions.length === 0) {
        return res.json({ narrative: "No student interactions yet. The narrative summary will appear here once students begin using the chatbot.", cached: false });
      }

      const sessionSummaries = sessions
        .filter((s: any) => s.userType || s.county || s.interests)
        .slice(0, 50)
        .map((s: any) => {
          const parts = [];
          if (s.userType) parts.push(`Type: ${s.userType}`);
          if (s.county) parts.push(`County: ${s.county}`);
          if (s.interests && Array.isArray(s.interests) && s.interests.length > 0) parts.push(`Interests: ${s.interests.join(", ")}`);
          return parts.join(" | ");
        })
        .filter((s: string) => s.length > 0);

      const response = await replitOpenai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an analytics writer for North State Pathways, an education and career guidance platform in Northern California. Write a brief narrative summary (2-3 short paragraphs) analyzing student interaction patterns. Be specific about what students are looking for, which areas are most active, and what gaps or unmet needs you observe. Write in a professional but warm tone, as if briefing an education administrator. Do not use bullet points or headers — just flowing paragraphs.`,
          },
          {
            role: "user",
            content: `Here are the aggregated stats and individual session data from our chatbot:

Total sessions: ${stats.totalSessions}
Total messages: ${stats.totalMessages}
Top counties: ${stats.topCounties.map((c: any) => `${c.county} (${c.count})`).join(", ") || "None yet"}
Top interests: ${stats.topInterests.map((i: any) => `${i.interest} (${i.count})`).join(", ") || "None yet"}

Individual sessions:
${sessionSummaries.join("\n")}

Write 2-3 short paragraphs summarizing what students are seeking, which regions and interests are most active, and any gaps or patterns worth noting.`,
          },
        ],
        max_tokens: 500,
      });

      const narrative = response.choices[0]?.message?.content || "Unable to generate summary.";
      narrativeCache = { text: narrative, generatedAt: Date.now() };
      res.json({ narrative, cached: false });
    } catch (error) {
      console.error("Error generating narrative:", error);
      res.status(500).json({ error: "Failed to generate narrative summary" });
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
      const body = { ...req.body };

      if (body.institutionName && !body.institutionId) {
        const institutions = await storage.getInstitutions();
        const match = institutions.find(
          (i) => i.name.toLowerCase().trim() === body.institutionName.toLowerCase().trim()
        );
        if (match) {
          body.institutionId = match.id;
        } else {
          const newInst = await storage.createInstitution({
            name: body.institutionName,
            type: body.institutionType || "College",
            county: body.county || null,
            website: body.url || null,
            description: null,
          });
          body.institutionId = newInst.id;
        }
      }
      delete body.institutionName;
      delete body.institutionType;

      const parsed = insertProgramSchema.parse(body);
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
      const { provider, apiKey: providedKey } = req.body;

      const keyMap: Record<string, string> = { openai: "openai_api_key", anthropic: "anthropic_api_key", openrouter: "openrouter_api_key" };
      let apiKey = providedKey;
      if (!apiKey || apiKey.includes("•")) {
        const settings = await storage.getAllSettings();
        const settingsMap: Record<string, string> = {};
        for (const s of settings) settingsMap[s.key] = s.value;
        apiKey = settingsMap[keyMap[provider]];
      }

      if (!apiKey) return res.status(400).json({ error: `No ${provider} API key configured` });

      let client: OpenAI;
      let model: string;

      if (provider === "openai") {
        client = new OpenAI({ apiKey });
        model = "gpt-4o-mini";
      } else if (provider === "anthropic") {
        client = new OpenAI({ apiKey, baseURL: "https://api.anthropic.com/v1/" });
        model = "claude-haiku-3-5-20241022";
      } else if (provider === "openrouter") {
        client = new OpenAI({
          apiKey,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": "https://northstatepathways.org",
            "X-Title": "North State Pathways",
          },
        });
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
      let msg = error?.message || "Connection failed";
      if (msg.includes("User not found") && req.body?.provider === "openrouter") {
        msg = "OpenRouter rejected this key (User not found). If this key works elsewhere, try generating a new key at openrouter.ai/settings/keys specifically for this project — keys can be IP-restricted.";
      }
      res.status(500).json({ error: msg.length > 300 ? msg.slice(0, 300) : msg });
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

      const knowledge = await storage.getPathwayKnowledge().catch(() => "");
      const researchModelSetting = (await storage.getSetting("research_model")) || "openrouter/openai/gpt-4o-mini-search-preview";

      let researchClient: OpenAI;
      let researchModel: string;
      try {
        const result = await getAIClient(researchModelSetting);
        researchClient = result.client;
        researchModel = result.model;
      } catch (clientErr: any) {
        await storage.updateResearchTask(task.id, { status: "failed", aiResponse: `Failed to initialize research model: ${clientErr?.message || "Unknown error"}. Make sure the required API key (OpenAI or OpenRouter) is configured in Settings.` });
        return res.status(400).json({ error: "Research requires an API key for the selected model. Please configure the appropriate key in Settings." });
      }

      const countyScope = task.county ? `Focus EXCLUSIVELY on ${task.county}, California.` : "Cover all 10 North State counties: Butte, Glenn, Lassen, Modoc, Plumas, Shasta, Sierra, Siskiyou, Tehama, and Trinity counties in California.";
      const allPathways = await storage.getPathways();
      const pathwayName = task.pathwayId ? allPathways.find((p: any) => p.id === task.pathwayId)?.name : null;

      const existingNames = knowledge
        .split("\n")
        .filter((line: string) => line.startsWith("- ") || line.startsWith("• "))
        .map((line: string) => line.replace(/^[-•]\s*/, "").trim())
        .slice(0, 50)
        .join(", ");

      const response = await researchClient.chat.completions.create({
        model: researchModel,
        messages: [
          {
            role: "system",
            content: `You are a web research assistant for North State Pathways. Your job is to SEARCH THE INTERNET and find NEW programs, institutions, scholarships, and resources that are NOT already in our database.

YOUR TASK: Search the web for real, currently-available education and career programs, scholarships, and resources.

GEOGRAPHIC SCOPE: ${countyScope}
${pathwayName ? `PATHWAY FOCUS: ${pathwayName}-related programs and resources` : ""}

ALREADY IN OUR DATABASE (do NOT repeat these):
${existingNames || "None yet"}

SEARCH INSTRUCTIONS:
- Search for real programs at community colleges, universities, and training centers in the specified area
- Find actual scholarships, grants, and financial aid opportunities
- Include real URLs to program pages and institution websites
- Only report programs and resources you can verify exist — no hypothetical or suggested programs
- Do NOT include anything outside the specified county/region

RESPONSE FORMAT — Follow this EXACTLY:

## Findings
Concise summary of what you found on the web (2-4 paragraphs max). Mention specific institutions and their websites. State only verified facts.

## Programs Found
For each real program discovered online:
- **[Program Name]** at [Institution] — [Level] — [Brief description] — [URL]

## Resources Found
For each real resource (scholarship, financial aid, support service) found online:
- **[Resource Name]** ([Type]) — [Description] — Eligibility: [who qualifies] — [URL]

---ACTIONS---
Output a JSON array of items to add to the knowledge base. Only include items you found with real information:
\`\`\`json
[
  {
    "type": "program",
    "name": "Program Name",
    "institution": "Institution Name",
    "county": "County Name",
    "level": "Certificate|Associate|Bachelor|Master|Training",
    "description": "Brief description",
    "url": "https://actual-url"
  },
  {
    "type": "resource",
    "name": "Resource Name",
    "resourceType": "Scholarship|Grant|Financial Aid|Support Service|Internship",
    "description": "What it provides",
    "eligibility": "Who qualifies",
    "url": "https://actual-url",
    "counties": ["County1", "County2"]
  }
]
\`\`\`

RULES:
- SEARCH THE WEB. Do not make up programs or suggest what might exist.
- Every item must have a real URL or clearly state the source.
- Be concise and factual. No suggestions, no follow-up questions.
- Skip items already in our database.`,
          },
          {
            role: "user",
            content: `Research task: ${task.title}\n\nDescription: ${task.description || "No additional description"}\n\nCounty: ${task.county || "All North State counties"}\n\nSearch the internet for real, currently available programs and resources matching this request.`,
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
          daily: dailyBudget ? parseFloat(dailyBudget) : null,
          monthly: monthlyBudget ? parseFloat(monthlyBudget) : null,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch token usage" });
    }
  });

  // ========== ONBOARDING SCRIPTS API (Admin) ==========
  app.get("/api/admin/onboarding-scripts", requireAdmin, async (req, res) => {
    try {
      const pathwayId = req.query.pathwayId ? parseInt(req.query.pathwayId as string) : undefined;
      const language = (req.query.language as string) || undefined;
      const scripts = await storage.getOnboardingScripts(pathwayId, language);
      res.json(scripts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch onboarding scripts" });
    }
  });

  app.post("/api/admin/onboarding-scripts", requireAdmin, async (req, res) => {
    try {
      const parsed = insertOnboardingScriptSchema.parse(req.body);
      const script = await storage.createOnboardingScript(parsed);
      res.status(201).json(script);
    } catch (error: any) {
      if (error?.name === "ZodError") return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to create onboarding script" });
    }
  });

  app.patch("/api/admin/onboarding-scripts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const updateSchema = insertOnboardingScriptSchema.partial();
      const parsed = updateSchema.parse(req.body);
      const script = await storage.updateOnboardingScript(id, parsed);
      if (!script) return res.status(404).json({ error: "Script not found" });
      res.json(script);
    } catch (error: any) {
      if (error?.name === "ZodError") return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: "Failed to update onboarding script" });
    }
  });

  app.delete("/api/admin/onboarding-scripts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const existing = await storage.getOnboardingScript(id);
      if (!existing) return res.status(404).json({ error: "Script not found" });
      if (existing.audioUrl && existing.audioUrl.startsWith("/audio/onboarding/custom/")) {
        const filePath = path.join(process.cwd(), "public", existing.audioUrl);
        try { await unlink(filePath); } catch {}
      }
      await storage.deleteOnboardingScript(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete onboarding script" });
    }
  });

  app.post("/api/admin/onboarding-scripts/:id/upload-audio", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const script = await storage.getOnboardingScript(id);
      if (!script) return res.status(404).json({ error: "Script not found" });

      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const audioBuffer = Buffer.concat(chunks);
          if (audioBuffer.length === 0) return res.status(400).json({ error: "No audio data" });

          const audioDir = path.join(process.cwd(), "public", "audio", "onboarding", "custom");
          await mkdir(audioDir, { recursive: true });

          const filename = `script-${id}-${Date.now()}.mp3`;
          const filePath = path.join(audioDir, filename);
          await writeFile(filePath, audioBuffer);

          if (script.audioUrl && script.audioUrl.startsWith("/audio/onboarding/custom/")) {
            const oldPath = path.join(process.cwd(), "public", script.audioUrl);
            try { await unlink(oldPath); } catch {}
          }

          const audioUrl = `/audio/onboarding/custom/${filename}`;
          const updated = await storage.updateOnboardingScript(id, { audioUrl });
          res.json(updated);
        } catch (error) {
          console.error("Audio upload error:", error);
          res.status(500).json({ error: "Failed to save audio" });
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload audio" });
    }
  });

  app.post("/api/admin/onboarding-scripts/:id/generate-audio", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const script = await storage.getOnboardingScript(id);
      if (!script) return res.status(404).json({ error: "Script not found" });

      const voice = req.body.voice || "nova";
      const audioBuffer = await textToSpeech(script.scriptText, voice, "mp3");

      const audioDir = path.join(process.cwd(), "public", "audio", "onboarding", "custom");
      await mkdir(audioDir, { recursive: true });

      const filename = `script-${id}-${Date.now()}.mp3`;
      const filePath = path.join(audioDir, filename);
      await writeFile(filePath, audioBuffer);

      if (script.audioUrl && script.audioUrl.startsWith("/audio/onboarding/custom/")) {
        const oldPath = path.join(process.cwd(), "public", script.audioUrl);
        try { await unlink(oldPath); } catch {}
      }

      const audioUrl = `/audio/onboarding/custom/${filename}`;
      const updated = await storage.updateOnboardingScript(id, { audioUrl });
      res.json(updated);
    } catch (error) {
      console.error("TTS generation error:", error);
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });

  app.post("/api/admin/onboarding-scripts/auto-generate", requireAdmin, async (req, res) => {
    try {
      const { pathwayId, step, contextKey } = req.body;
      if (!pathwayId || !step) return res.status(400).json({ error: "pathwayId and step are required" });

      const pathway = await storage.getPathway(pathwayId);
      if (!pathway) return res.status(404).json({ error: "Pathway not found" });

      const stepDescriptions: Record<string, string> = {
        welcome: "Welcome message introducing the pathway",
        county: "Asking which county the student lives in",
        "student-type": "Asking what type of student they are (high school, college grad, etc.)",
        "study-location": "Asking if they prefer to study locally or are willing to travel",
        "support-needs": "Asking what kind of support they need (financial, mentoring, work experience)",
      };

      const prompt = `You are writing a friendly, encouraging voice narration script for a career guidance chatbot. The pathway is "${pathway.name}". This is for the onboarding step: "${step}" - ${stepDescriptions[step] || step}.${contextKey ? ` The specific context is: "${contextKey}".` : ""}

Write a brief, warm narration script (2-4 sentences) that:
- Speaks directly to the student in second person
- Is encouraging and supportive
- Guides them to make their selection
- References the ${pathway.name} pathway naturally
- Sounds natural when spoken aloud (avoid text-like formatting)

Return ONLY the script text, no quotes or formatting.`;

      const completion = await replitOpenai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      });

      const scriptText = completion.choices[0]?.message?.content?.trim() || "";
      res.json({ scriptText });
    } catch (error) {
      console.error("Auto-generate script error:", error);
      res.status(500).json({ error: "Failed to generate script" });
    }
  });

  // Public endpoint: fetch pathways (for chat page)
  app.get("/api/pathways", async (_req, res) => {
    try { res.json(await storage.getPathways()); }
    catch (error) { res.status(500).json({ error: "Failed to fetch pathways" }); }
  });

  // Public endpoint: fetch onboarding scripts for a pathway
  app.get("/api/onboarding-scripts", async (req, res) => {
    try {
      const pathwayId = req.query.pathwayId ? parseInt(req.query.pathwayId as string) : undefined;
      const language = (req.query.language as string) || "en";
      if (!pathwayId) return res.status(400).json({ error: "pathwayId required" });
      const scripts = await storage.getOnboardingScripts(pathwayId, language);
      res.json(scripts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch onboarding scripts" });
    }
  });

  return httpServer;
}
