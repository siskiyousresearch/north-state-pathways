import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Sparkles, AlertTriangle, CheckCircle2,
  Users, ShieldCheck, MessageCircle, Globe, ExternalLink
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function DisclaimerPage() {
  const { language, setLanguage, t } = useLanguage();

  const sections = [
    {
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      titleKey: "disclaimer.limitsTitle",
      bodyKey: "disclaimer.limitsBody",
    },
    {
      icon: CheckCircle2,
      color: "text-primary",
      bg: "bg-primary/5",
      border: "border-primary/20",
      titleKey: "disclaimer.verifyTitle",
      bodyKey: "disclaimer.verifyBody",
    },
    {
      icon: ShieldCheck,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      titleKey: "disclaimer.dataTitle",
      bodyKey: "disclaimer.dataBody",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight">{t("nav.title")}</h1>
                <p className="text-xs text-muted-foreground leading-tight">{t("disclaimer.badge")}</p>
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === "en" ? "es" : "en")}
              data-testid="button-language-toggle"
              className="gap-1.5"
            >
              <Globe className="w-3.5 h-3.5" />
              {language === "en" ? "ES" : "EN"}
            </Button>
          </nav>
        </div>
      </header>

      <div className="pt-16">
        <section className="py-16 px-6 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <Badge variant="secondary" className="text-xs font-medium">{t("disclaimer.badge")}</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-disclaimer-title">
              {t("disclaimer.title")}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed" data-testid="text-disclaimer-subtitle">
              {t("disclaimer.subtitle")}
            </p>
          </div>
        </section>

        <section className="py-12 px-6">
          <div className="max-w-3xl mx-auto space-y-5">
            {sections.map(({ icon: Icon, color, bg, border, titleKey, bodyKey }) => (
              <Card key={titleKey} className={`p-6 border ${border} ${bg}`} data-testid={`card-disclaimer-${titleKey.split(".")[1]}`}>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-0.5">
                    <Icon className={`w-6 h-6 ${color}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold mb-2">{t(titleKey)}</h2>
                    <p className="text-muted-foreground leading-relaxed">{t(bodyKey)}</p>
                  </div>
                </div>
              </Card>
            ))}

            <Card className="p-6 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30" data-testid="card-disclaimer-human-help">
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-2">{t("disclaimer.humanHelpTitle")}</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">{t("disclaimer.humanHelpBody")}</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground leading-relaxed">
                        {language === "en" ? (
                          <>
                            <strong className="text-foreground">SCAILE (North State Pathways team)</strong> — visit{" "}
                            <a
                              href="https://northstatepathways.org"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-0.5"
                              data-testid="link-scaile-contact"
                            >
                              northstatepathways.org
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </a>{" "}
                            for contact information and regional support resources.
                          </>
                        ) : (
                          <>
                            <strong className="text-foreground">SCAILE (equipo de North State Pathways)</strong> — visita{" "}
                            <a
                              href="https://northstatepathways.org"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-0.5"
                              data-testid="link-scaile-contact"
                            >
                              northstatepathways.org
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </a>{" "}
                            para obtener información de contacto y recursos de apoyo regional.
                          </>
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">
                          {language === "en" ? "Institution counselors & admissions offices" : "Consejeros e oficinas de admisiones"}
                        </strong>
                        {language === "en"
                          ? " — each college and university listed on this platform has dedicated staff ready to answer your questions about programs, requirements, and support services."
                          : " — cada colegio y universidad listado en esta plataforma tiene personal dedicado listo para responder tus preguntas sobre programas, requisitos y servicios de apoyo."}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="py-12 px-6 bg-primary text-primary-foreground">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-3">
              {language === "en" ? "Ready to explore your options?" : "¿Listo para explorar tus opciones?"}
            </h2>
            <p className="text-primary-foreground/80 mb-6">
              {language === "en"
                ? "Use our AI assistant as a helpful guide — then connect with real advisors to confirm your path."
                : "Usa nuestro asistente de IA como guía — luego conéctate con asesores reales para confirmar tu camino."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/">
                <Button variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-2" data-testid="button-back-home-cta">
                  <ArrowLeft className="w-4 h-4" />
                  {t("disclaimer.backHome")}
                </Button>
              </Link>
              <Link href="/chat">
                <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2" data-testid="button-start-chat-cta">
                  <MessageCircle className="w-4 h-4" />
                  {t("disclaimer.startChat")}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <footer className="py-8 px-6 border-t">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">{t("nav.title")}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t("landing.footer")}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
