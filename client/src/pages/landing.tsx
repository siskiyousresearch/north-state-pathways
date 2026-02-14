import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, GraduationCap, Heart, MapPin, ArrowRight, Sparkles, Users, BookOpen } from "lucide-react";
const heroImg = "/images/hero-landscape.png";

const counties = [
  "Butte", "Glenn", "Lassen", "Modoc", "Plumas",
  "Shasta", "Sierra", "Siskiyou", "Tehama", "Trinity"
];

const features = [
  {
    icon: MessageCircle,
    title: "AI-Powered Guidance",
    description: "Get personalized education and career pathway recommendations through an intelligent conversation."
  },
  {
    icon: GraduationCap,
    title: "Education Pathways",
    description: "Explore programs from community colleges to universities across the North State region."
  },
  {
    icon: Heart,
    title: "Healthcare Careers",
    description: "Discover nursing, medical assisting, EMS, and allied health programs near you."
  },
  {
    icon: MapPin,
    title: "Local Resources",
    description: "Find scholarships, financial aid, and support services specific to your county."
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight" data-testid="text-brand-name">North State Pathways</h1>
              <p className="text-xs text-muted-foreground leading-tight">AI Career Assistant</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/chat">
              <Button data-testid="button-start-chat-header">Start Exploring</Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost" data-testid="button-admin-link">Admin</Button>
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
              <Sparkles className="w-3 h-3 mr-1" /> Powered by AI
            </Badge>
            <h2
              className="text-3xl md:text-5xl lg:text-6xl font-bold text-white max-w-4xl leading-tight mb-4"
              data-testid="text-hero-title"
            >
              Your Future Starts Here in the North State
            </h2>
            <p className="text-base md:text-lg text-white/80 max-w-2xl mb-8 leading-relaxed">
              Explore education and healthcare career pathways across 10 counties in
              Northern California. Get personalized guidance from our AI assistant.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link href="/chat">
                <Button size="lg" variant="outline" className="text-white border-white/30 backdrop-blur-sm bg-white/10" data-testid="button-start-chat-hero">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Talk to Our AI Assistant
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-features-heading">How We Can Help</h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Whether you're a high school student, college student, adult learner, parent, or counselor,
              we're here to guide you.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <Card key={i} className="p-5 hover-elevate" data-testid={`card-feature-${i}`}>
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-counties-heading">Serving the North State Region</h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Resources and pathways across 10 counties in Northern California
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {counties.map((county) => (
              <Badge key={county} variant="secondary" className="text-sm py-1.5 px-3" data-testid={`badge-county-${county.toLowerCase()}`}>
                <MapPin className="w-3 h-3 mr-1.5" />
                {county} County
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold mb-3">Who Is This For?</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Users, title: "Students & Families", desc: "High school students exploring careers, college students seeking programs, and parents navigating options." },
              { icon: GraduationCap, title: "Adult Learners", desc: "Career changers, workforce re-entrants, and adults seeking new education pathways." },
              { icon: BookOpen, title: "Counselors & Advisors", desc: "School counselors and college advisors looking for regional pathway information." }
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
          <h3 className="text-2xl md:text-3xl font-bold mb-4">Ready to Explore Your Path?</h3>
          <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
            Start a conversation with our AI assistant and discover education and career
            opportunities right here in the North State.
          </p>
          <Link href="/chat">
            <Button size="lg" className="bg-white text-primary border-white/80" data-testid="button-start-chat-cta">
              Get Started Now <ArrowRight className="w-4 h-4 ml-2" />
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
