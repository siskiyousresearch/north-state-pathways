import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Sparkles, GraduationCap, Heart, Users,
  BookOpen, MapPin, Target, Lightbulb, Handshake
} from "lucide-react";

export default function AboutPage() {
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
                <h1 className="text-sm font-bold leading-tight">North State Pathways</h1>
                <p className="text-xs text-muted-foreground leading-tight">About Us</p>
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/chat">
              <Button data-testid="button-start-chat-about">Start Exploring</Button>
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
              <Users className="w-3 h-3 mr-1" /> About Us
            </Badge>
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white max-w-3xl leading-tight mb-4"
              data-testid="text-about-title"
            >
              Empowering North State Students
            </h2>
            <p className="text-base md:text-lg text-white/80 max-w-2xl leading-relaxed">
              Comprehensive educational services focused on academic excellence and personal growth
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-about-mission-heading">
                Our Mission
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                North State Education Pathways is a leading provider of comprehensive educational
                services in the region. With a focus on both academic excellence and personal growth,
                we empower students to reach their full potential and thrive in their educational journeys.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                At North State Education Pathways, we believe that education is the foundation for a
                brighter future. Our experienced team of educators and counselors work closely with
                students, leveraging the latest teaching methods and cutting-edge technologies to
                deliver an exceptional learning experience.
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
              What We Stand For
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our core values guide everything we do in supporting North State students
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Target,
                title: "Personalized Guidance",
                desc: "From personalized lesson plans to innovative extracurricular activities, we ensure every student gets tailored support."
              },
              {
                icon: Lightbulb,
                title: "Innovation",
                desc: "Leveraging cutting-edge technologies including AI-powered tools to deliver an exceptional learning experience."
              },
              {
                icon: Handshake,
                title: "Community Partnership",
                desc: "Working closely with regional K-16 institutions, employers, and community organizations across 10 counties."
              }
            ].map((item, i) => (
              <Card key={i} className="p-6 text-center" data-testid={`card-value-${i}`}>
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

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-about-pathways-heading">
              Our Pathways
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We offer two primary career pathways serving Northern California communities
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6" data-testid="card-pathway-healthcare">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-destructive/10">
                  <Heart className="w-5 h-5 text-destructive" />
                </div>
                <h4 className="text-lg font-semibold">Healthcare Careers</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Explore nursing, emergency medical services, medical assisting, health information
                technology, and allied health programs across the region.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Nursing</Badge>
                <Badge variant="secondary">EMS</Badge>
                <Badge variant="secondary">Medical Assisting</Badge>
                <Badge variant="secondary">Health IT</Badge>
              </div>
            </Card>
            <Card className="p-6" data-testid="card-pathway-education">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-lg font-semibold">Education Careers</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Discover pathways to teaching, school administration, counseling, early childhood
                education, and special education across our partner institutions.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Teaching</Badge>
                <Badge variant="secondary">Administration</Badge>
                <Badge variant="secondary">Counseling</Badge>
                <Badge variant="secondary">ECE</Badge>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-card">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-about-region-heading">
              Serving the North State Region
            </h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our services span 10 counties across Northern California
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              "Butte", "Glenn", "Lassen", "Modoc", "Plumas",
              "Shasta", "Sierra", "Siskiyou", "Tehama", "Trinity"
            ].map((county) => (
              <Badge key={county} variant="secondary" className="text-sm py-1.5 px-3">
                <MapPin className="w-3 h-3 mr-1.5" />
                {county} County
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
            Our Partners
          </h3>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            A partnership of SCAILE, North State Together, and regional K-16 institutions
            working together to build stronger career pathways.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: BookOpen,
                title: "SCAILE",
                desc: "Supporting innovation in education through technology and AI."
              },
              {
                icon: Users,
                title: "North State Together",
                desc: "A collaborative of community organizations advancing educational equity."
              },
              {
                icon: GraduationCap,
                title: "K-16 Institutions",
                desc: "Community colleges, CSU campuses, and UC programs across the region."
              }
            ].map((item, i) => (
              <Card key={i} className="p-5" data-testid={`card-partner-${i}`}>
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 mx-auto mb-3">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">Ready to Find Your Path?</h3>
          <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
            Start a conversation with our AI assistant and discover the education and career
            opportunities waiting for you in the North State.
          </p>
          <Link href="/chat">
            <Button size="lg" className="bg-white text-primary border-white/80" data-testid="button-start-chat-cta">
              Talk to Our AI Assistant
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-8 px-6 border-t">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">North State Pathways</span>
          </div>
          <p className="text-xs text-muted-foreground">
            A partnership of SCAILE, North State Together, and regional K-16 institutions.
          </p>
        </div>
      </footer>
    </div>
  );
}
