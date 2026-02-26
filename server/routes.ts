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
      description: { en: "Provide direct patient care in hospitals, clinics, and community health settings. RNs assess patients, administer treatments, and coordinate care plans.", es: "Brinda atención directa al paciente en hospitales, clínicas y entornos de salud comunitaria." },
      salary: { en: "$80,000 – $120,000/year", es: "$80,000 – $120,000/año" },
      education: { en: "Associate or Bachelor's Degree in Nursing (2–4 years)", es: "Título de asociado o licenciatura en enfermería (2-4 años)" },
      outlook: { en: "High demand — 6% growth expected through 2032", es: "Alta demanda — se espera un crecimiento del 6% hasta 2032" },
      scoring: {
        hc_motivation: { passion: 15, growth: 10, money: 5, balance: 0 },
        hc_education: { medium: 15, short: 10, long: 5, minimal: 0 },
        hc_patients: { all_the_time: 15, some: 5, minimal: 0 },
        hc_medical: { very: 15, somewhat: 10, not_really: 0 },
        hc_emergency: { moderate: 10, fast: 10, calm: 0 },
        hc_age_group: { all: 10, elderly: 10, adults: 8, children: 8 },
      },
    },
    {
      id: "licensed_vocational_nurse",
      title: { en: "Licensed Vocational Nurse (LVN)", es: "Enfermero/a Vocacional con Licencia (LVN)" },
      description: { en: "Provide basic nursing care under the supervision of RNs and doctors. LVNs work in long-term care, clinics, and home health settings.", es: "Brinda cuidados básicos de enfermería bajo la supervisión de RNs y médicos." },
      salary: { en: "$50,000 – $65,000/year", es: "$50,000 – $65,000/año" },
      education: { en: "Certificate or Diploma (12–18 months)", es: "Certificado o diploma (12-18 meses)" },
      outlook: { en: "Steady demand — especially in rural and long-term care", es: "Demanda constante — especialmente en áreas rurales y cuidado a largo plazo" },
      scoring: {
        hc_motivation: { passion: 15, balance: 10, money: 5, growth: 5 },
        hc_education: { short: 15, minimal: 10, medium: 0, long: 0 },
        hc_patients: { all_the_time: 15, some: 10, minimal: 0 },
        hc_medical: { somewhat: 15, very: 10, not_really: 0 },
        hc_emergency: { calm: 10, moderate: 10, fast: 0 },
        hc_age_group: { elderly: 15, all: 8, adults: 5, children: 5 },
      },
    },
    {
      id: "certified_nursing_assistant",
      title: { en: "Certified Nursing Assistant (CNA)", es: "Asistente de Enfermería Certificado (CNA)" },
      description: { en: "Help patients with daily activities like bathing, dressing, and eating. CNAs work closely with patients in nursing homes, hospitals, and home care.", es: "Ayuda a los pacientes con actividades diarias como bañarse, vestirse y comer." },
      salary: { en: "$32,000 – $42,000/year", es: "$32,000 – $42,000/año" },
      education: { en: "Certificate program (4–12 weeks)", es: "Programa de certificado (4-12 semanas)" },
      outlook: { en: "Very high demand — great entry point into healthcare", es: "Muy alta demanda — excelente punto de entrada al sector salud" },
      scoring: {
        hc_motivation: { passion: 15, balance: 10, money: 0, growth: 5 },
        hc_education: { minimal: 15, short: 10, medium: 0, long: 0 },
        hc_patients: { all_the_time: 15, some: 5, minimal: 0 },
        hc_medical: { somewhat: 10, very: 5, not_really: 5 },
        hc_emergency: { calm: 15, moderate: 5, fast: 0 },
        hc_age_group: { elderly: 15, all: 8, adults: 5, children: 3 },
      },
    },
    {
      id: "emt_paramedic",
      title: { en: "EMT / Paramedic", es: "Técnico de Emergencias Médicas / Paramédico" },
      description: { en: "Respond to emergency calls, provide pre-hospital care, and transport patients. Work in ambulances, fire departments, and emergency rooms.", es: "Responde a llamadas de emergencia, brinda atención prehospitalaria y transporta pacientes." },
      salary: { en: "$38,000 – $65,000/year", es: "$38,000 – $65,000/año" },
      education: { en: "Certificate to Associate Degree (6 months – 2 years)", es: "Certificado a título de asociado (6 meses – 2 años)" },
      outlook: { en: "Growing demand — especially in rural communities", es: "Demanda creciente — especialmente en comunidades rurales" },
      scoring: {
        hc_motivation: { passion: 15, growth: 10, money: 5, balance: 0 },
        hc_education: { minimal: 10, short: 15, medium: 0, long: 0 },
        hc_patients: { all_the_time: 15, some: 5, minimal: 0 },
        hc_medical: { very: 15, somewhat: 5, not_really: 0 },
        hc_emergency: { fast: 15, moderate: 0, calm: 0 },
        hc_age_group: { all: 15, adults: 8, children: 5, elderly: 5 },
      },
    },
    {
      id: "medical_assistant",
      title: { en: "Medical Assistant", es: "Asistente Médico" },
      description: { en: "Support physicians in clinics by taking vitals, preparing patients, scheduling appointments, and managing records.", es: "Apoya a los médicos en clínicas tomando signos vitales, preparando pacientes y gestionando registros." },
      salary: { en: "$35,000 – $45,000/year", es: "$35,000 – $45,000/año" },
      education: { en: "Certificate or Associate Degree (9 months – 2 years)", es: "Certificado o título de asociado (9 meses – 2 años)" },
      outlook: { en: "Very high demand — 14% growth expected", es: "Muy alta demanda — se espera un crecimiento del 14%" },
      scoring: {
        hc_motivation: { balance: 15, passion: 10, money: 5, growth: 5 },
        hc_education: { short: 15, minimal: 10, medium: 0, long: 0 },
        hc_patients: { some: 15, all_the_time: 10, minimal: 0 },
        hc_medical: { somewhat: 15, very: 5, not_really: 5 },
        hc_emergency: { moderate: 15, calm: 10, fast: 0 },
        hc_age_group: { all: 10, adults: 10, children: 5, elderly: 5 },
      },
    },
    {
      id: "health_info_tech",
      title: { en: "Health Information Technician", es: "Técnico en Información de Salud" },
      description: { en: "Manage patient records, medical coding, and healthcare data systems. Work behind the scenes to keep healthcare organizations running efficiently.", es: "Gestiona registros de pacientes, codificación médica y sistemas de datos de salud." },
      salary: { en: "$42,000 – $58,000/year", es: "$42,000 – $58,000/año" },
      education: { en: "Associate Degree (2 years)", es: "Título de asociado (2 años)" },
      outlook: { en: "Strong demand — healthcare digitization driving growth", es: "Fuerte demanda — la digitalización impulsa el crecimiento" },
      scoring: {
        hc_motivation: { money: 10, balance: 15, growth: 10, passion: 0 },
        hc_education: { short: 15, medium: 10, minimal: 5, long: 0 },
        hc_patients: { minimal: 15, some: 5, all_the_time: 0 },
        hc_medical: { not_really: 15, somewhat: 5, very: 0 },
        hc_emergency: { calm: 15, moderate: 5, fast: 0 },
        hc_age_group: { all: 10, adults: 5, elderly: 3, children: 3 },
      },
    },
    {
      id: "public_health_worker",
      title: { en: "Community Health Worker", es: "Trabajador de Salud Comunitaria" },
      description: { en: "Connect communities with health services, conduct outreach, and promote wellness education in underserved populations.", es: "Conecta comunidades con servicios de salud, realiza difusión y promueve educación sobre bienestar." },
      salary: { en: "$35,000 – $50,000/year", es: "$35,000 – $50,000/año" },
      education: { en: "Certificate to Bachelor's Degree (varies)", es: "Certificado a licenciatura (varía)" },
      outlook: { en: "Fast growing — 14% growth, critical in rural areas", es: "Crecimiento rápido — 14%, crucial en áreas rurales" },
      scoring: {
        hc_motivation: { passion: 15, growth: 5, balance: 10, money: 0 },
        hc_education: { minimal: 10, short: 15, medium: 10, long: 0 },
        hc_patients: { some: 15, all_the_time: 10, minimal: 0 },
        hc_medical: { not_really: 10, somewhat: 10, very: 0 },
        hc_emergency: { calm: 15, moderate: 10, fast: 0 },
        hc_age_group: { all: 15, elderly: 8, children: 8, adults: 8 },
      },
    },
  ];

  const educationCareers: CareerProfile[] = [
    {
      id: "elementary_teacher",
      title: { en: "Elementary School Teacher (K-6)", es: "Maestro/a de Escuela Primaria (K-6)" },
      description: { en: "Teach core subjects to young students, foster curiosity, and create engaging learning environments in elementary schools.", es: "Enseña materias básicas a estudiantes jóvenes y crea ambientes de aprendizaje atractivos." },
      salary: { en: "$55,000 – $85,000/year", es: "$55,000 – $85,000/año" },
      education: { en: "Bachelor's Degree + Teaching Credential (4–5 years)", es: "Licenciatura + Credencial de enseñanza (4-5 años)" },
      outlook: { en: "Steady demand — especially in rural districts", es: "Demanda constante — especialmente en distritos rurales" },
      scoring: {
        ed_motivation: { inspire: 15, community: 10, subject: 5, stability: 5 },
        ed_age_group: { elementary: 15, early_childhood: 5, secondary: 0, adult: 0 },
        ed_education_level: { bachelors: 15, masters: 10, associates: 0, certificate: 0 },
        ed_role: { classroom: 15, specialist: 5, support: 0, childcare: 0 },
        ed_environment: { structured: 15, dynamic: 10, flexible: 0 },
        ed_location: { local: 10, willing_travel: 5, online: 0 },
      },
    },
    {
      id: "secondary_teacher",
      title: { en: "Middle/High School Teacher (7-12)", es: "Maestro/a de Secundaria/Preparatoria (7-12)" },
      description: { en: "Teach specialized subjects to teenagers, prepare students for college and careers, and serve as a mentor during formative years.", es: "Enseña materias especializadas a adolescentes y prepara estudiantes para la universidad y carreras." },
      salary: { en: "$58,000 – $90,000/year", es: "$58,000 – $90,000/año" },
      education: { en: "Bachelor's Degree + Teaching Credential (4–5 years)", es: "Licenciatura + Credencial de enseñanza (4-5 años)" },
      outlook: { en: "Good demand — especially in STEM and special education", es: "Buena demanda — especialmente en STEM y educación especial" },
      scoring: {
        ed_motivation: { subject: 15, inspire: 10, community: 5, stability: 5 },
        ed_age_group: { secondary: 15, adult: 5, elementary: 0, early_childhood: 0 },
        ed_education_level: { bachelors: 15, masters: 10, associates: 0, certificate: 0 },
        ed_role: { classroom: 15, specialist: 10, support: 0, childcare: 0 },
        ed_environment: { dynamic: 15, structured: 10, flexible: 0 },
        ed_location: { local: 10, willing_travel: 10, online: 0 },
      },
    },
    {
      id: "early_childhood_educator",
      title: { en: "Early Childhood Educator", es: "Educador/a de Primera Infancia" },
      description: { en: "Nurture and teach young children (ages 0-5) in preschools, childcare centers, and Head Start programs. Focus on developmental milestones.", es: "Cuida y enseña a niños pequeños (0-5 años) en preescolares y centros de cuidado infantil." },
      salary: { en: "$30,000 – $48,000/year", es: "$30,000 – $48,000/año" },
      education: { en: "Certificate to Associate Degree (6 months – 2 years)", es: "Certificado a título de asociado (6 meses – 2 años)" },
      outlook: { en: "High demand — critical need in North State communities", es: "Alta demanda — necesidad crítica en comunidades del Norte del Estado" },
      scoring: {
        ed_motivation: { inspire: 15, community: 10, stability: 5, subject: 0 },
        ed_age_group: { early_childhood: 15, elementary: 5, secondary: 0, adult: 0 },
        ed_education_level: { certificate: 15, associates: 15, bachelors: 5, masters: 0 },
        ed_role: { childcare: 15, classroom: 10, support: 5, specialist: 0 },
        ed_environment: { dynamic: 15, flexible: 10, structured: 5 },
        ed_location: { local: 15, online: 0, willing_travel: 5 },
      },
    },
    {
      id: "paraprofessional",
      title: { en: "Paraprofessional / Teacher's Aide", es: "Paraprofesional / Asistente de Maestro" },
      description: { en: "Support lead teachers in the classroom by helping students one-on-one, managing activities, and assisting with special needs students.", es: "Apoya a los maestros en el aula ayudando a estudiantes individualmente y asistiendo con necesidades especiales." },
      salary: { en: "$28,000 – $38,000/year", es: "$28,000 – $38,000/año" },
      education: { en: "High school diploma + some college (certificate preferred)", es: "Diploma de preparatoria + algo de universidad (certificado preferido)" },
      outlook: { en: "Consistent demand — great stepping stone to teaching", es: "Demanda constante — excelente paso hacia la enseñanza" },
      scoring: {
        ed_motivation: { community: 15, inspire: 10, stability: 10, subject: 0 },
        ed_age_group: { elementary: 10, early_childhood: 10, secondary: 5, adult: 0 },
        ed_education_level: { certificate: 15, associates: 10, bachelors: 0, masters: 0 },
        ed_role: { support: 15, childcare: 10, classroom: 5, specialist: 0 },
        ed_environment: { structured: 15, dynamic: 5, flexible: 5 },
        ed_location: { local: 15, willing_travel: 5, online: 0 },
      },
    },
    {
      id: "school_counselor",
      title: { en: "School Counselor", es: "Consejero/a Escolar" },
      description: { en: "Guide students through academic planning, social-emotional challenges, and career exploration. Work in K-12 schools or college settings.", es: "Guía a estudiantes en planificación académica, desafíos socioemocionales y exploración de carreras." },
      salary: { en: "$55,000 – $80,000/year", es: "$55,000 – $80,000/año" },
      education: { en: "Master's Degree + Pupil Personnel Services (PPS) Credential", es: "Maestría + Credencial de Servicios de Personal Estudiantil (PPS)" },
      outlook: { en: "Growing demand — increased focus on student mental health", es: "Demanda creciente — mayor enfoque en salud mental estudiantil" },
      scoring: {
        ed_motivation: { inspire: 10, community: 15, stability: 10, subject: 0 },
        ed_age_group: { secondary: 10, elementary: 10, adult: 5, early_childhood: 0 },
        ed_education_level: { masters: 15, bachelors: 5, associates: 0, certificate: 0 },
        ed_role: { specialist: 15, support: 10, classroom: 0, childcare: 0 },
        ed_environment: { flexible: 15, structured: 5, dynamic: 5 },
        ed_location: { local: 10, willing_travel: 10, online: 5 },
      },
    },
    {
      id: "special_education_teacher",
      title: { en: "Special Education Teacher", es: "Maestro/a de Educación Especial" },
      description: { en: "Work with students who have learning disabilities, autism, or other special needs. Develop individualized education plans (IEPs) and adapt curriculum.", es: "Trabaja con estudiantes con discapacidades de aprendizaje, autismo u otras necesidades especiales." },
      salary: { en: "$55,000 – $85,000/year", es: "$55,000 – $85,000/año" },
      education: { en: "Bachelor's Degree + Education Specialist Credential", es: "Licenciatura + Credencial de Especialista en Educación" },
      outlook: { en: "Very high demand — critical shortage in California", es: "Muy alta demanda — escasez crítica en California" },
      scoring: {
        ed_motivation: { inspire: 15, community: 10, stability: 5, subject: 0 },
        ed_age_group: { elementary: 10, secondary: 10, early_childhood: 5, adult: 0 },
        ed_education_level: { bachelors: 10, masters: 15, associates: 0, certificate: 0 },
        ed_role: { specialist: 15, classroom: 10, support: 5, childcare: 0 },
        ed_environment: { dynamic: 15, structured: 10, flexible: 5 },
        ed_location: { local: 10, willing_travel: 10, online: 0 },
      },
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
