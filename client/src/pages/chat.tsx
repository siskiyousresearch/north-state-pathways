import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Send, Sparkles, ArrowLeft,
  MapPin, User, Loader2, Bot, ChevronLeft,
  Stethoscope, School, Volume2, VolumeX,
  Home, Plane, HandHeart, DollarSign, Briefcase, Check, ArrowRight,
  ExternalLink, BookOpen, GraduationCap, Heart
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

const studentTypes = [
  {
    id: "high-school",
    label: "High School Student",
    description: "Currently attending high school"
  },
  {
    id: "hs-grad-no-college",
    label: "High School Graduate",
    description: "Graduated high school and have never attended college"
  },
  {
    id: "some-college",
    label: "Former or Current College Student",
    description: "Some college classes but no degree"
  },
  {
    id: "associates",
    label: "Associate's Degree Holder",
    description: "Have an associate's degree and would like to continue my education"
  },
  {
    id: "bachelors-seeking-masters",
    label: "College Graduate - Seeking Master's",
    description: "College graduate and would like to obtain a master's degree"
  },
  {
    id: "seeking-doctorate",
    label: "College Graduate - Seeking Doctorate",
    description: "College graduate and would like to obtain a doctorate"
  }
];

const supportOptions = [
  {
    id: "wraparound",
    icon: HandHeart,
    label: "Help to Be Successful",
    description: "Tutoring, counseling, mentoring, and other wraparound services"
  },
  {
    id: "financial",
    icon: DollarSign,
    label: "Financial Support",
    description: "Scholarships, grants, financial aid, and tuition assistance"
  },
  {
    id: "work-experience",
    icon: Briefcase,
    label: "Work Experience",
    description: "Internships, clinical placements, apprenticeships, and job shadows"
  }
];

const PATHWAY_WELCOME_SCRIPT = "Welcome to North State Pathways! I'm here to help you explore exciting career opportunities in Northern California. Let's start by choosing a career path that sparks your interest. Healthcare, or Education? The choice is yours!";

function getCountyScript(pathway: string): string {
  const field = pathway === "healthcare" ? "Healthcare" : "Education";
  const extras = pathway === "healthcare"
    ? "From nursing to medical technology, there are so many ways to make a difference in people's lives."
    : "From teaching to counseling, you can shape the future of our communities.";
  return `Excellent choice! ${field} is an incredibly rewarding field with amazing opportunities right here in the North State. ${extras} Now, which county do you call home? This helps me find programs and resources close to you.`;
}

function getStudentTypeScript(county: string): string {
  return `${county} County, great! There are wonderful institutions and programs in your area. Now tell me a little about yourself. Where are you in your education journey? Whether you're still in high school or already have a degree, there's a perfect path waiting for you.`;
}

function getStudyLocationScript(studentType: string): string {
  const label = studentTypes.find(s => s.id === studentType)?.label || "student";
  return `Perfect! As a ${label.toLowerCase()}, you have some exciting options ahead. Now here's an important question. Would you prefer to study close to home, or are you open to exploring programs a bit further away? Both are great options!`;
}

function getSupportNeedsScript(location: string): string {
  const pref = location === "local"
    ? "Studying locally is a smart move! You'll save on costs and stay connected to your community."
    : "Being open to travel really opens up your options! You'll have access to even more programs and opportunities.";
  return `${pref} One last thing before we chat. Are there any extra ways I can help support your journey? Think about things like tutoring, financial aid, or hands-on work experience. Pick as many as you'd like, or just hit Start Chatting to dive right in!`;
}

const ONBOARDING_VIDEOS: Record<string, string> = {
  pathway: "/videos/onboarding-step1-pathway.mp4",
  county: "/videos/onboarding-step2-county.mp4",
  "student-type": "/videos/onboarding-step3-student.mp4",
  "study-location": "/videos/onboarding-step4-location.mp4",
  "support-needs": "/videos/onboarding-step5-support.mp4",
};

type OnboardingStep = "pathway" | "county" | "student-type" | "study-location" | "support-needs" | "done";
const TOTAL_STEPS = 5;

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
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("pathway");
  const [selectedPathway, setSelectedPathway] = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [selectedStudentType, setSelectedStudentType] = useState<string | null>(null);
  const [studyLocation, setStudyLocation] = useState<string | null>(null);
  const [selectedSupports, setSelectedSupports] = useState<string[]>([]);

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const audioRequestIdRef = useRef(0);

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

  const playDynamicAudio = useCallback(async (script: string) => {
    if (!voiceEnabled) return;
    stopCurrentAudio();
    const requestId = ++audioRequestIdRef.current;
    setIsSpeaking(true);
    const result = await playTTSForText(script);
    if (requestId !== audioRequestIdRef.current) {
      if (result) {
        result.audio.pause();
        URL.revokeObjectURL(result.url);
      }
      return;
    }
    if (result) {
      currentAudioRef.current = result.audio;
      currentAudioUrlRef.current = result.url;
      result.audio.onended = () => { setIsSpeaking(false); currentAudioRef.current = null; };
    } else {
      setIsSpeaking(false);
    }
  }, [voiceEnabled, stopCurrentAudio]);

  useEffect(() => {
    playDynamicAudio(PATHWAY_WELCOME_SCRIPT);
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
        playTTSForText(lastMsg.content).then((result) => {
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
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
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

    try {
      const res = await fetch(`/api/chat/sessions/${sid}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
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
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: "I'm sorry, I encountered an error. Please try again.",
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handlePathwaySelect = (pathway: string) => {
    setSelectedPathway(pathway);
    setOnboardingStep("county");
    playDynamicAudio(getCountyScript(pathway));
  };

  const handleCountySelect = (county: string) => {
    setSelectedCounty(county);
    setOnboardingStep("student-type");
    playDynamicAudio(getStudentTypeScript(county));
  };

  const handleStudentTypeSelect = (typeId: string) => {
    setSelectedStudentType(typeId);
    stopCurrentAudio();
    setOnboardingStep("study-location");
    playDynamicAudio(getStudyLocationScript(typeId));
  };

  const handleStudyLocationSelect = (location: string) => {
    setStudyLocation(location);
    setOnboardingStep("support-needs");
    playDynamicAudio(getSupportNeedsScript(location));
  };

  const toggleSupport = (id: string) => {
    setSelectedSupports((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSupportsContinue = async () => {
    const st = studentTypes.find((s) => s.id === selectedStudentType);
    const pathwayLabel = selectedPathway === "healthcare" ? "Healthcare" : "Education";
    const locationPref = studyLocation === "local"
      ? "I prefer to study locally near where I live"
      : "I am open to traveling for my education";
    const supportNeeds = selectedSupports.length > 0
      ? `I'm also interested in: ${selectedSupports.map((s) => {
          const opt = supportOptions.find((o) => o.id === s);
          return opt?.label?.toLowerCase() || s;
        }).join(", ")}`
      : "";
    const introMessage = `I'm interested in ${pathwayLabel} career pathways. I live in ${selectedCounty} County. I am a ${st?.label?.toLowerCase()}${st?.description ? ` (${st?.description?.toLowerCase()})` : ""}. ${locationPref}. ${supportNeeds} What programs and opportunities are available for me?`;
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
      playDynamicAudio(PATHWAY_WELCOME_SCRIPT);
    } else if (onboardingStep === "student-type") {
      const pw = selectedPathway;
      setSelectedCounty(null);
      setOnboardingStep("county");
      if (pw) playDynamicAudio(getCountyScript(pw));
    } else if (onboardingStep === "study-location") {
      const county = selectedCounty;
      setSelectedStudentType(null);
      setOnboardingStep("student-type");
      if (county) playDynamicAudio(getStudentTypeScript(county));
    } else if (onboardingStep === "support-needs") {
      const st = selectedStudentType;
      setStudyLocation(null);
      setOnboardingStep("study-location");
      if (st) playDynamicAudio(getStudyLocationScript(st));
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
              <h1 className="text-sm font-bold leading-tight" data-testid="text-chat-title">Pathways Assistant</h1>
              <p className="text-xs text-muted-foreground leading-tight">North State Career Guide</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
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
              Speaking...
            </Badge>
          )}
          {sessionId && !isSpeaking && (
            <Badge variant="secondary" className="text-xs">
              Session Active
            </Badge>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto">
          {showOnboarding ? (
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
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                )}

                {onboardingStep === "pathway" && (
                  <div className="text-center animate-in fade-in duration-300">
                    <div className="w-full max-w-lg mx-auto mb-6 rounded-md overflow-hidden">
                      <video
                        src={ONBOARDING_VIDEOS["pathway"]}
                        className="w-full h-48 object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        data-testid="video-onboarding-pathway"
                      />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-welcome-heading">
                      Welcome to North State Pathways
                    </h2>
                    <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                      Let's find the right path for you. Which area interests you most?
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
                        <h3 className="font-semibold text-lg mb-1">Healthcare</h3>
                        <p className="text-sm text-muted-foreground">Nursing, EMS, Medical Assisting, and more</p>
                      </Card>
                      <Card
                        className="p-6 cursor-pointer hover-elevate active-elevate-2 text-center group"
                        onClick={() => handlePathwaySelect("education")}
                        data-testid="card-pathway-education"
                      >
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 dark:bg-primary/20 mx-auto mb-4">
                          <School className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Education</h3>
                        <p className="text-sm text-muted-foreground">Teaching, Administration, Counseling, and more</p>
                      </Card>
                    </div>
                  </div>
                )}

                {onboardingStep === "county" && (
                  <div className="text-center animate-in fade-in duration-300">
                    <div className="w-full max-w-xl mx-auto mb-6 rounded-md overflow-hidden">
                      <video
                        src={ONBOARDING_VIDEOS["county"]}
                        className="w-full h-48 object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        data-testid="video-onboarding-county"
                      />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2" data-testid="text-county-heading">
                      I want to work in{" "}
                      <span className="text-primary">
                        {selectedPathway === "healthcare" ? "Healthcare" : "Education"}
                      </span>{" "}
                      and I live in...
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      Select your county so we can find programs near you
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
                        src={ONBOARDING_VIDEOS["student-type"]}
                        className="w-full h-48 object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        data-testid="video-onboarding-student"
                      />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2" data-testid="text-student-type-heading">
                      I AM A...
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                      <Badge variant="secondary">
                        {selectedPathway === "healthcare" ? "Healthcare" : "Education"}
                      </Badge>
                      <Badge variant="secondary">
                        <MapPin className="w-3 h-3 mr-1" />{selectedCounty} County
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      Tell us about your education background
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                      {studentTypes.map((st) => (
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
                              <p className="text-sm font-semibold">{st.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{st.description}</p>
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
                        src={ONBOARDING_VIDEOS["study-location"]}
                        className="w-full h-48 object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        data-testid="video-onboarding-location"
                      />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2" data-testid="text-study-location-heading">
                      Where do you want to study?
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                      <Badge variant="secondary">
                        {selectedPathway === "healthcare" ? "Healthcare" : "Education"}
                      </Badge>
                      <Badge variant="secondary">
                        <MapPin className="w-3 h-3 mr-1" />{selectedCounty} County
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      Would you prefer to stay local or are you open to traveling?
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
                        <h3 className="font-semibold text-lg mb-1">Study Locally</h3>
                        <p className="text-sm text-muted-foreground">I want to study where I am</p>
                      </Card>
                      <Card
                        className="p-6 cursor-pointer hover-elevate active-elevate-2 text-center"
                        onClick={() => handleStudyLocationSelect("travel")}
                        data-testid="card-location-travel"
                      >
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4">
                          <Plane className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Open to Travel</h3>
                        <p className="text-sm text-muted-foreground">I am OK to travel for my education</p>
                      </Card>
                    </div>
                  </div>
                )}

                {onboardingStep === "support-needs" && (
                  <div className="text-center animate-in fade-in duration-300">
                    <div className="w-full max-w-lg mx-auto mb-6 rounded-md overflow-hidden">
                      <video
                        src={ONBOARDING_VIDEOS["support-needs"]}
                        className="w-full h-48 object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        data-testid="video-onboarding-support"
                      />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2" data-testid="text-support-needs-heading">
                      What else can we help with?
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                      <Badge variant="secondary">
                        {selectedPathway === "healthcare" ? "Healthcare" : "Education"}
                      </Badge>
                      <Badge variant="secondary">
                        <MapPin className="w-3 h-3 mr-1" />{selectedCounty} County
                      </Badge>
                      <Badge variant="secondary">
                        {studyLocation === "local" ? "Local" : "Open to Travel"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      Select any that apply, then continue
                    </p>
                    <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto mb-6">
                      {supportOptions.map((opt) => {
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
                                <p className="text-sm font-semibold">{opt.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
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
                      Start Chatting <ArrowRight className="w-4 h-4 ml-2" />
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
                    <h2 className="text-sm font-bold" data-testid="text-resources-title">Resources & Support</h2>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {selectedPathway === "healthcare" ? "Healthcare" : "Education"}
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
                    <p className="text-xs text-muted-foreground p-2">Loading resources...</p>
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
                                  <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 invisible group-hover:visible" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{resource.type}</p>
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
                    Visit <a href="https://northstatepathways.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">northstatepathways.org</a>
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
                              <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ul]:ml-1 [&>ul>li]:mb-1 [&_strong]:text-foreground" data-testid={`markdown-${msg.id}`}>
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            ) : (
                              msg.content
                            )
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span className="text-xs">Thinking...</span>
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

                <div className="border-t bg-background/60 backdrop-blur-md px-4 py-3">
                  <div className="max-w-2xl mx-auto">
                    <div className="flex items-end gap-2">
                      <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about education pathways, healthcare careers, scholarships..."
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
                      Powered by AI. Information is for guidance only — verify with institutions directly.
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
