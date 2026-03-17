import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AIActiveBadge, HumanCounselorPanel, useAIOptOut } from "@/components/ai-active-badge";
import { computeScores } from "@/lib/assessment-scoring";
import {
  ArrowLeft, ArrowRight, Globe, MessageCircle,
  Stethoscope, GraduationCap, CheckCircle2,
  RotateCcw, Sparkles, Heart, BookOpen,
  DollarSign, Clock, TrendingUp, Trophy, Award, Medal,
  Printer, ClipboardList, ChevronDown, ChevronUp, ExternalLink, MapPin
} from "lucide-react";
import type { AssessmentQuestion, AssessmentOption, AssessmentCareer } from "@shared/schema";

interface QuizQuestion {
  id: string;
  category: string;
  question: { en: string; es: string };
  gif: string;
  multiSelect?: boolean;
  options: { value: string; label: { en: string; es: string } }[];
}

type DBQuestion = AssessmentQuestion & { options: AssessmentOption[] };

function mapDBQuestionsToQuiz(dbQuestions: DBQuestion[]): QuizQuestion[] {
  return dbQuestions
    .filter(q => q.isActive)
    .map(q => ({
      id: String(q.id),
      category: q.category,
      question: { en: q.questionEn, es: q.questionEs },
      gif: q.gifUrl || "",
      multiSelect: q.multiSelect || false,
      options: q.options.map(o => ({
        value: o.value,
        label: { en: o.labelEn, es: o.labelEs },
      })),
    }));
}

interface CareerMatch {
  id: string;
  title: string;
  description: string;
  salary: string;
  education: string;
  outlook: string;
  matchPercent: number;
}

interface AssessmentResult {
  careers: CareerMatch[];
  aiInsight: string;
  nextSteps: string[];
  isAlgorithmic?: boolean;
}

interface QASummaryItem {
  question: string;
  answers: string[];
}

interface CareerProgramInfo {
  id: number;
  name: string;
  institutionName: string;
  url: string;
  logoUrl: string | null;
}

type CareerPrograms = Record<string, CareerProgramInfo[]>;

type Track = "healthcare" | "education";

export default function AssessmentPage() {
  const { language, setLanguage } = useLanguage();
  const [, navigate] = useLocation();
  const [track, setTrack] = useState<Track | null>(() => {
    const param = new URLSearchParams(window.location.search).get("track");
    return param === "healthcare" || param === "education" ? param : null;
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [qaSummary, setQaSummary] = useState<QASummaryItem[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [loadingResult, setLoadingResult] = useState(false);
  const [aiOptedOut, setAiOptedOut] = useAIOptOut();

  const prevLanguageRef = useRef<string>(language);
  const submittedAnswersRef = useRef<Record<string, string | string[]>>({});
  const resultRef = useRef<AssessmentResult | null>(null);

  useEffect(() => { resultRef.current = result; }, [result]);

  const navigateToChat = () => {
    if (result && track) {
      const topCareers = result.careers.slice(0, 3).map(c => ({
        title: c.title,
        matchPercent: c.matchPercent,
        description: c.description,
        salary: c.salary,
        education: c.education,
      }));
      const context = {
        track,
        careers: topCareers,
        aiInsight: result.aiInsight || "",
        qaSummary: qaSummary.map(q => ({ question: q.question, answers: q.answers })),
      };
      sessionStorage.setItem("nsp-assessment-context", JSON.stringify(context));
    }
    navigate("/chat");
  };

  useEffect(() => {
    if (prevLanguageRef.current === language) return;
    prevLanguageRef.current = language;

    const currentResult = resultRef.current;
    if (!currentResult || !track) return;

    if (questions.length > 0) {
      setQaSummary(buildQASummary(questions, submittedAnswersRef.current));
    }

    if (currentResult.isAlgorithmic) {
      if (!dbCareers || dbCareers.length === 0) return;
      const careerIds = dbCareers.map(c => c.id);
      const scored = computeScores(submittedAnswersRef.current, questions, careerIds, track);
      const top = scored.slice(0, 6);
      const careerMatches: CareerMatch[] = top.map(s => {
        const career = dbCareers.find(c => c.id === s.id)!;
        return {
          id: String(career.id),
          title: language === "es" && career.nameEs ? career.nameEs : career.name,
          description: language === "es" && career.descriptionEs ? career.descriptionEs : (career.descriptionEn ?? ""),
          salary: language === "es" && career.salaryEs ? career.salaryEs : (career.salaryEn ?? ""),
          education: language === "es" && career.educationEs ? career.educationEs : (career.educationEn ?? ""),
          outlook: language === "es" && career.outlookEs ? career.outlookEs : (career.outlookEn ?? ""),
          matchPercent: s.matchPercent,
        };
      });
      setResult(prev => prev ? { ...prev, careers: careerMatches } : null);
    } else {
      setLoadingResult(true);
      apiRequest("POST", "/api/assessment/results", {
        track,
        answers: submittedAnswersRef.current,
        language,
      })
        .then(res => res.json())
        .then(data => setResult(data))
        .catch(e => console.error("Language reprocess error:", e))
        .finally(() => setLoadingResult(false));
    }
  }, [language]);

  const { data: dbQuestions, isLoading: questionsLoading } = useQuery<DBQuestion[]>({
    queryKey: ["/api/assessment/questions", `?track=${track}`],
    enabled: !!track,
  });

  const { data: dbCareers } = useQuery<AssessmentCareer[]>({
    queryKey: ["/api/assessment/careers", `?track=${track}`],
    enabled: !!track,
  });

  const { data: careerPrograms = {} } = useQuery<CareerPrograms>({
    queryKey: ["/api/assessment/career-programs", `?track=${track}`],
    enabled: !!track,
  });

  const questions: QuizQuestion[] = dbQuestions ? mapDBQuestionsToQuiz(dbQuestions) : [];
  const currentQuestion = questions[currentStep];

  const hasAnswer = (id: string) => {
    const a = answers[id];
    return a && (Array.isArray(a) ? a.length > 0 : a.length > 0);
  };
  const progress = track && currentQuestion ? ((currentStep + (hasAnswer(currentQuestion?.id) ? 1 : 0)) / questions.length) * 100 : 0;

  const handleSelectOption = (value: string) => {
    if (!currentQuestion) return;
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
    setQaSummary([]);
    setSummaryOpen(false);
  };

  const buildQASummary = (qs: QuizQuestion[], ans: Record<string, string | string[]>): QASummaryItem[] =>
    qs.map(q => {
      const selected = ans[q.id];
      const selectedArr = selected ? (Array.isArray(selected) ? selected : [selected]) : [];
      const answerLabels = selectedArr.map(v => {
        const opt = q.options.find(o => o.value === v);
        return opt ? opt.label[language] : v;
      });
      return { question: q.question[language], answers: answerLabels };
    }).filter(item => item.answers.length > 0);

  const submitAssessment = async () => {
    const snapshot = buildQASummary(questions, answers);
    setQaSummary(snapshot);
    submittedAnswersRef.current = answers;

    if (aiOptedOut) {
      if (!dbCareers || dbCareers.length === 0) {
        setResult({ careers: [], aiInsight: "", nextSteps: [], isAlgorithmic: true });
        return;
      }
      const careerIds = dbCareers.map(c => c.id);
      const scored = computeScores(answers, questions, careerIds, track!);
      const top = scored.slice(0, 6);
      const careerMatches: CareerMatch[] = top.map(s => {
        const career = dbCareers.find(c => c.id === s.id)!;
        return {
          id: String(career.id),
          title: language === "es" && career.nameEs ? career.nameEs : career.name,
          description: language === "es" && career.descriptionEs ? career.descriptionEs : (career.descriptionEn ?? ""),
          salary: language === "es" && career.salaryEs ? career.salaryEs : (career.salaryEn ?? ""),
          education: language === "es" && career.educationEs ? career.educationEs : (career.educationEn ?? ""),
          outlook: language === "es" && career.outlookEs ? career.outlookEs : (career.outlookEn ?? ""),
          matchPercent: s.matchPercent,
        };
      });
      setResult({ careers: careerMatches, aiInsight: "", nextSteps: [], isAlgorithmic: true });
      return;
    }

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

  const handlePrint = () => {
    const trackLabel = track === "healthcare"
      ? (language === "en" ? "Healthcare" : "Salud")
      : (language === "en" ? "Education" : "Educación");
    const title = language === "en"
      ? `Career Self-Assessment Summary — ${trackLabel} Track`
      : `Resumen de Autoevaluación de Carrera — Área de ${trackLabel}`;
    const lines = qaSummary.map((item, i) =>
      `${i + 1}. ${item.question}\n   → ${item.answers.join(", ")}`
    ).join("\n\n");
    const careersSection = result && result.careers.length > 0
      ? "\n\n" + (language === "en" ? "TOP CAREER MATCHES:" : "MEJORES COINCIDENCIAS DE CARRERA:") + "\n" +
        result.careers.slice(0, 5).map((c, i) => `${i + 1}. ${c.title} (${c.matchPercent}% match)`).join("\n")
      : "";
    const content = `${title}\n${"=".repeat(title.length)}\n\n${lines}${careersSection}\n\n---\nNorth State Pathways | northstatepathways.org`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`<pre style="font-family:Arial,sans-serif;font-size:14px;padding:24px;max-width:700px;margin:0 auto;line-height:1.6">${content}</pre>`);
      win.document.close();
      win.print();
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
          <AIActiveBadge
            aiOptedOut={aiOptedOut}
            onOptOutChange={setAiOptedOut}
            language={language}
          />
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
                  </div>
                </Card>
              </div>
            </div>
          )}

          {track && !result && questionsLoading && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="w-full max-w-lg aspect-video rounded-2xl" />
                <Skeleton className="h-7 w-3/4" />
              </div>
              <div className="space-y-2.5">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            </div>
          )}

          {track && !result && !questionsLoading && currentQuestion && (
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
                <div className="w-full max-w-lg aspect-video rounded-2xl overflow-hidden bg-muted/30 border flex items-center justify-center" data-testid="img-question-gif">
                  <img
                    src={currentQuestion.gif}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="eager"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
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

          {loadingResult && !aiOptedOut && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-muted-foreground">
                {language === "en" ? "Analyzing your responses..." : "Analizando tus respuestas..."}
              </p>
            </div>
          )}

          {result && result.isAlgorithmic && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" data-testid="assessment-algo-results">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  {track === "healthcare" ? <Stethoscope className="w-7 h-7 text-primary" /> : <GraduationCap className="w-7 h-7 text-primary" />}
                </div>
                <h2 className="text-2xl font-bold" data-testid="text-algo-result-title">
                  {language === "en" ? "Your Career Matches" : "Tus Carreras Compatibles"}
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto text-sm">
                  {language === "en"
                    ? "Based on your answers, here are the careers that best match your interests and goals. These results were calculated without AI."
                    : "Según tus respuestas, estas son las carreras que mejor se alinean contigo. Estos resultados se calcularon sin IA."}
                </p>
              </div>

              <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800" data-testid="card-algo-notice">
                <div className="flex items-start gap-3">
                  <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    {language === "en"
                      ? "AI is turned off — these matches are based on a scoring algorithm. For deeper personalized guidance, speak with one of our counselors below."
                      : "La IA está desactivada — estos resultados se basan en un algoritmo de puntuación. Para orientación personalizada, habla con uno de nuestros consejeros a continuación."}
                  </p>
                </div>
              </Card>

              {result.careers.length > 0 && (
                <div className="space-y-3">
                  {result.careers.map((career, i) => {
                    const RankIcon = i === 0 ? Trophy : i === 1 ? Award : Medal;
                    const rankColor = i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : "text-amber-700";
                    return (
                      <Card key={career.id} className={`p-5 ${i === 0 ? "border-primary/30 shadow-sm" : ""}`} data-testid={`card-algo-career-${i}`}>
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              {i < 3 ? (
                                <RankIcon className={`w-5 h-5 shrink-0 mt-0.5 ${rankColor}`} />
                              ) : (
                                <span className="w-5 h-5 shrink-0 mt-0.5 flex items-center justify-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                              )}
                              <div className="min-w-0">
                                <h3 className="font-bold text-base" data-testid={`text-algo-career-title-${i}`}>{career.title}</h3>
                                <p className="text-sm text-muted-foreground mt-0.5">{career.description}</p>
                              </div>
                            </div>
                            <Badge variant={i === 0 ? "default" : "secondary"} className="shrink-0 text-xs" data-testid={`badge-algo-match-${i}`}>
                              {career.matchPercent}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                              <DollarSign className="w-3.5 h-3.5 text-green-600 shrink-0" />
                              <span>{career.salary}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{career.education}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                              <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{career.outlook}</span>
                            </div>
                          </div>
                          {(careerPrograms[career.id] || []).length > 0 && (
                            <div className="border-t pt-3">
                              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                                {language === "en" ? "Where to Study in the Region" : "Dónde Estudiar en la Región"}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {(careerPrograms[career.id] || []).map(prog => (
                                  <a key={prog.id} href={prog.url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 rounded-md px-2.5 py-1.5 transition-colors"
                                    data-testid={`link-algo-program-${career.id}-${prog.id}`}>
                                    {prog.logoUrl && (
                                      <img src={prog.logoUrl} alt={prog.institutionName} className="w-4 h-4 object-contain" />
                                    )}
                                    <span>{prog.institutionName}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {qaSummary.length > 0 && (
                <Card className="overflow-hidden" data-testid="card-qa-summary">
                  <button
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setSummaryOpen(v => !v)}
                    data-testid="button-toggle-qa-summary"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">
                        {language === "en" ? "Your Assessment Answers" : "Tus Respuestas de Evaluación"}
                      </span>
                      <Badge variant="outline" className="text-xs">{qaSummary.length}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {language === "en" ? "Share with your counselor" : "Comparte con tu consejero"}
                      </span>
                      {summaryOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {summaryOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t pt-4">
                      {qaSummary.map((item, i) => (
                        <div key={i} className="space-y-1" data-testid={`qa-item-${i}`}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {language === "en" ? `Question ${i + 1}` : `Pregunta ${i + 1}`}
                          </p>
                          <p className="text-sm font-medium">{item.question}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {item.answers.map((ans, j) => (
                              <Badge key={j} variant="secondary" className="text-xs" data-testid={`qa-answer-${i}-${j}`}>
                                {ans}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t">
                        <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5" data-testid="button-print-summary">
                          <Printer className="w-3.5 h-3.5" />
                          {language === "en" ? "Print Summary" : "Imprimir Resumen"}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              <HumanCounselorPanel language={language} />

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button variant="outline" onClick={resetQuiz} data-testid="button-algo-retake">
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  {language === "en" ? "Take Again" : "Volver a Tomar"}
                </Button>
                <Button onClick={navigateToChat} data-testid="button-algo-chat">
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  {language === "en" ? "Chat with Our AI Assistant" : "Chatea con Nuestro Asistente de IA"}
                </Button>
              </div>
            </div>
          )}

          {result && !result.isAlgorithmic && !loadingResult && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  {track === "healthcare" ? <Stethoscope className="w-7 h-7 text-primary" /> : <GraduationCap className="w-7 h-7 text-primary" />}
                </div>
                <h2 className="text-2xl font-bold" data-testid="text-result-title">
                  {language === "en" ? "Your Career Matches" : "Tus Carreras Compatibles"}
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto text-sm">
                  {language === "en"
                    ? "Based on your answers, here are the careers that best match your interests, skills, and goals."
                    : "Según tus respuestas, estas son las carreras que mejor se alinean con tus intereses, habilidades y metas."}
                </p>
              </div>

              {result.aiInsight && (
                <Card className="p-5 bg-primary/5 border-primary/20" data-testid="card-ai-insight">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold mb-1" data-testid="text-ai-insight-heading">
                        {language === "en" ? "Personalized Insight" : "Perspectiva Personalizada"}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-ai-insight">
                        {result.aiInsight}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {result.careers.length > 0 && (
                <div className="space-y-3">
                  {result.careers.map((career, i) => {
                    const RankIcon = i === 0 ? Trophy : i === 1 ? Award : Medal;
                    const rankColor = i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : "text-amber-700";
                    return (
                      <Card key={career.id} className={`p-5 ${i === 0 ? "border-primary/30 shadow-sm" : ""}`} data-testid={`card-career-${i}`}>
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <RankIcon className={`w-5 h-5 shrink-0 mt-0.5 ${rankColor}`} />
                              <div className="min-w-0">
                                <h3 className="font-bold text-base" data-testid={`text-career-title-${i}`}>{career.title}</h3>
                                <p className="text-sm text-muted-foreground mt-0.5">{career.description}</p>
                              </div>
                            </div>
                            <Badge variant={i === 0 ? "default" : "secondary"} className="shrink-0 text-xs" data-testid={`badge-match-${i}`}>
                              {career.matchPercent}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2" data-testid={`text-salary-${i}`}>
                              <DollarSign className="w-3.5 h-3.5 text-green-600 shrink-0" />
                              <span>{career.salary}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2" data-testid={`text-education-${i}`}>
                              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{career.education}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2" data-testid={`text-outlook-${i}`}>
                              <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{career.outlook}</span>
                            </div>
                          </div>
                          {(careerPrograms[String(career.id)] || []).length > 0 && (
                            <div className="border-t pt-3">
                              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                                {language === "en" ? "Where to Study in the Region" : "Dónde Estudiar en la Región"}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {(careerPrograms[String(career.id)] || []).map(prog => (
                                  <a key={prog.id} href={prog.url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 rounded-md px-2.5 py-1.5 transition-colors"
                                    data-testid={`link-program-${career.id}-${prog.id}`}>
                                    {prog.logoUrl && (
                                      <img src={prog.logoUrl} alt={prog.institutionName} className="w-4 h-4 object-contain" />
                                    )}
                                    <span>{prog.institutionName}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {result.nextSteps.length > 0 && (
                <Card className="p-5">
                  <h3 className="text-sm font-bold mb-3" data-testid="text-next-steps-heading">
                    {language === "en" ? "Your Next Steps" : "Tus Próximos Pasos"}
                  </h3>
                  <div className="space-y-2">
                    {result.nextSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5" data-testid={`text-next-step-${i}`}>
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-sm">{step}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {qaSummary.length > 0 && (
                <Card className="overflow-hidden" data-testid="card-qa-summary-ai">
                  <button
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setSummaryOpen(v => !v)}
                    data-testid="button-toggle-qa-summary-ai"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">
                        {language === "en" ? "Your Assessment Answers" : "Tus Respuestas de Evaluación"}
                      </span>
                      <Badge variant="outline" className="text-xs">{qaSummary.length}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {language === "en" ? "Share with your counselor" : "Comparte con tu consejero"}
                      </span>
                      {summaryOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {summaryOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t pt-4">
                      {qaSummary.map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {language === "en" ? `Question ${i + 1}` : `Pregunta ${i + 1}`}
                          </p>
                          <p className="text-sm font-medium">{item.question}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {item.answers.map((ans, j) => (
                              <Badge key={j} variant="secondary" className="text-xs">{ans}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t">
                        <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5" data-testid="button-print-summary-ai">
                          <Printer className="w-3.5 h-3.5" />
                          {language === "en" ? "Print Summary" : "Imprimir Resumen"}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button variant="outline" onClick={resetQuiz} data-testid="button-retake">
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  {language === "en" ? "Take Again" : "Volver a Tomar"}
                </Button>
                <Button onClick={navigateToChat} data-testid="button-chat-after-results">
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  {language === "en" ? "Chat with Our AI Assistant" : "Chatea con Nuestro Asistente de IA"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
