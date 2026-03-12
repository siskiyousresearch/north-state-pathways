import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Users, Search, Pencil, Phone, Mail, Building2 } from "lucide-react";
import type { Contact, Institution } from "@shared/schema";

interface ContactForm {
  name: string;
  title: string;
  phone: string;
  email: string;
  institutionId: number | null;
}

const emptyForm: ContactForm = {
  name: "", title: "", phone: "", email: "", institutionId: null,
};

export default function ContactsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);

  const { data: contacts, isLoading } = useQuery<Contact[]>({ queryKey: ["/api/admin/contacts"] });
  const { data: institutions } = useQuery<Institution[]>({ queryKey: ["/api/admin/institutions"] });

  const buildPayload = (f: ContactForm) => ({
    name: f.name,
    title: f.title,
    phone: f.phone,
    email: f.email,
    institutionId: f.institutionId,
  });

  const createContact = useMutation({
    mutationFn: (data: ContactForm) => apiRequest("POST", "/api/admin/contacts", buildPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contacts"] });
      setShowDialog(false);
      setForm(emptyForm);
      toast({ title: "Contact added" });
    },
  });

  const updateContact = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ContactForm }) =>
      apiRequest("PATCH", `/api/admin/contacts/${id}`, buildPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contacts"] });
      setEditingContact(null);
      setForm(emptyForm);
      toast({ title: "Contact updated" });
    },
  });

  const openEdit = (contact: Contact) => {
    setForm({
      name: contact.name,
      title: contact.title,
      phone: contact.phone,
      email: contact.email,
      institutionId: contact.institutionId,
    });
    setEditingContact(contact);
  };

  const closeEdit = () => {
    setEditingContact(null);
    setForm(emptyForm);
  };

  const closeCreate = (open: boolean) => {
    setShowDialog(open);
    if (!open) setForm(emptyForm);
  };

  const filtered = contacts?.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) ||
           c.title.toLowerCase().includes(search.toLowerCase()) ||
           c.email.toLowerCase().includes(search.toLowerCase())
  );

  const getInstitutionName = (institutionId: number | null) => {
    if (!institutionId) return null;
    return institutions?.find(i => i.id === institutionId)?.name || null;
  };

  const contactForm = (
    <div className="space-y-3 mt-2">
      <div>
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-contact-name" />
      </div>
      <div>
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Career Counselor" data-testid="input-contact-title" />
      </div>
      <div>
        <Label>Phone</Label>
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" data-testid="input-contact-phone" />
      </div>
      <div>
        <Label>Email</Label>
        <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" type="email" data-testid="input-contact-email" />
      </div>
      <div>
        <Label>Institution</Label>
        <Select
          value={form.institutionId?.toString() || "none"}
          onValueChange={(v) => setForm({ ...form, institutionId: v === "none" ? null : parseInt(v) })}
        >
          <SelectTrigger data-testid="select-contact-institution">
            <SelectValue placeholder="Select institution" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No institution</SelectItem>
            {institutions?.map((inst) => (
              <SelectItem key={inst.id} value={inst.id.toString()}>{inst.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-contacts-title">Contacts</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage counselors and institutional contacts</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="pl-8 w-64"
            data-testid="input-search-contacts"
          />
        </div>
        <Dialog open={showDialog} onOpenChange={closeCreate}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-contact">
              <Plus className="w-4 h-4 mr-1.5" /> Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
            </DialogHeader>
            {contactForm}
            <Button
              className="w-full"
              onClick={() => createContact.mutate(form)}
              disabled={!form.name || !form.title || !form.phone || !form.email || createContact.isPending}
              data-testid="button-save-contact"
            >
              {createContact.isPending ? "Adding..." : "Add Contact"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingContact} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          {contactForm}
          <Button
            className="w-full"
            onClick={() => editingContact && updateContact.mutate({ id: editingContact.id, data: form })}
            disabled={!form.name || !form.title || !form.phone || !form.email || updateContact.isPending}
            data-testid="button-update-contact"
          >
            {updateContact.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            {filtered.map((contact) => {
              const instName = getInstitutionName(contact.institutionId);
              return (
                <Card key={contact.id} className="p-3.5" data-testid={`card-contact-${contact.id}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate" data-testid={`text-contact-name-${contact.id}`}>{contact.name}</p>
                          <Badge variant="secondary" className="text-xs" data-testid={`text-contact-title-${contact.id}`}>{contact.title}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-muted-foreground">
                          <span className="flex items-center gap-1" data-testid={`text-contact-phone-${contact.id}`}>
                            <Phone className="w-3 h-3" /> {contact.phone}
                          </span>
                          <span className="flex items-center gap-1" data-testid={`text-contact-email-${contact.id}`}>
                            <Mail className="w-3 h-3" /> {contact.email}
                          </span>
                          {instName && (
                            <span className="flex items-center gap-1" data-testid={`text-contact-institution-${contact.id}`}>
                              <Building2 className="w-3 h-3" /> {instName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(contact)} data-testid={`button-edit-contact-${contact.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No contacts yet. Add your first contact to get started.</p>
        </div>
      )}
    </div>
  );
}
