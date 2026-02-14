import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Send, Sparkles, ArrowLeft,
  MapPin, User, Loader2, Bot, ChevronLeft,
  Stethoscope, School, Volume2, VolumeX
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

const ONBOARDING_AUDIO: Record<string, string> = {
  pathway: "/audio/welcome.mp3",
  county: "/audio/county.mp3",
  "student-type": "/audio/student-type.mp3",
};

type OnboardingStep = "pathway" | "county" | "student-type" | "done";

function playAudioFile(src: string) {
  try {
    const audio = new Audio(src);
    audio.play().catch(() => {});
    return audio;
  } catch { return null; }
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
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("pathway");
  const [selectedPathway, setSelectedPathway] = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);

  const stopCurrentAudio = useCallback(() => {
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

  const playOnboardingAudio = useCallback((step: OnboardingStep) => {
    if (!voiceEnabled) return;
    stopCurrentAudio();
    const src = ONBOARDING_AUDIO[step];
    if (!src) return;
    const audio = playAudioFile(src);
    if (audio) {
      currentAudioRef.current = audio;
      setIsSpeaking(true);
      audio.onended = () => { setIsSpeaking(false); currentAudioRef.current = null; };
    }
  }, [voiceEnabled, stopCurrentAudio]);

  useEffect(() => {
    playOnboardingAudio("pathway");
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
    playOnboardingAudio("county");
  };

  const handleCountySelect = (county: string) => {
    setSelectedCounty(county);
    setOnboardingStep("student-type");
    playOnboardingAudio("student-type");
  };

  const handleStudentTypeSelect = async (typeId: string) => {
    const st = studentTypes.find((s) => s.id === typeId);
    const pathwayLabel = selectedPathway === "healthcare" ? "Healthcare" : "Education";
    const introMessage = `I'm interested in ${pathwayLabel} career pathways. I live in ${selectedCounty} County. I am a ${st?.label?.toLowerCase()}${st?.description ? ` (${st?.description?.toLowerCase()})` : ""}. What programs and opportunities are available for me?`;
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
      playOnboardingAudio("pathway");
    } else if (onboardingStep === "student-type") {
      setSelectedCounty(null);
      setOnboardingStep("county");
      playOnboardingAudio("county");
    }
  };

  const hasMessages = messages.length > 0;
  const showOnboarding = onboardingStep !== "done";
  const stepNumber = onboardingStep === "pathway" ? 1 : onboardingStep === "county" ? 2 : 3;

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
                <div className="flex items-center justify-center gap-3 mb-6">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          s <= stepNumber
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                        data-testid={`step-indicator-${s}`}
                      >
                        {s}
                      </div>
                      {s < 3 && (
                        <div className={`w-12 h-0.5 ${s < stepNumber ? "bg-primary" : "bg-muted"}`} />
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
                      <img
                        src="/images/onboarding-pathway.jpg"
                        alt="Choose your career pathway"
                        className="w-full h-40 object-cover"
                        data-testid="img-onboarding-pathway"
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
                      <img
                        src="/images/onboarding-county.jpg"
                        alt="Northern California landscape"
                        className="w-full h-40 object-cover"
                        data-testid="img-onboarding-county"
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
                      <img
                        src="/images/onboarding-student.jpg"
                        alt="Students in a learning environment"
                        className="w-full h-40 object-cover"
                        data-testid="img-onboarding-student"
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
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
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
                    className={`max-w-[80%] rounded-md px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border"
                    }`}
                  >
                    {msg.content || (
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
          )}
        </div>
      </div>

      {(onboardingStep === "done" || hasMessages) && (
        <div className="border-t bg-background px-4 py-3">
          <div className="max-w-3xl mx-auto">
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
      )}
    </div>
  );
}
