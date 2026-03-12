import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, User, UserX, Map, ExternalLink, BookOpen } from "lucide-react";
import type { Contact } from "@shared/schema";

type Resource = {
  id: number;
  name: string;
  type: string;
  description: string | null;
  url: string | null;
  eligibility: string | null;
};

const AI_OPTOUT_KEY = "nsp-ai-opted-out";

export function useAIOptOut(): [boolean, (v: boolean) => void] {
  const [aiOptedOut, setAiOptedOut] = useState(() => {
    try {
      return sessionStorage.getItem(AI_OPTOUT_KEY) === "true";
    } catch {
      return false;
    }
  });
  const setOptOut = useCallback((v: boolean) => {
    setAiOptedOut(v);
    try {
      sessionStorage.setItem(AI_OPTOUT_KEY, String(v));
    } catch {}
  }, []);
  return [aiOptedOut, setOptOut];
}

interface AIActiveBadgeProps {
  aiOptedOut: boolean;
  onOptOutChange: (optedOut: boolean) => void;
  language: "en" | "es";
}

export function AIActiveBadge({ aiOptedOut, onOptOutChange, language }: AIActiveBadgeProps) {
  return (
    <div className="flex items-center gap-3" data-testid="ai-active-badge-container">
      {!aiOptedOut && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" data-testid="badge-ai-active">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs font-medium text-green-700 dark:text-green-300">
            {language === "en" ? "AI Active" : "IA Activa"}
          </span>
        </div>
      )}
      <label className="flex items-center gap-1.5 cursor-pointer" data-testid="toggle-ai-optout">
        <Switch
          checked={aiOptedOut}
          onCheckedChange={onOptOutChange}
          data-testid="switch-ai-optout"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {language === "en" ? "Opt out of AI" : "Desactivar IA"}
        </span>
      </label>
    </div>
  );
}

interface HumanCounselorPanelProps {
  language: "en" | "es";
}

export function HumanCounselorPanel({ language }: HumanCounselorPanelProps) {
  const { data: contactsList = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  return (
    <div className="space-y-4" data-testid="human-counselor-panel">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold" data-testid="text-counselor-heading">
            {language === "en" ? "Talk to a Human Counselor" : "Habla con un Consejero"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {language === "en"
              ? "Reach out to one of our counselors for personalized help."
              : "Comunícate con uno de nuestros consejeros para ayuda personalizada."}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-24 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : contactsList.length === 0 ? (
        <Card className="p-4" data-testid="card-no-contacts">
          <p className="text-sm text-muted-foreground text-center">
            {language === "en"
              ? "No counselor contacts available at this time. Please check back later."
              : "No hay contactos de consejeros disponibles en este momento. Por favor, vuelve más tarde."}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {contactsList.map(contact => (
            <Card key={contact.id} className="p-4" data-testid={`card-contact-${contact.id}`}>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-semibold" data-testid={`text-contact-name-${contact.id}`}>{contact.name}</p>
                  {contact.title && (
                    <p className="text-xs text-muted-foreground" data-testid={`text-contact-title-${contact.id}`}>{contact.title}</p>
                  )}
                  {contact.institution && (
                    <p className="text-xs text-muted-foreground" data-testid={`text-contact-institution-${contact.id}`}>{contact.institution}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      data-testid={`link-contact-phone-${contact.id}`}
                    >
                      <Phone className="w-3 h-3" />
                      {contact.phone}
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      data-testid={`link-contact-email-${contact.id}`}
                    >
                      <Mail className="w-3 h-3" />
                      {contact.email}
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface ChatAIOptOutFallbackProps {
  language: "en" | "es";
}

export function ChatAIOptOutFallback({ language }: ChatAIOptOutFallbackProps) {
  const { data: resourcesList = [], isLoading: resourcesLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  return (
    <div className="w-full h-full flex" data-testid="chat-ai-optout-fallback">
      {/* Left sidebar — Resources */}
      <aside className="w-72 shrink-0 border-r bg-muted/20 flex flex-col overflow-y-auto hidden md:flex" data-testid="optout-resources-section">
        <div className="p-4 border-b bg-background/80 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">
                {language === "en" ? "Available Resources" : "Recursos Disponibles"}
              </h3>
              <p className="text-xs text-muted-foreground leading-tight">
                {language === "en" ? "Access directly" : "Acceso directo"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-2 flex-1">
          {resourcesLoading ? (
            <>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </>
          ) : resourcesList.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4" data-testid="card-no-resources">
              {language === "en" ? "No resources available at this time." : "No hay recursos disponibles en este momento."}
            </p>
          ) : (
            resourcesList.map(resource => (
              <Card key={resource.id} className="p-3" data-testid={`card-resource-${resource.id}`}>
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-semibold leading-snug" data-testid={`text-resource-name-${resource.id}`}>{resource.name}</p>
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                        data-testid={`link-resource-url-${resource.id}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">{resource.type}</Badge>
                  {resource.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
                  )}
                  {resource.eligibility && (
                    <p className="text-xs text-muted-foreground italic line-clamp-1">{resource.eligibility}</p>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </aside>

      {/* Right main area — AI off notice + Counselors */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
          <Card className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
              <UserX className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold" data-testid="text-ai-off-heading">
                {language === "en" ? "AI Chat is Turned Off" : "El Chat de IA está Desactivado"}
              </h2>
              <p className="text-sm text-muted-foreground mt-2" data-testid="text-ai-off-description">
                {language === "en"
                  ? "You've opted out of AI-powered features. You can still explore programs and resources directly using our interactive map."
                  : "Has desactivado las funciones de IA. Aún puedes explorar programas y recursos directamente usando nuestro mapa interactivo."}
              </p>
            </div>
            <a href="/explore">
              <Button className="gap-2" data-testid="button-explore-map">
                <Map className="w-4 h-4" />
                {language === "en" ? "Explore the Map" : "Explorar el Mapa"}
              </Button>
            </a>
          </Card>

          {/* Resources visible on mobile (sidebar hidden on small screens) */}
          <div className="md:hidden space-y-3" data-testid="optout-resources-mobile">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-bold">
                {language === "en" ? "Available Resources" : "Recursos Disponibles"}
              </h3>
            </div>
            {resourcesLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {resourcesList.map(resource => (
                  <Card key={resource.id} className="p-3" data-testid={`card-resource-mobile-${resource.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold">{resource.name}</p>
                          <Badge variant="secondary" className="text-xs shrink-0">{resource.type}</Badge>
                        </div>
                        {resource.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{resource.description}</p>
                        )}
                      </div>
                      {resource.url && (
                        <a href={resource.url} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <ExternalLink className="w-3 h-3" />
                          {language === "en" ? "Visit" : "Visitar"}
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <HumanCounselorPanel language={language} />
        </div>
      </div>
    </div>
  );
}

interface AssessmentAIOptOutFallbackProps {
  language: "en" | "es";
}

export function AssessmentAIOptOutFallback({ language }: AssessmentAIOptOutFallbackProps) {
  return (
    <div className="space-y-6" data-testid="assessment-ai-optout-fallback">
      <Card className="p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
          <UserX className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-bold" data-testid="text-assessment-ai-off-heading">
            {language === "en" ? "AI Analysis is Turned Off" : "El Análisis de IA está Desactivado"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2" data-testid="text-assessment-ai-off-description">
            {language === "en"
              ? "You've opted out of AI-powered features. Career assessment results cannot be scored without AI analysis. Please contact a counselor for personalized career guidance."
              : "Has desactivado las funciones de IA. Los resultados de la evaluación de carrera no pueden ser procesados sin análisis de IA. Por favor, contacta a un consejero para orientación profesional personalizada."}
          </p>
        </div>
      </Card>

      <HumanCounselorPanel language={language} />
    </div>
  );
}
