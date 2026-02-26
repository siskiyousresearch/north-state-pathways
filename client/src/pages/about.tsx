import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Sparkles, GraduationCap, Heart, Users,
  BookOpen, MapPin, Target, Lightbulb, Handshake, Globe
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function AboutPage() {
  const { language, setLanguage, t } = useLanguage();

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
                <p className="text-xs text-muted-foreground leading-tight">{t("nav.about")}</p>
              </div>
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
            <Link href="/explore">
              <Button variant="ghost" data-testid="button-explore-link-about">{t("nav.explore")}</Button>
            </Link>
            <Link href="/chat">
              <Button data-testid="button-start-chat-about">{t("nav.startExploring")}</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative pt-16 overflow-hidden">
        <div className="relative h-[360px] md:h-[420px]">
          <img
            src="/images/about-hero.jpg"
            alt="Northern California landscape"
            className="absolute inset-0 w-full h-full object-cover"
            data-testid="img-about-hero"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20" />
          <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
            <Badge variant="secondary" className="mb-4 bg-white/15 text-white border-white/20 backdrop-blur-sm">
              <Users className="w-3 h-3 mr-1" /> {t("about.badge")}
            </Badge>
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white max-w-3xl leading-tight mb-4"
              data-testid="text-about-title"
            >
              {t("about.heroTitle")}
            </h2>
            <p className="text-base md:text-lg text-white/80 max-w-2xl leading-relaxed">
              {t("about.heroDesc")}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-about-mission-heading">
                {t("about.missionTitle")}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t("about.missionP1")}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {t("about.missionP2")}
              </p>
            </div>
            <div className="rounded-md overflow-hidden">
              <img
                src="/images/about-mission.jpg"
                alt="College campus"
                className="w-full h-64 object-cover"
                data-testid="img-about-mission"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-card">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-about-values-heading">
              {t("about.valuesTitle")}
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("about.valuesDesc")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Target,
                titleKey: "about.value1Title",
                descKey: "about.value1Desc"
              },
              {
                icon: Lightbulb,
                titleKey: "about.value2Title",
                descKey: "about.value2Desc"
              },
              {
                icon: Handshake,
                titleKey: "about.value3Title",
                descKey: "about.value3Desc"
              }
            ].map((item, i) => (
              <Card key={i} className="p-6 text-center" data-testid={`card-value-${i}`}>
                <div className="flex items-center justify-center w-12 h-12 rounded-md bg-primary/10 mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">{t(item.titleKey)}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(item.descKey)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-about-pathways-heading">
              {t("about.pathwaysTitle")}
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("about.pathwaysDesc")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6" data-testid="card-pathway-healthcare">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-destructive/10">
                  <Heart className="w-5 h-5 text-destructive" />
                </div>
                <h4 className="text-lg font-semibold">{t("about.healthcareTitle")}</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {t("about.healthcareDesc")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{t("about.nursing")}</Badge>
                <Badge variant="secondary">{t("about.ems")}</Badge>
                <Badge variant="secondary">{t("about.medicalAssisting")}</Badge>
                <Badge variant="secondary">{t("about.healthIT")}</Badge>
              </div>
            </Card>
            <Card className="p-6" data-testid="card-pathway-education">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-lg font-semibold">{t("about.educationTitle")}</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {t("about.educationDesc")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{t("about.teaching")}</Badge>
                <Badge variant="secondary">{t("about.administration")}</Badge>
                <Badge variant="secondary">{t("about.counseling")}</Badge>
                <Badge variant="secondary">{t("about.ece")}</Badge>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-card">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-about-region-heading">
              {t("about.regionTitle")}
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("about.regionDesc")}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              "Butte", "Glenn", "Lassen", "Modoc", "Plumas",
              "Shasta", "Sierra", "Siskiyou", "Tehama", "Trinity"
            ].map((county) => (
              <Badge key={county} variant="secondary" className="text-sm py-1.5 px-3">
                <MapPin className="w-3 h-3 mr-1.5" />
                {county} {t("landing.county")}
              </Badge>
            ))}
          </div>
          <div className="rounded-md overflow-hidden">
            <img
              src="/images/about-region.jpg"
              alt="Northern California forest"
              className="w-full h-48 object-cover"
              data-testid="img-about-region"
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-about-partners-heading">
            {t("about.partnersTitle")}
          </h3>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            {t("about.partnersDesc")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: BookOpen,
                titleKey: "about.scaile",
                descKey: "about.scaileDesc"
              },
              {
                icon: Users,
                titleKey: "about.nst",
                descKey: "about.nstDesc"
              },
              {
                icon: GraduationCap,
                titleKey: "about.k16",
                descKey: "about.k16Desc"
              }
            ].map((item, i) => (
              <Card key={i} className="p-5" data-testid={`card-partner-${i}`}>
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 mx-auto mb-3">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">{t(item.titleKey)}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(item.descKey)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">{t("about.ctaTitle")}</h3>
          <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
            {t("about.ctaDesc")}
          </p>
          <Link href="/chat">
            <Button size="lg" className="bg-white text-primary border-white/80" data-testid="button-start-chat-cta">
              {t("about.ctaButton")}
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
          <p className="text-xs text-muted-foreground">
            {t("landing.footer")}
          </p>
        </div>
      </footer>
    </div>
  );
}
