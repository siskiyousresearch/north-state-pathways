import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare, Route, BookOpen, Users,
  TrendingUp, MapPin, Heart, GraduationCap, Sparkles, ClipboardCheck, Search
} from "lucide-react";

export default function AdminDashboard() {
  const { data: narrative, isLoading: narrativeLoading } = useQuery<{
    narrative: string;
    cached: boolean;
  }>({
    queryKey: ["/api/admin/narrative"],
  });

  const { data: stats, isLoading } = useQuery<{
    totalSessions: number;
    totalMessages: number;
    totalPathways: number;
    totalPrograms: number;
    totalResources: number;
    topCounties: { county: string; count: number }[];
    topInterests: { interest: string; count: number }[];
    recentSessions: { id: number; userType: string; county: string; createdAt: string }[];
    toolUsage: { tool: string; event: string; count: number }[];
  }>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of student interactions and pathway data</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Chat Sessions", value: stats?.totalSessions ?? 0, icon: MessageSquare, desc: "Total student interactions" },
    { label: "Total Messages", value: stats?.totalMessages ?? 0, icon: Users, desc: "Messages exchanged" },
    { label: "Pathways", value: stats?.totalPathways ?? 0, icon: Route, desc: "Active career pathways" },
    { label: "Programs", value: stats?.totalPrograms ?? 0, icon: GraduationCap, desc: "Available programs" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of student interactions and pathway data</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="p-5" data-testid={`card-stat-${i}`}>
            <div className="flex items-center justify-between gap-1 mb-3">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5" data-testid="card-top-counties">
          <div className="flex items-center justify-between gap-1 mb-4">
            <div>
              <h3 className="font-semibold">Top Counties</h3>
              <p className="text-xs text-muted-foreground">Most active student regions</p>
            </div>
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </div>
          {stats?.topCounties && stats.topCounties.length > 0 ? (
            <div className="space-y-3">
              {stats.topCounties.map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="text-sm truncate">{c.county || "Not specified"}</span>
                  </div>
                  <Badge variant="secondary">{c.count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data yet. Sessions will appear as students interact.</p>
          )}
        </Card>

        <Card className="p-5" data-testid="card-top-interests">
          <div className="flex items-center justify-between gap-1 mb-4">
            <div>
              <h3 className="font-semibold">Top Interests</h3>
              <p className="text-xs text-muted-foreground">Most requested career areas</p>
            </div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          {stats?.topInterests && stats.topInterests.length > 0 ? (
            <div className="space-y-3">
              {stats.topInterests.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-chart-2 shrink-0" />
                    <span className="text-sm truncate">{item.interest}</span>
                  </div>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data yet. Interests will be tracked from conversations.</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5" data-testid="card-assessment-usage">
          <div className="flex items-center justify-between gap-1 mb-4">
            <div>
              <h3 className="font-semibold">Self-Assessment</h3>
              <p className="text-xs text-muted-foreground">Career assessment tool usage</p>
            </div>
            <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
          </div>
          {(() => {
            const tu = stats?.toolUsage ?? [];
            const started = tu.find(t => t.tool === "self-assessment" && t.event === "started")?.count ?? 0;
            const completed = tu.find(t => t.tool === "self-assessment" && t.event === "completed")?.count ?? 0;
            const rate = started > 0 ? Math.round((completed / started) * 100) : 0;
            return started > 0 || completed > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-sm">Assessments Started</span>
                  </div>
                  <Badge variant="secondary">{started}</Badge>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-sm">Assessments Completed</span>
                  </div>
                  <Badge variant="secondary">{completed}</Badge>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="text-sm">Completion Rate</span>
                  </div>
                  <Badge variant="outline">{rate}%</Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No assessment usage data yet. Stats will appear as students take assessments.</p>
            );
          })()}
        </Card>

        <Card className="p-5" data-testid="card-scholarship-usage">
          <div className="flex items-center justify-between gap-1 mb-4">
            <div>
              <h3 className="font-semibold">Scholarship Finder</h3>
              <p className="text-xs text-muted-foreground">Scholarship matching tool usage</p>
            </div>
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
          </div>
          {(() => {
            const tu = stats?.toolUsage ?? [];
            const started = tu.find(t => t.tool === "scholarship-finder" && t.event === "started")?.count ?? 0;
            const completed = tu.find(t => t.tool === "scholarship-finder" && t.event === "completed")?.count ?? 0;
            const rate = started > 0 ? Math.round((completed / started) * 100) : 0;
            return started > 0 || completed > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-sm">Searches Started</span>
                  </div>
                  <Badge variant="secondary">{started}</Badge>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-sm">Searches Completed</span>
                  </div>
                  <Badge variant="secondary">{completed}</Badge>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="text-sm">Completion Rate</span>
                  </div>
                  <Badge variant="outline">{rate}%</Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No scholarship finder usage data yet. Stats will appear as students use the tool.</p>
            );
          })()}
        </Card>
      </div>

      <Card className="p-5" data-testid="card-student-narrative">
        <div className="flex items-center justify-between gap-1 mb-4">
          <div>
            <h3 className="font-semibold">Student Insights</h3>
            <p className="text-xs text-muted-foreground">AI-generated summary of student interactions</p>
          </div>
          <Sparkles className="w-4 h-4 text-muted-foreground" />
        </div>
        {narrativeLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[95%]" />
            <Skeleton className="h-4 w-full mt-3" />
            <Skeleton className="h-4 w-[85%]" />
            <Skeleton className="h-4 w-[92%]" />
          </div>
        ) : narrative?.narrative ? (
          <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
            {narrative.narrative.split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to generate summary at this time.</p>
        )}
      </Card>

      <Card className="p-5" data-testid="card-recent-sessions">
        <div className="flex items-center justify-between gap-1 mb-4">
          <div>
            <h3 className="font-semibold">Recent Sessions</h3>
            <p className="text-xs text-muted-foreground">Latest student interactions</p>
          </div>
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
        </div>
        {stats?.recentSessions && stats.recentSessions.length > 0 ? (
          <div className="space-y-2">
            {stats.recentSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-4 py-2 border-b last:border-b-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{session.userType || "Unknown user"}</p>
                    <p className="text-xs text-muted-foreground">{session.county || "County not specified"}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(session.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
        )}
      </Card>
    </div>
  );
}
