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
import { Switch } from "@/components/ui/switch";
import { Plus, BookOpen, ExternalLink, Trash2, Search, Pencil, MapPin, ChevronDown, X } from "lucide-react";
import type { Resource, Pathway, EligibilityRule } from "@shared/schema";

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
  eligibilityRules: EligibilityRule[];
}

const emptyForm: ResourceForm = {
  name: "", type: "", description: "", url: "", eligibility: "",
  selectedPathwayIds: [], selectedCounties: [], eligibilityRules: [],
};

export default function ResourcesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [form, setForm] = useState<ResourceForm>(emptyForm);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [valueInputs, setValueInputs] = useState<Record<number, string>>({});

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
    eligibilityRules: f.eligibilityRules.length > 0 ? f.eligibilityRules : null,
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
      eligibilityRules: (resource.eligibilityRules as EligibilityRule[] | null) || [],
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

      {/* Eligibility Rules */}
      <div className="border rounded-md">
        <button
          type="button"
          className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium hover:bg-accent/50 rounded-md"
          onClick={() => setRulesOpen(!rulesOpen)}
        >
          <span>Eligibility Rules</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${rulesOpen ? "rotate-180" : ""}`} />
        </button>

        {rulesOpen && (
          <div className="px-3 pb-3 space-y-3">
            {form.eligibilityRules.map((rule, idx) => (
              <div key={idx} className="border rounded-md p-2.5 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Criterion</Label>
                    <Input
                      list="criterion-suggestions"
                      value={rule.criterion}
                      onChange={(e) => {
                        const updated = [...form.eligibilityRules];
                        updated[idx] = { ...rule, criterion: e.target.value };
                        setForm({ ...form, eligibilityRules: updated });
                      }}
                      placeholder="e.g. County of Residence"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="w-32">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={rule.type}
                      onValueChange={(v) => {
                        const updated = [...form.eligibilityRules];
                        const newType = v as EligibilityRule["type"];
                        updated[idx] = {
                          ...rule,
                          type: newType,
                          values: newType === "range" ? { min: undefined, max: undefined } :
                                  (newType === "select" || newType === "multiselect" || newType === "text") ? [] : undefined,
                        };
                        setForm({ ...form, eligibilityRules: updated });
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="multiselect">Multiselect</SelectItem>
                        <SelectItem value="range">Range</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-1.5 pb-0.5">
                    <div className="flex flex-col items-center gap-0.5">
                      <Label className="text-xs">Req</Label>
                      <Switch
                        checked={rule.required}
                        onCheckedChange={(checked) => {
                          const updated = [...form.eligibilityRules];
                          updated[idx] = { ...rule, required: checked };
                          setForm({ ...form, eligibilityRules: updated });
                        }}
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => {
                        const updated = form.eligibilityRules.filter((_, i) => i !== idx);
                        setForm({ ...form, eligibilityRules: updated });
                        const newInputs = { ...valueInputs };
                        delete newInputs[idx];
                        setValueInputs(newInputs);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Values UI based on type */}
                {(rule.type === "select" || rule.type === "multiselect") && (
                  <div>
                    <Label className="text-xs">Values</Label>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {Array.isArray(rule.values) && (rule.values as string[]).map((val, vi) => (
                        <Badge key={vi} variant="secondary" className="text-xs gap-0.5">
                          {val}
                          <button
                            type="button"
                            className="ml-0.5 hover:text-destructive"
                            onClick={() => {
                              const updated = [...form.eligibilityRules];
                              const newValues = [...(rule.values as string[])];
                              newValues.splice(vi, 1);
                              updated[idx] = { ...rule, values: newValues };
                              setForm({ ...form, eligibilityRules: updated });
                            }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        value={valueInputs[idx] || ""}
                        onChange={(e) => setValueInputs({ ...valueInputs, [idx]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = (valueInputs[idx] || "").trim();
                            if (!val) return;
                            const updated = [...form.eligibilityRules];
                            const currentValues = Array.isArray(rule.values) ? (rule.values as string[]) : [];
                            updated[idx] = { ...rule, values: [...currentValues, val] };
                            setForm({ ...form, eligibilityRules: updated });
                            setValueInputs({ ...valueInputs, [idx]: "" });
                          }
                        }}
                        placeholder="Type a value and press Enter"
                        className="h-8 text-sm flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 px-2.5"
                        disabled={!(valueInputs[idx] || "").trim()}
                        onClick={() => {
                          const val = (valueInputs[idx] || "").trim();
                          if (!val) return;
                          const updated = [...form.eligibilityRules];
                          const currentValues = Array.isArray(rule.values) ? (rule.values as string[]) : [];
                          updated[idx] = { ...rule, values: [...currentValues, val] };
                          setForm({ ...form, eligibilityRules: updated });
                          setValueInputs({ ...valueInputs, [idx]: "" });
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {rule.type === "text" && (
                  <div>
                    <Label className="text-xs">Value</Label>
                    <Input
                      value={Array.isArray(rule.values) ? (rule.values as string[]).join(", ") : (rule.values as string) || ""}
                      onChange={(e) => {
                        const updated = [...form.eligibilityRules];
                        updated[idx] = { ...rule, values: e.target.value ? [e.target.value] : [] };
                        setForm({ ...form, eligibilityRules: updated });
                      }}
                      placeholder="Enter the expected value"
                      className="h-8 text-sm"
                    />
                  </div>
                )}

                {rule.type === "range" && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Min</Label>
                      <Input
                        type="number"
                        value={(rule.values as { min?: number; max?: number })?.min ?? ""}
                        onChange={(e) => {
                          const updated = [...form.eligibilityRules];
                          const rangeVal = (rule.values as { min?: number; max?: number }) || {};
                          updated[idx] = {
                            ...rule,
                            values: { ...rangeVal, min: e.target.value ? Number(e.target.value) : undefined },
                          };
                          setForm({ ...form, eligibilityRules: updated });
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Max</Label>
                      <Input
                        type="number"
                        value={(rule.values as { min?: number; max?: number })?.max ?? ""}
                        onChange={(e) => {
                          const updated = [...form.eligibilityRules];
                          const rangeVal = (rule.values as { min?: number; max?: number }) || {};
                          updated[idx] = {
                            ...rule,
                            values: { ...rangeVal, max: e.target.value ? Number(e.target.value) : undefined },
                          };
                          setForm({ ...form, eligibilityRules: updated });
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            <datalist id="criterion-suggestions">
              <option value="County of Residence" />
              <option value="City" />
              <option value="Enrollment Status" />
              <option value="GPA" />
              <option value="Major/Pathway" />
              <option value="Citizenship" />
              <option value="Financial Need" />
              <option value="Age" />
              <option value="High School" />
              <option value="Institution" />
            </datalist>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setForm({
                  ...form,
                  eligibilityRules: [
                    ...form.eligibilityRules,
                    { criterion: "", type: "select", values: [], required: false },
                  ],
                });
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Rule
            </Button>
          </div>
        )}
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
