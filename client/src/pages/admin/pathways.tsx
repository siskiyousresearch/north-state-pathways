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
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus, Route, GraduationCap, Building2,
  Pencil, Trash2, Search
} from "lucide-react";
import type { Pathway, Program, Institution } from "@shared/schema";

export default function PathwaysPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showPathwayDialog, setShowPathwayDialog] = useState(false);
  const [showProgramDialog, setShowProgramDialog] = useState(false);
  const [editingPathway, setEditingPathway] = useState<Pathway | null>(null);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  const [pathwayForm, setPathwayForm] = useState({ name: "", slug: "", description: "", icon: "", color: "" });
  const [programForm, setProgramForm] = useState({
    name: "", pathwayId: "", institutionId: "", county: "", description: "", level: "", url: ""
  });

  const { data: pathways, isLoading: pathwaysLoading } = useQuery<Pathway[]>({ queryKey: ["/api/admin/pathways"] });
  const { data: programs, isLoading: programsLoading } = useQuery<Program[]>({ queryKey: ["/api/admin/programs"] });
  const { data: institutions } = useQuery<Institution[]>({ queryKey: ["/api/admin/institutions"] });

  const createPathway = useMutation({
    mutationFn: (data: typeof pathwayForm) => apiRequest("POST", "/api/admin/pathways", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pathways"] });
      setShowPathwayDialog(false);
      setPathwayForm({ name: "", slug: "", description: "", icon: "", color: "" });
      toast({ title: "Pathway created" });
    },
  });

  const updatePathway = useMutation({
    mutationFn: (data: { id: number } & typeof pathwayForm) =>
      apiRequest("PATCH", `/api/admin/pathways/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pathways"] });
      setShowPathwayDialog(false);
      setEditingPathway(null);
      toast({ title: "Pathway updated" });
    },
  });

  const deletePathway = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/pathways/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pathways"] });
      toast({ title: "Pathway deleted" });
    },
  });

  const createProgram = useMutation({
    mutationFn: (data: typeof programForm) =>
      apiRequest("POST", "/api/admin/programs", {
        ...data,
        pathwayId: data.pathwayId ? parseInt(data.pathwayId) : null,
        institutionId: data.institutionId ? parseInt(data.institutionId) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      setShowProgramDialog(false);
      setEditingProgram(null);
      setProgramForm({ name: "", pathwayId: "", institutionId: "", county: "", description: "", level: "", url: "" });
      toast({ title: "Program created" });
    },
  });

  const updateProgram = useMutation({
    mutationFn: (data: { id: number } & typeof programForm) =>
      apiRequest("PATCH", `/api/admin/programs/${data.id}`, {
        name: data.name,
        pathwayId: data.pathwayId ? parseInt(data.pathwayId) : null,
        institutionId: data.institutionId ? parseInt(data.institutionId) : null,
        county: data.county || null,
        description: data.description || null,
        level: data.level || null,
        url: data.url || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      setShowProgramDialog(false);
      setEditingProgram(null);
      setProgramForm({ name: "", pathwayId: "", institutionId: "", county: "", description: "", level: "", url: "" });
      toast({ title: "Program updated" });
    },
  });

  const deleteProgram = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/programs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      toast({ title: "Program deleted" });
    },
  });

  const openEditProgram = (p: Program) => {
    setEditingProgram(p);
    setProgramForm({
      name: p.name,
      pathwayId: p.pathwayId ? String(p.pathwayId) : "",
      institutionId: p.institutionId ? String(p.institutionId) : "",
      county: p.county || "",
      description: p.description || "",
      level: p.level || "",
      url: p.url || "",
    });
    setShowProgramDialog(true);
  };

  const openEditPathway = (p: Pathway) => {
    setEditingPathway(p);
    setPathwayForm({ name: p.name, slug: p.slug, description: p.description || "", icon: p.icon || "", color: p.color || "" });
    setShowPathwayDialog(true);
  };

  const filteredPrograms = programs?.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) ||
           (p.county && p.county.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-pathways-title">Pathways & Programs</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage career pathways and education programs</p>
        </div>
      </div>

      <Tabs defaultValue="pathways">
        <TabsList>
          <TabsTrigger value="pathways" data-testid="tab-pathways">
            <Route className="w-3.5 h-3.5 mr-1.5" /> Pathways
          </TabsTrigger>
          <TabsTrigger value="programs" data-testid="tab-programs">
            <GraduationCap className="w-3.5 h-3.5 mr-1.5" /> Programs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pathways" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">{pathways?.length ?? 0} pathways</p>
            <Dialog open={showPathwayDialog} onOpenChange={(open) => {
              setShowPathwayDialog(open);
              if (!open) { setEditingPathway(null); setPathwayForm({ name: "", slug: "", description: "", icon: "", color: "" }); }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-pathway">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Pathway
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPathway ? "Edit Pathway" : "Add Pathway"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label>Name</Label>
                    <Input value={pathwayForm.name} onChange={(e) => setPathwayForm({ ...pathwayForm, name: e.target.value })} data-testid="input-pathway-name" />
                  </div>
                  <div>
                    <Label>Slug</Label>
                    <Input value={pathwayForm.slug} onChange={(e) => setPathwayForm({ ...pathwayForm, slug: e.target.value })} data-testid="input-pathway-slug" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={pathwayForm.description} onChange={(e) => setPathwayForm({ ...pathwayForm, description: e.target.value })} data-testid="input-pathway-description" />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => editingPathway
                      ? updatePathway.mutate({ id: editingPathway.id, ...pathwayForm })
                      : createPathway.mutate(pathwayForm)
                    }
                    disabled={!pathwayForm.name || !pathwayForm.slug}
                    data-testid="button-save-pathway"
                  >
                    {editingPathway ? "Update" : "Create"} Pathway
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {pathwaysLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pathways?.map((pathway) => (
                <Card key={pathway.id} className="p-4" data-testid={`card-pathway-${pathway.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{pathway.name}</h4>
                        <Badge variant="secondary">{pathway.slug}</Badge>
                      </div>
                      {pathway.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{pathway.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEditPathway(pathway)} data-testid={`button-edit-pathway-${pathway.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deletePathway.mutate(pathway.id)} data-testid={`button-delete-pathway-${pathway.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="programs" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search programs..."
                  className="pl-8 w-64"
                  data-testid="input-search-programs"
                />
              </div>
              <p className="text-sm text-muted-foreground">{filteredPrograms?.length ?? 0} programs</p>
            </div>
            <Dialog open={showProgramDialog} onOpenChange={(open) => {
              setShowProgramDialog(open);
              if (!open) { setEditingProgram(null); setProgramForm({ name: "", pathwayId: "", institutionId: "", county: "", description: "", level: "", url: "" }); }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-program">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Program
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingProgram ? "Edit Program" : "Add Program"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label>Name</Label>
                    <Input value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} data-testid="input-program-name" />
                  </div>
                  <div>
                    <Label>Pathway</Label>
                    <Select value={programForm.pathwayId} onValueChange={(v) => setProgramForm({ ...programForm, pathwayId: v })}>
                      <SelectTrigger data-testid="select-program-pathway"><SelectValue placeholder="Select pathway" /></SelectTrigger>
                      <SelectContent>
                        {pathways?.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Institution</Label>
                    <Select value={programForm.institutionId} onValueChange={(v) => setProgramForm({ ...programForm, institutionId: v })}>
                      <SelectTrigger data-testid="select-program-institution"><SelectValue placeholder="Select institution" /></SelectTrigger>
                      <SelectContent>
                        {institutions?.map((inst) => (
                          <SelectItem key={inst.id} value={String(inst.id)}>{inst.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>County</Label>
                    <Input value={programForm.county} onChange={(e) => setProgramForm({ ...programForm, county: e.target.value })} data-testid="input-program-county" />
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Input value={programForm.level} onChange={(e) => setProgramForm({ ...programForm, level: e.target.value })} placeholder="Certificate, Associate's, Bachelor's..." data-testid="input-program-level" />
                  </div>
                  <div>
                    <Label>URL</Label>
                    <Input value={programForm.url} onChange={(e) => setProgramForm({ ...programForm, url: e.target.value })} placeholder="https://..." data-testid="input-program-url" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={programForm.description} onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })} data-testid="input-program-description" />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => editingProgram
                      ? updateProgram.mutate({ id: editingProgram.id, ...programForm })
                      : createProgram.mutate(programForm)
                    }
                    disabled={!programForm.name}
                    data-testid="button-save-program"
                  >
                    {editingProgram ? "Update" : "Create"} Program
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {programsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredPrograms?.map((program) => (
                  <Card key={program.id} className="p-3.5" data-testid={`card-program-${program.id}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
                          <GraduationCap className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{program.name}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            {program.county && <Badge variant="secondary" className="text-xs">{program.county}</Badge>}
                            {program.level && <Badge variant="outline" className="text-xs">{program.level}</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => openEditProgram(program)} data-testid={`button-edit-program-${program.id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteProgram.mutate(program.id)} data-testid={`button-delete-program-${program.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
