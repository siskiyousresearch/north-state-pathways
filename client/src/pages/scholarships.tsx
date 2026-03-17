import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AIActiveBadge, useAIOptOut } from "@/components/ai-active-badge";
import {
  ArrowLeft,
  Bot,
  User,
  Loader2,
  ExternalLink,
  GraduationCap,
  Send,
  SkipForward,
  Globe,
  MapPin,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { Resource } from "@shared/schema";

const NORTH_STATE_COUNTIES = [
  "Butte", "Glenn", "Lassen", "Modoc", "Plumas",
  "Shasta", "Sierra", "Siskiyou", "Tehama", "Trinity",
];

interface Criterion {
  criterion: string;
  type: string;
  allValues: string[] | { min?: number; max?: number };
  scholarshipCount: number;
}

interface MatchResult {
  resource: Resource;
  score: number;
  matchedRules: string[];
  unmatchedRequired: string[];
  eligible: boolean;
}

type BubbleRole = "bot" | "user";

interface ChatBubble {
  id: number;
  role: BubbleRole;
  content: string;
}

type Phase = "county" | "questions" | "loading" | "results";

export default function ScholarshipsPage() {
  const { language, setLanguage, t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [aiOptedOut, setAiOptedOut] = useAIOptOut();

  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [phase, setPhase] = useState<Phase>("county");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [multiSelectValues, setMultiSelectValues] = useState<string[]>([]);
  const [rangeValue, setRangeValue] = useState("");
  const [textValue, setTextValue] = useState("");
  const [nextId, setNextId] = useState(1);

  const addBubble = useCallback(
    (role: BubbleRole, content: string) => {
      setBubbles((prev) => [...prev, { id: nextId, role, content }]);
      setNextId((n) => n + 1);
    },
    [nextId],
  );

  // Fetch criteria
  const { data: criteriaData, isLoading: criteriaLoading } = useQuery<{
    criteria: Criterion[];
  }>({
    queryKey: ["/api/scholarships/criteria"],
  });

  const criteria = criteriaData?.criteria ?? [];

  // Add welcome bubble + county question on mount
  useEffect(() => {
    if (bubbles.length === 0) {
      setBubbles([
        { id: 1, role: "bot", content: t("scholarships.welcome") },
        { id: 2, role: "bot", content: t("scholarships.countyQuestion") },
      ]);
      setNextId(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ask next question when criteria loads or question index changes
  useEffect(() => {
    if (phase !== "questions") return;

    // If no criteria exist at all OR we've exhausted all questions, go straight to results
    if (!criteriaLoading && criteria.length === 0) {
      fetchResults(answers);
      return;
    }
    if (criteria.length > 0 && currentQuestionIndex >= criteria.length) {
      fetchResults(answers);
      return;
    }

    if (criteria.length > 0 && currentQuestionIndex < criteria.length) {
      const criterion = criteria[currentQuestionIndex];
      // Skip "County of Residence" criterion since we already asked
      if (criterion.criterion.toLowerCase().includes("county")) {
        setCurrentQuestionIndex((i) => i + 1);
        return;
      }
      setBubbles((prev) => {
        const questionText = formatQuestionText(criterion);
        const lastBot = [...prev].reverse().find((b) => b.role === "bot");
        if (lastBot && lastBot.content === questionText) return prev;
        return [
          ...prev,
          { id: nextId, role: "bot" as BubbleRole, content: questionText },
        ];
      });
      setNextId((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria.length, criteriaLoading, currentQuestionIndex, phase]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles, phase, results]);

  function formatQuestionText(criterion: Criterion): string {
    const label = criterion.criterion
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const suffix = language === "es"
      ? `(${criterion.scholarshipCount} becas usan esto)`
      : `(${criterion.scholarshipCount} scholarship${criterion.scholarshipCount !== 1 ? "s" : ""} use this)`;
    const prefix = language === "es" ? "¿Cuál es tu" : "What is your";
    return `${prefix} ${label.toLowerCase()}? ${suffix}`;
  }

  function handleCountySelect(county: string) {
    addBubble("user", `${county} County`);
    setAnswers((prev) => ({ ...prev, "County of Residence": `${county} County` }));
    setPhase("questions");
  }

  function handleCountySkip() {
    addBubble("user", t("scholarships.skip"));
    setPhase("questions");
  }

  function advanceToNext(answerDisplay: string, answerValue: unknown) {
    const criterion = criteria[currentQuestionIndex];
    addBubble("user", answerDisplay);
    setAnswers((prev) => ({ ...prev, [criterion.criterion]: answerValue }));
    setMultiSelectValues([]);
    setRangeValue("");
    setTextValue("");
    setCurrentQuestionIndex((i) => i + 1);
  }

  function handleSkip() {
    addBubble("user", t("scholarships.skip"));
    setMultiSelectValues([]);
    setRangeValue("");
    setTextValue("");
    setCurrentQuestionIndex((i) => i + 1);
  }

  async function fetchResults(finalAnswers?: Record<string, unknown>) {
    setPhase("loading");
    addBubble("bot", t("scholarships.answering"));
    try {
      const res = await apiRequest("POST", "/api/scholarships/match", {
        criteria: finalAnswers ?? answers,
      });
      const data: MatchResult[] = await res.json();
      setResults(data);
      setPhase("results");
    } catch {
      setResults([]);
      setPhase("results");
    }
  }

  function handleSeeResultsSoFar() {
    fetchResults(answers);
  }

  function handleStartOver() {
    setBubbles([
      { id: 1, role: "bot", content: t("scholarships.welcome") },
      { id: 2, role: "bot", content: t("scholarships.countyQuestion") },
    ]);
    setNextId(3);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setPhase("county");
    setResults([]);
    setMultiSelectValues([]);
    setRangeValue("");
    setTextValue("");
  }

  function getScoreColor(score: number): string {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-gray-400";
  }

  function getScoreVariant(
    score: number,
  ): "default" | "secondary" | "outline" {
    if (score >= 70) return "default";
    if (score >= 40) return "secondary";
    return "outline";
  }

  const currentCriterion =
    phase === "questions" && currentQuestionIndex < criteria.length
      ? criteria[currentQuestionIndex]
      : null;

  // Don't show "County of Residence" criterion since we handle it separately
  const effectiveCriterion = currentCriterion && currentCriterion.criterion.toLowerCase().includes("county")
    ? null
    : currentCriterion;

  const showSeeResults =
    phase === "questions" && currentQuestionIndex >= 3 && criteria.length > 0;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header — matches chat page */}
      <header className="flex items-center justify-between gap-4 px-4 py-2.5 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">{t("scholarships.title")}</h1>
              <p className="text-xs text-muted-foreground leading-tight">{t("scholarships.subtitle")}</p>
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
          >
            <Globe className="w-3.5 h-3.5" />
            {language === "en" ? "ES" : "EN"}
          </Button>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="space-y-4">
              {bubbles.map((bubble) => (
                <div
                  key={bubble.id}
                  className={`flex gap-3 ${bubble.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {bubble.role === "bot" && (
                    <Avatar className="w-8 h-8 shrink-0 mt-1">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      bubble.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted/60 border rounded-bl-md"
                    }`}
                  >
                    {bubble.content}
                  </div>
                  {bubble.role === "user" && (
                    <Avatar className="w-8 h-8 shrink-0 mt-1">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {/* Loading state */}
              {(criteriaLoading || phase === "loading") && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="w-8 h-8 shrink-0 mt-1">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/60 border rounded-2xl rounded-bl-md px-4 py-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs">{t("scholarships.answering")}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* No criteria message — only show if loaded and empty and we're in county phase still */}
              {!criteriaLoading && criteria.length === 0 && phase === "county" && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="w-8 h-8 shrink-0 mt-1">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/60 border rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed">
                    {t("scholarships.noCriteria")}
                  </div>
                </div>
              )}

              {/* Results */}
              {phase === "results" && (
                <div className="space-y-4">
                  <div className="flex gap-3 justify-start">
                    <Avatar className="w-8 h-8 shrink-0 mt-1">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted/60 border rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed">
                      {results.length > 0
                        ? language === "es"
                          ? `${t("scholarships.results")}: ${results.length} beca${results.length !== 1 ? "s" : ""} encontrada${results.length !== 1 ? "s" : ""}.`
                          : `${t("scholarships.results")}: ${results.length} scholarship${results.length !== 1 ? "s" : ""} found.`
                        : t("scholarships.noResults")}
                    </div>
                  </div>

                  {results.map((match) => (
                    <Card
                      key={match.resource.id}
                      className="p-4 ml-11 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                          <h3 className="font-semibold text-sm leading-tight">
                            {match.resource.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant={match.eligible ? "default" : "outline"}
                            className={`text-[10px] ${match.eligible ? "bg-green-600" : ""}`}
                          >
                            {match.eligible ? t("scholarships.eligible") : t("scholarships.notEligible")}
                          </Badge>
                          <Badge
                            variant={getScoreVariant(match.score)}
                            className="shrink-0"
                          >
                            <span
                              className={`inline-block w-2 h-2 rounded-full mr-1.5 ${getScoreColor(match.score)}`}
                            />
                            {t("scholarships.matchScore")}{" "}
                            {match.score}%
                          </Badge>
                        </div>
                      </div>

                      {match.resource.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {match.resource.description}
                        </p>
                      )}

                      {match.resource.eligibility && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {language === "es" ? "Elegibilidad:" : "Eligibility:"}
                          </span>{" "}
                          {match.resource.eligibility}
                        </p>
                      )}

                      {match.matchedRules.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {match.matchedRules.map((rule) => (
                            <Badge
                              key={rule}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {t("scholarships.matched")}: {rule}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {match.resource.url && (
                        <a
                          href={match.resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="outline" className="gap-1.5">
                            {t("scholarships.apply")}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      )}
                    </Card>
                  ))}

                  <div className="flex justify-center pt-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleStartOver}>
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t("scholarships.startOver")}
                    </Button>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>
        </div>
      </div>

      {/* County selection phase */}
      {phase === "county" && (
        <div className="border-t bg-background/95 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-4 py-3 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {NORTH_STATE_COUNTIES.map((county) => (
                <Button
                  key={county}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 justify-start"
                  onClick={() => handleCountySelect(county)}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {county}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1"
              onClick={handleCountySkip}
            >
              <SkipForward className="w-3.5 h-3.5" />
              {t("scholarships.skip")}
            </Button>
          </div>
        </div>
      )}

      {/* Dynamic criteria questions phase */}
      {phase === "questions" && effectiveCriterion && !criteriaLoading && (
        <div className="border-t bg-background/95 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-4 py-3 space-y-3">
            {/* Select: button pills */}
            {effectiveCriterion.type === "select" &&
              Array.isArray(effectiveCriterion.allValues) && (
                <div className="flex flex-wrap gap-2">
                  {(effectiveCriterion.allValues as string[]).map((val) => (
                    <Button
                      key={val}
                      variant="outline"
                      size="sm"
                      onClick={() => advanceToNext(val, val)}
                    >
                      {val}
                    </Button>
                  ))}
                </div>
              )}

            {/* Multiselect: checkbox pills + continue */}
            {effectiveCriterion.type === "multiselect" &&
              Array.isArray(effectiveCriterion.allValues) && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {(effectiveCriterion.allValues as string[]).map((val) => {
                      const checked = multiSelectValues.includes(val);
                      return (
                        <button
                          key={val}
                          onClick={() =>
                            setMultiSelectValues((prev) =>
                              checked
                                ? prev.filter((v) => v !== val)
                                : [...prev, val],
                            )
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                            checked
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            className="w-3.5 h-3.5"
                            tabIndex={-1}
                          />
                          {val}
                        </button>
                      );
                    })}
                  </div>
                  {multiSelectValues.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() =>
                        advanceToNext(
                          multiSelectValues.join(", "),
                          multiSelectValues,
                        )
                      }
                    >
                      {t("scholarships.continue")}
                    </Button>
                  )}
                </div>
              )}

            {/* Range: number input */}
            {effectiveCriterion.type === "range" && (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (rangeValue.trim()) {
                    advanceToNext(rangeValue, Number(rangeValue));
                  }
                }}
              >
                <Input
                  type="number"
                  step="0.01"
                  value={rangeValue}
                  onChange={(e) => setRangeValue(e.target.value)}
                  placeholder={
                    !Array.isArray(effectiveCriterion.allValues)
                      ? `${effectiveCriterion.allValues.min ?? ""} - ${effectiveCriterion.allValues.max ?? ""}`
                      : ""
                  }
                  className="flex-1"
                  min={
                    !Array.isArray(effectiveCriterion.allValues)
                      ? effectiveCriterion.allValues.min
                      : undefined
                  }
                  max={
                    !Array.isArray(effectiveCriterion.allValues)
                      ? effectiveCriterion.allValues.max
                      : undefined
                  }
                />
                <Button type="submit" size="icon" disabled={!rangeValue.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            )}

            {/* Boolean: Yes/No */}
            {effectiveCriterion.type === "boolean" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => advanceToNext(language === "es" ? "Sí" : "Yes", true)}
                >
                  {language === "es" ? "Sí" : "Yes"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => advanceToNext("No", false)}
                >
                  No
                </Button>
              </div>
            )}

            {/* Text: free text input */}
            {effectiveCriterion.type === "text" && (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (textValue.trim()) {
                    advanceToNext(textValue, textValue);
                  }
                }}
              >
                <Input
                  type="text"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder={language === "es" ? "Escribe tu respuesta..." : "Type your answer..."}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!textValue.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            )}

            {/* Skip + See Results */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1"
                onClick={handleSkip}
              >
                <SkipForward className="w-3.5 h-3.5" />
                {t("scholarships.skip")}
              </Button>
              {showSeeResults && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSeeResultsSoFar}
                >
                  {t("scholarships.seeResults")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer footer — matches chat page */}
      <div className="border-t bg-background/95 backdrop-blur-md px-4 py-2">
        <p className="text-xs text-muted-foreground text-center max-w-3xl mx-auto">
          {t("chat.disclaimer")}{" "}
          <Link href="/disclaimer" className="text-primary hover:underline">
            {t("chat.disclaimerLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
