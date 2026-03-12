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
import { apiRequest, queryClient, getAdminToken } from "@/lib/queryClient";
import { Plus, Building2, Pencil, Trash2, MapPin, Globe, ExternalLink, Loader2 } from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import type { Institution } from "@shared/schema";

const INSTITUTION_TYPES = [
  "Community College",
  "University (CSU)",
  "University (UC)",
  "University (Private)",
  "University (Out-of-State)",
  "University (Online)",
  "County Office of Education",
  "Vocational/Trade School",
  "Other",
];

const NORTH_STATE_COUNTIES = [
  "Butte", "Glenn", "Lassen", "Modoc", "Plumas",
  "Shasta", "Sierra", "Siskiyou", "Tehama", "Trinity",
];

interface InstitutionForm {
  name: string;
  type: string;
  county: string;
  website: string;
  description: string;
  logoUrl: string;
  address: string;
  mapX: string;
  mapY: string;
}

const emptyForm: InstitutionForm = {
  name: "",
  type: "",
  county: "",
  website: "",
  description: "",
  logoUrl: "",
  address: "",
  mapX: "",
  mapY: "",
};

function institutionToForm(inst: Institution): InstitutionForm {
  return {
    name: inst.name || "",
    type: inst.type || "",
    county: inst.county || "",
    website: inst.website || "",
    description: inst.description || "",
    logoUrl: inst.logoUrl || "",
    address: inst.address || "",
    mapX: inst.mapX != null ? String(inst.mapX) : "",
    mapY: inst.mapY != null ? String(inst.mapY) : "",
  };
}

function getInitials(name: string): string {
  const words = name.split(/\s+/);
  const firstWord = words[0];
  if (firstWord === firstWord.toUpperCase() && firstWord.length >= 2 && firstWord.length <= 4) {
    return firstWord.slice(0, 3);
  }
  return words.filter(w => w[0] === w[0].toUpperCase()).map(w => w[0]).join("").slice(0, 3);
}

export default function InstitutionsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<Institution | null>(null);
  const [form, setForm] = useState<InstitutionForm>(emptyForm);
  const [customType, setCustomType] = useState("");
  const [showCustomType, setShowCustomType] = useState(false);

  const { data: institutions = [], isLoading } = useQuery<Institution[]>({
    queryKey: ["/api/admin/institutions"],
    queryFn: () =>
      fetch("/api/admin/institutions", {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      }).then(r => r.json()),
  });

  const createInst = useMutation({
    mutationFn: (data: Partial<Institution>) =>
      apiRequest("POST", "/api/admin/institutions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/institutions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/map/institutions"] });
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingInst(null);
      toast({ title: "Institution created" });
    },
    onError: () => toast({ title: "Failed to create institution", variant: "destructive" }),
  });

  const updateInst = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Institution> }) =>
      apiRequest("PATCH", `/api/admin/institutions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/institutions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/map/institutions"] });
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingInst(null);
      toast({ title: "Institution updated" });
    },
    onError: () => toast({ title: "Failed to update institution", variant: "destructive" }),
  });

  const deleteInst = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/institutions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/institutions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/map/institutions"] });
      toast({ title: "Institution deleted" });
    },
    onError: () => toast({ title: "Failed to delete institution", variant: "destructive" }),
  });

  function openNew() {
    setEditingInst(null);
    setForm(emptyForm);
    setShowCustomType(false);
    setCustomType("");
    setDialogOpen(true);
  }

  function openEdit(inst: Institution) {
    setEditingInst(inst);
    setForm(institutionToForm(inst));
    const isPreset = INSTITUTION_TYPES.includes(inst.type);
    setShowCustomType(!isPreset);
    setCustomType(!isPreset ? inst.type : "");
    setDialogOpen(true);
  }

  function buildPayload() {
    const type = showCustomType ? customType : form.type;
    return {
      name: form.name,
      type,
      county: form.county || null,
      website: form.website || null,
      description: form.description || null,
      logoUrl: form.logoUrl || null,
      address: form.address || null,
      mapX: form.mapX ? parseInt(form.mapX) : null,
      mapY: form.mapY ? parseInt(form.mapY) : null,
    };
  }

  function handleSave() {
    const payload = buildPayload();
    if (!payload.name || !payload.type) return;
    if (editingInst) {
      updateInst.mutate({ id: editingInst.id, data: payload });
    } else {
      createInst.mutate(payload);
    }
  }

  const isPending = createInst.isPending || updateInst.isPending;

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" /> Institutions
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage colleges, universities, and partner institutions
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNew} data-testid="button-new-institution">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Institution
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingInst ? "Edit Institution" : "New Institution"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Shasta College"
                      data-testid="input-institution-name"
                    />
                  </div>
                  <div>
                    <Label>Type *</Label>
                    {!showCustomType ? (
                      <div className="flex gap-2">
                        <Select
                          value={form.type}
                          onValueChange={v => {
                            if (v === "__custom__") { setShowCustomType(true); setForm({ ...form, type: "" }); }
                            else setForm({ ...form, type: v });
                          }}
                        >
                          <SelectTrigger data-testid="select-institution-type">
                            <SelectValue placeholder="Select type…" />
                          </SelectTrigger>
                          <SelectContent>
                            {INSTITUTION_TYPES.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                            <SelectItem value="__custom__">Other / Custom…</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={customType}
                          onChange={e => setCustomType(e.target.value)}
                          placeholder="Enter custom type"
                          data-testid="input-institution-custom-type"
                        />
                        <Button variant="outline" size="sm" onClick={() => setShowCustomType(false)}>
                          Use list
                        </Button>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>County</Label>
                    <Select
                      value={form.county || "__none__"}
                      onValueChange={v => setForm({ ...form, county: v === "__none__" ? "" : v })}
                    >
                      <SelectTrigger data-testid="select-institution-county">
                        <SelectValue placeholder="Select county (or none)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None (regional/online)</SelectItem>
                        {NORTH_STATE_COUNTIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={form.website}
                      onChange={e => setForm({ ...form, website: e.target.value })}
                      placeholder="https://example.edu"
                      data-testid="input-institution-website"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Brief description"
                      rows={2}
                      data-testid="input-institution-description"
                    />
                  </div>
                  <div>
                    <Label>Logo URL</Label>
                    <Input
                      value={form.logoUrl}
                      onChange={e => setForm({ ...form, logoUrl: e.target.value })}
                      placeholder="/images/logos/my-school.png"
                      data-testid="input-institution-logo-url"
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={form.address}
                      onChange={e => setForm({ ...form, address: e.target.value })}
                      placeholder="123 Main St, Redding, CA"
                      data-testid="input-institution-address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Map X (px)</Label>
                      <Input
                        type="number"
                        value={form.mapX}
                        onChange={e => setForm({ ...form, mapX: e.target.value })}
                        placeholder="e.g. 228"
                        data-testid="input-institution-map-x"
                      />
                    </div>
                    <div>
                      <Label>Map Y (px)</Label>
                      <Input
                        type="number"
                        value={form.mapY}
                        onChange={e => setForm({ ...form, mapY: e.target.value })}
                        placeholder="e.g. 369"
                        data-testid="input-institution-map-y"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Map X/Y positions the marker on the Explore Map (SVG 600×700). Leave blank for off-map institutions (online, out-of-state).</p>
                  <Button
                    className="w-full"
                    onClick={handleSave}
                    disabled={!form.name || (!form.type && !customType) || isPending}
                    data-testid="button-save-institution"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                    {editingInst ? "Save Changes" : "Create Institution"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-36 w-full" />)}
            </div>
          ) : institutions.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No institutions yet. Add one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {institutions.map(inst => (
                <Card key={inst.id} className="p-4 flex flex-col gap-3" data-testid={`card-institution-${inst.id}`}>
                  <div className="flex items-start gap-3">
                    {inst.logoUrl ? (
                      <img src={inst.logoUrl} alt={inst.name} className="w-10 h-10 object-contain rounded shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
                        {getInitials(inst.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm leading-tight">{inst.name}</p>
                      <Badge variant="secondary" className="text-xs mt-1">{inst.type}</Badge>
                    </div>
                  </div>
                  {inst.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{inst.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {inst.county && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" /> {inst.county}
                      </span>
                    )}
                    {inst.mapX != null && inst.mapY != null && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-primary" /> Map ({inst.mapX},{inst.mapY})
                      </span>
                    )}
                    {inst.website && (
                      <a
                        href={inst.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-primary hover:underline"
                        data-testid={`link-institution-website-${inst.id}`}
                      >
                        <Globe className="w-3 h-3" /> Visit site
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(inst)}
                      data-testid={`button-edit-institution-${inst.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete "${inst.name}"?`)) deleteInst.mutate(inst.id);
                      }}
                      data-testid={`button-delete-institution-${inst.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
