import { db } from "./db";
import { eq, desc, sql, and, count, gte, sum } from "drizzle-orm";
import {
  counties, institutions, pathways, programs, resources,
  chatSessions, chatMessages, researchTasks, conversations, messages, appSettings, tokenUsage,
  onboardingScripts, assessmentQuestions, assessmentOptions, assessmentCareers, contacts,
  type InsertCounty, type InsertInstitution, type InsertPathway,
  type InsertProgram, type InsertResource, type InsertChatSession,
  type InsertChatMessage, type InsertResearchTask, type InsertTokenUsage,
  type InsertOnboardingScript, type InsertAssessmentQuestion, type InsertAssessmentOption, type InsertAssessmentCareer,
  type InsertContact,
  type County, type Institution, type Pathway, type Program,
  type Resource, type ChatSession, type ChatMessage, type ResearchTask,
  type AppSetting, type TokenUsage, type OnboardingScript,
  type AssessmentQuestion, type AssessmentOption, type AssessmentCareer,
  type Contact, type EligibilityRule
} from "@shared/schema";

export interface IStorage {
  getCounties(): Promise<County[]>;
  createCounty(data: InsertCounty): Promise<County>;

  getInstitutions(): Promise<Institution[]>;
  createInstitution(data: InsertInstitution): Promise<Institution>;
  updateInstitution(id: number, data: Partial<InsertInstitution>): Promise<Institution | undefined>;
  deleteInstitution(id: number): Promise<void>;

  getPathways(): Promise<Pathway[]>;
  getPathway(id: number): Promise<Pathway | undefined>;
  createPathway(data: InsertPathway): Promise<Pathway>;
  updatePathway(id: number, data: Partial<InsertPathway>): Promise<Pathway | undefined>;
  deletePathway(id: number): Promise<void>;

  getPrograms(): Promise<Program[]>;
  getProgramsByPathway(pathwayId: number): Promise<Program[]>;
  createProgram(data: InsertProgram): Promise<Program>;
  updateProgram(id: number, data: Partial<InsertProgram>): Promise<Program | undefined>;
  deleteProgram(id: number): Promise<void>;

  getResources(): Promise<Resource[]>;
  createResource(data: InsertResource): Promise<Resource>;
  updateResource(id: number, data: Partial<InsertResource>): Promise<Resource | undefined>;
  deleteResource(id: number): Promise<void>;

  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<AppSetting>;
  getAllSettings(): Promise<AppSetting[]>;

  createChatSession(data: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: number): Promise<ChatSession | undefined>;
  getChatSessionBySessionId(sessionId: string): Promise<ChatSession | undefined>;
  updateChatSession(id: number, data: Partial<InsertChatSession>): Promise<ChatSession | undefined>;
  getAllChatSessions(): Promise<ChatSession[]>;
  getChatMessagesBySession(sessionId: number): Promise<ChatMessage[]>;
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;

  getResearchTasks(): Promise<ResearchTask[]>;
  getResearchTask(id: number): Promise<ResearchTask | undefined>;
  createResearchTask(data: InsertResearchTask): Promise<ResearchTask>;
  updateResearchTask(id: number, data: Partial<InsertResearchTask>): Promise<ResearchTask | undefined>;
  deleteResearchTask(id: number): Promise<void>;

  getOnboardingScripts(pathwayId?: number, language?: string): Promise<OnboardingScript[]>;
  getOnboardingScript(id: number): Promise<OnboardingScript | undefined>;
  createOnboardingScript(data: InsertOnboardingScript): Promise<OnboardingScript>;
  updateOnboardingScript(id: number, data: Partial<InsertOnboardingScript>): Promise<OnboardingScript | undefined>;
  deleteOnboardingScript(id: number): Promise<void>;

  getStats(): Promise<{
    totalSessions: number;
    totalMessages: number;
    totalPathways: number;
    totalPrograms: number;
    totalResources: number;
    topCounties: { county: string; count: number }[];
    topInterests: { interest: string; count: number }[];
    recentSessions: ChatSession[];
  }>;

  getPathwayKnowledge(): Promise<string>;

  getAssessmentQuestions(track?: string): Promise<(AssessmentQuestion & { options: AssessmentOption[] })[]>;
  createAssessmentQuestion(data: InsertAssessmentQuestion): Promise<AssessmentQuestion>;
  updateAssessmentQuestion(id: number, data: Partial<InsertAssessmentQuestion>): Promise<AssessmentQuestion | undefined>;
  deleteAssessmentQuestion(id: number): Promise<void>;

  createAssessmentOption(data: InsertAssessmentOption): Promise<AssessmentOption>;
  updateAssessmentOption(id: number, data: Partial<InsertAssessmentOption>): Promise<AssessmentOption | undefined>;
  deleteAssessmentOption(id: number): Promise<void>;

  getAssessmentCareers(track?: string): Promise<AssessmentCareer[]>;
  createAssessmentCareer(data: InsertAssessmentCareer): Promise<AssessmentCareer>;
  updateAssessmentCareer(id: number, data: Partial<InsertAssessmentCareer>): Promise<AssessmentCareer | undefined>;
  deleteAssessmentCareer(id: number): Promise<void>;

  getContacts(): Promise<Contact[]>;
  createContact(data: InsertContact): Promise<Contact>;
  updateContact(id: number, data: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<void>;

  recordTokenUsage(data: InsertTokenUsage): Promise<TokenUsage>;
  getTokenUsageStats(period: "day" | "month"): Promise<{
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    estimatedCost: number;
    byModel: { model: string; provider: string; totalTokens: number; estimatedCost: number }[];
    byType: { usageType: string; totalTokens: number; estimatedCost: number }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getCounties() {
    return db.select().from(counties);
  }
  async createCounty(data: InsertCounty) {
    const [c] = await db.insert(counties).values(data).returning();
    return c;
  }

  async getInstitutions() {
    return db.select().from(institutions);
  }
  async createInstitution(data: InsertInstitution) {
    const [inst] = await db.insert(institutions).values(data).returning();
    return inst;
  }
  async updateInstitution(id: number, data: Partial<InsertInstitution>) {
    const [inst] = await db.update(institutions).set(data).where(eq(institutions.id, id)).returning();
    return inst;
  }
  async deleteInstitution(id: number) {
    await db.delete(institutions).where(eq(institutions.id, id));
  }

  async getPathways() {
    return db.select().from(pathways);
  }
  async getPathway(id: number) {
    const [p] = await db.select().from(pathways).where(eq(pathways.id, id));
    return p;
  }
  async createPathway(data: InsertPathway) {
    const [p] = await db.insert(pathways).values(data).returning();
    return p;
  }
  async updatePathway(id: number, data: Partial<InsertPathway>) {
    const [p] = await db.update(pathways).set(data).where(eq(pathways.id, id)).returning();
    return p;
  }
  async deletePathway(id: number) {
    await db.delete(pathways).where(eq(pathways.id, id));
  }

  async getPrograms() {
    return db.select().from(programs);
  }
  async getProgramsByPathway(pathwayId: number) {
    return db.select().from(programs).where(eq(programs.pathwayId, pathwayId));
  }
  async createProgram(data: InsertProgram) {
    const [p] = await db.insert(programs).values(data).returning();
    return p;
  }
  async updateProgram(id: number, data: Partial<InsertProgram>) {
    const [p] = await db.update(programs).set(data).where(eq(programs.id, id)).returning();
    return p;
  }
  async deleteProgram(id: number) {
    await db.delete(programs).where(eq(programs.id, id));
  }

  async getResources() {
    return db.select().from(resources);
  }
  async createResource(data: InsertResource) {
    const [r] = await db.insert(resources).values(data).returning();
    return r;
  }
  async updateResource(id: number, data: Partial<InsertResource>) {
    const [r] = await db.update(resources).set(data).where(eq(resources.id, id)).returning();
    return r;
  }
  async deleteResource(id: number) {
    await db.delete(resources).where(eq(resources.id, id));
  }

  async createChatSession(data: InsertChatSession) {
    const [s] = await db.insert(chatSessions).values(data).returning();
    return s;
  }
  async getChatSession(id: number) {
    const [s] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return s;
  }
  async getChatSessionBySessionId(sessionId: string) {
    const [s] = await db.select().from(chatSessions).where(eq(chatSessions.sessionId, sessionId));
    return s;
  }
  async updateChatSession(id: number, data: Partial<InsertChatSession>) {
    const [s] = await db.update(chatSessions).set({ ...data, updatedAt: new Date() }).where(eq(chatSessions.id, id)).returning();
    return s;
  }
  async getAllChatSessions() {
    return db.select().from(chatSessions).orderBy(desc(chatSessions.createdAt));
  }
  async getChatMessagesBySession(sessionId: number) {
    return db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(chatMessages.createdAt);
  }
  async createChatMessage(data: InsertChatMessage) {
    const [m] = await db.insert(chatMessages).values(data).returning();
    return m;
  }

  async getResearchTasks() {
    return db.select().from(researchTasks).orderBy(desc(researchTasks.createdAt));
  }
  async getResearchTask(id: number) {
    const [t] = await db.select().from(researchTasks).where(eq(researchTasks.id, id));
    return t;
  }
  async createResearchTask(data: InsertResearchTask) {
    const [t] = await db.insert(researchTasks).values(data).returning();
    return t;
  }
  async updateResearchTask(id: number, data: Partial<InsertResearchTask>) {
    const [t] = await db.update(researchTasks).set({ ...data, updatedAt: new Date() }).where(eq(researchTasks.id, id)).returning();
    return t;
  }
  async deleteResearchTask(id: number) {
    await db.delete(researchTasks).where(eq(researchTasks.id, id));
  }

  async getStats() {
    const [sessionCount] = await db.select({ count: count() }).from(chatSessions);
    const [messageCount] = await db.select({ count: count() }).from(chatMessages);
    const [pathwayCount] = await db.select({ count: count() }).from(pathways);
    const [programCount] = await db.select({ count: count() }).from(programs);
    const [resourceCount] = await db.select({ count: count() }).from(resources);

    const topCountiesResult = await db
      .select({ county: chatSessions.county, count: count() })
      .from(chatSessions)
      .where(sql`${chatSessions.county} IS NOT NULL AND ${chatSessions.county} != ''`)
      .groupBy(chatSessions.county)
      .orderBy(desc(count()))
      .limit(5);

    const recentSessionsResult = await db
      .select()
      .from(chatSessions)
      .orderBy(desc(chatSessions.createdAt))
      .limit(10);

    return {
      totalSessions: sessionCount.count,
      totalMessages: messageCount.count,
      totalPathways: pathwayCount.count,
      totalPrograms: programCount.count,
      totalResources: resourceCount.count,
      topCounties: topCountiesResult.map((r) => ({ county: r.county!, count: r.count })),
      topInterests: await this.getTopInterests(),
      recentSessions: recentSessionsResult,
    };
  }

  async getSetting(key: string): Promise<string | null> {
    const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return setting?.value ?? null;
  }
  async setSetting(key: string, value: string): Promise<AppSetting> {
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key));
    if (existing.length > 0) {
      const [updated] = await db.update(appSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(appSettings.key, key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(appSettings).values({ key, value }).returning();
    return created;
  }
  async getAllSettings(): Promise<AppSetting[]> {
    return db.select().from(appSettings);
  }

  private async getTopInterests(): Promise<{ interest: string; count: number }[]> {
    const result = await db.execute(sql`
      SELECT interest, COUNT(*) as count
      FROM chat_sessions, LATERAL unnest(interests) AS interest
      WHERE interests IS NOT NULL AND array_length(interests, 1) > 0
      GROUP BY interest
      ORDER BY count DESC
      LIMIT 5
    `);
    return (result.rows as any[]).map((r) => ({
      interest: r.interest as string,
      count: Number(r.count),
    }));
  }

  async getPathwayKnowledge(): Promise<string> {
    const allPathways = await this.getPathways();
    const allPrograms = await this.getPrograms();
    const allInstitutions = await this.getInstitutions();
    const allResources = await this.getResources();
    const allCounties = await this.getCounties();

    let knowledge = "## North State Pathways Knowledge Base\n\n";
    knowledge += "### Counties Served\n";
    knowledge += allCounties.map((c) => `- ${c.name} (${c.region})`).join("\n") + "\n\n";

    knowledge += "### Career Pathways\n";
    for (const p of allPathways) {
      knowledge += `\n#### ${p.name}\n`;
      if (p.description) knowledge += `${p.description}\n`;
      const pathwayPrograms = allPrograms.filter((pr) => pr.pathwayId === p.id);
      if (pathwayPrograms.length > 0) {
        knowledge += "Programs:\n";
        for (const pr of pathwayPrograms) {
          const inst = allInstitutions.find((i) => i.id === pr.institutionId);
          knowledge += `- ${pr.name}`;
          if (inst) knowledge += ` at ${inst.name}`;
          if (pr.county) knowledge += ` (${pr.county} County)`;
          if (pr.level) knowledge += ` [${pr.level}]`;
          if (pr.description) knowledge += `: ${pr.description}`;
          if (pr.url) knowledge += ` | Program URL: ${pr.url}`;
          else if (inst?.website) knowledge += ` | Institution URL: ${inst.website}`;
          knowledge += "\n";
        }
      }
    }

    knowledge += "\n### Institutions\n";
    for (const inst of allInstitutions) {
      knowledge += `- ${inst.name} (${inst.type})`;
      if (inst.county) knowledge += ` - ${inst.county} County`;
      if (inst.website) knowledge += ` | Website: ${inst.website}`;
      knowledge += "\n";
    }

    knowledge += "\n### Resources (Scholarships, Financial Aid, Support)\n";
    for (const r of allResources) {
      knowledge += `- ${r.name} (${r.type})`;
      if (r.description) knowledge += `: ${r.description}`;
      if (r.eligibility) knowledge += ` | Eligibility: ${r.eligibility}`;
      if (r.eligibilityRules) {
        const rules = r.eligibilityRules as EligibilityRule[];
        const reqRules = rules.filter(rule => rule.required).map(rule => `${rule.criterion}: ${Array.isArray(rule.values) ? rule.values.join(', ') : JSON.stringify(rule.values)}`);
        if (reqRules.length) knowledge += ` | Requirements: ${reqRules.join('; ')}`;
      }
      if (r.url) knowledge += ` | URL: ${r.url}`;
      knowledge += "\n";
    }

    return knowledge;
  }

  async getOnboardingScripts(pathwayId?: number, language?: string): Promise<OnboardingScript[]> {
    const lang = language || "en";
    if (pathwayId) {
      return db.select().from(onboardingScripts)
        .where(and(eq(onboardingScripts.pathwayId, pathwayId), eq(onboardingScripts.language, lang)))
        .orderBy(onboardingScripts.step, onboardingScripts.sortOrder);
    }
    return db.select().from(onboardingScripts)
      .where(eq(onboardingScripts.language, lang))
      .orderBy(onboardingScripts.step, onboardingScripts.sortOrder);
  }
  async getOnboardingScript(id: number): Promise<OnboardingScript | undefined> {
    const [s] = await db.select().from(onboardingScripts).where(eq(onboardingScripts.id, id));
    return s;
  }
  async createOnboardingScript(data: InsertOnboardingScript): Promise<OnboardingScript> {
    const [s] = await db.insert(onboardingScripts).values(data).returning();
    return s;
  }
  async updateOnboardingScript(id: number, data: Partial<InsertOnboardingScript>): Promise<OnboardingScript | undefined> {
    const [s] = await db.update(onboardingScripts).set({ ...data, updatedAt: new Date() }).where(eq(onboardingScripts.id, id)).returning();
    return s;
  }
  async deleteOnboardingScript(id: number): Promise<void> {
    await db.delete(onboardingScripts).where(eq(onboardingScripts.id, id));
  }

  async getAssessmentQuestions(track?: string): Promise<(AssessmentQuestion & { options: AssessmentOption[] })[]> {
    let questions: AssessmentQuestion[];
    if (track) {
      questions = await db.select().from(assessmentQuestions)
        .where(eq(assessmentQuestions.track, track))
        .orderBy(assessmentQuestions.sortOrder);
    } else {
      questions = await db.select().from(assessmentQuestions)
        .orderBy(assessmentQuestions.sortOrder);
    }
    const allOptions = await db.select().from(assessmentOptions).orderBy(assessmentOptions.sortOrder);
    return questions.map(q => ({
      ...q,
      options: allOptions.filter(o => o.questionId === q.id),
    }));
  }

  async createAssessmentQuestion(data: InsertAssessmentQuestion): Promise<AssessmentQuestion> {
    const [q] = await db.insert(assessmentQuestions).values(data).returning();
    return q;
  }

  async updateAssessmentQuestion(id: number, data: Partial<InsertAssessmentQuestion>): Promise<AssessmentQuestion | undefined> {
    const [q] = await db.update(assessmentQuestions).set({ ...data, updatedAt: new Date() }).where(eq(assessmentQuestions.id, id)).returning();
    return q;
  }

  async deleteAssessmentQuestion(id: number): Promise<void> {
    await db.delete(assessmentQuestions).where(eq(assessmentQuestions.id, id));
  }

  async createAssessmentOption(data: InsertAssessmentOption): Promise<AssessmentOption> {
    const [o] = await db.insert(assessmentOptions).values(data).returning();
    return o;
  }

  async updateAssessmentOption(id: number, data: Partial<InsertAssessmentOption>): Promise<AssessmentOption | undefined> {
    const [o] = await db.update(assessmentOptions).set(data).where(eq(assessmentOptions.id, id)).returning();
    return o;
  }

  async deleteAssessmentOption(id: number): Promise<void> {
    await db.delete(assessmentOptions).where(eq(assessmentOptions.id, id));
  }

  async getAssessmentCareers(track?: string): Promise<AssessmentCareer[]> {
    if (track) {
      return db.select().from(assessmentCareers).where(eq(assessmentCareers.track, track));
    }
    return db.select().from(assessmentCareers);
  }

  async createAssessmentCareer(data: InsertAssessmentCareer): Promise<AssessmentCareer> {
    const [c] = await db.insert(assessmentCareers).values(data).returning();
    return c;
  }

  async updateAssessmentCareer(id: number, data: Partial<InsertAssessmentCareer>): Promise<AssessmentCareer | undefined> {
    const [c] = await db.update(assessmentCareers).set({ ...data, updatedAt: new Date() }).where(eq(assessmentCareers.id, id)).returning();
    return c;
  }

  async deleteAssessmentCareer(id: number): Promise<void> {
    await db.delete(assessmentCareers).where(eq(assessmentCareers.id, id));
  }

  async getContacts(): Promise<Contact[]> {
    return db.select().from(contacts);
  }
  async createContact(data: InsertContact): Promise<Contact> {
    const [c] = await db.insert(contacts).values(data).returning();
    return c;
  }
  async updateContact(id: number, data: Partial<InsertContact>): Promise<Contact | undefined> {
    const [c] = await db.update(contacts).set(data).where(eq(contacts.id, id)).returning();
    return c;
  }

  async recordTokenUsage(data: InsertTokenUsage): Promise<TokenUsage> {
    const [record] = await db.insert(tokenUsage).values(data).returning();
    return record;
  }

  async getTokenUsageStats(period: "day" | "month") {
    const since = new Date();
    if (period === "day") {
      since.setHours(0, 0, 0, 0);
    } else {
      since.setDate(1);
      since.setHours(0, 0, 0, 0);
    }

    const records = await db
      .select()
      .from(tokenUsage)
      .where(gte(tokenUsage.createdAt, since));

    let totalTokens = 0, promptTokens = 0, completionTokens = 0, estimatedCost = 0;
    const modelMap = new Map<string, { model: string; provider: string; totalTokens: number; estimatedCost: number }>();
    const typeMap = new Map<string, { usageType: string; totalTokens: number; estimatedCost: number }>();

    for (const r of records) {
      totalTokens += r.totalTokens;
      promptTokens += r.promptTokens;
      completionTokens += r.completionTokens;
      estimatedCost += r.estimatedCost;

      const mKey = `${r.provider}/${r.model}`;
      const existing = modelMap.get(mKey) || { model: r.model, provider: r.provider, totalTokens: 0, estimatedCost: 0 };
      existing.totalTokens += r.totalTokens;
      existing.estimatedCost += r.estimatedCost;
      modelMap.set(mKey, existing);

      const tExisting = typeMap.get(r.usageType) || { usageType: r.usageType, totalTokens: 0, estimatedCost: 0 };
      tExisting.totalTokens += r.totalTokens;
      tExisting.estimatedCost += r.estimatedCost;
      typeMap.set(r.usageType, tExisting);
    }

    return {
      totalTokens,
      promptTokens,
      completionTokens,
      estimatedCost,
      byModel: Array.from(modelMap.values()).sort((a, b) => b.totalTokens - a.totalTokens),
      byType: Array.from(typeMap.values()).sort((a, b) => b.totalTokens - a.totalTokens),
    };
  }

  async getContacts() {
    return db.select().from(contacts);
  }
  async createContact(data: InsertContact) {
    const [contact] = await db.insert(contacts).values(data).returning();
    return contact;
  }
  async updateContact(id: number, data: Partial<InsertContact>) {
    const [contact] = await db.update(contacts).set(data).where(eq(contacts.id, id)).returning();
    return contact;
  }
  async deleteContact(id: number) {
    await db.delete(contacts).where(eq(contacts.id, id));
  }
}

export const storage = new DatabaseStorage();
