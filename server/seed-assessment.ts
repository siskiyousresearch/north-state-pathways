import { db } from "./db";
import { assessmentQuestions, assessmentOptions, assessmentCareers } from "@shared/schema";

interface QuestionSeed {
  track: string;
  category: string;
  questionEn: string;
  questionEs: string;
  gifUrl: string;
  multiSelect: boolean;
  sortOrder: number;
  options: { value: string; labelEn: string; labelEs: string; sortOrder: number }[];
}

const healthcareQuestionSeeds: QuestionSeed[] = [
  {
    track: "healthcare", category: "Motivation", sortOrder: 1, multiSelect: false,
    questionEn: "What matters most to you in a career?",
    questionEs: "¿Qué es lo que más te importa en una carrera?",
    gifUrl: "https://media.giphy.com/media/l0HlMSVVw9BmqMPe0/giphy.gif",
    options: [
      { value: "money", labelEn: "High earning potential — I want financial security", labelEs: "Alto potencial de ingresos — quiero seguridad financiera", sortOrder: 1 },
      { value: "passion", labelEn: "Helping people — I want to make a difference", labelEs: "Ayudar a las personas — quiero hacer la diferencia", sortOrder: 2 },
      { value: "balance", labelEn: "Work-life balance — I value my personal time", labelEs: "Equilibrio vida-trabajo — valoro mi tiempo personal", sortOrder: 3 },
      { value: "growth", labelEn: "Career growth — I want room to advance", labelEs: "Crecimiento profesional — quiero espacio para avanzar", sortOrder: 4 },
    ],
  },
  {
    track: "healthcare", category: "Education", sortOrder: 2, multiSelect: false,
    questionEn: "How much time are you willing to spend in school?",
    questionEs: "¿Cuánto tiempo estás dispuesto/a a pasar estudiando?",
    gifUrl: "https://media.giphy.com/media/3o7btNa0RUYa5E7iiQ/giphy.gif",
    options: [
      { value: "minimal", labelEn: "As little as possible — on-the-job training or a few months", labelEs: "Lo menos posible — capacitación en el trabajo o unos meses", sortOrder: 1 },
      { value: "short", labelEn: "1-2 years — a certificate or associate degree", labelEs: "1-2 años — un certificado o título de asociado", sortOrder: 2 },
      { value: "medium", labelEn: "3-4 years — a bachelor's degree", labelEs: "3-4 años — una licenciatura", sortOrder: 3 },
      { value: "long", labelEn: "5+ years — I'm ready for an advanced degree", labelEs: "5+ años — estoy listo/a para un título avanzado", sortOrder: 4 },
    ],
  },
  {
    track: "healthcare", category: "Patient Interaction", sortOrder: 3, multiSelect: false,
    questionEn: "How much do you want to work directly with patients?",
    questionEs: "¿Cuánto deseas trabajar directamente con pacientes?",
    gifUrl: "https://media.giphy.com/media/QBGfW8iczqACOikMYr/giphy.gif",
    options: [
      { value: "all_the_time", labelEn: "All the time — I love working with people face-to-face", labelEs: "Todo el tiempo — me encanta trabajar cara a cara con las personas", sortOrder: 1 },
      { value: "some", labelEn: "Some interaction is fine, but not all day", labelEs: "Algo de interacción está bien, pero no todo el día", sortOrder: 2 },
      { value: "minimal", labelEn: "I prefer working behind the scenes", labelEs: "Prefiero trabajar detrás de escena", sortOrder: 3 },
    ],
  },
  {
    track: "healthcare", category: "Medical Comfort", sortOrder: 4, multiSelect: false,
    questionEn: "How comfortable are you with medical procedures and blood?",
    questionEs: "¿Qué tan cómodo/a te sientes con procedimientos médicos y sangre?",
    gifUrl: "https://media.giphy.com/media/YnZPEeeC7q6pQTRj3H/giphy.gif",
    options: [
      { value: "very", labelEn: "Very comfortable — I can handle anything", labelEs: "Muy cómodo/a — puedo manejar cualquier cosa", sortOrder: 1 },
      { value: "somewhat", labelEn: "Somewhat comfortable — I can manage with training", labelEs: "Algo cómodo/a — puedo manejarlo con capacitación", sortOrder: 2 },
      { value: "not_really", labelEn: "Not really — I'd rather avoid clinical settings", labelEs: "No mucho — prefiero evitar entornos clínicos", sortOrder: 3 },
    ],
  },
  {
    track: "healthcare", category: "Work Environment", sortOrder: 5, multiSelect: false,
    questionEn: "What kind of work pace do you prefer?",
    questionEs: "¿Qué tipo de ritmo de trabajo prefieres?",
    gifUrl: "https://media.giphy.com/media/ule4vhcY1xEKQ/giphy.gif",
    options: [
      { value: "fast", labelEn: "Fast-paced and high-pressure — I thrive under stress", labelEs: "Rápido y alta presión — me desempeño bien bajo estrés", sortOrder: 1 },
      { value: "moderate", labelEn: "Steady and structured — I like routine with some variety", labelEs: "Estable y estructurado — me gusta la rutina con algo de variedad", sortOrder: 2 },
      { value: "calm", labelEn: "Calm and predictable — I prefer a relaxed environment", labelEs: "Tranquilo y predecible — prefiero un ambiente relajado", sortOrder: 3 },
    ],
  },
  {
    track: "healthcare", category: "Population", sortOrder: 6, multiSelect: true,
    questionEn: "What age groups are you interested in working with?",
    questionEs: "¿Con qué grupos de edad te interesa trabajar?",
    gifUrl: "https://media.giphy.com/media/3oEjHZhG9COPG6XjzO/giphy.gif",
    options: [
      { value: "children", labelEn: "Children and teenagers", labelEs: "Niños y adolescentes", sortOrder: 1 },
      { value: "adults", labelEn: "Adults", labelEs: "Adultos", sortOrder: 2 },
      { value: "elderly", labelEn: "Elderly", labelEs: "Personas mayores", sortOrder: 3 },
      { value: "all", labelEn: "All ages — I don't have a preference", labelEs: "Todas las edades — no tengo preferencia", sortOrder: 4 },
    ],
  },
  {
    track: "healthcare", category: "Work Setting", sortOrder: 7, multiSelect: false,
    questionEn: "What kind of work setting sounds best to you?",
    questionEs: "¿Qué tipo de entorno de trabajo te suena mejor?",
    gifUrl: "https://media.giphy.com/media/l3q2Hy66w1hpDSWUE/giphy.gif",
    options: [
      { value: "hospital", labelEn: "Hospital — I want to be in the action", labelEs: "Hospital — quiero estar en la acción", sortOrder: 1 },
      { value: "clinic", labelEn: "Clinic or doctor's office — steady and personal", labelEs: "Clínica o consultorio — estable y personal", sortOrder: 2 },
      { value: "community", labelEn: "Community or home-based — out in the field", labelEs: "Comunidad o a domicilio — en el campo", sortOrder: 3 },
      { value: "office", labelEn: "Office or lab — behind the scenes", labelEs: "Oficina o laboratorio — detrás de escena", sortOrder: 4 },
    ],
  },
  {
    track: "healthcare", category: "Daily Tasks", sortOrder: 8, multiSelect: false,
    questionEn: "What kind of daily tasks appeal to you most?",
    questionEs: "¿Qué tipo de tareas diarias te atraen más?",
    gifUrl: "https://media.giphy.com/media/LmBsnpDCuturMhtLfw/giphy.gif",
    options: [
      { value: "hands_on", labelEn: "Hands-on care — procedures, wound care, injections", labelEs: "Cuidado práctico — procedimientos, cuidado de heridas, inyecciones", sortOrder: 1 },
      { value: "technology", labelEn: "Technology & equipment — imaging, lab work, machines", labelEs: "Tecnología y equipos — imágenes, laboratorio, máquinas", sortOrder: 2 },
      { value: "counseling", labelEn: "Talking & teaching — counseling, education, outreach", labelEs: "Hablar y enseñar — consejería, educación, difusión", sortOrder: 3 },
      { value: "administrative", labelEn: "Organizing & managing — records, billing, administration", labelEs: "Organizar y gestionar — registros, facturación, administración", sortOrder: 4 },
    ],
  },
];

const educationQuestionSeeds: QuestionSeed[] = [
  {
    track: "education", category: "Motivation", sortOrder: 1, multiSelect: false,
    questionEn: "Why are you interested in a career in education?",
    questionEs: "¿Por qué te interesa una carrera en educación?",
    gifUrl: "https://media.tenor.com/0awndc0411wAAAAd/happy-dance-excited.gif",
    options: [
      { value: "inspire", labelEn: "I want to inspire and shape young minds", labelEs: "Quiero inspirar y formar mentes jóvenes", sortOrder: 1 },
      { value: "community", labelEn: "I want to strengthen my community through education", labelEs: "Quiero fortalecer mi comunidad a través de la educación", sortOrder: 2 },
      { value: "subject", labelEn: "I'm passionate about a subject and want to share it", labelEs: "Me apasiona una materia y quiero compartirla", sortOrder: 3 },
      { value: "stability", labelEn: "I want a stable career with good benefits", labelEs: "Quiero una carrera estable con buenos beneficios", sortOrder: 4 },
    ],
  },
  {
    track: "education", category: "Age Group", sortOrder: 2, multiSelect: true,
    questionEn: "What age groups would you like to teach?",
    questionEs: "¿A qué grupos de edad te gustaría enseñar?",
    gifUrl: "https://media.tenor.com/F4EfNZj7nCsAAAAd/alex-wolff-raising-hand.gif",
    options: [
      { value: "early_childhood", labelEn: "Young children (preschool to kindergarten)", labelEs: "Niños pequeños (preescolar a kinder)", sortOrder: 1 },
      { value: "elementary", labelEn: "Elementary school (grades 1-6)", labelEs: "Escuela primaria (grados 1-6)", sortOrder: 2 },
      { value: "secondary", labelEn: "Middle or high school (grades 7-12)", labelEs: "Escuela secundaria o preparatoria (grados 7-12)", sortOrder: 3 },
      { value: "adult", labelEn: "Adults or college students", labelEs: "Adultos o estudiantes universitarios", sortOrder: 4 },
    ],
  },
  {
    track: "education", category: "Education", sortOrder: 3, multiSelect: false,
    questionEn: "How much schooling are you willing to complete?",
    questionEs: "¿Cuánta educación estás dispuesto/a a completar?",
    gifUrl: "https://media.tenor.com/ICCkMEE3hKUAAAAd/graduation-celebration.gif",
    options: [
      { value: "certificate", labelEn: "A certificate program (less than 2 years)", labelEs: "Un programa de certificado (menos de 2 años)", sortOrder: 1 },
      { value: "associates", labelEn: "An associate degree (2 years)", labelEs: "Un título de asociado (2 años)", sortOrder: 2 },
      { value: "bachelors", labelEn: "A bachelor's degree (4 years)", labelEs: "Una licenciatura (4 años)", sortOrder: 3 },
      { value: "masters", labelEn: "A master's degree or credential program", labelEs: "Una maestría o programa de credencial", sortOrder: 4 },
    ],
  },
  {
    track: "education", category: "Role Type", sortOrder: 4, multiSelect: false,
    questionEn: "What kind of role interests you most?",
    questionEs: "¿Qué tipo de rol te interesa más?",
    gifUrl: "https://media.tenor.com/UQ4bHLp78PYAAAAM/team-high-five-family-feud-canada.gif",
    options: [
      { value: "classroom", labelEn: "Lead teacher in a classroom", labelEs: "Maestro/a principal en un salón de clases", sortOrder: 1 },
      { value: "support", labelEn: "Supporting role — helping teachers and students", labelEs: "Rol de apoyo — ayudando a maestros y estudiantes", sortOrder: 2 },
      { value: "specialist", labelEn: "Specialist — counseling, special ed, or administration", labelEs: "Especialista — consejería, educación especial o administración", sortOrder: 3 },
      { value: "childcare", labelEn: "Childcare or early learning center", labelEs: "Cuidado infantil o centro de aprendizaje temprano", sortOrder: 4 },
    ],
  },
  {
    track: "education", category: "Environment", sortOrder: 5, multiSelect: false,
    questionEn: "What kind of work environment do you prefer?",
    questionEs: "¿Qué tipo de ambiente de trabajo prefieres?",
    gifUrl: "https://media.tenor.com/JChxs-yyayQAAAAd/cozy-aesthetic.gif",
    options: [
      { value: "structured", labelEn: "Structured and predictable — I like a set schedule", labelEs: "Estructurado y predecible — me gusta un horario fijo", sortOrder: 1 },
      { value: "dynamic", labelEn: "Dynamic and creative — every day is different", labelEs: "Dinámico y creativo — cada día es diferente", sortOrder: 2 },
      { value: "flexible", labelEn: "Flexible — I want control over my schedule", labelEs: "Flexible — quiero control sobre mi horario", sortOrder: 3 },
    ],
  },
  {
    track: "education", category: "Location", sortOrder: 6, multiSelect: false,
    questionEn: "Where would you prefer to study?",
    questionEs: "¿Dónde preferirías estudiar?",
    gifUrl: "https://media.tenor.com/PdIGGQsJAF4AAAAd/summer-road-trip.gif",
    options: [
      { value: "local", labelEn: "Locally in the North State — I want to stay close to home", labelEs: "Localmente en el Norte del Estado — quiero quedarme cerca de casa", sortOrder: 1 },
      { value: "willing_travel", labelEn: "I'm willing to travel or relocate for the right program", labelEs: "Estoy dispuesto/a a viajar o mudarme por el programa adecuado", sortOrder: 2 },
      { value: "online", labelEn: "Online — I need the flexibility of remote learning", labelEs: "En línea — necesito la flexibilidad del aprendizaje remoto", sortOrder: 3 },
    ],
  },
  {
    track: "education", category: "Focus Area", sortOrder: 7, multiSelect: false,
    questionEn: "What part of working in education excites you most?",
    questionEs: "¿Qué parte de trabajar en educación te emociona más?",
    gifUrl: "https://media.tenor.com/8wYnJIc6mWoAAAAd/light-bulb-idea.gif",
    options: [
      { value: "teaching", labelEn: "Teaching & curriculum — creating lessons, leading a classroom", labelEs: "Enseñanza y currículo — crear lecciones, dirigir un salón", sortOrder: 1 },
      { value: "wellbeing", labelEn: "Student wellbeing — counseling, social-emotional support", labelEs: "Bienestar estudiantil — consejería, apoyo socioemocional", sortOrder: 2 },
      { value: "leadership", labelEn: "Leadership & administration — managing schools or programs", labelEs: "Liderazgo y administración — gestionar escuelas o programas", sortOrder: 3 },
      { value: "resources", labelEn: "Resources & research — libraries, media, instructional design", labelEs: "Recursos e investigación — bibliotecas, medios, diseño instruccional", sortOrder: 4 },
    ],
  },
  {
    track: "education", category: "Special Needs", sortOrder: 8, multiSelect: false,
    questionEn: "How do you feel about working with students with special needs?",
    questionEs: "¿Cómo te sientes acerca de trabajar con estudiantes con necesidades especiales?",
    gifUrl: "https://media.tenor.com/ZK1mkWw-65wAAAAd/hug-cute.gif",
    options: [
      { value: "love_it", labelEn: "I'd love it — that's exactly what I want to do", labelEs: "Me encantaría — eso es exactamente lo que quiero hacer", sortOrder: 1 },
      { value: "open", labelEn: "I'm open to it — I'd be happy to include it in my work", labelEs: "Estoy abierto/a — me gustaría incluirlo en mi trabajo", sortOrder: 2 },
      { value: "general", labelEn: "I prefer general education — mainstream classrooms", labelEs: "Prefiero educación general — aulas regulares", sortOrder: 3 },
    ],
  },
];

interface CareerSeed {
  track: string;
  name: string;
  nameEs: string | null;
  descriptionEn: string | null;
  descriptionEs: string | null;
  salaryEn: string | null;
  salaryEs: string | null;
  educationEn: string | null;
  educationEs: string | null;
  outlookEn: string | null;
  outlookEs: string | null;
}

const healthcareCareerSeeds: CareerSeed[] = [
  { track: "healthcare", name: "Registered Nurse (RN)", nameEs: "Enfermero/a Registrado/a (RN)", descriptionEn: "Provide direct patient care in hospitals, clinics, and community health settings. Assess patients, administer treatments, and coordinate care plans.", descriptionEs: "Brinda atención directa al paciente en hospitales, clínicas y entornos de salud comunitaria.", salaryEn: "$80,000 – $120,000/year", salaryEs: "$80,000 – $120,000/año", educationEn: "Associate or Bachelor's Degree in Nursing (2–4 years)", educationEs: "Título de asociado o licenciatura en enfermería (2-4 años)", outlookEn: "High demand — 6% growth expected through 2032", outlookEs: "Alta demanda — crecimiento del 6% esperado hasta 2032" },
  { track: "healthcare", name: "Licensed Vocational Nurse (LVN)", nameEs: "Enfermero/a Vocacional con Licencia (LVN)", descriptionEn: "Provide basic nursing care under supervision of RNs and doctors in long-term care, clinics, and home health settings.", descriptionEs: "Brinda cuidados básicos de enfermería bajo supervisión de RNs y médicos.", salaryEn: "$50,000 – $65,000/year", salaryEs: "$50,000 – $65,000/año", educationEn: "Certificate or Diploma (12–18 months)", educationEs: "Certificado o diploma (12-18 meses)", outlookEn: "Steady demand — especially in rural and long-term care", outlookEs: "Demanda constante — especialmente en áreas rurales" },
  { track: "healthcare", name: "Certified Nursing Assistant (CNA)", nameEs: "Asistente de Enfermería Certificado (CNA)", descriptionEn: "Help patients with daily activities like bathing, dressing, and eating in nursing homes, hospitals, and home care.", descriptionEs: "Ayuda a pacientes con actividades diarias en hogares de ancianos, hospitales y cuidado en el hogar.", salaryEn: "$32,000 – $42,000/year", salaryEs: "$32,000 – $42,000/año", educationEn: "Certificate program (4–12 weeks)", educationEs: "Programa de certificado (4-12 semanas)", outlookEn: "Very high demand — great entry point into healthcare", outlookEs: "Muy alta demanda — excelente punto de entrada al sector salud" },
  { track: "healthcare", name: "EMT / Paramedic", nameEs: "Técnico de Emergencias Médicas / Paramédico", descriptionEn: "Respond to emergency calls, provide pre-hospital care, and transport patients. Work in ambulances, fire departments, and emergency rooms.", descriptionEs: "Responde a llamadas de emergencia, brinda atención prehospitalaria y transporta pacientes.", salaryEn: "$38,000 – $65,000/year", salaryEs: "$38,000 – $65,000/año", educationEn: "Certificate to Associate Degree (6 months – 2 years)", educationEs: "Certificado a título de asociado (6 meses – 2 años)", outlookEn: "Growing demand — especially in rural communities", outlookEs: "Demanda creciente — especialmente en comunidades rurales" },
  { track: "healthcare", name: "Medical Assistant", nameEs: "Asistente Médico", descriptionEn: "Support physicians in clinics by taking vitals, preparing patients, scheduling appointments, and managing medical records.", descriptionEs: "Apoya a médicos en clínicas tomando signos vitales, preparando pacientes y gestionando registros.", salaryEn: "$35,000 – $45,000/year", salaryEs: "$35,000 – $45,000/año", educationEn: "Certificate or Associate Degree (9 months – 2 years)", educationEs: "Certificado o título de asociado (9 meses – 2 años)", outlookEn: "Very high demand — 14% growth expected", outlookEs: "Muy alta demanda — crecimiento del 14% esperado" },
  { track: "healthcare", name: "Phlebotomist", nameEs: "Flebotomista", descriptionEn: "Draw blood from patients for lab tests, transfusions, and donations. Work in hospitals, clinics, blood banks, and diagnostic laboratories.", descriptionEs: "Extrae sangre de pacientes para pruebas de laboratorio, transfusiones y donaciones.", salaryEn: "$30,000 – $40,000/year", salaryEs: "$30,000 – $40,000/año", educationEn: "Certificate program (4–8 months)", educationEs: "Programa de certificado (4-8 meses)", outlookEn: "High demand — 8% growth, quick entry into healthcare", outlookEs: "Alta demanda — crecimiento del 8%, entrada rápida al sector salud" },
  { track: "healthcare", name: "Pharmacy Technician", nameEs: "Técnico de Farmacia", descriptionEn: "Assist pharmacists in preparing and dispensing medications, managing inventory, and serving patients at retail and hospital pharmacies.", descriptionEs: "Asiste a farmacéuticos en la preparación y dispensación de medicamentos y atención al paciente.", salaryEn: "$33,000 – $44,000/year", salaryEs: "$33,000 – $44,000/año", educationEn: "Certificate program (6–12 months)", educationEs: "Programa de certificado (6-12 meses)", outlookEn: "Steady demand — essential in every community", outlookEs: "Demanda constante — esencial en cada comunidad" },
  { track: "healthcare", name: "Dental Assistant", nameEs: "Asistente Dental", descriptionEn: "Support dentists during procedures, prepare patients, take X-rays, and manage dental office operations.", descriptionEs: "Apoya a dentistas durante procedimientos, prepara pacientes, toma radiografías y gestiona operaciones.", salaryEn: "$34,000 – $46,000/year", salaryEs: "$34,000 – $46,000/año", educationEn: "Certificate program (9–12 months)", educationEs: "Programa de certificado (9-12 meses)", outlookEn: "Growing demand — 7% growth expected", outlookEs: "Demanda creciente — crecimiento del 7% esperado" },
  { track: "healthcare", name: "Home Health Aide", nameEs: "Asistente de Salud en el Hogar", descriptionEn: "Provide in-home personal care and basic health services to elderly and disabled clients, helping them maintain independence.", descriptionEs: "Brinda cuidado personal y servicios básicos de salud a clientes ancianos y discapacitados en sus hogares.", salaryEn: "$28,000 – $36,000/year", salaryEs: "$28,000 – $36,000/año", educationEn: "Certificate program (75–120 hours)", educationEs: "Programa de certificado (75-120 horas)", outlookEn: "Very high demand — 22% growth, fastest in healthcare", outlookEs: "Muy alta demanda — crecimiento del 22%, el más rápido en salud" },
  { track: "healthcare", name: "Medical Biller / Coding Specialist", nameEs: "Especialista en Facturación / Codificación Médica", descriptionEn: "Translate medical procedures and diagnoses into billing codes, process insurance claims, and ensure accurate healthcare reimbursement.", descriptionEs: "Traduce procedimientos y diagnósticos médicos en códigos de facturación y procesa reclamaciones de seguros.", salaryEn: "$38,000 – $52,000/year", salaryEs: "$38,000 – $52,000/año", educationEn: "Certificate program (6–12 months)", educationEs: "Programa de certificado (6-12 meses)", outlookEn: "Strong demand — critical role in every healthcare facility", outlookEs: "Fuerte demanda — rol crítico en cada centro de salud" },
  { track: "healthcare", name: "Health Information Technologist", nameEs: "Tecnólogo en Información de Salud", descriptionEn: "Manage patient records, electronic health systems, and clinical data. Ensure data accuracy and compliance with healthcare regulations.", descriptionEs: "Gestiona registros de pacientes, sistemas electrónicos de salud y datos clínicos.", salaryEn: "$42,000 – $58,000/year", salaryEs: "$42,000 – $58,000/año", educationEn: "Associate Degree (2 years)", educationEs: "Título de asociado (2 años)", outlookEn: "Strong demand — healthcare digitization driving growth", outlookEs: "Fuerte demanda — la digitalización impulsa el crecimiento" },
  { track: "healthcare", name: "Dental Hygienist", nameEs: "Higienista Dental", descriptionEn: "Clean teeth, examine patients for oral diseases, take X-rays, and educate patients on oral health in dental offices.", descriptionEs: "Limpia dientes, examina pacientes para enfermedades orales, toma radiografías y educa sobre salud oral.", salaryEn: "$65,000 – $90,000/year", salaryEs: "$65,000 – $90,000/año", educationEn: "Associate Degree (2–3 years)", educationEs: "Título de asociado (2-3 años)", outlookEn: "High demand — 7% growth expected", outlookEs: "Alta demanda — crecimiento del 7% esperado" },
  { track: "healthcare", name: "Respiratory Therapist", nameEs: "Terapeuta Respiratorio", descriptionEn: "Treat patients with breathing disorders, manage ventilators, and provide emergency airway care in hospitals and clinics.", descriptionEs: "Trata pacientes con trastornos respiratorios, gestiona ventiladores y brinda cuidado de emergencia de vías aéreas.", salaryEn: "$55,000 – $80,000/year", salaryEs: "$55,000 – $80,000/año", educationEn: "Associate Degree (2 years)", educationEs: "Título de asociado (2 años)", outlookEn: "High demand — 13% growth, critical in hospitals", outlookEs: "Alta demanda — crecimiento del 13%, crítico en hospitales" },
  { track: "healthcare", name: "Radiologic Technologist", nameEs: "Tecnólogo Radiológico", descriptionEn: "Perform diagnostic imaging procedures like X-rays, CT scans, and MRIs. Work in hospitals, clinics, and imaging centers.", descriptionEs: "Realiza procedimientos de imagen diagnóstica como rayos X, tomografías y resonancias magnéticas.", salaryEn: "$55,000 – $78,000/year", salaryEs: "$55,000 – $78,000/año", educationEn: "Associate Degree (2 years)", educationEs: "Título de asociado (2 años)", outlookEn: "Growing demand — 6% growth, essential diagnostic role", outlookEs: "Demanda creciente — crecimiento del 6%, rol diagnóstico esencial" },
  { track: "healthcare", name: "Surgical Technician", nameEs: "Técnico Quirúrgico", descriptionEn: "Assist surgeons during operations by preparing instruments, maintaining sterile environments, and supporting the surgical team.", descriptionEs: "Asiste a cirujanos durante operaciones preparando instrumentos y manteniendo ambientes estériles.", salaryEn: "$45,000 – $62,000/year", salaryEs: "$45,000 – $62,000/año", educationEn: "Associate Degree or Certificate (1–2 years)", educationEs: "Título de asociado o certificado (1-2 años)", outlookEn: "Growing demand — 5% growth expected", outlookEs: "Demanda creciente — crecimiento del 5% esperado" },
  { track: "healthcare", name: "Physical Therapist Assistant", nameEs: "Asistente de Terapia Física", descriptionEn: "Help patients recover from injuries and surgeries through therapeutic exercises and treatments under a physical therapist's direction.", descriptionEs: "Ayuda a pacientes a recuperarse de lesiones y cirugías mediante ejercicios terapéuticos.", salaryEn: "$50,000 – $68,000/year", salaryEs: "$50,000 – $68,000/año", educationEn: "Associate Degree (2 years)", educationEs: "Título de asociado (2 años)", outlookEn: "High demand — 24% growth, excellent outlook", outlookEs: "Alta demanda — crecimiento del 24%, excelente perspectiva" },
  { track: "healthcare", name: "Diagnostic Technician (Ultrasound)", nameEs: "Técnico de Diagnóstico (Ultrasonido)", descriptionEn: "Use specialized imaging equipment like ultrasound to create images of organs and tissues, helping doctors diagnose medical conditions.", descriptionEs: "Usa equipo de imagen especializado como ultrasonido para crear imágenes de órganos y tejidos.", salaryEn: "$58,000 – $82,000/year", salaryEs: "$58,000 – $82,000/año", educationEn: "Associate Degree (2 years)", educationEs: "Título de asociado (2 años)", outlookEn: "High demand — 10% growth expected", outlookEs: "Alta demanda — crecimiento del 10% esperado" },
  { track: "healthcare", name: "Patient Representative / Health Navigator", nameEs: "Representante del Paciente / Navegador de Salud", descriptionEn: "Guide patients through the healthcare system, connect them with resources, and advocate for their needs and rights.", descriptionEs: "Guía a pacientes a través del sistema de salud, los conecta con recursos y aboga por sus necesidades.", salaryEn: "$36,000 – $50,000/year", salaryEs: "$36,000 – $50,000/año", educationEn: "Associate Degree or Certificate (1–2 years)", educationEs: "Título de asociado o certificado (1-2 años)", outlookEn: "Growing demand — essential in community health", outlookEs: "Demanda creciente — esencial en salud comunitaria" },
  { track: "healthcare", name: "Community Health Worker", nameEs: "Trabajador de Salud Comunitaria", descriptionEn: "Connect communities with health services, conduct outreach, and promote wellness education in underserved populations.", descriptionEs: "Conecta comunidades con servicios de salud, realiza difusión y promueve educación sobre bienestar.", salaryEn: "$35,000 – $50,000/year", salaryEs: "$35,000 – $50,000/año", educationEn: "Certificate to Bachelor's Degree (varies)", educationEs: "Certificado a licenciatura (varía)", outlookEn: "Fast growing — 14% growth, critical in rural areas", outlookEs: "Crecimiento rápido — 14%, crucial en áreas rurales" },
  { track: "healthcare", name: "Health Education Specialist", nameEs: "Especialista en Educación de Salud", descriptionEn: "Develop and implement programs to promote healthy behaviors and prevent disease in communities and organizations.", descriptionEs: "Desarrolla e implementa programas para promover comportamientos saludables y prevenir enfermedades.", salaryEn: "$48,000 – $65,000/year", salaryEs: "$48,000 – $65,000/año", educationEn: "Associate to Bachelor's Degree (2–4 years)", educationEs: "Título de asociado a licenciatura (2-4 años)", outlookEn: "Growing demand — 7% growth, increasing public health focus", outlookEs: "Demanda creciente — crecimiento del 7%, mayor enfoque en salud pública" },
  { track: "healthcare", name: "Substance Abuse Counselor", nameEs: "Consejero de Abuso de Sustancias", descriptionEn: "Help individuals overcome addiction and substance use disorders through counseling, treatment planning, and support services.", descriptionEs: "Ayuda a individuos a superar la adicción mediante consejería, planificación de tratamiento y servicios de apoyo.", salaryEn: "$42,000 – $60,000/year", salaryEs: "$42,000 – $60,000/año", educationEn: "Bachelor's Degree (4 years)", educationEs: "Licenciatura (4 años)", outlookEn: "High demand — 18% growth, critical need in rural areas", outlookEs: "Alta demanda — crecimiento del 18%, necesidad crítica en áreas rurales" },
  { track: "healthcare", name: "Healthcare Administrator", nameEs: "Administrador de Servicios de Salud", descriptionEn: "Manage healthcare facilities, departments, or practices. Oversee operations, budgets, staffing, and regulatory compliance.", descriptionEs: "Gestiona instalaciones, departamentos o prácticas de salud. Supervisa operaciones, presupuestos y personal.", salaryEn: "$65,000 – $115,000/year", salaryEs: "$65,000 – $115,000/año", educationEn: "Bachelor's or Master's Degree (4–6 years)", educationEs: "Licenciatura o maestría (4-6 años)", outlookEn: "Strong demand — 28% growth, one of the fastest growing", outlookEs: "Fuerte demanda — crecimiento del 28%, uno de los de mayor crecimiento" },
  { track: "healthcare", name: "Clinical Research Coordinator", nameEs: "Coordinador de Investigación Clínica", descriptionEn: "Manage clinical trials and research studies, recruit participants, collect data, and ensure compliance with research protocols.", descriptionEs: "Gestiona ensayos clínicos y estudios de investigación, recluta participantes y recopila datos.", salaryEn: "$50,000 – $72,000/year", salaryEs: "$50,000 – $72,000/año", educationEn: "Bachelor's Degree (4 years)", educationEs: "Licenciatura (4 años)", outlookEn: "Growing demand — expanding research needs in healthcare", outlookEs: "Demanda creciente — necesidades de investigación en expansión" },
  { track: "healthcare", name: "Nutritionist / Dietary Aide", nameEs: "Nutricionista / Asistente Dietético", descriptionEn: "Plan and recommend dietary programs, counsel patients on nutrition, and work in hospitals, clinics, and community health organizations.", descriptionEs: "Planifica y recomienda programas dietéticos, asesora pacientes sobre nutrición en hospitales y clínicas.", salaryEn: "$45,000 – $68,000/year", salaryEs: "$45,000 – $68,000/año", educationEn: "Associate to Bachelor's Degree (2–4 years)", educationEs: "Título de asociado a licenciatura (2-4 años)", outlookEn: "Growing demand — 7% growth, increasing health awareness", outlookEs: "Demanda creciente — crecimiento del 7%, mayor conciencia sobre salud" },
  { track: "healthcare", name: "Speech-Language Pathologist", nameEs: "Patólogo del Habla y Lenguaje", descriptionEn: "Diagnose and treat speech, language, and swallowing disorders in children and adults across healthcare and school settings.", descriptionEs: "Diagnostica y trata trastornos del habla, lenguaje y deglución en niños y adultos.", salaryEn: "$70,000 – $100,000/year", salaryEs: "$70,000 – $100,000/año", educationEn: "Master's Degree (6 years total)", educationEs: "Maestría (6 años en total)", outlookEn: "High demand — 19% growth, critical shortage in schools", outlookEs: "Alta demanda — crecimiento del 19%, escasez crítica en escuelas" },
  { track: "healthcare", name: "Occupational Therapist", nameEs: "Terapeuta Ocupacional", descriptionEn: "Help patients develop, recover, and improve skills needed for daily living and working through therapeutic activities.", descriptionEs: "Ayuda a pacientes a desarrollar, recuperar y mejorar habilidades para la vida diaria mediante actividades terapéuticas.", salaryEn: "$75,000 – $100,000/year", salaryEs: "$75,000 – $100,000/año", educationEn: "Master's or Doctoral Degree (5–7 years)", educationEs: "Maestría o doctorado (5-7 años)", outlookEn: "High demand — 12% growth expected", outlookEs: "Alta demanda — crecimiento del 12% esperado" },
  { track: "healthcare", name: "Physician Assistant (PA)", nameEs: "Asistente Médico (PA)", descriptionEn: "Examine patients, diagnose illnesses, prescribe medications, and develop treatment plans under physician collaboration.", descriptionEs: "Examina pacientes, diagnostica enfermedades, prescribe medicamentos y desarrolla planes de tratamiento.", salaryEn: "$105,000 – $145,000/year", salaryEs: "$105,000 – $145,000/año", educationEn: "Master's Degree (6–7 years total)", educationEs: "Maestría (6-7 años en total)", outlookEn: "Very high demand — 27% growth, critical in rural areas", outlookEs: "Muy alta demanda — crecimiento del 27%, crítico en áreas rurales" },
  { track: "healthcare", name: "Nurse Practitioner (NP)", nameEs: "Enfermero/a Practicante (NP)", descriptionEn: "Provide advanced nursing care including diagnosing conditions, prescribing medications, and managing patient care independently.", descriptionEs: "Brinda atención de enfermería avanzada incluyendo diagnósticos, prescripción de medicamentos y gestión de pacientes.", salaryEn: "$100,000 – $140,000/year", salaryEs: "$100,000 – $140,000/año", educationEn: "Master's or Doctoral Degree in Nursing (6–8 years)", educationEs: "Maestría o doctorado en enfermería (6-8 años)", outlookEn: "Very high demand — 40% growth, fastest in healthcare", outlookEs: "Muy alta demanda — crecimiento del 40%, el más rápido en salud" },
  { track: "healthcare", name: "Pharmacist", nameEs: "Farmacéutico/a", descriptionEn: "Dispense prescription medications, counsel patients on proper use, monitor drug interactions, and promote wellness.", descriptionEs: "Dispensa medicamentos recetados, asesora pacientes sobre uso adecuado y monitorea interacciones.", salaryEn: "$120,000 – $160,000/year", salaryEs: "$120,000 – $160,000/año", educationEn: "Doctor of Pharmacy (PharmD) (6–8 years)", educationEs: "Doctorado en Farmacia (PharmD) (6-8 años)", outlookEn: "Steady demand — essential community role", outlookEs: "Demanda constante — rol esencial en la comunidad" },
  { track: "healthcare", name: "Physical Therapist (PT)", nameEs: "Fisioterapeuta (PT)", descriptionEn: "Evaluate and treat patients with injuries, disabilities, or health conditions to improve movement and manage pain.", descriptionEs: "Evalúa y trata pacientes con lesiones, discapacidades o condiciones de salud para mejorar el movimiento.", salaryEn: "$80,000 – $110,000/year", salaryEs: "$80,000 – $110,000/año", educationEn: "Doctor of Physical Therapy (DPT) (6–7 years)", educationEs: "Doctorado en Terapia Física (DPT) (6-7 años)", outlookEn: "High demand — 15% growth expected", outlookEs: "Alta demanda — crecimiento del 15% esperado" },
];

const educationCareerSeeds: CareerSeed[] = [
  { track: "education", name: "K-12 Paraprofessional / Teacher's Aide", nameEs: "Paraprofesional K-12 / Asistente de Maestro", descriptionEn: "Support lead teachers in classrooms by helping students one-on-one, managing activities, and assisting with special needs students.", descriptionEs: "Apoya a maestros en aulas ayudando a estudiantes individualmente y asistiendo con necesidades especiales.", salaryEn: "$28,000 – $38,000/year", salaryEs: "$28,000 – $38,000/año", educationEn: "Certificate or Permit (varies)", educationEs: "Certificado o permiso (varía)", outlookEn: "Consistent demand — great stepping stone to teaching", outlookEs: "Demanda constante — excelente paso hacia la enseñanza" },
  { track: "education", name: "Child Development Assistant", nameEs: "Asistente de Desarrollo Infantil", descriptionEn: "Assist in early learning settings by supporting children's daily activities, play-based learning, and developmental milestones.", descriptionEs: "Asiste en entornos de aprendizaje temprano apoyando actividades diarias y desarrollo de niños.", salaryEn: "$26,000 – $34,000/year", salaryEs: "$26,000 – $34,000/año", educationEn: "Certificate or Permit (6 units minimum)", educationEs: "Certificado o permiso (6 unidades mínimo)", outlookEn: "Steady demand — entry point into early childhood education", outlookEs: "Demanda constante — punto de entrada a educación infantil" },
  { track: "education", name: "Bilingual Assistant / Interpreter", nameEs: "Asistente Bilingüe / Intérprete", descriptionEn: "Provide language support in schools for students and families with limited English. Assist with translation, communication, and cultural bridging.", descriptionEs: "Brinda apoyo lingüístico en escuelas para estudiantes y familias con inglés limitado.", salaryEn: "$30,000 – $42,000/year", salaryEs: "$30,000 – $42,000/año", educationEn: "Certificate or Permit + Bilingual proficiency", educationEs: "Certificado o permiso + dominio bilingüe", outlookEn: "Growing demand — essential in diverse North State communities", outlookEs: "Demanda creciente — esencial en comunidades diversas del Norte del Estado" },
  { track: "education", name: "School Bus Driver", nameEs: "Conductor de Autobús Escolar", descriptionEn: "Safely transport students to and from school and activities. A vital support role for rural North State communities.", descriptionEs: "Transporta estudiantes de manera segura hacia y desde la escuela y actividades.", salaryEn: "$28,000 – $40,000/year", salaryEs: "$28,000 – $40,000/año", educationEn: "Commercial Driver's License (CDL) + training", educationEs: "Licencia de conducir comercial (CDL) + capacitación", outlookEn: "High demand — critical shortage in rural districts", outlookEs: "Alta demanda — escasez crítica en distritos rurales" },
  { track: "education", name: "Instructional Assistant", nameEs: "Asistente de Instrucción", descriptionEn: "Work alongside teachers to support student learning, prepare materials, tutor individuals, and help manage classroom activities.", descriptionEs: "Trabaja junto a maestros para apoyar el aprendizaje, preparar materiales y tutorizar estudiantes.", salaryEn: "$30,000 – $40,000/year", salaryEs: "$30,000 – $40,000/año", educationEn: "Associate Degree or equivalent (2 years)", educationEs: "Título de asociado o equivalente (2 años)", outlookEn: "Steady demand — valued support role in schools", outlookEs: "Demanda constante — rol de apoyo valorado en escuelas" },
  { track: "education", name: "Special Education Assistant", nameEs: "Asistente de Educación Especial", descriptionEn: "Support students with disabilities in classrooms, help implement IEP goals, and provide one-on-one learning assistance.", descriptionEs: "Apoya a estudiantes con discapacidades en aulas, implementa metas de IEP y brinda asistencia individual.", salaryEn: "$30,000 – $42,000/year", salaryEs: "$30,000 – $42,000/año", educationEn: "Associate Degree (2 years)", educationEs: "Título de asociado (2 años)", outlookEn: "High demand — critical need in all school districts", outlookEs: "Alta demanda — necesidad crítica en todos los distritos escolares" },
  { track: "education", name: "Afterschool Site Manager", nameEs: "Gerente de Sitio de Programa Extraescolar", descriptionEn: "Oversee afterschool programs, manage staff, coordinate activities, and ensure a safe enrichment environment for students.", descriptionEs: "Supervisa programas extraescolares, gestiona personal y coordina actividades para estudiantes.", salaryEn: "$32,000 – $45,000/year", salaryEs: "$32,000 – $45,000/año", educationEn: "Associate Degree (2 years)", educationEs: "Título de asociado (2 años)", outlookEn: "Growing demand — expanding afterschool programs", outlookEs: "Demanda creciente — programas extraescolares en expansión" },
  { track: "education", name: "Library Technician", nameEs: "Técnico de Biblioteca", descriptionEn: "Manage school library collections, assist students with research, organize resources, and promote literacy programs.", descriptionEs: "Gestiona colecciones de bibliotecas escolares, asiste a estudiantes con investigación y promueve programas de lectura.", salaryEn: "$30,000 – $42,000/year", salaryEs: "$30,000 – $42,000/año", educationEn: "Associate Degree (2 years)", educationEs: "Título de asociado (2 años)", outlookEn: "Steady demand — valued support role in schools", outlookEs: "Demanda constante — rol de apoyo valorado en escuelas" },
  { track: "education", name: "Child Development Teacher", nameEs: "Maestro/a de Desarrollo Infantil", descriptionEn: "Lead early childhood classrooms, plan developmentally appropriate curriculum, and guide young children's social-emotional growth.", descriptionEs: "Dirige aulas de primera infancia, planifica currículo apropiado y guía el desarrollo socioemocional.", salaryEn: "$32,000 – $48,000/year", salaryEs: "$32,000 – $48,000/año", educationEn: "Associate Degree or Child Development Permit (2 years)", educationEs: "Título de asociado o permiso de desarrollo infantil (2 años)", outlookEn: "High demand — critical need in North State communities", outlookEs: "Alta demanda — necesidad crítica en comunidades del Norte del Estado" },
  { track: "education", name: "Career Technical Education (CTE) Instructor", nameEs: "Instructor de Educación Técnica Profesional (CTE)", descriptionEn: "Teach hands-on vocational and technical skills to students at the middle school, high school, or community college level.", descriptionEs: "Enseña habilidades vocacionales y técnicas prácticas a estudiantes de secundaria o universidad comunitaria.", salaryEn: "$50,000 – $80,000/year", salaryEs: "$50,000 – $80,000/año", educationEn: "Industry experience + CTE Credential or Associate Degree", educationEs: "Experiencia en la industria + Credencial CTE o título de asociado", outlookEn: "Growing demand — emphasis on career readiness pathways", outlookEs: "Demanda creciente — énfasis en vías de preparación profesional" },
  { track: "education", name: "Substitute Teacher", nameEs: "Maestro/a Sustituto/a", descriptionEn: "Fill in for absent teachers across grade levels and subjects. A flexible role and common pathway into full-time teaching.", descriptionEs: "Reemplaza a maestros ausentes en diferentes grados y materias. Un rol flexible y camino común hacia la enseñanza.", salaryEn: "$28,000 – $45,000/year", salaryEs: "$28,000 – $45,000/año", educationEn: "Bachelor's Degree + Substitute Permit", educationEs: "Licenciatura + permiso de sustituto", outlookEn: "Very high demand — perpetual need across all districts", outlookEs: "Muy alta demanda — necesidad perpetua en todos los distritos" },
  { track: "education", name: "Child Development Site Supervisor", nameEs: "Supervisor de Sitio de Desarrollo Infantil", descriptionEn: "Oversee daily operations of a childcare site, supervise staff, ensure licensing compliance, and coordinate family engagement.", descriptionEs: "Supervisa operaciones diarias de un sitio de cuidado infantil, personal y cumplimiento de licencias.", salaryEn: "$38,000 – $52,000/year", salaryEs: "$38,000 – $52,000/año", educationEn: "Bachelor's Degree in Child Development or related", educationEs: "Licenciatura en desarrollo infantil o relacionado", outlookEn: "High demand — leadership roles critical for quality programs", outlookEs: "Alta demanda — roles de liderazgo críticos para programas de calidad" },
  { track: "education", name: "Elementary School Teacher (K-6)", nameEs: "Maestro/a de Escuela Primaria (K-6)", descriptionEn: "Teach core subjects to young students, foster curiosity, and create engaging learning environments in elementary schools.", descriptionEs: "Enseña materias básicas a estudiantes jóvenes y crea ambientes de aprendizaje atractivos.", salaryEn: "$55,000 – $85,000/year", salaryEs: "$55,000 – $85,000/año", educationEn: "Bachelor's Degree + Teaching Credential (4–5 years)", educationEs: "Licenciatura + Credencial de enseñanza (4-5 años)", outlookEn: "Steady demand — especially in rural districts", outlookEs: "Demanda constante — especialmente en distritos rurales" },
  { track: "education", name: "Middle/High School Teacher (7-12)", nameEs: "Maestro/a de Secundaria/Preparatoria (7-12)", descriptionEn: "Teach specialized subjects to teenagers, prepare students for college and careers, and serve as a mentor during formative years.", descriptionEs: "Enseña materias especializadas a adolescentes y prepara estudiantes para la universidad y carreras.", salaryEn: "$58,000 – $90,000/year", salaryEs: "$58,000 – $90,000/año", educationEn: "Bachelor's Degree + Teaching Credential (4–5 years)", educationEs: "Licenciatura + Credencial de enseñanza (4-5 años)", outlookEn: "Good demand — especially in STEM and special education", outlookEs: "Buena demanda — especialmente en STEM y educación especial" },
  { track: "education", name: "Special Education Teacher", nameEs: "Maestro/a de Educación Especial", descriptionEn: "Work with students who have learning disabilities, autism, or other special needs. Develop IEPs and adapt curriculum.", descriptionEs: "Trabaja con estudiantes con discapacidades de aprendizaje, autismo u otras necesidades especiales.", salaryEn: "$55,000 – $85,000/year", salaryEs: "$55,000 – $85,000/año", educationEn: "Bachelor's Degree + Education Specialist Credential", educationEs: "Licenciatura + Credencial de Especialista en Educación", outlookEn: "Very high demand — critical shortage in California", outlookEs: "Muy alta demanda — escasez crítica en California" },
  { track: "education", name: "Reading and Literacy Teacher", nameEs: "Maestro/a de Lectura y Alfabetización", descriptionEn: "Specialize in teaching reading skills, support struggling readers, and develop literacy programs across grade levels.", descriptionEs: "Se especializa en enseñar habilidades de lectura, apoyar lectores con dificultades y desarrollar programas de alfabetización.", salaryEn: "$55,000 – $82,000/year", salaryEs: "$55,000 – $82,000/año", educationEn: "Bachelor's Degree + Reading/Literacy Credential", educationEs: "Licenciatura + Credencial de Lectura/Alfabetización", outlookEn: "High demand — literacy focus growing in all districts", outlookEs: "Alta demanda — enfoque en alfabetización crece en todos los distritos" },
  { track: "education", name: "PK-3 Teacher (Age 3 through 3rd Grade)", nameEs: "Maestro/a PK-3 (Edad 3 hasta 3er Grado)", descriptionEn: "Teach in the critical early years from preschool through third grade, bridging early childhood and elementary education.", descriptionEs: "Enseña en los años críticos desde preescolar hasta tercer grado, conectando educación infantil y primaria.", salaryEn: "$48,000 – $75,000/year", salaryEs: "$48,000 – $75,000/año", educationEn: "Bachelor's Degree + PK-3 Teaching Credential", educationEs: "Licenciatura + Credencial de enseñanza PK-3", outlookEn: "Growing demand — new credential with increasing adoption", outlookEs: "Demanda creciente — nueva credencial con adopción creciente" },
  { track: "education", name: "School Counselor / Career Advisor", nameEs: "Consejero/a Escolar / Asesor de Carreras", descriptionEn: "Guide students through academic planning, social-emotional challenges, and career exploration in K-12 or college settings.", descriptionEs: "Guía a estudiantes en planificación académica, desafíos socioemocionales y exploración de carreras.", salaryEn: "$55,000 – $80,000/year", salaryEs: "$55,000 – $80,000/año", educationEn: "Master's Degree + PPS Credential", educationEs: "Maestría + Credencial PPS", outlookEn: "Growing demand — increased focus on student mental health", outlookEs: "Demanda creciente — mayor enfoque en salud mental estudiantil" },
  { track: "education", name: "School Social Worker", nameEs: "Trabajador/a Social Escolar", descriptionEn: "Address students' social, emotional, and family challenges that affect learning. Connect families with community resources.", descriptionEs: "Aborda desafíos sociales, emocionales y familiares que afectan el aprendizaje. Conecta familias con recursos.", salaryEn: "$55,000 – $78,000/year", salaryEs: "$55,000 – $78,000/año", educationEn: "Master's Degree in Social Work (MSW)", educationEs: "Maestría en Trabajo Social (MSW)", outlookEn: "High demand — growing mental health needs in schools", outlookEs: "Alta demanda — crecientes necesidades de salud mental en escuelas" },
  { track: "education", name: "Instructional Coordinator", nameEs: "Coordinador/a de Instrucción", descriptionEn: "Develop curricula, train teachers, analyze student data, and oversee educational standards at the district or county level.", descriptionEs: "Desarrolla currículo, capacita maestros, analiza datos estudiantiles y supervisa estándares educativos.", salaryEn: "$65,000 – $95,000/year", salaryEs: "$65,000 – $95,000/año", educationEn: "Master's Degree + teaching experience", educationEs: "Maestría + experiencia docente", outlookEn: "Growing demand — emphasis on educational quality", outlookEs: "Demanda creciente — énfasis en calidad educativa" },
  { track: "education", name: "K-12 School Psychologist", nameEs: "Psicólogo/a Escolar K-12", descriptionEn: "Assess students' learning and behavioral needs, provide psychological services, and support special education evaluations.", descriptionEs: "Evalúa necesidades de aprendizaje y comportamiento, brinda servicios psicológicos y apoya evaluaciones de educación especial.", salaryEn: "$70,000 – $100,000/year", salaryEs: "$70,000 – $100,000/año", educationEn: "Master's or Specialist Degree (3+ years graduate)", educationEs: "Maestría o título de especialista (3+ años de posgrado)", outlookEn: "Very high demand — severe shortage across California", outlookEs: "Muy alta demanda — escasez severa en California" },
  { track: "education", name: "Principal / Vice Principal", nameEs: "Director/a / Subdirector/a", descriptionEn: "Lead a school's academic programs, manage staff, ensure student safety, and drive school improvement as an administrator.", descriptionEs: "Dirige programas académicos de una escuela, gestiona personal y impulsa la mejora escolar.", salaryEn: "$95,000 – $145,000/year", salaryEs: "$95,000 – $145,000/año", educationEn: "Master's Degree + Administrative Credential", educationEs: "Maestría + Credencial administrativa", outlookEn: "Steady demand — leadership openings in rural districts", outlookEs: "Demanda constante — vacantes de liderazgo en distritos rurales" },
  { track: "education", name: "Community College Faculty", nameEs: "Profesorado de Universidad Comunitaria", descriptionEn: "Teach college-level courses at community colleges, develop curriculum, and mentor adult learners pursuing degrees and certificates.", descriptionEs: "Enseña cursos universitarios en universidades comunitarias, desarrolla currículo y guía estudiantes adultos.", salaryEn: "$60,000 – $100,000/year", salaryEs: "$60,000 – $100,000/año", educationEn: "Master's Degree in subject area", educationEs: "Maestría en el área de especialidad", outlookEn: "Steady demand — retirements creating openings", outlookEs: "Demanda constante — jubilaciones creando vacantes" },
  { track: "education", name: "Librarian / Media Specialist", nameEs: "Bibliotecario/a / Especialista en Medios", descriptionEn: "Manage school or college library programs, curate collections, teach research skills, and integrate technology in learning.", descriptionEs: "Gestiona programas de biblioteca, cura colecciones, enseña habilidades de investigación e integra tecnología.", salaryEn: "$55,000 – $80,000/year", salaryEs: "$55,000 – $80,000/año", educationEn: "Master's Degree in Library Science (MLIS)", educationEs: "Maestría en Ciencias Bibliotecarias (MLIS)", outlookEn: "Moderate demand — valued role in academic settings", outlookEs: "Demanda moderada — rol valorado en entornos académicos" },
  { track: "education", name: "Early Childhood Education Program Director", nameEs: "Director/a de Programa de Educación Infantil", descriptionEn: "Oversee early childhood education programs, manage staff, ensure curriculum quality, and maintain licensing and accreditation.", descriptionEs: "Supervisa programas de educación infantil, gestiona personal y asegura calidad curricular y acreditación.", salaryEn: "$50,000 – $75,000/year", salaryEs: "$50,000 – $75,000/año", educationEn: "Master's Degree in Early Childhood Education or related", educationEs: "Maestría en educación infantil o relacionado", outlookEn: "High demand — expanding early childhood initiatives", outlookEs: "Alta demanda — iniciativas de primera infancia en expansión" },
  { track: "education", name: "Superintendent / Assistant Superintendent", nameEs: "Superintendente / Superintendente Asistente", descriptionEn: "Lead an entire school district's operations, set strategic vision, manage budgets, and oversee all schools and programs.", descriptionEs: "Dirige operaciones de un distrito escolar completo, establece visión estratégica y gestiona presupuestos.", salaryEn: "$130,000 – $200,000/year", salaryEs: "$130,000 – $200,000/año", educationEn: "Master's or Doctorate + Administrative Credential", educationEs: "Maestría o doctorado + Credencial administrativa", outlookEn: "Steady demand — leadership pipeline needed in rural areas", outlookEs: "Demanda constante — se necesita desarrollo de liderazgo en áreas rurales" },
];

export async function seedAssessmentData() {
  const existingQuestions = await db.select().from(assessmentQuestions);
  if (existingQuestions.length > 0) {
    console.log("Assessment data already seeded, skipping.");
    return;
  }

  console.log("Seeding assessment questions and options...");

  const allQuestions = [...healthcareQuestionSeeds, ...educationQuestionSeeds];
  for (const q of allQuestions) {
    const [inserted] = await db.insert(assessmentQuestions).values({
      track: q.track,
      category: q.category,
      questionEn: q.questionEn,
      questionEs: q.questionEs,
      gifUrl: q.gifUrl,
      multiSelect: q.multiSelect,
      sortOrder: q.sortOrder,
      isActive: true,
    }).returning();

    await db.insert(assessmentOptions).values(
      q.options.map(opt => ({
        questionId: inserted.id,
        value: opt.value,
        labelEn: opt.labelEn,
        labelEs: opt.labelEs,
        sortOrder: opt.sortOrder,
      }))
    );
  }

  console.log(`Seeded ${allQuestions.length} assessment questions with options.`);

  console.log("Seeding assessment careers...");
  const allCareers = [...healthcareCareerSeeds, ...educationCareerSeeds];
  await db.insert(assessmentCareers).values(allCareers);
  console.log(`Seeded ${allCareers.length} assessment careers (${healthcareCareerSeeds.length} healthcare + ${educationCareerSeeds.length} education).`);
}
