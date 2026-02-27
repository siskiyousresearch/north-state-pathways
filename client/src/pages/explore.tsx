import { useState, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { countyPaths, mapInstitutions, offMapInstitutions, SVG_WIDTH, SVG_HEIGHT } from "@/lib/map-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, MapPin, ExternalLink, GraduationCap,
  Globe, MessageCircle, School, Building2, Wifi, X, Filter, Trees
} from "lucide-react";

const markerIcons: Record<string, typeof School> = {
  college: School,
  university: GraduationCap,
  "county-office": Building2,
  online: Wifi,
};

const markerColors: Record<string, string> = {
  college: "#f59e0b",
  university: "#3b82f6",
  "county-office": "#8b5cf6",
  online: "#06b6d4",
};

interface ApiInstitution {
  id: number;
  name: string;
  type: string;
  county: string | null;
  website: string | null;
  description: string | null;
  programs: {
    id: number;
    name: string;
    level: string | null;
    pathway: string | null;
    pathwaySlug: string | null;
    url: string | null;
  }[];
}

type PathwayFilter = "all" | "healthcare" | "education";

export default function ExplorePage() {
  const { language, setLanguage, t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<PathwayFilter>("all");
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [hoveredInstitution, setHoveredInstitution] = useState<string | null>(null);
  const [hoveredCounty, setHoveredCounty] = useState<string | null>(null);

  const { data: apiInstitutions = [] } = useQuery<ApiInstitution[]>({
    queryKey: ["/api/map/institutions"],
  });

  const allMapInstitutions = useMemo(() => [...mapInstitutions, ...offMapInstitutions], []);

  const filteredInstitutions = useMemo(() => {
    return allMapInstitutions.filter(inst => {
      if (activeFilter === "all") return true;
      const apiInst = apiInstitutions.find(a => a.name === inst.name);
      if (!apiInst) return true;
      return apiInst.programs.some(p => p.pathwaySlug === activeFilter);
    });
  }, [activeFilter, apiInstitutions, allMapInstitutions]);

  const onMapInstitutions = useMemo(() => {
    return filteredInstitutions.filter(inst => mapInstitutions.some(m => m.name === inst.name));
  }, [filteredInstitutions]);

  const getApiData = useCallback((name: string) => apiInstitutions.find(a => a.name === name), [apiInstitutions]);

  const activeInst = selectedInstitution || hoveredInstitution;
  const activeApiData = activeInst ? getApiData(activeInst) : null;
  const activeMapData = activeInst ? allMapInstitutions.find(m => m.name === activeInst) : null;

  const filteredPrograms = useMemo(() => {
    if (!activeApiData) return [];
    if (activeFilter === "all") return activeApiData.programs;
    return activeApiData.programs.filter(p => p.pathwaySlug === activeFilter);
  }, [activeApiData, activeFilter]);

  const getCountyInstitutionCount = useCallback((countyName: string) => {
    return onMapInstitutions.filter(inst => inst.county === countyName).length;
  }, [onMapInstitutions]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="flex items-center justify-between gap-4 px-4 py-2.5 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
              <Trees className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight" data-testid="text-explore-title">{t("explore.title")}</h1>
              <p className="text-xs text-muted-foreground leading-tight hidden sm:block">{t("explore.subtitle")}</p>
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
              <span className="hidden sm:inline">{t("explore.startChat")}</span>
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:flex flex-col w-80 xl:w-96 border-r bg-background/95 backdrop-blur-sm z-10 overflow-hidden">
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{language === "en" ? "Filter by Pathway" : "Filtrar por Carrera"}</span>
            </div>
            <div className="flex gap-1.5">
              {(["all", "healthcare", "education"] as PathwayFilter[]).map(f => (
                <Button
                  key={f}
                  variant={activeFilter === f ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 flex-1"
                  onClick={() => setActiveFilter(f)}
                  data-testid={`button-filter-${f}`}
                >
                  {f === "all" ? t("explore.filterAll") : f === "healthcare" ? t("explore.filterHealthcare") : t("explore.filterEducation")}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredInstitutions.map(inst => {
              const api = getApiData(inst.name);
              const isActive = activeInst === inst.name;
              const Icon = markerIcons[inst.marker];
              const color = markerColors[inst.marker];
              const programCount = api ? (activeFilter === "all" ? api.programs.length : api.programs.filter(p => p.pathwaySlug === activeFilter).length) : 0;

              return (
                <Card
                  key={inst.name}
                  className={`p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isActive ? "border-primary bg-primary/5 shadow-md" : "hover:border-primary/30"
                  }`}
                  onClick={() => setSelectedInstitution(isActive ? null : inst.name)}
                  onMouseEnter={() => setHoveredInstitution(inst.name)}
                  onMouseLeave={() => setHoveredInstitution(null)}
                  data-testid={`card-institution-${inst.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-colors"
                      style={{ backgroundColor: isActive ? color : `${color}20`, color: isActive ? "white" : color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{inst.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {inst.county ? (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            <MapPin className="w-2.5 h-2.5 mr-0.5" />{inst.county}
                          </Badge>
                        ) : inst.marker === "online" ? (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            <Wifi className="w-2.5 h-2.5 mr-0.5" />{t("explore.online")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            {t("explore.outOfRegion")}
                          </Badge>
                        )}
                        {programCount > 0 && (
                          <span className="text-[10px] text-muted-foreground">{programCount} {t("explore.programs").toLowerCase()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isActive && api && (
                    <div className="mt-3 pt-2.5 border-t space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      {api.description && (
                        <p className="text-xs text-muted-foreground">{api.description}</p>
                      )}
                      {filteredPrograms.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">{t("explore.programs")}</p>
                          {filteredPrograms.map(prog => (
                            <div key={prog.id} className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-muted/50 text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <GraduationCap className="w-3 h-3 text-primary shrink-0" />
                                <span className="truncate">{prog.name}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {prog.level && <Badge variant="outline" className="text-[9px] h-3.5 px-1">{prog.level}</Badge>}
                                {prog.url && (
                                  <a href={prog.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                    <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">{t("explore.noPrograms")}</p>
                      )}
                      {api.website && (
                        <a
                          href={api.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          data-testid="link-visit-website"
                        >
                          <ExternalLink className="w-3 h-3" /> {t("explore.visitWebsite")}
                        </a>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-cyan-950/30">
          <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="bgTrees" x="0" y="0" width="200" height="180" patternUnits="userSpaceOnUse">
                <path d="M30 70 L20 50 L25 52 L18 35 L24 37 L22 25 L30 15 L38 25 L36 37 L42 35 L35 52 L40 50 L30 70Z" fill="currentColor" opacity="0.5" />
                <rect x="27" y="70" width="6" height="10" fill="currentColor" opacity="0.4" />

                <path d="M160 80 L152 65 L156 66 L150 52 L155 54 L153 44 L160 35 L167 44 L165 54 L170 52 L164 66 L168 65 L160 80Z" fill="currentColor" opacity="0.4" />
                <rect x="157" y="80" width="6" height="8" fill="currentColor" opacity="0.3" />

                <path d="M90 160 L65 130 L75 132 L60 105 L72 108 L68 90 L90 60 L112 90 L108 108 L120 105 L105 132 L115 130 L90 160Z" fill="currentColor" opacity="0.3" />
                <rect x="85" y="160" width="10" height="15" fill="currentColor" opacity="0.25" />

                <path d="M55 120 L48 108 L52 109 L46 98 L50 99 L55 88 L60 99 L64 98 L58 109 L62 108 L55 120Z" fill="currentColor" opacity="0.35" />
                <rect x="53" y="120" width="4" height="7" fill="currentColor" opacity="0.3" />

                <path d="M140 140 L130 125 L134 126 L128 115 L132 116 L140 105 L148 116 L152 115 L146 126 L150 125 L140 140Z" fill="currentColor" opacity="0.3" />
                <rect x="137" y="140" width="6" height="8" fill="currentColor" opacity="0.25" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bgTrees)" />
          </svg>
          
          <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
            <svg
              viewBox={`-10 -60 ${SVG_WIDTH + 20} ${SVG_HEIGHT + 70}`}
              className="w-full h-full max-w-[700px] max-h-full"
              style={{ filter: "drop-shadow(0 8px 30px rgba(0,0,0,0.12))" }}
              data-testid="svg-map"
              role="img"
              aria-label={language === "en" ? "Interactive map of North State California counties and educational institutions" : "Mapa interactivo de los condados del norte de California e instituciones educativas"}
            >
              <defs>
                <linearGradient id="mapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(152, 28%, 48%)" />
                  <stop offset="50%" stopColor="hsl(152, 30%, 40%)" />
                  <stop offset="100%" stopColor="hsl(155, 28%, 36%)" />
                </linearGradient>
                <linearGradient id="mapGradHover" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(152, 35%, 52%)" />
                  <stop offset="100%" stopColor="hsl(152, 35%, 44%)" />
                </linearGradient>
                <linearGradient id="mapGradActive" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(152, 38%, 56%)" />
                  <stop offset="100%" stopColor="hsl(152, 38%, 48%)" />
                </linearGradient>
                <filter id="countyGlow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feFlood floodColor="hsl(152, 50%, 50%)" floodOpacity="0.3" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="markerShadow">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3" />
                </filter>
                <filter id="tooltipShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                </filter>
              </defs>

              {countyPaths.map(county => {
                const isHovered = hoveredCounty === county.name;
                const hasActiveInst = activeInst
                  ? allMapInstitutions.find(m => m.name === activeInst)?.county === county.name
                  : false;
                const instCount = getCountyInstitutionCount(county.name);
                const isHighlighted = isHovered || hasActiveInst;

                return (
                  <g key={county.name}
                    onMouseEnter={() => setHoveredCounty(county.name)}
                    onMouseLeave={() => setHoveredCounty(null)}
                    onFocus={() => setHoveredCounty(county.name)}
                    onBlur={() => setHoveredCounty(null)}
                    className="cursor-pointer"
                    tabIndex={0}
                    role="button"
                    aria-label={`${county.name} County, ${instCount} ${instCount === 1 ? "institution" : "institutions"}`}
                  >
                    <path
                      d={county.path}
                      fill={hasActiveInst ? "url(#mapGradActive)" : isHovered ? "url(#mapGradHover)" : "url(#mapGrad)"}
                      stroke="hsl(152, 25%, 75%)"
                      strokeWidth="1"
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                      filter={isHighlighted ? "url(#countyGlow)" : undefined}
                      data-testid={`county-path-${county.name.toLowerCase()}`}
                    />
                    <text
                      x={county.labelX}
                      y={county.labelY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="pointer-events-none select-none"
                      fill="white"
                      fontSize="13"
                      fontWeight="700"
                      letterSpacing="2"
                      opacity={isHighlighted ? 1 : 0.6}
                      style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)", transition: "opacity 0.3s" }}
                    >
                      {county.name.toUpperCase()}
                    </text>
                    {isHovered && instCount > 0 && (
                      <text
                        x={county.labelX}
                        y={county.labelY + 15}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="pointer-events-none select-none animate-in fade-in duration-200"
                        fill="hsl(152, 30%, 85%)"
                        fontSize="8"
                      >
                        {instCount} {instCount === 1
                          ? (language === "en" ? "institution" : "institucion")
                          : (language === "en" ? "institutions" : "instituciones")}
                      </text>
                    )}
                  </g>
                );
              })}

              {onMapInstitutions.map(inst => {
                const isActive = activeInst === inst.name;
                const isHovered = hoveredInstitution === inst.name;
                const api = getApiData(inst.name);
                const color = markerColors[inst.marker];
                const highlighted = isActive || isHovered;

                const tooltipW = 160;
                const tooltipH = api && api.programs.length > 0 ? 46 : 32;
                let tooltipX = inst.x - tooltipW / 2;
                let tooltipY = inst.y - tooltipH - 14;
                if (tooltipX < 5) tooltipX = 5;
                if (tooltipX + tooltipW > SVG_WIDTH - 5) tooltipX = SVG_WIDTH - tooltipW - 5;
                if (tooltipY < 5) tooltipY = inst.y + 14;

                return (
                  <g
                    key={inst.name}
                    className="cursor-pointer"
                    onClick={() => setSelectedInstitution(isActive ? null : inst.name)}
                    onMouseEnter={() => setHoveredInstitution(inst.name)}
                    onMouseLeave={() => setHoveredInstitution(null)}
                    onFocus={() => setHoveredInstitution(inst.name)}
                    onBlur={() => setHoveredInstitution(null)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedInstitution(isActive ? null : inst.name); } }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${inst.name}, ${inst.type}${inst.county ? `, ${inst.county} County` : ""}${api ? `, ${api.programs.length} programs` : ""}`}
                    data-testid={`marker-${inst.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {isActive && (
                      <>
                        <circle cx={inst.x} cy={inst.y} r="18" fill={color} opacity="0.15">
                          <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
                        </circle>
                      </>
                    )}

                    <circle
                      cx={inst.x}
                      cy={inst.y}
                      r={highlighted ? 9 : 7}
                      fill={color}
                      stroke="white"
                      strokeWidth={highlighted ? 3 : 2.5}
                      className="transition-all duration-200"
                      filter="url(#markerShadow)"
                    />

                    {highlighted && (
                      <g className="animate-in fade-in zoom-in-95 duration-150">
                        <rect
                          x={tooltipX}
                          y={tooltipY}
                          width={tooltipW}
                          height={tooltipH}
                          rx="6"
                          fill="white"
                          filter="url(#tooltipShadow)"
                          opacity="0.97"
                        />
                        <rect
                          x={tooltipX}
                          y={tooltipY}
                          width={tooltipW}
                          height={tooltipH}
                          rx="6"
                          fill="none"
                          stroke="hsl(152, 30%, 85%)"
                          strokeWidth="0.5"
                        />
                        <circle
                          cx={tooltipX + 14}
                          cy={tooltipY + 14}
                          r="5"
                          fill={`${color}20`}
                        />
                        <circle
                          cx={tooltipX + 14}
                          cy={tooltipY + 14}
                          r="2.5"
                          fill={color}
                        />
                        <text
                          x={tooltipX + 24}
                          y={tooltipY + 12}
                          dominantBaseline="central"
                          fill="hsl(152, 40%, 15%)"
                          fontSize="7"
                          fontWeight="700"
                        >
                          {inst.name.length > 20 ? inst.name.slice(0, 20) + "..." : inst.name}
                        </text>
                        <text
                          x={tooltipX + 24}
                          y={tooltipY + 22}
                          dominantBaseline="central"
                          fill="hsl(152, 20%, 50%)"
                          fontSize="5.5"
                        >
                          {inst.type} {inst.county ? `\u2022 ${inst.county} County` : ""}
                        </text>
                        {api && api.programs.length > 0 && (
                          <text
                            x={tooltipX + 14}
                            y={tooltipY + 36}
                            dominantBaseline="central"
                            fill={color}
                            fontSize="6"
                            fontWeight="600"
                          >
                            {api.programs.length} {t("explore.programs").toLowerCase()} {language === "en" ? "available" : "disponibles"}
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                );
              })}

              <g transform="translate(12, -50)">
                <text x="0" y="0" fontSize="20" fontWeight="800" fill="hsl(152, 40%, 20%)" letterSpacing="0.5" dominantBaseline="hanging">
                  {language === "en" ? "North State California" : "Norte de California"}
                </text>
                <text x="0" y="26" fontSize="12" fill="hsl(152, 25%, 45%)" dominantBaseline="hanging">
                  {language === "en" ? `10 Counties \u2022 ${onMapInstitutions.length} Institutions` : `10 Condados \u2022 ${onMapInstitutions.length} Instituciones`}
                </text>
              </g>

              <g transform={`translate(${SVG_WIDTH - 170}, -55)`}>
                <rect x="0" y="0" width="155" height="68" rx="8" fill="white" opacity="0.92" />
                <rect x="0" y="0" width="155" height="68" rx="8" fill="none" stroke="hsl(152, 20%, 80%)" strokeWidth="0.5" />
                <text x="12" y="14" fontSize="9" fontWeight="700" fill="hsl(152, 30%, 30%)" dominantBaseline="central">
                  {language === "en" ? "LEGEND" : "LEYENDA"}
                </text>

                <circle cx="16" cy="30" r="5" fill="#f59e0b" stroke="white" strokeWidth="1.5" />
                <text x="28" y="31" fontSize="9" fill="hsl(152, 20%, 35%)" dominantBaseline="central">
                  {language === "en" ? "Community College" : "Colegio Comunitario"}
                </text>

                <circle cx="16" cy="44" r="5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
                <text x="28" y="45" fontSize="9" fill="hsl(152, 20%, 35%)" dominantBaseline="central">
                  {language === "en" ? "University" : "Universidad"}
                </text>

                <circle cx="16" cy="58" r="5" fill="#8b5cf6" stroke="white" strokeWidth="1.5" />
                <text x="28" y="59" fontSize="9" fill="hsl(152, 20%, 35%)" dominantBaseline="central">
                  {language === "en" ? "County Office of Ed." : "Oficina de Ed."}
                </text>
              </g>
            </svg>
          </div>

          <div className="absolute bottom-4 left-4 right-4 md:hidden z-30">
            {activeInst && activeApiData ? (
              <Card className="p-4 bg-background/95 backdrop-blur-md shadow-xl animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-bold" data-testid="text-mobile-inst-name">{activeInst}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {activeMapData?.county ? (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          <MapPin className="w-2.5 h-2.5 mr-0.5" />{activeMapData.county}
                        </Badge>
                      ) : activeMapData?.marker === "online" ? (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          <Wifi className="w-2.5 h-2.5 mr-0.5" />{t("explore.online")}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setSelectedInstitution(null)}
                    data-testid="button-close-mobile-card"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {filteredPrograms.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {filteredPrograms.slice(0, 4).map(prog => (
                      <div key={prog.id} className="flex items-center gap-1.5 text-xs">
                        <GraduationCap className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate">{prog.name}</span>
                        {prog.level && <Badge variant="outline" className="text-[9px] h-3.5 px-1 shrink-0">{prog.level}</Badge>}
                      </div>
                    ))}
                    {filteredPrograms.length > 4 && (
                      <p className="text-[10px] text-muted-foreground">+{filteredPrograms.length - 4} more</p>
                    )}
                  </div>
                )}
                {activeApiData.website && (
                  <a
                    href={activeApiData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    data-testid="link-mobile-visit-website"
                  >
                    <ExternalLink className="w-3 h-3" /> {t("explore.visitWebsite")}
                  </a>
                )}
              </Card>
            ) : (
              <div className="flex gap-1.5 justify-center">
                {(["all", "healthcare", "education"] as PathwayFilter[]).map(f => (
                  <Button
                    key={f}
                    variant={activeFilter === f ? "default" : "secondary"}
                    size="sm"
                    className="text-xs h-7 shadow-lg"
                    onClick={() => setActiveFilter(f)}
                    data-testid={`button-mobile-filter-${f}`}
                  >
                    {f === "all" ? t("explore.filterAll") : f === "healthcare" ? t("explore.filterHealthcare") : t("explore.filterEducation")}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
