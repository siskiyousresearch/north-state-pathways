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
import { Plus, BookOpen, ExternalLink, Trash2, Search } from "lucide-react";
import type { Resource, Pathway } from "@shared/schema";

const resourceTypes = [
  "Scholarship", "Grant", "Financial Aid", "Fellowship",
  "Internship", "Program", "Support Service", "Other"
];

export default function ResourcesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "", description: "", url: "", eligibility: "", pathwayId: "", county: ""
  });

  const { data: resources, isLoading } = useQuery<Resource[]>({ queryKey: ["/api/admin/resources"] });
  const { data: pathways } = useQuery<Pathway[]>({ queryKey: ["/api/admin/pathways"] });

  const createResource = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest("POST", "/api/admin/resources", {
        ...data,
        pathwayId: data.pathwayId ? parseInt(data.pathwayId) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
      setShowDialog(false);
      setForm({ name: "", type: "", description: "", url: "", eligibility: "", pathwayId: "", county: "" });
      toast({ title: "Resource added" });
    },
  });

  const deleteResource = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/resources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
      toast({ title: "Resource deleted" });
    },
  });

  const filtered = resources?.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) ||
           (r.type && r.type.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
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
            className="pl-8 w-64"
            data-testid="input-search-resources"
          />
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-resource">
              <Plus className="w-4 h-4 mr-1.5" /> Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Resource</DialogTitle>
            </DialogHeader>
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
                <Label>Pathway</Label>
                <Select value={form.pathwayId} onValueChange={(v) => setForm({ ...form, pathwayId: v })}>
                  <SelectTrigger data-testid="select-resource-pathway"><SelectValue placeholder="All pathways" /></SelectTrigger>
                  <SelectContent>
                    {pathways?.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Button
                className="w-full"
                onClick={() => createResource.mutate(form)}
                disabled={!form.name || !form.type}
                data-testid="button-save-resource"
              >
                Add Resource
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            {filtered?.map((resource) => (
              <Card key={resource.id} className="p-3.5" data-testid={`card-resource-${resource.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{resource.name}</p>
                        <Badge variant="secondary" className="text-xs">{resource.type}</Badge>
                      </div>
                      {resource.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{resource.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {resource.url && (
                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => deleteResource.mutate(resource.id)} data-testid={`button-delete-resource-${resource.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
