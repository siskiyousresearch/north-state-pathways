import { db } from "./db";
import { eq, desc, sql, and, count } from "drizzle-orm";
import {
  counties, institutions, pathways, programs, resources,
  chatSessions, chatMessages, researchTasks, conversations, messages,
  type InsertCounty, type InsertInstitution, type InsertPathway,
  type InsertProgram, type InsertResource, type InsertChatSession,
  type InsertChatMessage, type InsertResearchTask,
  type County, type Institution, type Pathway, type Program,
  type Resource, type ChatSession, type ChatMessage, type ResearchTask
} from "@shared/schema";

export interface IStorage {
  getCounties(): Promise<County[]>;
  createCounty(data: InsertCounty): Promise<County>;

  getInstitutions(): Promise<Institution[]>;
  createInstitution(data: InsertInstitution): Promise<Institution>;

  getPathways(): Promise<Pathway[]>;
  getPathway(id: number): Promise<Pathway | undefined>;
  createPathway(data: InsertPathway): Promise<Pathway>;
  updatePathway(id: number, data: Partial<InsertPathway>): Promise<Pathway | undefined>;
  deletePathway(id: number): Promise<void>;

  getPrograms(): Promise<Program[]>;
  getProgramsByPathway(pathwayId: number): Promise<Program[]>;
  createProgram(data: InsertProgram): Promise<Program>;
  deleteProgram(id: number): Promise<void>;

  getResources(): Promise<Resource[]>;
  createResource(data: InsertResource): Promise<Resource>;
  deleteResource(id: number): Promise<void>;

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
      topInterests: [],
      recentSessions: recentSessionsResult,
    };
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
          knowledge += "\n";
        }
      }
    }

    knowledge += "\n### Institutions\n";
    for (const inst of allInstitutions) {
      knowledge += `- ${inst.name} (${inst.type})`;
      if (inst.county) knowledge += ` - ${inst.county} County`;
      knowledge += "\n";
    }

    knowledge += "\n### Resources (Scholarships, Financial Aid, Support)\n";
    for (const r of allResources) {
      knowledge += `- ${r.name} (${r.type})`;
      if (r.description) knowledge += `: ${r.description}`;
      if (r.eligibility) knowledge += ` | Eligibility: ${r.eligibility}`;
      knowledge += "\n";
    }

    return knowledge;
  }
}

export const storage = new DatabaseStorage();
