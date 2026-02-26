import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, ExternalLink, Construction } from "lucide-react";

export default function SelfAssessmentAdmin() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10" data-testid="icon-self-assessment">
          <ClipboardCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" data-testid="text-self-assessment-title">Self-Assessment Tool</h1>
            <Badge variant="secondary" className="text-xs gap-1" data-testid="badge-in-development">
              <Construction className="w-3 h-3" />
              In Development
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-self-assessment-subtitle">Career quiz for Healthcare and Education pathways</p>
        </div>
      </div>

      <Card className="p-6 space-y-4" data-testid="card-self-assessment-info">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold" data-testid="text-about-heading">About this feature</h2>
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-about-description">
            The Self-Assessment Tool is a career quiz that helps prospective students discover which
            healthcare or education career paths best match their interests, skills, and goals.
            Students answer 6 questions and receive personalized program recommendations from the
            North State region database.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold" data-testid="text-status-heading">Current status</h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2" data-testid="status-healthcare-track">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              Healthcare track — 6 questions covering motivation, education, patient interaction, clinical comfort, work pace, age group
            </li>
            <li className="flex items-center gap-2" data-testid="status-education-track">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              Education track — 6 questions covering motivation, age group, education level, role type, environment, study location
            </li>
            <li className="flex items-center gap-2" data-testid="status-matching">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              Score-based program matching against North State database
            </li>
            <li className="flex items-center gap-2" data-testid="status-language">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              Full English / Spanish language support
            </li>
            <li className="flex items-center gap-2" data-testid="status-ai-analysis">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
              AI-enhanced result analysis (future improvement)
            </li>
            <li className="flex items-center gap-2" data-testid="status-admin-editable">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
              Admin-editable questions and scoring weights (future improvement)
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold" data-testid="text-inspired-heading">Inspired by</h2>
          <a
            href="https://happyinhealthcare.org/career-quiz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            data-testid="link-inspiration"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Happy in Healthcare Career Quiz
          </a>
        </div>

        <a href="/assessment" target="_blank" rel="noopener noreferrer" data-testid="link-open-assessment">
          <Button className="gap-2" data-testid="button-open-self-assessment">
            <ExternalLink className="w-4 h-4" />
            Open Self-Assessment
          </Button>
        </a>
      </Card>
    </div>
  );
}
