import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const counties = pgTable("counties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  region: text("region").notNull().default("North State"),
});

export const institutions = pgTable("institutions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  county: text("county"),
  website: text("website"),
  description: text("description"),
  logoUrl: text("logo_url"),
  address: text("address"),
  mapX: integer("map_x"),
  mapY: integer("map_y"),
});

export const pathways = pgTable("pathways", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
});

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  pathwayId: integer("pathway_id").references(() => pathways.id),
  institutionId: integer("institution_id").references(() => institutions.id),
  county: text("county"),
  description: text("description"),
  level: text("level"),
  url: text("url"),
  tags: text("tags").array(),
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  url: text("url"),
  eligibility: text("eligibility"),
  pathwayId: integer("pathway_id").references(() => pathways.id),
  county: text("county"),
  counties: text("counties").array(),
  pathwayIds: integer("pathway_ids").array(),
  eligibilityRules: jsonb("eligibility_rules"),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  userType: text("user_type"),
  county: text("county"),
  interests: text("interests").array(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  metadata: jsonb("metadata"),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const researchTasks = pgTable("research_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  pathwayId: integer("pathway_id").references(() => pathways.id),
  county: text("county"),
  findings: text("findings"),
  aiResponse: text("ai_response"),
  approved: boolean("approved").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const onboardingScripts = pgTable("onboarding_scripts", {
  id: serial("id").primaryKey(),
  pathwayId: integer("pathway_id").references(() => pathways.id, { onDelete: "cascade" }),
  step: text("step").notNull(),
  contextKey: text("context_key"),
  title: text("title").notNull(),
  scriptText: text("script_text").notNull(),
  audioUrl: text("audio_url"),
  imageUrl: text("image_url"),
  language: text("language").default("en").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const tokenUsage = pgTable("token_usage", {
  id: serial("id").primaryKey(),
  model: text("model").notNull(),
  provider: text("provider").notNull(),
  usageType: text("usage_type").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  estimatedCost: real("estimated_cost").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"),
  phone: text("phone"),
  email: text("email"),
  institutionId: integer("institution_id").references(() => institutions.id),
  institution: text("institution"),
  county: text("county"),
  isActive: boolean("is_active").default(true).notNull(),
});

export const assessmentQuestions = pgTable("assessment_questions", {
  id: serial("id").primaryKey(),
  track: text("track").notNull(),
  category: text("category").notNull(),
  questionEn: text("question_en").notNull(),
  questionEs: text("question_es").notNull(),
  gifUrl: text("gif_url"),
  multiSelect: boolean("multi_select").default(false),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const assessmentOptions = pgTable("assessment_options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").references(() => assessmentQuestions.id, { onDelete: "cascade" }).notNull(),
  value: text("value").notNull(),
  labelEn: text("label_en").notNull(),
  labelEs: text("label_es").notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const assessmentCareers = pgTable("assessment_careers", {
  id: serial("id").primaryKey(),
  track: text("track").notNull(),
  name: text("name").notNull(),
  nameEs: text("name_es"),
  descriptionEn: text("description_en"),
  descriptionEs: text("description_es"),
  salaryEn: text("salary_en"),
  salaryEs: text("salary_es"),
  educationEn: text("education_en"),
  educationEs: text("education_es"),
  outlookEn: text("outlook_en"),
  outlookEs: text("outlook_es"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const eligibilityRuleSchema = z.object({
  criterion: z.string(),
  type: z.enum(["select", "multiselect", "range", "boolean", "text"]),
  values: z.union([
    z.array(z.string()),
    z.object({ min: z.number().optional(), max: z.number().optional() }),
  ]).optional(),
  required: z.boolean(),
});
export type EligibilityRule = z.infer<typeof eligibilityRuleSchema>;

export const usageEvents = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  tool: text("tool").notNull(),
  event: text("event").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUsageEventSchema = createInsertSchema(usageEvents).omit({ id: true, createdAt: true });
export type UsageEvent = typeof usageEvents.$inferSelect;
export type InsertUsageEvent = z.infer<typeof insertUsageEventSchema>;

export const insertAssessmentQuestionSchema = createInsertSchema(assessmentQuestions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAssessmentOptionSchema = createInsertSchema(assessmentOptions).omit({ id: true });
export const insertAssessmentCareerSchema = createInsertSchema(assessmentCareers).omit({ id: true, createdAt: true, updatedAt: true });

export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export const insertOnboardingScriptSchema = createInsertSchema(onboardingScripts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTokenUsageSchema = createInsertSchema(tokenUsage).omit({ id: true, createdAt: true });

export const insertCountySchema = createInsertSchema(counties).omit({ id: true });
export const insertInstitutionSchema = createInsertSchema(institutions).omit({ id: true });
export const insertPathwaySchema = createInsertSchema(pathways).omit({ id: true });
export const insertProgramSchema = createInsertSchema(programs).omit({ id: true });
export const insertResourceSchema = createInsertSchema(resources).omit({ id: true });
export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertResearchTaskSchema = createInsertSchema(researchTasks).omit({ id: true, createdAt: true, updatedAt: true });

export type County = typeof counties.$inferSelect;
export type InsertCounty = z.infer<typeof insertCountySchema>;
export type Institution = typeof institutions.$inferSelect;
export type InsertInstitution = z.infer<typeof insertInstitutionSchema>;
export type Pathway = typeof pathways.$inferSelect;
export type InsertPathway = z.infer<typeof insertPathwaySchema>;
export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ResearchTask = typeof researchTasks.$inferSelect;
export type InsertResearchTask = z.infer<typeof insertResearchTaskSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type OnboardingScript = typeof onboardingScripts.$inferSelect;
export type InsertOnboardingScript = z.infer<typeof insertOnboardingScriptSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type InsertTokenUsage = z.infer<typeof insertTokenUsageSchema>;

export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;
export type InsertAssessmentQuestion = z.infer<typeof insertAssessmentQuestionSchema>;
export type AssessmentOption = typeof assessmentOptions.$inferSelect;
export type InsertAssessmentOption = z.infer<typeof insertAssessmentOptionSchema>;
export type AssessmentCareer = typeof assessmentCareers.$inferSelect;
export type InsertAssessmentCareer = z.infer<typeof insertAssessmentCareerSchema>;

