import { useState, useEffect, useCallback } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageContext, getTranslation, type Language } from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import ChatPage from "@/pages/chat";
import AboutPage from "@/pages/about";
import AdminLayout from "@/pages/admin/layout";
import ExplorePage from "@/pages/explore";
import AssessmentPage from "@/pages/assessment";
import DisclaimerPage from "@/pages/disclaimer";
import InstitutionsPage from "@/pages/admin/institutions";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/explore" component={ExplorePage} />
      <Route path="/assessment" component={AssessmentPage} />
      <Route path="/disclaimer" component={DisclaimerPage} />
      <Route path="/admin" component={AdminLayout} />
      <Route path="/admin/institutions" component={InstitutionsPage} />
      <Route path="/admin/:rest*" component={AdminLayout} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nsp-language");
      if (stored === "es") return "es";
    }
    return "en";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("nsp-language", lang);
  }, []);

  const t = useCallback((key: string) => getTranslation(key, language), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageContext.Provider>
  );
}

export default App;
