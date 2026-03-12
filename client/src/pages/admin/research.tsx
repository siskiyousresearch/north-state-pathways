import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus, FlaskConical, Check, X, Loader2, Play, PlusCircle, Trash2, Pencil, RotateCw,
  GraduationCap, BookOpen, MapPin, ExternalLink, Building2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ResearchTask, Pathway } from "@shared/schema";

const NORTH_STATE_COUNTIES = [
  "Butte County", "Glenn County", "Lassen County", "Modoc County", "Plumas County",
  "Shasta County", "Sierra County", "Siskiyou County", "Tehama County", "Trinity County",
];

const statusColors: Record<string, string> = {
  pending: "secondary",
  researching: "default",
  completed: "default",
  approved: "default",
  rejected: "destructive",
};

interface RecommendedAction {
  type: "program" | "resource" | "institution";
  name: string;
  institution?: string;
  county?: string;
  level?: string;
  description?: string;
  url?: string;
  resourceType?: string;
  eligibility?: string;
  counties?: string[];
  institutionType?: string;
  website?: string;
}

function parseActions(aiResponse: string): { displayText: string; actions: RecommendedAction[] } {
  const separator = "---ACTIONS---";
  const idx = aiResponse.indexOf(separator);
  if (idx === -1) return { displayText: aiResponse, actions: [] };

  const displayText = aiResponse.substring(0, idx).trim();
  const actionsPart = aiResponse.substring(idx + separator.length).trim();

  const jsonMatch = actionsPart.match(/```json\s*([\s\S]*?)```/);
  if (!jsonMatch) return { displayText, actions: [] };

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    if (Array.isArray(parsed)) return { displayText, actions: parsed };
  } catch {}
  return { displayText, actions: [] };
}

export default function ResearchPage() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<ResearchTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<ResearchTask | null>(null);
  const [form, setForm] = useState({ title: "", description: "", pathwayId: "", county: "" });
  const [showNewPathway, setShowNewPathway] = useState(false);
  const [newPathway, setNewPathway] = useState({ name: "", description: "" });

  const { data: tasks, isLoading } = useQuery<ResearchTask[]>({
    queryKey: ["/api/admin/research"],
  });
  const { data: pathways } = useQuery<Pathway[]>({ queryKey: ["/api/admin/pathways"] });

  const currentTask = selectedTask && tasks?.find((t) => t.id === selectedTask.id) || selectedTask;

  const createPathway = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const res = await apiRequest("POST", "/api/admin/pathways", { name: data.name, slug, description: data.description || null });
      return res.json();
    },
    onSuccess: (pathway: Pathway) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pathways"] });
      setForm({ ...form, pathwayId: String(pathway.id) });
      setShowNewPathway(false);
      setNewPathway({ name: "", description: "" });
      toast({ title: `Pathway "${pathway.name}" created` });
    },
    onError: () => {
      toast({ title: "Failed to create pathway", variant: "destructive" });
    },
  });

  const createTask = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest("POST", "/api/admin/research", {
        ...data,
        pathwayId: data.pathwayId ? parseInt(data.pathwayId) : null,
        county: data.county || null,
        status: "pending",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/research"] });
      setShowDialog(false);
      setEditingTask(null);
      setForm({ title: "", description: "", pathwayId: "", county: "" });
      toast({ title: "Research task created" });
    },
  });

  const updateTask = useMutation({
    mutationFn: (data: { id: number } & typeof form) =>
      apiRequest("PATCH", `/api/admin/research/${data.id}`, {
        title: data.title,
        description: data.description || null,
        pathwayId: data.pathwayId ? parseInt(data.pathwayId) : null,
        county: data.county || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/research"] });
      setShowDialog(false);
      setEditingTask(null);
      setForm({ title: "", description: "", pathwayId: "", county: "" });
      toast({ title: "Research task updated" });
    },
  });

  const openEditTask = (task: ResearchTask) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      pathwayId: task.pathwayId ? String(task.pathwayId) : "",
      county: task.county || "",
    });
    setShowDialog(true);
  };

  const runResearch = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/research/${id}/run`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/research"] });
      toast({ title: "Research started" });
    },
  });

  const approveTask = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/research/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/research"] });
      toast({ title: "Research approved and added to knowledge base" });
    },
  });

  const rejectTask = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/research/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/research"] });
      toast({ title: "Research rejected" });
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/research/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/research"] });
      if (selectedTask?.id === deleteTask.variables) setSelectedTask(null);
      toast({ title: "Research task deleted" });
    },
  });

  const addProgram = useMutation({
    mutationFn: (action: RecommendedAction) => {
      const pathwayId = currentTask?.pathwayId || null;
      return apiRequest("POST", "/api/admin/programs", {
        name: action.name,
        pathwayId,
        institutionName: action.institution || null,
        county: action.county || null,
        description: action.description || null,
        level: action.level || null,
        url: action.url || null,
      });
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pathways"] });
      toast({ title: `Program "${action.name}" added` });
    },
    onError: () => {
      toast({ title: "Failed to add program", variant: "destructive" });
    },
  });

  const addResource = useMutation({
    mutationFn: (action: RecommendedAction) => {
      const pathwayId = currentTask?.pathwayId || null;
      return apiRequest("POST", "/api/admin/resources", {
        name: action.name,
        type: action.resourceType || "Other",
        description: action.description || null,
        eligibility: action.eligibility || null,
        url: action.url || null,
        pathwayId,
        counties: action.counties || (action.county ? [action.county] : null),
        pathwayIds: pathwayId ? [pathwayId] : null,
      });
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
      toast({ title: `Resource "${action.name}" added` });
    },
    onError: () => {
      toast({ title: "Failed to add resource", variant: "destructive" });
    },
  });

  const addInstitution = useMutation({
    mutationFn: (action: RecommendedAction) =>
      apiRequest("POST", "/api/admin/institutions", {
        name: action.name,
        type: action.institutionType || "Other",
        county: action.county || null,
        description: action.description || null,
        website: action.website || action.url || null,
      }),
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/institutions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/map/institutions"] });
      toast({ title: `Institution "${action.name}" added` });
    },
    onError: () => {
      toast({ title: "Failed to add institution", variant: "destructive" });
    },
  });

  const { displayText, actions } = currentTask?.aiResponse
    ? parseActions(currentTask.aiResponse)
    : { displayText: "", actions: [] };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-research-title">Research Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-powered pathway research with human approval</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) { setEditingTask(null); setForm({ title: "", description: "", pathwayId: "", county: "" }); }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-research">
              <Plus className="w-4 h-4 mr-1.5" /> New Research Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Research Task" : "Create Research Task"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Find new nursing programs" data-testid="input-research-title" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What should the AI research?" data-testid="input-research-description" />
              </div>
              <div>
                <Label>County</Label>
                <Select value={form.county} onValueChange={(v) => setForm({ ...form, county: v })}>
                  <SelectTrigger data-testid="select-research-county"><SelectValue placeholder="All counties" /></SelectTrigger>
                  <SelectContent>
                    {NORTH_STATE_COUNTIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Related Pathway</Label>
                <div className="flex items-center gap-2">
                  <Select value={form.pathwayId} onValueChange={(v) => setForm({ ...form, pathwayId: v })}>
                    <SelectTrigger data-testid="select-research-pathway" className="flex-1"><SelectValue placeholder="Select pathway" /></SelectTrigger>
                    <SelectContent>
                      {pathways?.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewPathway(!showNewPathway)}
                    title="Create new pathway"
                    data-testid="button-toggle-new-pathway"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </div>
                {showNewPathway && (
                  <div className="mt-2 p-3 border rounded-md space-y-2 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground">New Pathway</p>
                    <Input
                      value={newPathway.name}
                      onChange={(e) => setNewPathway({ ...newPathway, name: e.target.value })}
                      placeholder="Pathway name (e.g., Nursing)"
                      data-testid="input-new-pathway-name"
                    />
                    <Textarea
                      value={newPathway.description}
                      onChange={(e) => setNewPathway({ ...newPathway, description: e.target.value })}
                      placeholder="Brief description (optional)"
                      rows={2}
                      data-testid="input-new-pathway-description"
                    />
                    <Button
                      size="sm"
                      onClick={() => createPathway.mutate(newPathway)}
                      disabled={!newPathway.name || createPathway.isPending}
                      data-testid="button-create-new-pathway"
                    >
                      {createPathway.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Create Pathway
                    </Button>
                  </div>
                )}
              </div>
              <Button
                className="w-full"
                onClick={() => editingTask
                  ? updateTask.mutate({ id: editingTask.id, ...form })
                  : createTask.mutate(form)
                }
                disabled={!form.title}
                data-testid="button-create-research"
              >
                {editingTask ? "Update" : "Create"} Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm">Tasks</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{tasks?.length ?? 0} total</p>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : tasks && tasks.length > 0 ? (
                <div className="divide-y">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`w-full p-3 text-left hover:bg-accent/50 transition-colors ${selectedTask?.id === task.id ? "bg-accent" : ""}`}
                      data-testid={`button-research-task-${task.id}`}
                    >
                      <p className="text-sm font-medium break-words">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant={statusColors[task.status] as any} className="text-xs">
                          {task.status}
                        </Badge>
                        {task.county && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" /> {task.county.replace(" County", "")}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <FlaskConical className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No research tasks yet</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-5">
            {currentTask ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-lg">{currentTask.title}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant={statusColors[currentTask.status] as any}>
                        {currentTask.status}
                      </Badge>
                      {currentTask.county && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="w-3 h-3 mr-1" /> {currentTask.county}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(currentTask.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {currentTask.status === "pending" && (
                      <Button
                        onClick={() => runResearch.mutate(currentTask.id)}
                        disabled={runResearch.isPending}
                        data-testid="button-run-research"
                      >
                        {runResearch.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-1.5" />
                        )}
                        Run Research
                      </Button>
                    )}
                    {currentTask.status === "completed" && (
                      <>
                        <Button onClick={() => approveTask.mutate(currentTask.id)} data-testid="button-approve-research">
                          <Check className="w-4 h-4 mr-1.5" /> Approve
                        </Button>
                        <Button variant="outline" onClick={() => rejectTask.mutate(currentTask.id)} data-testid="button-reject-research">
                          <X className="w-4 h-4 mr-1.5" /> Reject
                        </Button>
                      </>
                    )}
                    {(currentTask.status === "completed" || currentTask.status === "approved" || currentTask.status === "rejected") && (
                      <Button
                        variant="outline"
                        onClick={() => runResearch.mutate(currentTask.id)}
                        disabled={runResearch.isPending}
                        data-testid="button-rerun-research"
                      >
                        {runResearch.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <RotateCw className="w-4 h-4 mr-1.5" />
                        )}
                        Re-run
                      </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={() => openEditTask(currentTask)} data-testid="button-edit-research">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => { deleteTask.mutate(currentTask.id); setSelectedTask(null); }} data-testid="button-delete-research">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {currentTask.description && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1">{currentTask.description}</p>
                  </div>
                )}

                {currentTask.aiResponse && (
                  <div>
                    <Label className="text-xs text-muted-foreground">AI Findings</Label>
                    <Card className="p-4 mt-1 bg-muted/50">
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-base prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1 prose-li:my-0.5 prose-ul:my-1">
                        <ReactMarkdown
                          components={{
                            a: ({ children, href }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {displayText}
                        </ReactMarkdown>
                      </div>
                    </Card>
                  </div>
                )}

                {actions.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Suggested Actions</Label>
                    <div className="mt-1 space-y-2">
                      {actions.map((action, idx) => (
                        <Card key={idx} className="p-3 border-dashed" data-testid={`card-action-${idx}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${action.type === "program" ? "bg-blue-100 text-blue-700" : action.type === "institution" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>
                                {action.type === "program" ? <GraduationCap className="w-3.5 h-3.5" /> : action.type === "institution" ? <Building2 className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium">{action.name}</p>
                                  <Badge variant="outline" className="text-xs capitalize">{action.type}</Badge>
                                </div>
                                {action.institution && (
                                  <p className="text-xs text-muted-foreground mt-0.5">at {action.institution}</p>
                                )}
                                {action.institutionType && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{action.institutionType}</p>
                                )}
                                {action.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{action.description}</p>
                                )}
                                <div className="flex items-center gap-3 flex-wrap mt-0.5">
                                  {action.county && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                      <MapPin className="w-3 h-3" /> {action.county}
                                    </span>
                                  )}
                                  {(action.url || action.website) && (
                                    <a
                                      href={action.url || action.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline flex items-center gap-0.5"
                                      data-testid={`link-action-url-${idx}`}
                                    >
                                      <ExternalLink className="w-3 h-3" /> Verify source
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (action.type === "program") addProgram.mutate(action);
                                else if (action.type === "institution") addInstitution.mutate(action);
                                else addResource.mutate(action);
                              }}
                              disabled={addProgram.isPending || addResource.isPending || addInstitution.isPending}
                              data-testid={`button-add-action-${idx}`}
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Add {action.type === "program" ? "Program" : action.type === "institution" ? "Institution" : "Resource"}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {currentTask.findings && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Approved Findings</Label>
                    <Card className="p-4 mt-1">
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-base prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1 prose-li:my-0.5 prose-ul:my-1">
                        <ReactMarkdown
                          components={{
                            a: ({ children, href }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {currentTask.findings}
                        </ReactMarkdown>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center">
                <FlaskConical className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a task to view details</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create research tasks to have AI discover new programs and resources
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
