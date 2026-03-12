import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, GraduationCap, Heart, MapPin, ArrowRight, Sparkles, Users, BookOpen, Globe, Shield, UserCheck, Lock, Scale, Bell, ShieldCheck, ExternalLink } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
const heroImg = "/images/hero-landscape.png";

const counties = [
  "Butte", "Glenn", "Lassen", "Modoc", "Plumas",
  "Shasta", "Sierra", "Siskiyou", "Tehama", "Trinity"
];

const featureIcons = [MessageCircle, GraduationCap, Heart, MapPin];
const featureKeys = [
  { title: "landing.feat1Title", desc: "landing.feat1Desc" },
  { title: "landing.feat2Title", desc: "landing.feat2Desc" },
  { title: "landing.feat3Title", desc: "landing.feat3Desc" },
  { title: "landing.feat4Title", desc: "landing.feat4Desc" },
];

const humansPrinciples = [
  { letter: "H", icon: UserCheck, title: "landing.humansH", desc: "landing.humansHDesc" },
  { letter: "U", icon: Users, title: "landing.humansU", desc: "landing.humansUDesc" },
  { letter: "M", icon: Lock, title: "landing.humansM", desc: "landing.humansMDesc" },
  { letter: "A", icon: Scale, title: "landing.humansA", desc: "landing.humansADesc" },
  { letter: "N", icon: Bell, title: "landing.humansN", desc: "landing.humansNDesc" },
  { letter: "S", icon: ShieldCheck, title: "landing.humansS", desc: "landing.humansSDesc" },
];

export default function LandingPage() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight" data-testid="text-brand-name">{t("nav.title")}</h1>
              <p className="text-xs text-muted-foreground leading-tight">{t("nav.aiAssistant")}</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === "en" ? "es" : "en")}
              data-testid="button-language-toggle"
            >
              <Globe className="w-4 h-4 mr-1" />
              {language === "en" ? "ES" : "EN"}
            </Button>
            <Link href="/about">
              <Button variant="ghost" data-testid="button-about-link">{t("nav.about")}</Button>
            </Link>
            <Link href="/explore">
              <Button variant="ghost" data-testid="button-explore-link">{t("nav.explore")}</Button>
            </Link>
            <Link href="/chat">
              <Button data-testid="button-start-chat-header">{t("nav.startExploring")}</Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost" data-testid="button-admin-link">{t("nav.admin")}</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative pt-16 overflow-hidden">
        <div className="relative h-[520px] md:h-[600px]">
          <img
            src={heroImg}
            alt="North State California landscape"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
            <Badge variant="secondary" className="mb-4 bg-white/15 text-white border-white/20 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1" /> {t("landing.badge")}
            </Badge>
            <h2
              className="text-3xl md:text-5xl lg:text-6xl font-bold text-white max-w-4xl leading-tight mb-4"
              data-testid="text-hero-title"
            >
              {t("landing.heroTitle")}
            </h2>
            <p className="text-base md:text-lg text-white/80 max-w-2xl mb-8 leading-relaxed">
              {t("landing.heroDesc")}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link href="/chat">
                <Button size="lg" variant="outline" className="text-white border-white/30 backdrop-blur-sm bg-white/10" data-testid="button-start-chat-hero">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  {t("landing.talkToAI")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-features-heading">{t("landing.howWeHelp")}</h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("landing.howWeHelpDesc")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {featureKeys.map((feature, i) => {
              const Icon = featureIcons[i];
              return (
                <Card key={i} className="p-5 hover-elevate" data-testid={`card-feature-${i}`}>
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-2">{t(feature.title)}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(feature.desc)}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative py-16 px-6 bg-muted/50 overflow-hidden" data-testid="section-humans-principles">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="circuit-bg" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
              <line x1="0" y1="60" x2="45" y2="60" stroke="hsl(152,45%,32%)" strokeWidth="0.8"/>
              <line x1="75" y1="60" x2="120" y2="60" stroke="hsl(152,45%,32%)" strokeWidth="0.8"/>
              <line x1="60" y1="0" x2="60" y2="45" stroke="hsl(152,45%,32%)" strokeWidth="0.8"/>
              <line x1="60" y1="75" x2="60" y2="120" stroke="hsl(152,45%,32%)" strokeWidth="0.8"/>
              <rect x="45" y="52" width="30" height="16" rx="3" fill="none" stroke="hsl(152,45%,32%)" strokeWidth="0.7"/>
              <circle cx="60" cy="60" r="3" fill="hsl(152,45%,32%)"/>
              <line x1="0" y1="20" x2="20" y2="20" stroke="hsl(152,45%,32%)" strokeWidth="0.6"/>
              <line x1="20" y1="20" x2="20" y2="40" stroke="hsl(152,45%,32%)" strokeWidth="0.6"/>
              <circle cx="20" cy="20" r="1.8" fill="hsl(152,45%,32%)"/>
              <circle cx="20" cy="40" r="1.8" fill="hsl(152,45%,32%)"/>
              <line x1="100" y1="80" x2="120" y2="80" stroke="hsl(152,45%,32%)" strokeWidth="0.6"/>
              <line x1="100" y1="80" x2="100" y2="100" stroke="hsl(152,45%,32%)" strokeWidth="0.6"/>
              <circle cx="100" cy="80" r="1.8" fill="hsl(152,45%,32%)"/>
              <circle cx="100" cy="100" r="1.8" fill="hsl(152,45%,32%)"/>
              <line x1="0" y1="95" x2="15" y2="95" stroke="hsl(152,45%,32%)" strokeWidth="0.5"/>
              <line x1="105" y1="5" x2="120" y2="5" stroke="hsl(152,45%,32%)" strokeWidth="0.5"/>
              <rect x="14" y="92" width="6" height="6" rx="1" fill="none" stroke="hsl(152,45%,32%)" strokeWidth="0.5"/>
              <rect x="100" y="2" width="6" height="6" rx="1" fill="none" stroke="hsl(152,45%,32%)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit-bg)" opacity="0.07"/>
        </svg>
        <div className="absolute inset-0 pointer-events-none" style={{background: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 20%, hsl(var(--muted) / 0.55) 100%)"}} aria-hidden="true"/>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Shield className="w-6 h-6 text-primary" />
              <Badge variant="secondary" className="text-xs font-medium">HUMANS</Badge>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-humans-heading">{t("landing.humansTitle")}</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed" data-testid="text-humans-desc">
              {t("landing.humansDesc")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {humansPrinciples.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.letter} className="p-5 hover-elevate" data-testid={`card-humans-${p.letter.toLowerCase()}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
                      <span className="text-sm font-bold text-primary">{p.letter}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <h4 className="font-semibold text-sm">{t(p.title)}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t(p.desc)}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <p className="text-xs text-muted-foreground mb-2" data-testid="text-humans-attribution">{t("landing.humansAttribution")}</p>
            <a
              href="https://ai.cccco.edu/guidance-and-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
              data-testid="link-humans-learn-more"
              aria-label={`${t("landing.humansLearnMore")} — HUMANS framework (opens in new tab)`}
            >
              {t("landing.humansLearnMore")}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-counties-heading">{t("landing.servingRegion")}</h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("landing.servingRegionDesc")}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {counties.map((county) => (
              <Badge key={county} variant="secondary" className="text-sm py-1.5 px-3" data-testid={`badge-county-${county.toLowerCase()}`}>
                <MapPin className="w-3 h-3 mr-1.5" />
                {county} {t("landing.county")}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold mb-3">{t("landing.whoIsFor")}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Users, title: t("landing.audience1Title"), desc: t("landing.audience1Desc") },
              { icon: GraduationCap, title: t("landing.audience2Title"), desc: t("landing.audience2Desc") },
              { icon: BookOpen, title: t("landing.audience3Title"), desc: t("landing.audience3Desc") }
            ].map((item, i) => (
              <Card key={i} className="p-6 text-center hover-elevate" data-testid={`card-audience-${i}`}>
                <div className="flex items-center justify-center w-12 h-12 rounded-md bg-primary/10 mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">{t("landing.ctaTitle")}</h3>
          <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
            {t("landing.ctaDesc")}
          </p>
          <Link href="/chat">
            <Button size="lg" className="bg-white text-primary border-white/80" data-testid="button-start-chat-cta">
              {t("landing.getStarted")} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-8 px-6 border-t">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{t("nav.title")}</span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <p className="text-xs text-muted-foreground">
              {t("landing.footer")}
            </p>
            <span className="hidden md:inline text-muted-foreground/40">·</span>
            <Link href="/disclaimer">
              <span className="text-xs text-primary hover:underline cursor-pointer" data-testid="link-footer-disclaimer">{t("disclaimer.footerLink")}</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
