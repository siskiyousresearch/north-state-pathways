import { db } from "./db";
import { counties, institutions, pathways, programs, resources } from "@shared/schema";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const existingPathways = await db.select().from(pathways);
  if (existingPathways.length > 0) {
    console.log("Database already seeded, skipping.");
    return;
  }

  await db.insert(counties).values([
    { name: "Butte", region: "North State" },
    { name: "Glenn", region: "North State" },
    { name: "Lassen", region: "North State" },
    { name: "Modoc", region: "North State" },
    { name: "Plumas", region: "North State" },
    { name: "Shasta", region: "North State" },
    { name: "Sierra", region: "North State" },
    { name: "Siskiyou", region: "North State" },
    { name: "Tehama", region: "North State" },
    { name: "Trinity", region: "North State" },
  ]);

  const [shastaCollege] = await db.insert(institutions).values([
    { name: "Shasta College", type: "Community College", county: "Shasta", website: "https://www.shastacollege.edu" },
    { name: "Butte College", type: "Community College", county: "Butte", website: "https://www.butte.edu" },
    { name: "College of the Siskiyous", type: "Community College", county: "Siskiyou", website: "https://www.siskiyous.edu" },
    { name: "Lassen Community College", type: "Community College", county: "Lassen", website: "https://www.lassencollege.edu" },
    { name: "CSU Chico", type: "University (CSU)", county: "Butte", website: "https://www.csuchico.edu" },
    { name: "Simpson University", type: "Private University", county: "Shasta", website: "https://www.simpsonu.edu" },
    { name: "UC Davis", type: "University (UC)", county: null, website: "https://www.ucdavis.edu" },
    { name: "Southern Oregon University", type: "University (Out-of-State)", county: null, website: "https://www.sou.edu" },
    { name: "Western Governors University", type: "Online University", county: null, website: "https://www.wgu.edu" },
    { name: "REACH University", type: "Online University", county: null, website: "https://www.reach.edu" },
    { name: "Shasta County Office of Education", type: "County Office", county: "Shasta", website: null },
    { name: "Butte County Office of Education", type: "County Office", county: "Butte", website: null },
    { name: "Siskiyou County Office of Education", type: "County Office", county: "Siskiyou", website: null },
    { name: "Tehama County Department of Education", type: "County Office", county: "Tehama", website: null },
  ]).returning();

  const allInstitutions = await db.select().from(institutions);
  const instMap: Record<string, number> = {};
  for (const inst of allInstitutions) {
    instMap[inst.name] = inst.id;
  }

  const [healthcarePathway, educationPathway] = await db.insert(pathways).values([
    { name: "Healthcare", slug: "healthcare", description: "Explore careers in nursing, medical assisting, emergency medical services, allied health, and health information management across the North State region." },
    { name: "Education", slug: "education", description: "Discover pathways to becoming a teacher, paraprofessional, or education administrator through local colleges and universities." },
  ]).returning();

  await db.insert(programs).values([
    { name: "Certified Nursing Assistant (CNA)", pathwayId: healthcarePathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Entry-level nursing certification preparing students for direct patient care in hospitals, nursing homes, and clinics.", level: "Certificate", tags: ["nursing", "entry-level", "healthcare"] },
    { name: "Licensed Vocational Nurse (LVN)", pathwayId: healthcarePathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Vocational nursing program providing clinical skills and knowledge for LVN licensure.", level: "Certificate", tags: ["nursing", "LVN", "healthcare"] },
    { name: "Associate Degree in Nursing (ADN/RN)", pathwayId: healthcarePathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Two-year registered nursing program preparing graduates for RN licensure and hospital nursing roles.", level: "Associate's", tags: ["nursing", "RN", "ADN"] },
    { name: "RN-to-BSN Program", pathwayId: healthcarePathway.id, institutionId: instMap["CSU Chico"], county: "Butte", description: "Bachelor's completion program for registered nurses seeking BSN credentials.", level: "Bachelor's", tags: ["nursing", "BSN", "RN"] },
    { name: "Medical Assisting", pathwayId: healthcarePathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Prepares students for clinical and administrative roles in physician offices and outpatient clinics.", level: "Certificate", tags: ["medical assisting", "clinical", "healthcare"] },
    { name: "Emergency Medical Technician (EMT)", pathwayId: healthcarePathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Basic EMT certification for pre-hospital emergency medical care.", level: "Certificate", tags: ["EMT", "EMS", "emergency"] },
    { name: "Paramedic Program", pathwayId: healthcarePathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Advanced EMS training for paramedic certification with clinical rotations.", level: "Certificate", tags: ["paramedic", "EMS", "advanced"] },
    { name: "Health Information Management", pathwayId: healthcarePathway.id, institutionId: instMap["CSU Chico"], county: "Butte", description: "Degree in managing healthcare data systems, medical records, and health informatics.", level: "Bachelor's", tags: ["HIM", "informatics", "data"] },
    { name: "Nursing (CNA/LVN)", pathwayId: healthcarePathway.id, institutionId: instMap["Butte College"], county: "Butte", description: "Nursing assistant and vocational nursing programs at Butte College.", level: "Certificate", tags: ["nursing", "CNA", "LVN"] },
    { name: "Allied Health Programs", pathwayId: healthcarePathway.id, institutionId: instMap["Butte College"], county: "Butte", description: "Various allied health certificate and degree programs including respiratory therapy and radiologic technology.", level: "Associate's", tags: ["allied health", "respiratory", "radiology"] },
    { name: "Nursing Programs", pathwayId: healthcarePathway.id, institutionId: instMap["College of the Siskiyous"], county: "Siskiyou", description: "CNA and LVN programs serving students in Siskiyou County.", level: "Certificate", tags: ["nursing", "rural", "Siskiyou"] },
    { name: "BSN Nursing", pathwayId: healthcarePathway.id, institutionId: instMap["Simpson University"], county: "Shasta", description: "Bachelor of Science in Nursing at Simpson University in Redding.", level: "Bachelor's", tags: ["BSN", "nursing", "private"] },
    { name: "Online BSN/MSN Programs", pathwayId: healthcarePathway.id, institutionId: instMap["Western Governors University"], county: null, description: "Competency-based online nursing degree programs for working professionals.", level: "Bachelor's/Master's", tags: ["online", "BSN", "MSN", "flexible"] },

    { name: "Elementary Education (Teaching Credential)", pathwayId: educationPathway.id, institutionId: instMap["CSU Chico"], county: "Butte", description: "Teaching credential program for K-8 education with student teaching placements in North State schools.", level: "Credential", tags: ["teaching", "K-8", "credential"] },
    { name: "Secondary Education (Teaching Credential)", pathwayId: educationPathway.id, institutionId: instMap["CSU Chico"], county: "Butte", description: "Teaching credential program for secondary education in various subject areas.", level: "Credential", tags: ["teaching", "secondary", "credential"] },
    { name: "Liberal Studies (Pre-Teaching)", pathwayId: educationPathway.id, institutionId: instMap["CSU Chico"], county: "Butte", description: "Bachelor's degree designed for students planning to earn a multiple subject teaching credential.", level: "Bachelor's", tags: ["pre-teaching", "liberal studies"] },
    { name: "Early Childhood Education", pathwayId: educationPathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Certificate and degree programs in early childhood education and child development.", level: "Certificate/Associate's", tags: ["ECE", "child development", "preschool"] },
    { name: "Early Childhood Education", pathwayId: educationPathway.id, institutionId: instMap["Butte College"], county: "Butte", description: "ECE programs preparing students for careers in preschool and childcare settings.", level: "Certificate/Associate's", tags: ["ECE", "childcare"] },
    { name: "Paraprofessional/Instructional Aide", pathwayId: educationPathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Preparation for classroom aide and paraprofessional positions in K-12 schools.", level: "Certificate", tags: ["paraprofessional", "aide", "K-12"] },
    { name: "Teacher Education (Online BA)", pathwayId: educationPathway.id, institutionId: instMap["REACH University"], county: null, description: "Online bachelor's degree in education with pathway to teaching credential, designed for working paraprofessionals.", level: "Bachelor's", tags: ["online", "paraprofessional", "teaching"] },
    { name: "Education (MAT)", pathwayId: educationPathway.id, institutionId: instMap["Southern Oregon University"], county: null, description: "Master of Arts in Teaching with options for initial licensure.", level: "Master's", tags: ["MAT", "master's", "teaching"] },
  ]);

  await db.insert(resources).values([
    { name: "Federal Pell Grant", type: "Financial Aid", description: "Need-based federal financial aid for undergraduate students. Apply through FAFSA.", eligibility: "US citizen/eligible non-citizen, financial need demonstrated through FAFSA", url: "https://studentaid.gov/understand-aid/types/grants/pell" },
    { name: "Shasta College Foundation Scholarships", type: "Scholarship", description: "Multiple scholarship opportunities for Shasta College students across various programs.", eligibility: "Enrolled at Shasta College", pathwayId: healthcarePathway.id, county: "Shasta", url: "https://www.shastacollege.edu/foundation" },
    { name: "North State AHEC Health Careers Scholarship", type: "Scholarship", description: "Scholarships for students pursuing healthcare careers in the North State region.", eligibility: "Healthcare major in North State region", pathwayId: healthcarePathway.id },
    { name: "CalWORKs Program", type: "Support Service", description: "Provides cash aid and services for eligible families including childcare, transportation, and book assistance.", eligibility: "CalWORKs recipients enrolled in education" },
    { name: "EOPS (Extended Opportunity Programs and Services)", type: "Support Service", description: "Supplemental support for eligible community college students including tutoring, counseling, and financial assistance.", eligibility: "Low-income, educationally disadvantaged community college students" },
    { name: "Career Navigator Services", type: "Support Service", description: "One-on-one career advising and pathway planning available at community colleges across the region.", eligibility: "Open to all community college students" },
    { name: "FAFSA Application Assistance", type: "Financial Aid", description: "Free help completing the FAFSA application available at all community colleges and high schools.", eligibility: "All prospective college students", url: "https://studentaid.gov/h/apply-for-aid/fafsa" },
    { name: "California Promise Grant (BOG Waiver)", type: "Financial Aid", description: "Waives community college enrollment fees for eligible California residents.", eligibility: "California resident, meet income or program eligibility", url: "https://www.csac.ca.gov" },
    { name: "Nursing Scholarship Program (BRN)", type: "Scholarship", description: "Board of Registered Nursing scholarship for students enrolled in approved nursing programs.", eligibility: "Enrolled in BRN-approved nursing program in California", pathwayId: healthcarePathway.id },
    { name: "Rural Health Workforce Initiative", type: "Grant", description: "Funding to support healthcare workforce development in rural Northern California communities.", eligibility: "Healthcare students in rural North State counties", pathwayId: healthcarePathway.id },
    { name: "Grow Your Own Teacher Programs", type: "Program", description: "Programs supporting community members to become teachers in local schools where they grew up.", eligibility: "Community members interested in teaching locally", pathwayId: educationPathway.id },
    { name: "Classified School Employee Teacher Credential Program", type: "Program", description: "Pathway for classified school employees (aides, office staff) to earn teaching credentials.", eligibility: "Current classified school employees", pathwayId: educationPathway.id },
  ]);

  console.log("Seed data inserted successfully!");
}

seed().catch(console.error).finally(() => process.exit(0));
