import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, BookOpen, ExternalLink, Trash2, Search, Pencil, MapPin } from "lucide-react";
import type { Resource, Pathway } from "@shared/schema";

const resourceTypes = [
  "Scholarship", "Grant", "Financial Aid", "Fellowship",
  "Internship", "Program", "Support Service", "Other"
];

const NORTH_STATE_COUNTIES = [
  "Butte County", "Glenn County", "Lassen County", "Modoc County", "Plumas County",
  "Shasta County", "Sierra County", "Siskiyou County", "Tehama County", "Trinity County",
];

interface ResourceForm {
  name: string;
  type: string;
  description: string;
  url: string;
  eligibility: string;
  selectedPathwayIds: number[];
  selectedCounties: string[];
}

const emptyForm: ResourceForm = {
  name: "", type: "", description: "", url: "", eligibility: "",
  selectedPathwayIds: [], selectedCounties: [],
};

export default function ResourcesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [form, setForm] = useState<ResourceForm>(emptyForm);

  const { data: resources, isLoading } = useQuery<Resource[]>({ queryKey: ["/api/admin/resources"] });
  const { data: pathways } = useQuery<Pathway[]>({ queryKey: ["/api/admin/pathways"] });

  const buildPayload = (f: ResourceForm) => ({
    name: f.name,
    type: f.type,
    description: f.description || null,
    url: f.url || null,
    eligibility: f.eligibility || null,
    pathwayId: f.selectedPathwayIds.length > 0 ? f.selectedPathwayIds[0] : null,
    pathwayIds: f.selectedPathwayIds.length > 0 ? f.selectedPathwayIds : null,
    county: f.selectedCounties.length > 0 ? f.selectedCounties[0] : null,
    counties: f.selectedCounties.length > 0 ? f.selectedCounties : null,
  });

  const createResource = useMutation({
    mutationFn: (data: ResourceForm) => apiRequest("POST", "/api/admin/resources", buildPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
      setShowDialog(false);
      setForm(emptyForm);
      toast({ title: "Resource added" });
    },
  });

  const updateResource = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ResourceForm }) =>
      apiRequest("PATCH", `/api/admin/resources/${id}`, buildPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
      setEditingResource(null);
      setForm(emptyForm);
      toast({ title: "Resource updated" });
    },
  });

  const deleteResource = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/resources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
      toast({ title: "Resource deleted" });
    },
  });

  const openEdit = (resource: Resource) => {
    const existingCounties = resource.counties || (resource.county ? [resource.county] : []);
    const existingPathwayIds = resource.pathwayIds || (resource.pathwayId ? [resource.pathwayId] : []);
    setForm({
      name: resource.name || "",
      type: resource.type || "",
      description: resource.description || "",
      url: resource.url || "",
      eligibility: resource.eligibility || "",
      selectedPathwayIds: existingPathwayIds,
      selectedCounties: existingCounties,
    });
    setEditingResource(resource);
  };

  const closeEdit = () => {
    setEditingResource(null);
    setForm(emptyForm);
  };

  const closeCreate = (open: boolean) => {
    setShowDialog(open);
    if (!open) setForm(emptyForm);
  };

  const togglePathway = (pathwayId: number) => {
    setForm(prev => ({
      ...prev,
      selectedPathwayIds: prev.selectedPathwayIds.includes(pathwayId)
        ? prev.selectedPathwayIds.filter(id => id !== pathwayId)
        : [...prev.selectedPathwayIds, pathwayId],
    }));
  };

  const toggleCounty = (county: string) => {
    setForm(prev => ({
      ...prev,
      selectedCounties: prev.selectedCounties.includes(county)
        ? prev.selectedCounties.filter(c => c !== county)
        : [...prev.selectedCounties, county],
    }));
  };

  const filtered = resources?.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) ||
           (r.type && r.type.toLowerCase().includes(search.toLowerCase()))
  );

  const getPathwayNames = (resource: Resource) => {
    const ids = resource.pathwayIds || (resource.pathwayId ? [resource.pathwayId] : []);
    return ids.map(id => pathways?.find(p => p.id === id)?.name).filter(Boolean);
  };

  const getCountyDisplay = (resource: Resource) => {
    const c = resource.counties || (resource.county ? [resource.county] : []);
    return c.map(name => name.replace(" County", ""));
  };

  const resourceForm = (
    <div className="space-y-3 mt-2">
      <div>
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-resource-name" />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
          <SelectTrigger data-testid="select-resource-type"><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            {resourceTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Pathways</Label>
        <div className="border rounded-md p-2 mt-1 space-y-1.5 max-h-36 overflow-y-auto" data-testid="select-resource-pathways">
          {pathways?.map((p) => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded px-1.5 py-1">
              <Checkbox
                checked={form.selectedPathwayIds.includes(p.id)}
                onCheckedChange={() => togglePathway(p.id)}
                data-testid={`checkbox-pathway-${p.id}`}
              />
              <span className="text-sm">{p.name}</span>
            </label>
          ))}
          {(!pathways || pathways.length === 0) && (
            <p className="text-xs text-muted-foreground px-1.5">No pathways available</p>
          )}
        </div>
        {form.selectedPathwayIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {form.selectedPathwayIds.map(id => {
              const name = pathways?.find(p => p.id === id)?.name;
              return name ? <Badge key={id} variant="secondary" className="text-xs">{name}</Badge> : null;
            })}
          </div>
        )}
      </div>
      <div>
        <Label>Applicable Counties</Label>
        <div className="border rounded-md p-2 mt-1 grid grid-cols-2 gap-1 max-h-44 overflow-y-auto" data-testid="select-resource-counties">
          {NORTH_STATE_COUNTIES.map((c) => (
            <label key={c} className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded px-1.5 py-1">
              <Checkbox
                checked={form.selectedCounties.includes(c)}
                onCheckedChange={() => toggleCounty(c)}
                data-testid={`checkbox-county-${c}`}
              />
              <span className="text-sm">{c.replace(" County", "")}</span>
            </label>
          ))}
        </div>
        {form.selectedCounties.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {form.selectedCounties.map(c => (
              <Badge key={c} variant="outline" className="text-xs">{c.replace(" County", "")}</Badge>
            ))}
          </div>
        )}
      </div>
      <div>
        <Label>URL</Label>
        <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." data-testid="input-resource-url" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-resource-description" />
      </div>
      <div>
        <Label>Eligibility</Label>
        <Input value={form.eligibility} onChange={(e) => setForm({ ...form, eligibility: e.target.value })} data-testid="input-resource-eligibility" />
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 overflow-hidden">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-resources-title">Resources</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage scholarships, financial aid, and support services</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="pl-8 w-full max-w-64"
            data-testid="input-search-resources"
          />
        </div>
        <Dialog open={showDialog} onOpenChange={closeCreate}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-resource">
              <Plus className="w-4 h-4 mr-1.5" /> Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Resource</DialogTitle>
            </DialogHeader>
            {resourceForm}
            <Button
              className="w-full"
              onClick={() => createResource.mutate(form)}
              disabled={!form.name || !form.type || createResource.isPending}
              data-testid="button-save-resource"
            >
              {createResource.isPending ? "Adding..." : "Add Resource"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingResource} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
          </DialogHeader>
          {resourceForm}
          <Button
            className="w-full"
            onClick={() => editingResource && updateResource.mutate({ id: editingResource.id, data: form })}
            disabled={!form.name || !form.type || updateResource.isPending}
            data-testid="button-update-resource"
          >
            {updateResource.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <div className="space-y-2">
            {filtered?.map((resource) => (
              <Card key={resource.id} className="p-3 sm:p-3.5" data-testid={`card-resource-${resource.id}`}>
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{resource.name}</p>
                          <Badge variant="secondary" className="text-xs shrink-0">{resource.type}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center shrink-0">
                        {resource.url && (
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">
                            <Button size="icon" variant="ghost" className="h-7 w-7" data-testid={`button-open-resource-${resource.id}`}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(resource)} data-testid={`button-edit-resource-${resource.id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteResource.mutate(resource.id)} data-testid={`button-delete-resource-${resource.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {getPathwayNames(resource).map((name) => (
                        <Badge key={name} variant="outline" className="text-xs">{name}</Badge>
                      ))}
                      {getCountyDisplay(resource).length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {getCountyDisplay(resource).join(", ")}
                        </span>
                      )}
                    </div>
                    {resource.url && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{resource.url}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
      )}
    </div>
  );
}
