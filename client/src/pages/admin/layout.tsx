import { Switch, Route } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import AdminDashboard from "./dashboard";
import ConversationsPage from "./conversations";
import PathwaysPage from "./pathways";
import ResourcesPage from "./resources";
import ResearchPage from "./research";

export default function AdminLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-2 px-4 py-2.5 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Switch>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/conversations" component={ConversationsPage} />
              <Route path="/admin/pathways" component={PathwaysPage} />
              <Route path="/admin/resources" component={ResourcesPage} />
              <Route path="/admin/research" component={ResearchPage} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
