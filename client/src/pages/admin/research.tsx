import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus, FlaskConical, Check, X, Loader2, Play, Eye, PlusCircle, Trash2, Pencil
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ResearchTask, Pathway } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "secondary",
  researching: "default",
  completed: "default",
  approved: "default",
  rejected: "destructive",
};

export default function ResearchPage() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<ResearchTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<ResearchTask | null>(null);
  const [form, setForm] = useState({ title: "", description: "", pathwayId: "" });
  const [showNewPathway, setShowNewPathway] = useState(false);
  const [newPathway, setNewPathway] = useState({ name: "", description: "" });

  const { data: tasks, isLoading } = useQuery<ResearchTask[]>({ queryKey: ["/api/admin/research"] });
  const { data: pathways } = useQuery<Pathway[]>({ queryKey: ["/api/admin/pathways"] });

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
        status: "pending",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/research"] });
      setShowDialog(false);
      setEditingTask(null);
      setForm({ title: "", description: "", pathwayId: "" });
      toast({ title: "Research task created" });
    },
  });

  const updateTask = useMutation({
    mutationFn: (data: { id: number } & typeof form) =>
      apiRequest("PATCH", `/api/admin/research/${data.id}`, {
        title: data.title,
        description: data.description || null,
        pathwayId: data.pathwayId ? parseInt(data.pathwayId) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/research"] });
      setShowDialog(false);
      setEditingTask(null);
      setForm({ title: "", description: "", pathwayId: "" });
      toast({ title: "Research task updated" });
    },
  });

  const openEditTask = (task: ResearchTask) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      pathwayId: task.pathwayId ? String(task.pathwayId) : "",
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-research-title">Research Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-powered pathway research with human approval</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) { setEditingTask(null); setForm({ title: "", description: "", pathwayId: "" }); }
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
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Find new nursing programs in Shasta County" data-testid="input-research-title" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What should the AI research?" data-testid="input-research-description" />
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
          <Card className="p-0">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm">Tasks</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{tasks?.length ?? 0} total</p>
            </div>
            <ScrollArea className="h-[500px]">
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
                      className={`w-full p-3.5 text-left hover-elevate ${selectedTask?.id === task.id ? "bg-accent" : ""}`}
                      data-testid={`button-research-task-${task.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate flex-1 min-w-0">{task.title}</p>
                        <Badge variant={statusColors[task.status] as any} className="text-xs shrink-0">
                          {task.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <FlaskConical className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No research tasks yet</p>
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-5">
            {selectedTask ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedTask.title}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant={statusColors[selectedTask.status] as any}>
                        {selectedTask.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(selectedTask.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {selectedTask.status === "pending" && (
                      <Button
                        onClick={() => runResearch.mutate(selectedTask.id)}
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
                    {selectedTask.status === "completed" && (
                      <>
                        <Button onClick={() => approveTask.mutate(selectedTask.id)} data-testid="button-approve-research">
                          <Check className="w-4 h-4 mr-1.5" /> Approve
                        </Button>
                        <Button variant="outline" onClick={() => rejectTask.mutate(selectedTask.id)} data-testid="button-reject-research">
                          <X className="w-4 h-4 mr-1.5" /> Reject
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="icon" onClick={() => openEditTask(selectedTask)} data-testid="button-edit-research">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => { deleteTask.mutate(selectedTask.id); setSelectedTask(null); }} data-testid="button-delete-research">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {selectedTask.description && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1">{selectedTask.description}</p>
                  </div>
                )}

                {selectedTask.aiResponse && (
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
                          {selectedTask.aiResponse}
                        </ReactMarkdown>
                      </div>
                    </Card>
                  </div>
                )}

                {selectedTask.findings && (
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
                          {selectedTask.findings}
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
