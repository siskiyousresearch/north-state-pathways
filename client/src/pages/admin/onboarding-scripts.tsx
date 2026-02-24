import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Mic, Square, Play, Pause, Wand2, Save, Trash2, Plus,
  Volume2, FileAudio, Loader2, RefreshCw
} from "lucide-react";
import type { Pathway, OnboardingScript } from "@shared/schema";

const STEPS = [
  { id: "welcome", label: "Welcome", description: "Initial welcome message when student arrives" },
  { id: "county", label: "County Selection", description: "Prompt to select their county" },
  { id: "student-type", label: "Student Type", description: "Prompt to identify their education level" },
  { id: "study-location", label: "Study Location", description: "Ask about local vs. travel preference" },
  { id: "support-needs", label: "Support Needs", description: "Ask about needed support services" },
];

const VOICES = [
  { id: "nova", label: "Nova (Female)" },
  { id: "alloy", label: "Alloy (Neutral)" },
  { id: "echo", label: "Echo (Male)" },
  { id: "fable", label: "Fable (Male)" },
  { id: "onyx", label: "Onyx (Male)" },
  { id: "shimmer", label: "Shimmer (Female)" },
];

const CONTEXT_OPTIONS: Record<string, { id: string; label: string }[]> = {
  "county": [],
  "student-type": [
    { id: "butte", label: "Butte County" },
    { id: "glenn", label: "Glenn County" },
    { id: "lassen", label: "Lassen County" },
    { id: "modoc", label: "Modoc County" },
    { id: "plumas", label: "Plumas County" },
    { id: "shasta", label: "Shasta County" },
    { id: "sierra", label: "Sierra County" },
    { id: "siskiyou", label: "Siskiyou County" },
    { id: "tehama", label: "Tehama County" },
    { id: "trinity", label: "Trinity County" },
  ],
  "study-location": [
    { id: "high-school", label: "High School Student" },
    { id: "hs-grad-no-college", label: "HS Graduate, No College" },
    { id: "some-college", label: "Some College" },
    { id: "associates", label: "Associate's Degree" },
    { id: "bachelors-seeking-masters", label: "Seeking Master's" },
    { id: "seeking-doctorate", label: "Seeking Doctorate" },
  ],
  "support-needs": [
    { id: "local", label: "Study Locally" },
    { id: "travel", label: "Willing to Travel" },
  ],
};

export default function OnboardingScriptsPage() {
  const { toast } = useToast();
  const [selectedPathwayId, setSelectedPathwayId] = useState<string>("");
  const [selectedStep, setSelectedStep] = useState<string>("welcome");
  const [selectedContext, setSelectedContext] = useState<string>("");
  const [editingScript, setEditingScript] = useState<OnboardingScript | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: "",
    scriptText: "",
    contextKey: "",
  });

  const { data: pathways = [] } = useQuery<Pathway[]>({
    queryKey: ["/api/admin/pathways"],
  });

  const scriptsQueryKey = selectedPathwayId
    ? ["/api/admin/onboarding-scripts", { pathwayId: selectedPathwayId }]
    : ["/api/admin/onboarding-scripts"];

  const { data: scripts = [], isLoading: scriptsLoading } = useQuery<OnboardingScript[]>({
    queryKey: scriptsQueryKey,
    queryFn: async () => {
      const url = selectedPathwayId
        ? `/api/admin/onboarding-scripts?pathwayId=${selectedPathwayId}`
        : "/api/admin/onboarding-scripts";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch scripts");
      return res.json();
    },
    enabled: !!selectedPathwayId,
  });

  const filteredScripts = scripts.filter(s => {
    if (s.step !== selectedStep) return false;
    if (selectedContext && s.contextKey !== selectedContext) return false;
    if (!selectedContext && s.contextKey) return false;
    return true;
  });

  const allStepScripts = scripts.filter(s => s.step === selectedStep);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/onboarding-scripts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onboarding-scripts"] });
      setShowCreateDialog(false);
      setCreateForm({ title: "", scriptText: "", contextKey: "" });
      toast({ title: "Script created" });
    },
    onError: () => toast({ title: "Failed to create script", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/onboarding-scripts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onboarding-scripts"] });
      toast({ title: "Script updated" });
    },
    onError: () => toast({ title: "Failed to update script", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/onboarding-scripts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onboarding-scripts"] });
      setEditingScript(null);
      toast({ title: "Script deleted" });
    },
    onError: () => toast({ title: "Failed to delete script", variant: "destructive" }),
  });

  const handleCreateScript = () => {
    if (!selectedPathwayId) return;
    createMutation.mutate({
      pathwayId: parseInt(selectedPathwayId),
      step: selectedStep,
      contextKey: selectedContext || null,
      title: createForm.title,
      scriptText: createForm.scriptText,
    });
  };

  const handleAutoGenerate = async (forCreate = false) => {
    if (!selectedPathwayId) return;
    try {
      const res = await apiRequest("POST", "/api/admin/onboarding-scripts/auto-generate", {
        pathwayId: parseInt(selectedPathwayId),
        step: selectedStep,
        contextKey: selectedContext || null,
      });
      const data = await res.json();
      if (forCreate) {
        const stepInfo = STEPS.find(s => s.id === selectedStep);
        setCreateForm({
          title: stepInfo?.label || selectedStep,
          scriptText: data.scriptText,
          contextKey: selectedContext,
        });
      } else if (editingScript) {
        setEditingScript({ ...editingScript, scriptText: data.scriptText });
      }
      toast({ title: "Script generated by AI" });
    } catch {
      toast({ title: "Failed to generate script", variant: "destructive" });
    }
  };

  const contextOptions = CONTEXT_OPTIONS[selectedStep] || [];
  const selectedPathway = pathways.find(p => p.id === parseInt(selectedPathwayId));
  const stepInfo = STEPS.find(s => s.id === selectedStep);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-onboarding-scripts-title">Onboarding Scripts</h1>
        <p className="text-muted-foreground mt-1">Edit the narration scripts and audio for each onboarding step</p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="w-64">
          <Label>Pathway</Label>
          <Select value={selectedPathwayId} onValueChange={(v) => { setSelectedPathwayId(v); setSelectedContext(""); }}>
            <SelectTrigger data-testid="select-pathway">
              <SelectValue placeholder="Select a pathway..." />
            </SelectTrigger>
            <SelectContent>
              {pathways.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-56">
          <Label>Step</Label>
          <Select value={selectedStep} onValueChange={(v) => { setSelectedStep(v); setSelectedContext(""); }}>
            <SelectTrigger data-testid="select-step">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STEPS.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {contextOptions.length > 0 && (
          <div className="w-56">
            <Label>Context (optional)</Label>
            <Select value={selectedContext} onValueChange={setSelectedContext}>
              <SelectTrigger data-testid="select-context">
                <SelectValue placeholder="All contexts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All contexts</SelectItem>
                {contextOptions.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!selectedPathwayId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a pathway to view and edit onboarding scripts
          </CardContent>
        </Card>
      ) : scriptsLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{stepInfo?.label} Scripts</h2>
              <p className="text-sm text-muted-foreground">{stepInfo?.description}</p>
              {selectedContext && selectedContext !== "__all__" && (
                <Badge variant="secondary" className="mt-1">
                  Context: {contextOptions.find(c => c.id === selectedContext)?.label || selectedContext}
                </Badge>
              )}
            </div>
            <Button
              onClick={() => {
                setShowCreateDialog(true);
                setCreateForm({ title: "", scriptText: "", contextKey: selectedContext === "__all__" ? "" : selectedContext });
              }}
              data-testid="button-add-script"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Script
            </Button>
          </div>

          {(selectedContext === "__all__" ? allStepScripts : filteredScripts).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No scripts for this step yet. Click "Add Script" to create one, or use the AI to auto-generate it.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {(selectedContext === "__all__" ? allStepScripts : filteredScripts).map(script => (
                <ScriptCard
                  key={script.id}
                  script={script}
                  onEdit={() => setEditingScript(script)}
                  onDelete={() => deleteMutation.mutate(script.id)}
                  contextOptions={contextOptions}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Script for {stepInfo?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={createForm.title}
                onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                placeholder={stepInfo?.label || "Script title"}
                data-testid="input-script-title"
              />
            </div>
            {contextOptions.length > 0 && (
              <div>
                <Label>Context</Label>
                <Select value={createForm.contextKey} onValueChange={v => setCreateForm(f => ({ ...f, contextKey: v }))}>
                  <SelectTrigger data-testid="select-create-context">
                    <SelectValue placeholder="Select context..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contextOptions.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Script Text</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAutoGenerate(true)}
                  data-testid="button-auto-generate-create"
                >
                  <Wand2 className="w-3.5 h-3.5 mr-1" />
                  Auto-generate
                </Button>
              </div>
              <Textarea
                value={createForm.scriptText}
                onChange={e => setCreateForm(f => ({ ...f, scriptText: e.target.value }))}
                placeholder="The narration text that will be spoken..."
                rows={4}
                data-testid="textarea-script-text"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCreateScript}
              disabled={!createForm.title || !createForm.scriptText || createMutation.isPending}
              data-testid="button-save-script"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingScript && (
        <ScriptEditor
          script={editingScript}
          onClose={() => setEditingScript(null)}
          onSave={(data) => updateMutation.mutate({ id: editingScript.id, data })}
          onAutoGenerate={() => handleAutoGenerate(false)}
          onScriptTextChange={(text) => setEditingScript({ ...editingScript, scriptText: text })}
          saving={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ScriptCard({
  script,
  onEdit,
  onDelete,
  contextOptions,
}: {
  script: OnboardingScript;
  onEdit: () => void;
  onDelete: () => void;
  contextOptions: { id: string; label: string }[];
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = () => {
    if (!script.audioUrl) return;
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      return;
    }
    const audio = new Audio(script.audioUrl);
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audio.play();
    setPlaying(true);
  };

  const contextLabel = script.contextKey
    ? contextOptions.find(c => c.id === script.contextKey)?.label || script.contextKey
    : null;

  return (
    <Card data-testid={`card-script-${script.id}`}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium">{script.title}</h3>
              {contextLabel && (
                <Badge variant="secondary" className="text-xs">{contextLabel}</Badge>
              )}
              {script.audioUrl ? (
                <Badge variant="default" className="text-xs gap-1">
                  <FileAudio className="w-3 h-3" /> Audio ready
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">No audio</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{script.scriptText}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {script.audioUrl && (
              <Button size="icon" variant="ghost" onClick={playAudio} data-testid={`button-play-${script.id}`}>
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onEdit} data-testid={`button-edit-script-${script.id}`}>
              Edit
            </Button>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={onDelete} data-testid={`button-delete-script-${script.id}`}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScriptEditor({
  script,
  onClose,
  onSave,
  onAutoGenerate,
  onScriptTextChange,
  saving,
}: {
  script: OnboardingScript;
  onClose: () => void;
  onSave: (data: Partial<OnboardingScript>) => void;
  onAutoGenerate: () => void;
  onScriptTextChange: (text: string) => void;
  saving: boolean;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(script.title);
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [recordedUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast({ title: "Microphone access denied", description: "Please allow microphone access to record audio.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playPreview = () => {
    const url = recordedUrl || script.audioUrl;
    if (!url) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  };

  const uploadRecordedAudio = async () => {
    if (!recordedBlob) return;
    setUploadingAudio(true);
    try {
      const res = await fetch(`/api/admin/onboarding-scripts/${script.id}/upload-audio`, {
        method: "POST",
        body: recordedBlob,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onboarding-scripts"] });
      toast({ title: "Audio uploaded successfully" });
      setRecordedBlob(null);
    } catch {
      toast({ title: "Failed to upload audio", variant: "destructive" });
    } finally {
      setUploadingAudio(false);
    }
  };

  const generateAudio = async () => {
    setGeneratingAudio(true);
    try {
      const res = await apiRequest("POST", `/api/admin/onboarding-scripts/${script.id}/generate-audio`, {
        voice: selectedVoice,
      });
      if (!res.ok) throw new Error("Generation failed");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onboarding-scripts"] });
      toast({ title: "Audio generated with AI voice" });
    } catch {
      toast({ title: "Failed to generate audio", variant: "destructive" });
    } finally {
      setGeneratingAudio(false);
    }
  };

  const handleSave = () => {
    onSave({ title, scriptText: script.scriptText });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Script</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              data-testid="input-edit-title"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Script Text</Label>
              <Button variant="ghost" size="sm" onClick={onAutoGenerate} data-testid="button-auto-generate-edit">
                <Wand2 className="w-3.5 h-3.5 mr-1" />
                Re-generate with AI
              </Button>
            </div>
            <Textarea
              value={script.scriptText}
              onChange={e => onScriptTextChange(e.target.value)}
              rows={5}
              data-testid="textarea-edit-script"
            />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Audio</CardTitle>
              <CardDescription>Record your own voice or generate with AI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {script.audioUrl && (
                  <Badge variant="default" className="gap-1">
                    <FileAudio className="w-3 h-3" /> Current audio available
                  </Badge>
                )}
                {recordedBlob && (
                  <Badge variant="secondary" className="gap-1">
                    <Mic className="w-3 h-3" /> New recording ready
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <Button variant="outline" onClick={startRecording} data-testid="button-start-recording">
                    <Mic className="w-4 h-4 mr-1.5" />
                    Record
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={stopRecording} data-testid="button-stop-recording">
                    <Square className="w-4 h-4 mr-1.5" />
                    Stop Recording
                  </Button>
                )}

                {(recordedUrl || script.audioUrl) && (
                  <Button variant="outline" onClick={playPreview} data-testid="button-play-preview">
                    {isPlaying ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5" />}
                    {isPlaying ? "Stop" : "Preview"}
                  </Button>
                )}

                {recordedBlob && (
                  <Button
                    onClick={uploadRecordedAudio}
                    disabled={uploadingAudio}
                    data-testid="button-upload-recording"
                  >
                    {uploadingAudio ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Volume2 className="w-4 h-4 mr-1.5" />}
                    Save Recording
                  </Button>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Or generate with AI voice:</p>
                <div className="flex items-center gap-2">
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger className="w-48" data-testid="select-voice">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICES.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="secondary"
                    onClick={generateAudio}
                    disabled={generatingAudio || !script.scriptText}
                    data-testid="button-generate-audio"
                  >
                    {generatingAudio ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1.5" />}
                    Generate Audio
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-edit">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
