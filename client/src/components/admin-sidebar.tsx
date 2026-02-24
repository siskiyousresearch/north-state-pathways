import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, MessageSquare, Route, BookOpen,
  FlaskConical, Sparkles, ArrowLeft, Settings, Mic
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Conversations", url: "/admin/conversations", icon: MessageSquare },
  { title: "Pathways & Programs", url: "/admin/pathways", icon: Route },
  { title: "Resources", url: "/admin/resources", icon: BookOpen },
  { title: "Research Tasks", url: "/admin/research", icon: FlaskConical },
  { title: "Onboarding Scripts", url: "/admin/onboarding-scripts", icon: Mic },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-bold leading-tight">Admin Panel</h2>
            <p className="text-xs text-muted-foreground leading-tight">North State Pathways</p>
          </div>
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm" className="w-full justify-start" data-testid="button-back-to-site">
            <ArrowLeft className="w-3.5 h-3.5 mr-2" />
            Back to Site
          </Button>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url || (item.url !== "/admin" && location.startsWith(item.url))}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
