import { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, ArrowRight, Globe, MessageCircle,
  Stethoscope, GraduationCap, CheckCircle2, ExternalLink,
  RotateCcw, Sparkles, Heart, BookOpen
} from "lucide-react";

interface QuizQuestion {
  id: string;
  category: string;
  question: { en: string; es: string };
  gif: string;
  multiSelect?: boolean;
  options: { value: string; label: { en: string; es: string } }[];
}

const healthcareQuestions: QuizQuestion[] = [
  {
    id: "hc_motivation",
    category: "Motivation",
    question: {
      en: "What matters most to you in a career?",
      es: "¿Qué es lo que más te importa en una carrera?",
    },
    gif: "https://media.tenor.com/a-4zC1uY0HYAAAAd/dream-big-big-dreams.gif",
    options: [
      { value: "money", label: { en: "High earning potential — I want financial security", es: "Alto potencial de ingresos — quiero seguridad financiera" } },
      { value: "passion", label: { en: "Helping people — I want to make a difference", es: "Ayudar a las personas — quiero hacer la diferencia" } },
      { value: "balance", label: { en: "Work-life balance — I value my personal time", es: "Equilibrio vida-trabajo — valoro mi tiempo personal" } },
      { value: "growth", label: { en: "Career growth — I want room to advance", es: "Crecimiento profesional — quiero espacio para avanzar" } },
    ],
  },
  {
    id: "hc_education",
    category: "Education",
    question: {
      en: "How much time are you willing to spend in school?",
      es: "¿Cuánto tiempo estás dispuesto/a a pasar estudiando?",
    },
    gif: "https://media.tenor.com/lOgxwnWrxqYAAAAd/dog-cute.gif",
    options: [
      { value: "minimal", label: { en: "As little as possible — on-the-job training or a few months", es: "Lo menos posible — capacitación en el trabajo o unos meses" } },
      { value: "short", label: { en: "1-2 years — a certificate or associate degree", es: "1-2 años — un certificado o título de asociado" } },
      { value: "medium", label: { en: "3-4 years — a bachelor's degree", es: "3-4 años — una licenciatura" } },
      { value: "long", label: { en: "5+ years — I'm ready for an advanced degree", es: "5+ años — estoy listo/a para un título avanzado" } },
    ],
  },
  {
    id: "hc_patients",
    category: "Patient Interaction",
    question: {
      en: "How much do you want to work directly with patients?",
      es: "¿Cuánto deseas trabajar directamente con pacientes?",
    },
    gif: "https://media.tenor.com/ZK1mkWw-65wAAAAd/hug-cute.gif",
    options: [
      { value: "all_the_time", label: { en: "All the time — I love working with people face-to-face", es: "Todo el tiempo — me encanta trabajar cara a cara con las personas" } },
      { value: "some", label: { en: "Some interaction is fine, but not all day", es: "Algo de interacción está bien, pero no todo el día" } },
      { value: "minimal", label: { en: "I prefer working behind the scenes", es: "Prefiero trabajar detrás de escena" } },
    ],
  },
  {
    id: "hc_medical",
    category: "Medical Comfort",
    question: {
      en: "How comfortable are you with medical procedures and blood?",
      es: "¿Qué tan cómodo/a te sientes con procedimientos médicos y sangre?",
    },
    gif: "https://media.tenor.com/-EKVxmGt7UcAAAAd/nurse-dance.gif",
    options: [
      { value: "very", label: { en: "Very comfortable — I can handle anything", es: "Muy cómodo/a — puedo manejar cualquier cosa" } },
      { value: "somewhat", label: { en: "Somewhat comfortable — I can manage with training", es: "Algo cómodo/a — puedo manejarlo con capacitación" } },
      { value: "not_really", label: { en: "Not really — I'd rather avoid clinical settings", es: "No mucho — prefiero evitar entornos clínicos" } },
    ],
  },
  {
    id: "hc_emergency",
    category: "Work Environment",
    question: {
      en: "What kind of work pace do you prefer?",
      es: "¿Qué tipo de ritmo de trabajo prefieres?",
    },
    gif: "https://media.tenor.com/sfgjf1JnpFoAAAAd/running-firefighter.gif",
    options: [
      { value: "fast", label: { en: "Fast-paced and high-pressure — I thrive under stress", es: "Rápido y alta presión — me desempeño bien bajo estrés" } },
      { value: "moderate", label: { en: "Steady and structured — I like routine with some variety", es: "Estable y estructurado — me gusta la rutina con algo de variedad" } },
      { value: "calm", label: { en: "Calm and predictable — I prefer a relaxed environment", es: "Tranquilo y predecible — prefiero un ambiente relajado" } },
    ],
  },
  {
    id: "hc_age_group",
    category: "Population",
    question: {
      en: "What age groups are you interested in working with?",
      es: "¿Con qué grupos de edad te interesa trabajar?",
    },
    gif: "https://media.tenor.com/E5MlxuCvJYMAAAAd/hugs-family.gif",
    multiSelect: true,
    options: [
      { value: "children", label: { en: "Children and teenagers", es: "Niños y adolescentes" } },
      { value: "adults", label: { en: "Adults", es: "Adultos" } },
      { value: "elderly", label: { en: "Elderly", es: "Personas mayores" } },
      { value: "all", label: { en: "All ages — I don't have a preference", es: "Todas las edades — no tengo preferencia" } },
    ],
  },
];

const educationQuestions: QuizQuestion[] = [
  {
    id: "ed_motivation",
    category: "Motivation",
    question: {
      en: "Why are you interested in a career in education?",
      es: "¿Por qué te interesa una carrera en educación?",
    },
    gif: "https://media.tenor.com/0awndc0411wAAAAd/happy-dance-excited.gif",
    options: [
      { value: "inspire", label: { en: "I want to inspire and shape young minds", es: "Quiero inspirar y formar mentes jóvenes" } },
      { value: "community", label: { en: "I want to strengthen my community through education", es: "Quiero fortalecer mi comunidad a través de la educación" } },
      { value: "subject", label: { en: "I'm passionate about a subject and want to share it", es: "Me apasiona una materia y quiero compartirla" } },
      { value: "stability", label: { en: "I want a stable career with good benefits", es: "Quiero una carrera estable con buenos beneficios" } },
    ],
  },
  {
    id: "ed_age_group",
    category: "Age Group",
    question: {
      en: "What age groups would you like to teach?",
      es: "¿A qué grupos de edad te gustaría enseñar?",
    },
    gif: "https://media.tenor.com/F4EfNZj7nCsAAAAd/alex-wolff-raising-hand.gif",
    multiSelect: true,
    options: [
      { value: "early_childhood", label: { en: "Young children (preschool to kindergarten)", es: "Niños pequeños (preescolar a kinder)" } },
      { value: "elementary", label: { en: "Elementary school (grades 1-6)", es: "Escuela primaria (grados 1-6)" } },
      { value: "secondary", label: { en: "Middle or high school (grades 7-12)", es: "Escuela secundaria o preparatoria (grados 7-12)" } },
      { value: "adult", label: { en: "Adults or college students", es: "Adultos o estudiantes universitarios" } },
    ],
  },
  {
    id: "ed_education_level",
    category: "Education",
    question: {
      en: "How much schooling are you willing to complete?",
      es: "¿Cuánta educación estás dispuesto/a a completar?",
    },
    gif: "https://media.tenor.com/ICCkMEE3hKUAAAAd/graduation-celebration.gif",
    options: [
      { value: "certificate", label: { en: "A certificate program (less than 2 years)", es: "Un programa de certificado (menos de 2 años)" } },
      { value: "associates", label: { en: "An associate degree (2 years)", es: "Un título de asociado (2 años)" } },
      { value: "bachelors", label: { en: "A bachelor's degree (4 years)", es: "Una licenciatura (4 años)" } },
      { value: "masters", label: { en: "A master's degree or credential program", es: "Una maestría o programa de credencial" } },
    ],
  },
  {
    id: "ed_role",
    category: "Role Type",
    question: {
      en: "What kind of role interests you most?",
      es: "¿Qué tipo de rol te interesa más?",
    },
    gif: "https://media.tenor.com/UQ4bHLp78PYAAAAM/team-high-five-family-feud-canada.gif",
    options: [
      { value: "classroom", label: { en: "Lead teacher in a classroom", es: "Maestro/a principal en un salón de clases" } },
      { value: "support", label: { en: "Supporting role — helping teachers and students", es: "Rol de apoyo — ayudando a maestros y estudiantes" } },
      { value: "specialist", label: { en: "Specialist — counseling, special ed, or administration", es: "Especialista — consejería, educación especial o administración" } },
      { value: "childcare", label: { en: "Childcare or early learning center", es: "Cuidado infantil o centro de aprendizaje temprano" } },
    ],
  },
  {
    id: "ed_environment",
    category: "Environment",
    question: {
      en: "What kind of work environment do you prefer?",
      es: "¿Qué tipo de ambiente de trabajo prefieres?",
    },
    gif: "https://media.tenor.com/JChxs-yyayQAAAAd/cozy-aesthetic.gif",
    options: [
      { value: "structured", label: { en: "Structured and predictable — I like a set schedule", es: "Estructurado y predecible — me gusta un horario fijo" } },
      { value: "dynamic", label: { en: "Dynamic and creative — every day is different", es: "Dinámico y creativo — cada día es diferente" } },
      { value: "flexible", label: { en: "Flexible — I want control over my schedule", es: "Flexible — quiero control sobre mi horario" } },
    ],
  },
  {
    id: "ed_location",
    category: "Location",
    question: {
      en: "Where would you prefer to study?",
      es: "¿Dónde preferirías estudiar?",
    },
    gif: "https://media.tenor.com/PdIGGQsJAF4AAAAd/summer-road-trip.gif",
    options: [
      { value: "local", label: { en: "Locally in the North State — I want to stay close to home", es: "Localmente en el Norte del Estado — quiero quedarme cerca de casa" } },
      { value: "willing_travel", label: { en: "I'm willing to travel or relocate for the right program", es: "Estoy dispuesto/a a viajar o mudarme por el programa adecuado" } },
      { value: "online", label: { en: "Online — I need the flexibility of remote learning", es: "En línea — necesito la flexibilidad del aprendizaje remoto" } },
    ],
  },
];

interface AssessmentResult {
  title: string;
  description: string;
  programs: {
    name: string;
    institution: string;
    level: string;
    url: string | null;
  }[];
  nextSteps: string[];
}

type Track = "healthcare" | "education";

export default function AssessmentPage() {
  const { language, setLanguage, t } = useLanguage();
  const [track, setTrack] = useState<Track | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);

  const questions = track === "healthcare" ? healthcareQuestions : educationQuestions;
  const currentQuestion = questions[currentStep];

  const hasAnswer = (id: string) => {
    const a = answers[id];
    return a && (Array.isArray(a) ? a.length > 0 : a.length > 0);
  };
  const progress = track ? ((currentStep + (hasAnswer(currentQuestion?.id) ? 1 : 0)) / questions.length) * 100 : 0;

  const handleSelectOption = (value: string) => {
    if (currentQuestion.multiSelect) {
      setAnswers(prev => {
        const current = (prev[currentQuestion.id] as string[]) || [];
        if (value === "all") {
          return { ...prev, [currentQuestion.id]: current.includes("all") ? [] : ["all"] };
        }
        const withoutAll = current.filter(v => v !== "all");
        const updated = withoutAll.includes(value) ? withoutAll.filter(v => v !== value) : [...withoutAll, value];
        return { ...prev, [currentQuestion.id]: updated };
      });
    } else {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
    }
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      submitAssessment();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    } else {
      setTrack(null);
      setAnswers({});
    }
  };

  const resetQuiz = () => {
    setTrack(null);
    setCurrentStep(0);
    setAnswers({});
    setResult(null);
  };

  const submitAssessment = async () => {
    setLoadingResult(true);
    try {
      const res = await apiRequest("POST", "/api/assessment/results", { track, answers, language });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error("Assessment error:", e);
    } finally {
      setLoadingResult(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <header className="flex items-center justify-between gap-4 px-4 py-2.5 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight" data-testid="text-assessment-title">
                {language === "en" ? "Career Self-Assessment" : "Autoevaluación de Carrera"}
              </h1>
              <p className="text-xs text-muted-foreground leading-tight hidden sm:block">
                {language === "en" ? "Find your ideal career path" : "Encuentra tu carrera ideal"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLanguage(language === "en" ? "es" : "en")}
            className="text-xs font-semibold px-2 h-7 gap-1"
            data-testid="button-toggle-language"
          >
            <Globe className="w-3.5 h-3.5" />
            {language === "en" ? "ES" : "EN"}
          </Button>
          <Link href="/chat">
            <Button size="sm" className="text-xs h-7 gap-1" data-testid="button-start-chat">
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === "en" ? "Chat" : "Chat"}</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {!track && !result && (
            <div className="space-y-6 text-center animate-in fade-in duration-300">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold" data-testid="text-choose-track">
                  {language === "en" ? "Which career path interests you?" : "¿Qué carrera te interesa?"}
                </h2>
                <p className="text-muted-foreground">
                  {language === "en"
                    ? "Take a short quiz to discover careers that match your interests, skills, and goals."
                    : "Toma un breve cuestionario para descubrir carreras que coincidan con tus intereses, habilidades y metas."}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Card
                  className="p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 group"
                  onClick={() => { setTrack("healthcare"); setCurrentStep(0); setAnswers({}); }}
                  data-testid="card-track-healthcare"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Heart className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{language === "en" ? "Healthcare" : "Salud"}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === "en"
                          ? "Nursing, EMT, medical assisting, and more"
                          : "Enfermería, EMT, asistente médico y más"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">6 {language === "en" ? "questions" : "preguntas"}</Badge>
                  </div>
                </Card>

                <Card
                  className="p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 group"
                  onClick={() => { setTrack("education"); setCurrentStep(0); setAnswers({}); }}
                  data-testid="card-track-education"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BookOpen className="w-8 h-8 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{language === "en" ? "Education" : "Educación"}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === "en"
                          ? "Teaching, early childhood, credentials, and more"
                          : "Enseñanza, primera infancia, credenciales y más"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">6 {language === "en" ? "questions" : "preguntas"}</Badge>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {track && !result && currentQuestion && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300" key={currentQuestion.id}>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {track === "healthcare" ? <Stethoscope className="w-3 h-3 mr-1" /> : <GraduationCap className="w-3 h-3 mr-1" />}
                    {currentQuestion.category}
                  </Badge>
                  <span>{language === "en" ? "Question" : "Pregunta"} {currentStep + 1}/{questions.length}</span>
                </div>
                <Progress value={progress} className="h-1.5" data-testid="progress-quiz" />
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden bg-muted/30 border" data-testid="img-question-gif">
                  <img
                    src={currentQuestion.gif}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
                <h2 className="text-xl font-bold text-center" data-testid="text-question">
                  {currentQuestion.question[language]}
                </h2>
              </div>

              {currentQuestion.multiSelect && (
                <p className="text-xs text-muted-foreground text-center" data-testid="text-multi-select-hint">
                  {language === "en" ? "Select all that apply" : "Selecciona todas las que apliquen"}
                </p>
              )}

              <div className="space-y-2.5">
                {currentQuestion.options.map(opt => {
                  const answerVal = answers[currentQuestion.id];
                  const isSelected = currentQuestion.multiSelect
                    ? Array.isArray(answerVal) && answerVal.includes(opt.value)
                    : answerVal === opt.value;
                  return (
                    <Card
                      key={opt.value}
                      className={`p-4 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md"
                          : "hover:border-primary/30 hover:shadow-sm"
                      }`}
                      onClick={() => handleSelectOption(opt.value)}
                      data-testid={`option-${opt.value}`}
                    >
                      <div className="flex items-center gap-3">
                        {currentQuestion.multiSelect ? (
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                          </div>
                        ) : (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                          </div>
                        )}
                        <span className="text-sm">{opt.label[language]}</span>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={handleBack} data-testid="button-quiz-back">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {language === "en" ? "Back" : "Atrás"}
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!hasAnswer(currentQuestion.id)}
                  data-testid="button-quiz-next"
                >
                  {currentStep === questions.length - 1
                    ? (language === "en" ? "See Results" : "Ver Resultados")
                    : (language === "en" ? "Next" : "Siguiente")}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {loadingResult && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-muted-foreground">
                {language === "en" ? "Analyzing your responses..." : "Analizando tus respuestas..."}
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  {track === "healthcare" ? <Stethoscope className="w-7 h-7 text-primary" /> : <GraduationCap className="w-7 h-7 text-primary" />}
                </div>
                <h2 className="text-2xl font-bold" data-testid="text-result-title">{result.title}</h2>
                <p className="text-muted-foreground max-w-lg mx-auto">{result.description}</p>
              </div>

              {result.programs.length > 0 && (
                <Card className="p-5">
                  <h3 className="text-sm font-bold mb-3">
                    {language === "en" ? "Recommended Programs in the North State" : "Programas Recomendados en el Norte del Estado"}
                  </h3>
                  <div className="space-y-2">
                    {result.programs.map((prog, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-muted/50">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{prog.name}</p>
                          <p className="text-xs text-muted-foreground">{prog.institution} — {prog.level}</p>
                        </div>
                        {prog.url && (
                          <a href={prog.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`link-program-${i}`}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {result.nextSteps.length > 0 && (
                <Card className="p-5">
                  <h3 className="text-sm font-bold mb-3">
                    {language === "en" ? "Your Next Steps" : "Tus Próximos Pasos"}
                  </h3>
                  <div className="space-y-2">
                    {result.nextSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-sm">{step}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button variant="outline" onClick={resetQuiz} data-testid="button-retake">
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  {language === "en" ? "Take Again" : "Volver a Tomar"}
                </Button>
                <Link href="/chat">
                  <Button data-testid="button-chat-after-results">
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    {language === "en" ? "Chat with Our AI Assistant" : "Chatea con Nuestro Asistente de IA"}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
