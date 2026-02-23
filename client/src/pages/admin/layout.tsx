import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminDashboard from "./dashboard";
import ConversationsPage from "./conversations";
import PathwaysPage from "./pathways";
import ResourcesPage from "./resources";
import ResearchPage from "./research";
import SettingsPage from "./settings";
import AdminLogin from "./login";

export default function AdminLayout() {
  const [logoutLoading, setLogoutLoading] = useState(false);

  const { data: auth, isLoading } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/auth/check"],
  });

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await apiRequest("POST", "/api/auth/logout");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
    } finally {
      setLogoutLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-64 h-8" />
      </div>
    );
  }

  if (!auth?.authenticated) {
    return (
      <AdminLogin onLogin={() => queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] })} />
    );
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutLoading}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Logout
            </Button>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Switch>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/conversations" component={ConversationsPage} />
              <Route path="/admin/pathways" component={PathwaysPage} />
              <Route path="/admin/resources" component={ResourcesPage} />
              <Route path="/admin/research" component={ResearchPage} />
              <Route path="/admin/settings" component={SettingsPage} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
