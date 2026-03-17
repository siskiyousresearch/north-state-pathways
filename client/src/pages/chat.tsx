import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import type { Pathway, OnboardingScript } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AIActiveBadge, ChatAIOptOutFallback, useAIOptOut } from "@/components/ai-active-badge";
import {
  Send, Sparkles, ArrowLeft,
  MapPin, User, Loader2, Bot, ChevronLeft, ChevronDown, ChevronUp,
  Stethoscope, School, Volume2, VolumeX,
  Home, Plane, HandHeart, DollarSign, Briefcase, Check, ArrowRight,
  ExternalLink, BookOpen, GraduationCap, Heart, Globe
} from "lucide-react";

interface ChatMsg {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const counties = [
  "Butte", "Glenn", "Lassen", "Modoc", "Plumas",
  "Shasta", "Sierra", "Siskiyou", "Tehama", "Trinity"
];

const studentTypeKeys = [
  { id: "high-school", labelKey: "studentType.highSchool", descKey: "studentType.highSchoolDesc" },
  { id: "hs-grad-no-college", labelKey: "studentType.hsGrad", descKey: "studentType.hsGradDesc" },
  { id: "some-college", labelKey: "studentType.someCollege", descKey: "studentType.someCollegeDesc" },
  { id: "associates", labelKey: "studentType.associates", descKey: "studentType.associatesDesc" },
  { id: "bachelors-seeking-masters", labelKey: "studentType.masters", descKey: "studentType.mastersDesc" },
  { id: "seeking-doctorate", labelKey: "studentType.doctorate", descKey: "studentType.doctorateDesc" },
];

const supportOptionKeys = [
  { id: "wraparound", icon: HandHeart, labelKey: "support.wraparound", descKey: "support.wraparoundDesc" },
  { id: "financial", icon: DollarSign, labelKey: "support.financial", descKey: "support.financialDesc" },
  { id: "work-experience", icon: Briefcase, labelKey: "support.workExperience", descKey: "support.workExperienceDesc" },
];

function getCountyAudio(pathway: string): string {
  return `/audio/onboarding/county-${pathway}.mp3`;
}

function getStudentTypeAudio(county: string): string {
  return `/audio/onboarding/studenttype-${county.toLowerCase()}.mp3`;
}

function getStudyLocationAudio(studentType: string): string {
  return `/audio/onboarding/studylocation-${studentType}.mp3`;
}

function getSupportNeedsAudio(location: string): string {
  return `/audio/onboarding/supportneeds-${location}.mp3`;
}

const ONBOARDING_VIDEOS: Record<string, string> = {
  pathway: "/videos/onboarding-step1-pathway.mp4",
  county: "/videos/onboarding-step2-county.mp4",
  "student-type": "/videos/onboarding-step3-student.mp4",
  "study-location": "/videos/onboarding-step4-location.mp4",
  "support-needs": "/videos/onboarding-step5-support.mp4",
};

const ONBOARDING_VIDEOS_MOBILE: Record<string, string> = {
  pathway: "/videos/onboarding-step1-pathway-mobile.mp4",
  county: "/videos/onboarding-step2-county-mobile.mp4",
  "student-type": "/videos/onboarding-step3-student-mobile.mp4",
  "study-location": "/videos/onboarding-step4-location-mobile.mp4",
  "support-needs": "/videos/onboarding-step5-support-mobile.mp4",
};

type OnboardingStep = "pathway" | "county" | "student-type" | "study-location" | "support-needs" | "done";
const TOTAL_STEPS = 5;

function stripMarkdownForTTS(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .trim();
}

async function playTTSForText(text: string): Promise<{ audio: HTMLAudioElement; url: string } | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: "nova" }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play().catch(() => {});
    return { audio, url };
  } catch { return null; }
}

export default function ChatPage() {
  const { language, setLanguage, t } = useLanguage();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("pathway");
  const [selectedPathway, setSelectedPathway] = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [selectedStudentType, setSelectedStudentType] = useState<string | null>(null);
  const [studyLocation, setStudyLocation] = useState<string | null>(null);
  const [selectedSupports, setSelectedSupports] = useState<string[]>([]);

  const [aiOptedOut, setAiOptedOut] = useAIOptOut();
  const streamAbortRef = useRef<AbortController | null>(null);

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const audioRequestIdRef = useRef(0);

  const assessmentContextRef = useRef<any>(null);

  // Check for assessment context passed from the self-assessment page
  useEffect(() => {
    const stored = sessionStorage.getItem("nsp-assessment-context");
    if (stored) {
      sessionStorage.removeItem("nsp-assessment-context");
      try {
        assessmentContextRef.current = JSON.parse(stored);
      } catch {
        assessmentContextRef.current = null;
      }
      if (assessmentContextRef.current) {
        setVoiceEnabled(false);
        setOnboardingStep("done");
      }
    }
  }, []);

  // Once onboarding is skipped via assessment, send a short opener with context in the session
  useEffect(() => {
    if (assessmentContextRef.current && onboardingStep === "done" && messages.length === 0 && !isLoading) {
      const ctx = assessmentContextRef.current;
      assessmentContextRef.current = null;
      const topCareer = ctx.careers?.[0];
      const trackLabel = ctx.track === "healthcare" ? (language === "es" ? "salud" : "healthcare") : (language === "es" ? "educación" : "education");
      const msg = language === "es"
        ? `Acabo de completar mi autoevaluación de carreras en ${trackLabel}${topCareer ? `. Mi resultado principal fue ${topCareer.title}` : ""}. ¿Cómo puedes ayudarme a explorar mis opciones?`
        : `I just completed my ${trackLabel} career self-assessment${topCareer ? ` and my top match was ${topCareer.title}` : ""}. How can you help me explore my options?`;
      // Store assessment context in session metadata so the AI has full context
      assessmentSessionContextRef.current = ctx;
      sendMessage(msg);
    }
  }, [onboardingStep, messages.length, isLoading, language]);

  const assessmentSessionContextRef = useRef<any>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const videos = isMobile ? ONBOARDING_VIDEOS_MOBILE : ONBOARDING_VIDEOS;

  const { data: dbPathways = [] } = useQuery<Pathway[]>({
    queryKey: ["/api/pathways"],
  });

  const selectedPathwayId = useMemo(() => {
    if (!selectedPathway) return null;
    const pw = dbPathways.find(p => p.slug === selectedPathway);
    return pw?.id ?? null;
  }, [selectedPathway, dbPathways]);

  const { data: onboardingScripts = [] } = useQuery<OnboardingScript[]>({
    queryKey: ["/api/onboarding-scripts", { pathwayId: selectedPathwayId, language }],
    queryFn: async () => {
      if (!selectedPathwayId) return [];
      const res = await fetch(`/api/onboarding-scripts?pathwayId=${selectedPathwayId}&language=${language}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedPathwayId,
  });

  const getScriptAudio = useCallback((step: string, contextKey?: string): string | null => {
    const match = onboardingScripts.find(s =>
      s.step === step && (contextKey ? s.contextKey === contextKey : !s.contextKey)
    );
    return match?.audioUrl || null;
  }, [onboardingScripts]);

  const resourcesUrl = `/api/resources?pathway=${encodeURIComponent(selectedPathway || "")}&county=${encodeURIComponent(selectedCounty || "")}`;
  const { data: resources = [] } = useQuery<{ id: number; name: string; type: string; description: string | null; url: string | null; eligibility: string | null; pathwayId: number | null; county: string | null }[]>({
    queryKey: [resourcesUrl],
    enabled: onboardingStep === "done",
  });

  const stopCurrentAudio = useCallback(() => {
    audioRequestIdRef.current++;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const handleOptOutChange = useCallback((v: boolean) => {
    setAiOptedOut(v);
    if (v) {
      streamAbortRef.current?.abort();
      stopCurrentAudio();
      setIsLoading(false);
    }
  }, [setAiOptedOut, stopCurrentAudio]);

  const playStaticAudio = useCallback((src: string) => {
    if (!voiceEnabled) return;
    stopCurrentAudio();
    const requestId = ++audioRequestIdRef.current;
    setIsSpeaking(true);
    const audio = new Audio(src);
    audio.onerror = () => { setIsSpeaking(false); currentAudioRef.current = null; };
    audio.play().catch(() => { setIsSpeaking(false); });
    if (requestId !== audioRequestIdRef.current) {
      audio.pause();
      return;
    }
    currentAudioRef.current = audio;
    audio.onended = () => { setIsSpeaking(false); currentAudioRef.current = null; };
  }, [voiceEnabled, stopCurrentAudio]);

  useEffect(() => {
    playStaticAudio(language === "es" ? "/audio/onboarding/es/welcome.mp3" : "/audio/onboarding/welcome.mp3");
    return () => {
      stopCurrentAudio();
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const prevLoadingRef = useRef(false);
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = isLoading;
    if (voiceEnabled && wasLoading && !isLoading && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant" && lastMsg.content) {
        stopCurrentAudio();
        setIsSpeaking(true);
        playTTSForText(stripMarkdownForTTS(lastMsg.content)).then((result) => {
          if (result) {
            currentAudioRef.current = result.audio;
            currentAudioUrlRef.current = result.url;
            result.audio.onended = () => {
              setIsSpeaking(false);
              currentAudioRef.current = null;
              URL.revokeObjectURL(result.url);
              currentAudioUrlRef.current = null;
            };
          } else {
            setIsSpeaking(false);
          }
        });
      }
    }
  }, [messages, isLoading, voiceEnabled, stopCurrentAudio]);

  const createSession = async () => {
    const assessmentCtx = assessmentSessionContextRef.current;
    assessmentSessionContextRef.current = null;
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assessmentCtx ? { metadata: { assessmentContext: assessmentCtx } } : {}),
    });
    const data = await res.json();
    setSessionId(data.id);
    return data.id;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    let sid = sessionId;
    if (!sid) {
      sid = await createSession();
    }

    const userMsg: ChatMsg = {
      id: Date.now(),
      role: "user",
      content: content.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantMsg: ChatMsg = {
      id: Date.now() + 1,
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, assistantMsg]);

    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    try {
      const res = await fetch(`/api/chat/sessions/${sid}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), language }),
        signal: abortController.signal,
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.content) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + event.content,
                  };
                }
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // User opted out mid-stream — remove the incomplete assistant message
        setMessages((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.role === "assistant" && m.content === "")));
        return;
      }
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: t("chat.errorMsg"),
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      streamAbortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const playStepAudioAsync = useCallback(async (step: string, contextKey: string | undefined, pathwayId: number | null, fallbackUrl: string) => {
    const dbAudio = getScriptAudio(step, contextKey);
    if (dbAudio) {
      playStaticAudio(dbAudio);
      return;
    }
    if (pathwayId) {
      try {
        const res = await fetch(`/api/onboarding-scripts?pathwayId=${pathwayId}&language=${language}`);
        if (res.ok) {
          const scripts: OnboardingScript[] = await res.json();
          const match = scripts.find(s =>
            s.step === step && (contextKey ? s.contextKey === contextKey : !s.contextKey)
          );
          if (match?.audioUrl) {
            playStaticAudio(match.audioUrl);
            return;
          }
        }
      } catch {}
    }
    playStaticAudio(fallbackUrl);
  }, [getScriptAudio, playStaticAudio, language]);

  const handlePathwaySelect = (pathway: string) => {
    setSelectedPathway(pathway);
    setOnboardingStep("county");
    const pw = dbPathways.find(p => p.slug === pathway);
    playStepAudioAsync("county", undefined, pw?.id ?? null, getCountyAudio(pathway));
  };

  const handleCountySelect = (county: string) => {
    setSelectedCounty(county);
    setOnboardingStep("student-type");
    playStepAudioAsync("student-type", county.toLowerCase(), selectedPathwayId, getStudentTypeAudio(county));
  };

  const handleStudentTypeSelect = (typeId: string) => {
    setSelectedStudentType(typeId);
    stopCurrentAudio();
    setOnboardingStep("study-location");
    playStepAudioAsync("study-location", typeId, selectedPathwayId, getStudyLocationAudio(typeId));
  };

  const handleStudyLocationSelect = (location: string) => {
    setStudyLocation(location);
    setOnboardingStep("support-needs");
    playStepAudioAsync("support-needs", location, selectedPathwayId, getSupportNeedsAudio(location));
  };

  const toggleSupport = (id: string) => {
    setSelectedSupports((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSupportsContinue = async () => {
    const st = studentTypeKeys.find((s) => s.id === selectedStudentType);
    const stLabel = st ? t(st.labelKey).toLowerCase() : selectedStudentType;
    const stDesc = st ? t(st.descKey).toLowerCase() : "";
    const pathwayLabel = selectedPathway === "healthcare" ? t("chat.healthcare") : t("chat.education");
    const locationPref = studyLocation === "local"
      ? (language === "es" ? "Prefiero estudiar localmente cerca de donde vivo" : "I prefer to study locally near where I live")
      : (language === "es" ? "Estoy dispuesto a viajar para mi educación" : "I am open to traveling for my education");
    const supportNeeds = selectedSupports.length > 0
      ? `${language === "es" ? "También me interesa" : "I'm also interested in"}: ${selectedSupports.map((s) => {
          const opt = supportOptionKeys.find((o) => o.id === s);
          return opt ? t(opt.labelKey).toLowerCase() : s;
        }).join(", ")}`
      : "";
    const introMessage = language === "es"
      ? `Estoy interesado en carreras de ${pathwayLabel}. Vivo en el condado de ${selectedCounty}. Soy ${stLabel}${stDesc ? ` (${stDesc})` : ""}. ${locationPref}. ${supportNeeds} ¿Qué programas y oportunidades hay disponibles para mí?`
      : `I'm interested in ${pathwayLabel} career pathways. I live in ${selectedCounty} County. I am a ${stLabel}${stDesc ? ` (${stDesc})` : ""}. ${locationPref}. ${supportNeeds} What programs and opportunities are available for me?`;
    stopCurrentAudio();
    setOnboardingStep("done");
    try {
      await sendMessage(introMessage);
    } catch (err) {
      console.error("Failed to send onboarding message:", err);
    }
  };

  const goBackOnboarding = () => {
    stopCurrentAudio();
    if (onboardingStep === "county") {
      setSelectedPathway(null);
      setOnboardingStep("pathway");
      playStaticAudio(language === "es" ? "/audio/onboarding/es/welcome.mp3" : "/audio/onboarding/welcome.mp3");
    } else if (onboardingStep === "student-type") {
      const pw = selectedPathway;
      setSelectedCounty(null);
      setOnboardingStep("county");
      if (pw) playStepAudioAsync("county", undefined, selectedPathwayId, getCountyAudio(pw));
    } else if (onboardingStep === "study-location") {
      const county = selectedCounty;
      setSelectedStudentType(null);
      setOnboardingStep("student-type");
      if (county) playStepAudioAsync("student-type", county.toLowerCase(), selectedPathwayId, getStudentTypeAudio(county));
    } else if (onboardingStep === "support-needs") {
      const st = selectedStudentType;
      setStudyLocation(null);
      setOnboardingStep("study-location");
      if (st) playStepAudioAsync("study-location", st, selectedPathwayId, getStudyLocationAudio(st));
    }
  };

  const hasMessages = messages.length > 0;
  const showOnboarding = onboardingStep !== "done";
  const stepNumberMap: Record<OnboardingStep, number> = {
    pathway: 1, county: 2, "student-type": 3, "study-location": 4, "support-needs": 5, done: 5
  };
  const stepNumber = stepNumberMap[onboardingStep];

  return (
    <div className="h-screen flex flex-col bg-background">
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
              <h1 className="text-sm font-bold leading-tight" data-testid="text-chat-title">{t("chat.title")}</h1>
              <p className="text-xs text-muted-foreground leading-tight">{t("chat.subtitle")}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <AIActiveBadge
            aiOptedOut={aiOptedOut}
            onOptOutChange={handleOptOutChange}
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (voiceEnabled) stopCurrentAudio();
              setVoiceEnabled(!voiceEnabled);
            }}
            data-testid="button-toggle-tts"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          {isSpeaking && voiceEnabled && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-speaking">
              {t("chat.speaking")}
            </Badge>
          )}
          {sessionId && !isSpeaking && (
            <Badge variant="secondary" className="text-xs">
              {t("chat.sessionActive")}
            </Badge>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto">
          {aiOptedOut ? (
            <div className="h-full">
              <ChatAIOptOutFallback language={language} />
            </div>
          ) : showOnboarding ? (
            <div className="flex flex-col items-center justify-center min-h-full px-4 py-8">
              <div className="max-w-2xl w-full">
                <div className="flex items-center justify-center gap-2 mb-6">
                  {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          s < stepNumber
                            ? "bg-primary text-primary-foreground"
                            : s === stepNumber
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                        data-testid={`step-indicator-${s}`}
                      >
                        {s < stepNumber ? <Check className="w-3.5 h-3.5" /> : s}
                      </div>
                      {s < TOTAL_STEPS && (
                        <div className={`w-8 h-0.5 ${s < stepNumber ? "bg-primary" : "bg-muted"}`} />
                      )}
                    </div>
                  ))}
                </div>

                {onboardingStep !== "pathway" && (
                  <Button
                    variant="ghost"
                    className="mb-4"
                    onClick={goBackOnboarding}
                    data-testid="button-onboarding-back"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> {t("chat.back")}
                  </Button>
                )}

                {onboardingStep === "pathway" && (
                  <div className="text-center animate-in fade-in duration-300">
                    <div className="w-full max-w-lg mx-auto mb-6 rounded-md overflow-hidden">
                      <video
                        src={videos["pathway"]}
                        className="w-full h-48 object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        data-testid="video-onboarding-pathway"
                      />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-welcome-heading">
                      {t("chat.welcomeTitle")}
                    </h2>
                    <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                      {t("chat.welcomeDesc")}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                      <Card
                        className="p-6 cursor-pointer hover-elevate active-elevate-2 text-center group"
                        onClick={() => handlePathwaySelect("healthcare")}
                        data-testid="card-pathway-healthcare"
                      >
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 dark:bg-destructive/20 mx-auto mb-4">
                          <Stethoscope className="w-7 h-7 text-destructive" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{t("chat.healthcare")}</h3>
                        <p className="text-sm text-muted-foreground">{t("chat.healthcareDesc")}</p>
                      </Card>
                      <Card
                        className="p-6 cursor-pointer hover-elevate active-elevate-2 text-center group"
                        onClick={() => handlePathwaySelect("education")}
                        data-testid="card-pathway-education"
                      >
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 dark:bg-primary/20 mx-auto mb-4">
                          <School className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{t("chat.education")}</h3>
                        <p className="text-sm text-muted-foreground">{t("chat.educationDesc")}</p>
                      </Card>
                    </div>
                  </div>
                )}

                {onboardingStep === "county" && (
                  <div className="text-center animate-in fade-in duration-300">
                    <div className="w-full max-w-xl mx-auto mb-6 rounded-md overflow-hidden">
                      <video
                        src={videos["county"]}
                        className="w-full h-48 object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        data-testid="video-onboarding-county"
                      />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2" data-testid="text-county-heading">
                      {t("chat.countyIntro")}{" "}
                      <span className="text-primary">
                        {selectedPathway === "healthcare" ? t("chat.healthcare") : t("chat.education")}
                      </span>{" "}
                      {t("chat.countyAnd")}
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      {t("chat.countySelect")}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-xl mx-auto">
                      {counties.map((county) => (
                        <Card
                          key={county}
                          className="p-3 cursor-pointer hover-elevate active-elevate-2 text-center"
                          onClick={() => handleCountySelect(county)}
                          data-testid={`card-county-${county.toLowerCase()}`}
                        >
                          <MapPin className="w-4 h-4 text-primary mx-auto mb-1.5" />
                          <p className="text-sm font-medium">{county}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {onboardingStep === "student-type" && (
                  <div className="text-center animate-in fade-in duration-300">
                    <div className="w-full max-w-xl mx-auto mb-6 rounded-md overflow-hidden">
                      <video
                        src={videos["student-type"]}
                        className="w-full h-48 object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        data-testid="video-onboarding-student"
                      />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2" data-testid="text-student-type-heading">
                      {t("chat.iAmA")}
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                      <Badge variant="secondary">
                        {selectedPathway === "healthcare" ? t("chat.healthcare") : t("chat.education")}
                      </Badge>
                      <Badge variant="secondary">
                        <MapPin className="w-3 h-3 mr-1" />{selectedCounty} {language === "es" ? "Condado" : "County"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      {t("chat.tellUsBackground")}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                      {studentTypeKeys.map((st) => (
                        <Card
                          key={st.id}
                          className="p-4 cursor-pointer hover-elevate active-elevate-2 text-left"
                          onClick={() => handleStudentTypeSelect(st.id)}
                          data-testid={`card-student-type-${st.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 shrink-0">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{t(st.labelKey)}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{t(st.descKey)}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {onboardingStep === "study-location" && (
                  <div className="text-center animate-in fade-in duration-300">
                    <div className="w-full max-w-lg mx-auto mb-6 rounded-md overflow-hidden">
                      <video
                        src={videos["study-location"]}
                        className="w-full h-48 object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        data-testid="video-onboarding-location"
                      />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2" data-testid="text-study-location-heading">
                      {t("chat.studyLocationTitle")}
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                      <Badge variant="secondary">
                        {selectedPathway === "healthcare" ? t("chat.healthcare") : t("chat.education")}
                      </Badge>
                      <Badge variant="secondary">
                        <MapPin className="w-3 h-3 mr-1" />{selectedCounty} {language === "es" ? "Condado" : "County"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      {t("chat.studyLocationDesc")}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                      <Card
                        className="p-6 cursor-pointer hover-elevate active-elevate-2 text-center"
                        onClick={() => handleStudyLocationSelect("local")}
                        data-testid="card-location-local"
                      >
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4">
                          <Home className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{t("chat.studyLocal")}</h3>
                        <p className="text-sm text-muted-foreground">{t("chat.studyLocalDesc")}</p>
                      </Card>
                      <Card
                        className="p-6 cursor-pointer hover-elevate active-elevate-2 text-center"
                        onClick={() => handleStudyLocationSelect("travel")}
                        data-testid="card-location-travel"
                      >
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4">
                          <Plane className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{t("chat.openToTravel")}</h3>
                        <p className="text-sm text-muted-foreground">{t("chat.openToTravelDesc")}</p>
                      </Card>
                    </div>
                  </div>
                )}

                {onboardingStep === "support-needs" && (
                  <div className="text-center animate-in fade-in duration-300">
                    <div className="w-full max-w-lg mx-auto mb-6 rounded-md overflow-hidden">
                      <video
                        src={videos["support-needs"]}
                        className="w-full h-48 object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        data-testid="video-onboarding-support"
                      />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2" data-testid="text-support-needs-heading">
                      {t("chat.supportTitle")}
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                      <Badge variant="secondary">
                        {selectedPathway === "healthcare" ? t("chat.healthcare") : t("chat.education")}
                      </Badge>
                      <Badge variant="secondary">
                        <MapPin className="w-3 h-3 mr-1" />{selectedCounty} {language === "es" ? "Condado" : "County"}
                      </Badge>
                      <Badge variant="secondary">
                        {studyLocation === "local" ? t("chat.studyLocal") : t("chat.openToTravel")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      {t("chat.supportDesc")}
                    </p>
                    <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto mb-6">
                      {supportOptionKeys.map((opt) => {
                        const isSelected = selectedSupports.includes(opt.id);
                        return (
                          <Card
                            key={opt.id}
                            className={`p-4 cursor-pointer hover-elevate active-elevate-2 text-left transition-colors ${
                              isSelected ? "border-primary bg-primary/5" : ""
                            }`}
                            onClick={() => toggleSupport(opt.id)}
                            data-testid={`card-support-${opt.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
                                isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10"
                              }`}>
                                {isSelected ? (
                                  <Check className="w-5 h-5" />
                                ) : (
                                  <opt.icon className="w-5 h-5 text-primary" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-semibold">{t(opt.labelKey)}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{t(opt.descKey)}</p>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                    <Button
                      size="lg"
                      onClick={handleSupportsContinue}
                      data-testid="button-continue-to-chat"
                    >
                      {t("chat.startChatting")} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full relative">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/images/hero-landscape.png')" }}
              />
              <div className="absolute inset-0 bg-background/85 dark:bg-background/90" />
              <div className="relative hidden lg:flex flex-col w-72 xl:w-80 border-r bg-background/60 backdrop-blur-md shrink-0" data-testid="sidebar-resources">
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-bold" data-testid="text-resources-title">{t("chat.resources")}</h2>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {selectedPathway === "healthcare" ? t("chat.healthcare") : t("chat.education")}
                    </Badge>
                    {selectedCounty && (
                      <Badge variant="secondary" className="text-xs">
                        <MapPin className="w-3 h-3 mr-0.5" />{selectedCounty}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {resources.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">{t("chat.loadingResources")}</p>
                  ) : (
                    resources.map((resource) => (
                      <div
                        key={resource.id}
                        className="group"
                        data-testid={`resource-item-${resource.id}`}
                      >
                        {resource.url ? (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 rounded-md border bg-card/70 backdrop-blur-sm hover-elevate transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <div className="shrink-0 mt-0.5">
                                {resource.type === "Scholarship" || resource.type === "Financial Aid" ? (
                                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                                ) : resource.type === "Program" ? (
                                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                  <Heart className="w-3.5 h-3.5 text-primary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="text-xs font-semibold truncate">{resource.name}</p>
                                  <ExternalLink className="w-3 h-3 text-primary shrink-0" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{resource.type}</p>
                                <p className="text-xs text-primary mt-0.5 font-medium">Visit site →</p>
                              </div>
                            </div>
                          </a>
                        ) : (
                          <div className="p-3 rounded-md border bg-card/70 backdrop-blur-sm">
                            <div className="flex items-start gap-2">
                              <div className="shrink-0 mt-0.5">
                                {resource.type === "Scholarship" || resource.type === "Financial Aid" ? (
                                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                                ) : resource.type === "Program" ? (
                                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                  <Heart className="w-3.5 h-3.5 text-primary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{resource.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{resource.type}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    {t("chat.visitWebsite").split("northstatepathways.org")[0]}<a href="https://northstatepathways.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">northstatepathways.org</a>
                  </p>
                </div>
              </div>

              <div className="relative flex-1 flex flex-col min-w-0">
                <div ref={scrollRef} className="flex-1 overflow-y-auto">
                  <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        data-testid={`message-${msg.role}-${msg.id}`}
                      >
                        {msg.role === "assistant" && (
                          <Avatar className="w-8 h-8 shrink-0 mt-1">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              <Bot className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[85%] rounded-md px-4 py-3 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-card/80 backdrop-blur-md border"
                          }`}
                        >
                          {msg.content ? (
                            msg.role === "assistant" ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ul]:ml-1 [&>ul>li]:mb-1 [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2" data-testid={`markdown-${msg.id}`}>
                                <ReactMarkdown
                                  components={{
                                    a: ({ href, children }) => (
                                      <a href={href} target="_blank" rel="noopener noreferrer" data-testid="link-chat-external">
                                        {children}
                                      </a>
                                    ),
                                  }}
                                >{msg.content}</ReactMarkdown>
                              </div>
                            ) : (
                              msg.content
                            )
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span className="text-xs">{t("chat.thinking")}</span>
                            </div>
                          )}
                        </div>
                        {msg.role === "user" && (
                          <Avatar className="w-8 h-8 shrink-0 mt-1">
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              <User className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {resources.length > 0 && (
                  <div className="lg:hidden border-t bg-background/70 backdrop-blur-md">
                    <button
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium"
                      onClick={() => setMobileResourcesOpen(o => !o)}
                      data-testid="button-mobile-resources-toggle"
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        {t("chat.resources")}
                        <Badge variant="secondary" className="text-xs ml-1">{resources.length}</Badge>
                      </span>
                      {mobileResourcesOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    {mobileResourcesOpen && (
                      <div className="max-h-52 overflow-y-auto px-3 pb-3 space-y-2">
                        {resources.map(resource => (
                          <div key={resource.id} data-testid={`mobile-resource-item-${resource.id}`}>
                            {resource.url ? (
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-2.5 rounded-md border bg-card/70 hover-elevate transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="shrink-0">
                                    {resource.type === "Scholarship" || resource.type === "Financial Aid" ? (
                                      <DollarSign className="w-3.5 h-3.5 text-primary" />
                                    ) : resource.type === "Program" ? (
                                      <GraduationCap className="w-3.5 h-3.5 text-primary" />
                                    ) : (
                                      <Heart className="w-3.5 h-3.5 text-primary" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1">
                                      <p className="text-xs font-semibold truncate">{resource.name}</p>
                                      <ExternalLink className="w-3 h-3 text-primary shrink-0" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">{resource.type}</p>
                                  </div>
                                </div>
                              </a>
                            ) : (
                              <div className="p-2.5 rounded-md border bg-card/70">
                                <div className="flex items-center gap-2">
                                  <div className="shrink-0">
                                    {resource.type === "Scholarship" || resource.type === "Financial Aid" ? (
                                      <DollarSign className="w-3.5 h-3.5 text-primary" />
                                    ) : (
                                      <Heart className="w-3.5 h-3.5 text-primary" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold truncate">{resource.name}</p>
                                    <p className="text-xs text-muted-foreground">{resource.type}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t bg-background/60 backdrop-blur-md px-4 py-3">
                  <div className="max-w-2xl mx-auto">
                    <div className="flex items-end gap-2">
                      <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t("chat.placeholder")}
                        className="min-h-[44px] max-h-[120px] resize-none text-sm"
                        rows={1}
                        disabled={isLoading}
                        data-testid="input-chat-message"
                      />
                      <Button
                        size="icon"
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || isLoading}
                        data-testid="button-send-message"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {t("chat.disclaimer")}{" "}
                      <Link href="/disclaimer" className="text-primary hover:underline" data-testid="link-chat-disclaimer">
                        {t("chat.disclaimerLink")}
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
