import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { mapCounties, mapInstitutions } from "@/lib/map-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, ArrowLeft, MapPin, ExternalLink, GraduationCap,
  Globe, MessageCircle, School, Building2, Wifi, X, Filter
} from "lucide-react";

const markerImages: Record<string, string> = {
  college: "/images/marker-college.png",
  university: "/images/marker-university.png",
  "county-office": "/images/marker-county-office.png",
  online: "/images/marker-online.png",
};

const markerIcons: Record<string, typeof School> = {
  college: School,
  university: GraduationCap,
  "county-office": Building2,
  online: Wifi,
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

  const { data: apiInstitutions = [] } = useQuery<ApiInstitution[]>({
    queryKey: ["/api/map/institutions"],
  });

  const filteredInstitutions = useMemo(() => {
    return mapInstitutions.filter(inst => {
      if (activeFilter === "all") return true;
      const apiInst = apiInstitutions.find(a => a.name === inst.name);
      if (!apiInst) return true;
      return apiInst.programs.some(p => p.pathwaySlug === activeFilter);
    });
  }, [activeFilter, apiInstitutions]);

  const getApiData = (name: string) => apiInstitutions.find(a => a.name === name);

  const activeInst = selectedInstitution || hoveredInstitution;
  const activeApiData = activeInst ? getApiData(activeInst) : null;
  const activeMapData = activeInst ? mapInstitutions.find(m => m.name === activeInst) : null;

  const filteredPrograms = useMemo(() => {
    if (!activeApiData) return [];
    if (activeFilter === "all") return activeApiData.programs;
    return activeApiData.programs.filter(p => p.pathwaySlug === activeFilter);
  }, [activeApiData, activeFilter]);

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
              <Sparkles className="w-4 h-4 text-primary-foreground" />
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
              <span className="text-xs font-medium text-muted-foreground">{t("explore.filterAll").split(" ")[0]}</span>
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
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-colors ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}>
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

        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="/images/map-background.png"
              alt="North State California illustrated map"
              className="w-full h-full object-cover"
              data-testid="img-map-background"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/20" />
          </div>

          {mapCounties.map(county => (
            <div
              key={county.name}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
              style={{ left: `${county.x}%`, top: `${county.y}%` }}
            >
              <span className="text-[10px] sm:text-xs font-bold text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide uppercase">
                {county.name}
              </span>
            </div>
          ))}

          {filteredInstitutions.map(inst => {
            const isActive = activeInst === inst.name;
            const isHovered = hoveredInstitution === inst.name;
            const api = getApiData(inst.name);

            return (
              <div
                key={inst.name}
                className="absolute transform -translate-x-1/2 -translate-y-full group"
                style={{
                  left: `${inst.x}%`,
                  top: `${inst.y}%`,
                  zIndex: isActive ? 40 : isHovered ? 30 : 20,
                }}
              >
                <div
                  className={`relative cursor-pointer transition-all duration-300 ${
                    isActive ? "scale-150" : isHovered ? "scale-125" : "scale-100 hover:scale-125"
                  }`}
                  onClick={() => setSelectedInstitution(isActive ? null : inst.name)}
                  onMouseEnter={() => setHoveredInstitution(inst.name)}
                  onMouseLeave={() => setHoveredInstitution(null)}
                  data-testid={`marker-${inst.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <img
                    src={markerImages[inst.marker]}
                    alt={inst.name}
                    className={`w-8 h-8 sm:w-10 sm:h-10 drop-shadow-lg transition-all duration-300 ${
                      isActive ? "drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]" : ""
                    }`}
                  />

                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap transition-all duration-200 ${
                    isActive || isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
                  }`}>
                    <div className="bg-background/95 backdrop-blur-sm border rounded-md shadow-lg px-2.5 py-1.5 text-center">
                      <p className="text-xs font-bold">{inst.name}</p>
                      {inst.county && (
                        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />{inst.county} {t("explore.county")}
                        </p>
                      )}
                      {api && api.programs.length > 0 && (
                        <p className="text-[10px] text-primary font-medium">{api.programs.length} {t("explore.programs").toLowerCase()}</p>
                      )}
                    </div>
                  </div>
                </div>

                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary/40 animate-ping" />
                )}
              </div>
            );
          })}

          <div className="absolute bottom-4 left-4 right-4 md:hidden z-30">
            {activeInst && activeApiData ? (
              <Card className="p-4 bg-background/95 backdrop-blur-md shadow-xl animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-bold">{activeInst}</h3>
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
