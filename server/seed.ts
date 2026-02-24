import { db } from "./db";
import { counties, institutions, pathways, programs, resources, onboardingScripts } from "@shared/schema";

async function seedOnboardingScripts() {
  const existing = await db.select().from(onboardingScripts);
  if (existing.length > 0) {
    console.log("Onboarding scripts already seeded, skipping.");
    return;
  }

  const allPathways = await db.select().from(pathways);
  const healthcare = allPathways.find(p => p.slug === "healthcare");
  const education = allPathways.find(p => p.slug === "education");
  if (!healthcare || !education) {
    console.log("Healthcare/Education pathways not found, skipping onboarding scripts seed.");
    return;
  }

  console.log("Seeding onboarding scripts...");
  const COUNTIES = ["butte", "glenn", "lassen", "modoc", "plumas", "shasta", "sierra", "siskiyou", "tehama", "trinity"];
  const STUDENT_TYPES = ["high-school", "hs-grad-no-college", "some-college", "associates", "bachelors-seeking-masters", "seeking-doctorate"];

  const healthcareCountyMessages: Record<string, string> = {
    butte: "Butte County has excellent healthcare training programs. Now tell us a bit about yourself — what's your current education level?",
    glenn: "Glenn County is growing its healthcare workforce. Tell us about yourself — what's your current education level?",
    lassen: "Lassen County needs healthcare professionals like you. What's your current education level?",
    modoc: "Modoc County is building its healthcare community. What's your current education level?",
    plumas: "Plumas County has opportunities in healthcare. Tell us about your education level.",
    shasta: "Shasta County is a hub for healthcare training in the North State. What's your education level?",
    sierra: "Sierra County is part of our healthcare network. What's your current education level?",
    siskiyou: "Siskiyou County offers unique healthcare opportunities. What's your education level?",
    tehama: "Tehama County is growing its healthcare sector. What's your current education level?",
    trinity: "Trinity County needs healthcare professionals. Tell us about your education level.",
  };

  const educationCountyMessages: Record<string, string> = {
    butte: "Butte County has great education programs. Tell us about yourself — what's your current education level?",
    glenn: "Glenn County schools are looking for dedicated educators. What's your current education level?",
    lassen: "Lassen County needs educators like you. What's your current education level?",
    modoc: "Modoc County is looking for passionate educators. What's your education level?",
    plumas: "Plumas County has opportunities in education. What's your education level?",
    shasta: "Shasta County has strong education pathways. What's your current education level?",
    sierra: "Sierra County communities need educators. What's your education level?",
    siskiyou: "Siskiyou County offers unique education career opportunities. What's your education level?",
    tehama: "Tehama County is investing in education. What's your current education level?",
    trinity: "Trinity County schools need dedicated professionals. Tell us about your education level.",
  };

  const healthcareStudyLocation: Record<string, string> = {
    "high-school": "As a high school student, you have a wonderful opportunity to start early on a healthcare career. Would you prefer to study close to home or are you open to traveling?",
    "hs-grad-no-college": "As a high school graduate, there are many healthcare pathways open to you. Do you want to study locally or are you willing to travel?",
    "some-college": "With some college experience, you're well-positioned for healthcare programs. Would you prefer local programs or are you open to traveling?",
    "associates": "Having an associate's degree opens up many healthcare career paths. Do you want to continue studying locally or travel for your education?",
    "bachelors-seeking-masters": "With a bachelor's degree, advanced healthcare programs await you. Would you prefer a local program or are you willing to travel?",
    "seeking-doctorate": "Pursuing a doctorate in healthcare is an incredible goal. Are you looking for programs close to home or willing to travel?",
  };

  const educationStudyLocation: Record<string, string> = {
    "high-school": "Starting your journey toward an education career while in high school is wonderful. Would you like to study locally or are you open to traveling?",
    "hs-grad-no-college": "As a high school graduate interested in education, many paths are open. Do you want to study locally or travel?",
    "some-college": "With some college experience, you're well on your way to an education career. Would you prefer local or travel?",
    "associates": "Your associate's degree is a great foundation for education careers. Study locally or travel?",
    "bachelors-seeking-masters": "A master's in education opens doors to leadership roles. Would you prefer a local program or travel?",
    "seeking-doctorate": "A doctorate in education is a powerful goal. Are you looking at local programs or willing to travel?",
  };

  const studyLocationLabels: Record<string, string> = {
    "high-school": "High School", "hs-grad-no-college": "HS Grad", "some-college": "Some College",
    "associates": "Associates", "bachelors-seeking-masters": "Bachelors", "seeking-doctorate": "Doctorate",
  };

  const scripts: Array<{
    pathwayId: number; step: string; contextKey: string | null;
    title: string; scriptText: string; audioUrl: string | null;
  }> = [];

  for (const pw of [healthcare, education]) {
    const isHealthcare = pw.id === healthcare.id;
    const countyMessages = isHealthcare ? healthcareCountyMessages : educationCountyMessages;
    const studyMessages = isHealthcare ? healthcareStudyLocation : educationStudyLocation;

    scripts.push({
      pathwayId: pw.id, step: "welcome", contextKey: null,
      title: "Welcome",
      scriptText: isHealthcare
        ? "Welcome to North State Pathways! We're here to help you discover exciting career opportunities in healthcare across Northern California. Let's find the right path for you."
        : "Welcome to North State Pathways! We're here to help you discover rewarding careers in education across Northern California. Let's find the right path for you.",
      audioUrl: "/audio/onboarding/welcome.mp3",
    });

    scripts.push({
      pathwayId: pw.id, step: "county", contextKey: null,
      title: "County Selection",
      scriptText: isHealthcare
        ? "Great choice! Healthcare careers are in high demand across the North State. Which county do you live in? This will help us find programs and opportunities near you."
        : "Education is a wonderful career path! Our North State communities need dedicated educators. Which county do you call home?",
      audioUrl: isHealthcare ? "/audio/onboarding/county-healthcare.mp3" : "/audio/onboarding/county-education.mp3",
    });

    for (const county of COUNTIES) {
      const label = county.charAt(0).toUpperCase() + county.slice(1);
      scripts.push({
        pathwayId: pw.id, step: "student-type", contextKey: county,
        title: `Student Type - ${label}`,
        scriptText: countyMessages[county],
        audioUrl: `/audio/onboarding/studenttype-${county}.mp3`,
      });
    }

    for (const st of STUDENT_TYPES) {
      scripts.push({
        pathwayId: pw.id, step: "study-location", contextKey: st,
        title: `Study Location - ${studyLocationLabels[st]}`,
        scriptText: studyMessages[st],
        audioUrl: `/audio/onboarding/studylocation-${st}.mp3`,
      });
    }

    scripts.push({
      pathwayId: pw.id, step: "support-needs", contextKey: "local",
      title: "Support Needs - Local",
      scriptText: isHealthcare
        ? "Studying locally is a great choice — you'll have community support nearby. Last question: what kind of support would be most helpful for you?"
        : "Studying locally keeps you connected to your community. What kind of support would help you succeed?",
      audioUrl: "/audio/onboarding/supportneeds-local.mp3",
    });

    scripts.push({
      pathwayId: pw.id, step: "support-needs", contextKey: "travel",
      title: "Support Needs - Travel",
      scriptText: isHealthcare
        ? "Being open to travel expands your options significantly. Last question: what kind of support are you looking for?"
        : "Being flexible about location gives you more program options. What support would be most helpful?",
      audioUrl: "/audio/onboarding/supportneeds-travel.mp3",
    });
  }

  await db.insert(onboardingScripts).values(scripts);
  console.log(`Seeded ${scripts.length} onboarding scripts.`);
}

export async function seedDatabase() {
  console.log("Checking if database needs seeding...");

  const existingPathways = await db.select().from(pathways);
  if (existingPathways.length > 0) {
    console.log("Database already seeded, skipping main seed.");
    await seedOnboardingScripts();
    return;
  }

  console.log("Seeding database...");

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
    { name: "Certified Nursing Assistant (CNA)", pathwayId: healthcarePathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Entry-level nursing certification preparing students for direct patient care in hospitals, nursing homes, and clinics.", level: "Certificate", url: "https://www.shastacollege.edu/academics/programs/nursing/", tags: ["nursing", "entry-level", "healthcare"] },
    { name: "Licensed Vocational Nurse (LVN)", pathwayId: healthcarePathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Vocational nursing program providing clinical skills and knowledge for LVN licensure.", level: "Certificate", url: "https://www.shastacollege.edu/academics/divisions-departments/health-sciences-hsup/health-sciences-programs/vocational-nursing-vn-program/", tags: ["nursing", "LVN", "healthcare"] },
    { name: "Associate Degree in Nursing (ADN/RN)", pathwayId: healthcarePathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Two-year registered nursing program preparing graduates for RN licensure and hospital nursing roles.", level: "Associate's", url: "https://www.shastacollege.edu/academics/programs/health-sciences/nursing-associate-degree-nursing-as-degree/", tags: ["nursing", "RN", "ADN"] },
    { name: "RN-to-BSN Program", pathwayId: healthcarePathway.id, institutionId: instMap["CSU Chico"], county: "Butte", description: "Bachelor's completion program for registered nurses seeking BSN credentials.", level: "Bachelor's", url: "https://www.csuchico.edu/nurs/programs/rn-bsn/index.shtml", tags: ["nursing", "BSN", "RN"] },
    { name: "Medical Assisting", pathwayId: healthcarePathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Prepares students for clinical and administrative roles in physician offices and outpatient clinics.", level: "Certificate", url: "https://www.shastacollege.edu/academics/divisions-departments/health-sciences-hsup/health-sciences-programs/medical-assisting-ma-program/", tags: ["medical assisting", "clinical", "healthcare"] },
    { name: "Emergency Medical Technician (EMT)", pathwayId: healthcarePathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Basic EMT certification for pre-hospital emergency medical care.", level: "Certificate", url: "https://www.shastacollege.edu/academics/programs/fire-technology/ems-program/", tags: ["EMT", "EMS", "emergency"] },
    { name: "Paramedic Program", pathwayId: healthcarePathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Advanced EMS training for paramedic certification with clinical rotations.", level: "Certificate", url: "https://www.shastacollege.edu/academics/programs/emergency-services/", tags: ["paramedic", "EMS", "advanced"] },
    { name: "Health Information Management", pathwayId: healthcarePathway.id, institutionId: instMap["CSU Chico"], county: "Butte", description: "Degree in managing healthcare data systems, medical records, and health informatics.", level: "Bachelor's", url: "https://www.csuchico.edu/phha/degrees-minors/health-admin.shtml", tags: ["HIM", "informatics", "data"] },
    { name: "Nursing (CNA/LVN)", pathwayId: healthcarePathway.id, institutionId: instMap["Butte College"], county: "Butte", description: "Nursing assistant and vocational nursing programs at Butte College.", level: "Certificate", url: "https://www.butte.edu/nursing/", tags: ["nursing", "CNA", "LVN"] },
    { name: "Allied Health Programs", pathwayId: healthcarePathway.id, institutionId: instMap["Butte College"], county: "Butte", description: "Various allied health certificate and degree programs including respiratory therapy and radiologic technology.", level: "Associate's", url: "https://www.butte.edu/departments/careertech/healthoccupations/", tags: ["allied health", "respiratory", "radiology"] },
    { name: "Nursing Programs", pathwayId: healthcarePathway.id, institutionId: instMap["College of the Siskiyous"], county: "Siskiyou", description: "CNA and LVN programs serving students in Siskiyou County.", level: "Certificate", url: "https://www.siskiyous.edu/cte/nurs/", tags: ["nursing", "rural", "Siskiyou"] },
    { name: "BSN Nursing", pathwayId: healthcarePathway.id, institutionId: instMap["Simpson University"], county: "Shasta", description: "Bachelor of Science in Nursing at Simpson University in Redding.", level: "Bachelor's", url: "https://simpsonu.edu/academics/undergraduate-majors/nursing/", tags: ["BSN", "nursing", "private"] },
    { name: "Online BSN/MSN Programs", pathwayId: healthcarePathway.id, institutionId: instMap["Western Governors University"], county: null, description: "Competency-based online nursing degree programs for working professionals.", level: "Bachelor's/Master's", url: "https://www.wgu.edu/online-nursing-health-degrees/rn-prelicensure-nursing-bachelors-program.html", tags: ["online", "BSN", "MSN", "flexible"] },
    { name: "Elementary Education (Teaching Credential)", pathwayId: educationPathway.id, institutionId: instMap["CSU Chico"], county: "Butte", description: "Teaching credential program for K-8 education with student teaching placements in North State schools.", level: "Credential", url: "https://www.csuchico.edu/academics/college/communication-education/departments/school-education/credential/index.shtml", tags: ["teaching", "K-8", "credential"] },
    { name: "Secondary Education (Teaching Credential)", pathwayId: educationPathway.id, institutionId: instMap["CSU Chico"], county: "Butte", description: "Teaching credential program for secondary education in various subject areas.", level: "Credential", url: "https://www.csuchico.edu/academics/college/communication-education/departments/school-education/credential/index.shtml", tags: ["teaching", "secondary", "credential"] },
    { name: "Liberal Studies (Pre-Teaching)", pathwayId: educationPathway.id, institutionId: instMap["CSU Chico"], county: "Butte", description: "Bachelor's degree designed for students planning to earn a multiple subject teaching credential.", level: "Bachelor's", url: "https://www.csuchico.edu/academics/college/communication-education/departments/liberal-studies/index.shtml", tags: ["pre-teaching", "liberal studies"] },
    { name: "Early Childhood Education", pathwayId: educationPathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Certificate and degree programs in early childhood education and child development.", level: "Certificate/Associate's", url: "https://www.shastacollege.edu/academics/programs/early-childhood-education/", tags: ["ECE", "child development", "preschool"] },
    { name: "Early Childhood Education", pathwayId: educationPathway.id, institutionId: instMap["Butte College"], county: "Butte", description: "ECE programs preparing students for careers in preschool and childcare settings.", level: "Certificate/Associate's", url: "https://www.butte.edu/ece", tags: ["ECE", "childcare"] },
    { name: "Paraprofessional/Instructional Aide", pathwayId: educationPathway.id, institutionId: instMap["Shasta College"], county: "Shasta", description: "Preparation for classroom aide and paraprofessional positions in K-12 schools.", level: "Certificate", url: "https://www.shastacollege.edu/academics/programs/early-childhood-education/", tags: ["paraprofessional", "aide", "K-12"] },
    { name: "Teacher Education (Online BA)", pathwayId: educationPathway.id, institutionId: instMap["REACH University"], county: null, description: "Online bachelor's degree in education with pathway to teaching credential, designed for working paraprofessionals.", level: "Bachelor's", url: "https://reach.edu/programs", tags: ["online", "paraprofessional", "teaching"] },
    { name: "Education (MAT)", pathwayId: educationPathway.id, institutionId: instMap["Southern Oregon University"], county: null, description: "Master of Arts in Teaching with options for initial licensure.", level: "Master's", url: "https://sou.edu/academics/education/programs/master-arts-teaching-mat/", tags: ["MAT", "master's", "teaching"] },
  ]);

  await db.insert(resources).values([
    { name: "Federal Pell Grant", type: "Financial Aid", description: "Need-based federal financial aid for undergraduate students. Apply through FAFSA.", eligibility: "US citizen/eligible non-citizen, financial need demonstrated through FAFSA", url: "https://studentaid.gov/understand-aid/types/grants/pell" },
    { name: "Shasta College Foundation Scholarships", type: "Scholarship", description: "Multiple scholarship opportunities for Shasta College students across various programs.", eligibility: "Enrolled at Shasta College", pathwayId: healthcarePathway.id, county: "Shasta", url: "https://www.shastacollege.edu/foundation" },
    { name: "North State AHEC Health Careers Scholarship", type: "Scholarship", description: "Scholarships for students pursuing healthcare careers in the North State region.", eligibility: "Healthcare major in North State region", pathwayId: healthcarePathway.id, url: "https://cal-ahec.org/scholars-program-application/" },
    { name: "CalWORKs Program", type: "Support Service", description: "Provides cash aid and services for eligible families including childcare, transportation, and book assistance.", eligibility: "CalWORKs recipients enrolled in education", url: "https://www.cccco.edu/About-Us/Chancellors-Office/Divisions/Educational-Services-and-Support/Student-Service/What-we-do/CalWORKs" },
    { name: "EOPS (Extended Opportunity Programs and Services)", type: "Support Service", description: "Supplemental support for eligible community college students including tutoring, counseling, and financial assistance.", eligibility: "Low-income, educationally disadvantaged community college students", url: "https://www.cccco.edu/About-Us/Chancellors-Office/Divisions/Educational-Services-and-Support/Student-Service/What-we-do/Extended-Opportunity-Programs-and-Services" },
    { name: "Career Navigator Services", type: "Support Service", description: "One-on-one career advising and pathway planning available at community colleges across the region.", eligibility: "Open to all community college students", url: "https://northstatecareers.org/" },
    { name: "FAFSA Application Assistance", type: "Financial Aid", description: "Free help completing the FAFSA application available at all community colleges and high schools.", eligibility: "All prospective college students", url: "https://studentaid.gov/h/apply-for-aid/fafsa" },
    { name: "California Promise Grant (BOG Waiver)", type: "Financial Aid", description: "Waives community college enrollment fees for eligible California residents.", eligibility: "California resident, meet income or program eligibility", url: "https://www.csac.ca.gov" },
    { name: "Nursing Scholarship Program (BRN)", type: "Scholarship", description: "Board of Registered Nursing scholarship for students enrolled in approved nursing programs.", eligibility: "Enrolled in BRN-approved nursing program in California", pathwayId: healthcarePathway.id, url: "https://hcai.ca.gov/workforce/financial-assistance/scholarships/bsnsp/" },
    { name: "Rural Health Workforce Initiative", type: "Grant", description: "Funding to support healthcare workforce development in rural Northern California communities.", eligibility: "Healthcare students in rural North State counties", pathwayId: healthcarePathway.id, url: "https://hcai.ca.gov/workforce/health-workforce/california-state-office-of-rural-health/" },
    { name: "Grow Your Own Teacher Programs", type: "Program", description: "Programs supporting community members to become teachers in local schools where they grew up.", eligibility: "Community members interested in teaching locally", pathwayId: educationPathway.id, url: "https://www.cde.ca.gov/ci/pl/divteachrecruit.asp" },
    { name: "Classified School Employee Teacher Credential Program", type: "Program", description: "Pathway for classified school employees (aides, office staff) to earn teaching credentials.", eligibility: "Current classified school employees", pathwayId: educationPathway.id, url: "https://www.ctc.ca.gov/educator-prep/grant-funded-programs/Classified-Sch-Empl-Teacher-Cred-Prog" },
    { name: "North State Health Careers", type: "Program", description: "Explore healthcare career pathways, job-readiness skills, and education programs across North State community colleges.", eligibility: "Open to all prospective healthcare students", pathwayId: healthcarePathway.id, url: "https://northstatecareers.org/industry/health/" },
    { name: "North State Education & Human Development Careers", type: "Program", description: "Discover education and human development career opportunities, teaching pathways, and credential programs in Northern California.", eligibility: "Open to all prospective education students", pathwayId: educationPathway.id, url: "https://northstatecareers.org/industry/education-and-human-development/" },
  ]);

  await seedOnboardingScripts();
  console.log("Seed data inserted successfully!");
}

const isDirectRun = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed");
if (isDirectRun) {
  seedDatabase().catch(console.error).finally(() => process.exit(0));
}
