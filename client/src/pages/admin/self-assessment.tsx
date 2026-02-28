import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
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
  Plus, Trash2, Pencil, Sparkles, GripVertical,
  ClipboardCheck, Stethoscope, GraduationCap, Eye, EyeOff,
  ArrowUp, ArrowDown, Image, Loader2
} from "lucide-react";
import type { AssessmentQuestion, AssessmentOption, AssessmentCareer } from "@shared/schema";

type QuestionWithOptions = AssessmentQuestion & { options: AssessmentOption[] };

interface QuestionForm {
  track: string;
  category: string;
  questionEn: string;
  questionEs: string;
  gifUrl: string;
  multiSelect: boolean;
  isActive: boolean;
  sortOrder: number;
  options: { value: string; labelEn: string; labelEs: string }[];
}

interface CareerForm {
  track: string;
  name: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  salaryEn: string;
  salaryEs: string;
  educationEn: string;
  educationEs: string;
  outlookEn: string;
  outlookEs: string;
}

const emptyQuestionForm: QuestionForm = {
  track: "healthcare", category: "", questionEn: "", questionEs: "",
  gifUrl: "", multiSelect: false, isActive: true, sortOrder: 0,
  options: [{ value: "", labelEn: "", labelEs: "" }],
};

const emptyCareerForm: CareerForm = {
  track: "healthcare", name: "", nameEs: "",
  descriptionEn: "", descriptionEs: "",
  salaryEn: "", salaryEs: "",
  educationEn: "", educationEs: "",
  outlookEn: "", outlookEs: "",
};

export default function SelfAssessmentAdmin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("questions");
  const [trackFilter, setTrackFilter] = useState("healthcare");

  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionWithOptions | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(emptyQuestionForm);

  const [showCareerDialog, setShowCareerDialog] = useState(false);
  const [editingCareer, setEditingCareer] = useState<AssessmentCareer | null>(null);
  const [careerForm, setCareerForm] = useState<CareerForm>(emptyCareerForm);

  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const { data: questions, isLoading: questionsLoading } = useQuery<QuestionWithOptions[]>({
    queryKey: ["/api/admin/assessment/questions"],
  });

  const { data: careers, isLoading: careersLoading } = useQuery<AssessmentCareer[]>({
    queryKey: ["/api/admin/assessment/careers"],
  });

  const filteredQuestions = (questions || [])
    .filter(q => q.track === trackFilter)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const filteredCareers = (careers || [])
    .filter(c => c.track === trackFilter);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/assessment/questions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/assessment/careers"] });
  };

  const createQuestion = useMutation({
    mutationFn: (data: QuestionForm) => apiRequest("POST", "/api/admin/assessment/questions", data),
    onSuccess: () => { invalidateAll(); setShowQuestionDialog(false); toast({ title: "Question created" }); },
    onError: () => toast({ title: "Failed to create question", variant: "destructive" }),
  });

  const updateQuestion = useMutation({
    mutationFn: (data: { id: number } & QuestionForm) =>
      apiRequest("PATCH", `/api/admin/assessment/questions/${data.id}`, data),
    onSuccess: () => { invalidateAll(); setShowQuestionDialog(false); setEditingQuestion(null); toast({ title: "Question updated" }); },
    onError: () => toast({ title: "Failed to update question", variant: "destructive" }),
  });

  const deleteQuestion = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/assessment/questions/${id}`),
    onSuccess: () => { invalidateAll(); toast({ title: "Question deleted" }); },
    onError: () => toast({ title: "Failed to delete question", variant: "destructive" }),
  });

  const toggleQuestionActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/assessment/questions/${id}`, { isActive }),
    onSuccess: () => invalidateAll(),
  });

  const reorderQuestion = useMutation({
    mutationFn: ({ id, sortOrder }: { id: number; sortOrder: number }) =>
      apiRequest("PATCH", `/api/admin/assessment/questions/${id}`, { sortOrder }),
    onSuccess: () => invalidateAll(),
  });

  const createCareer = useMutation({
    mutationFn: (data: CareerForm) => apiRequest("POST", "/api/admin/assessment/careers", data),
    onSuccess: () => { invalidateAll(); setShowCareerDialog(false); toast({ title: "Career created" }); },
    onError: () => toast({ title: "Failed to create career", variant: "destructive" }),
  });

  const updateCareer = useMutation({
    mutationFn: (data: { id: number } & CareerForm) =>
      apiRequest("PATCH", `/api/admin/assessment/careers/${data.id}`, data),
    onSuccess: () => { invalidateAll(); setShowCareerDialog(false); setEditingCareer(null); toast({ title: "Career updated" }); },
    onError: () => toast({ title: "Failed to update career", variant: "destructive" }),
  });

  const deleteCareer = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/assessment/careers/${id}`),
    onSuccess: () => { invalidateAll(); toast({ title: "Career deleted" }); },
    onError: () => toast({ title: "Failed to delete career", variant: "destructive" }),
  });

  function openNewQuestion() {
    setEditingQuestion(null);
    setQuestionForm({ ...emptyQuestionForm, track: trackFilter });
    setShowQuestionDialog(true);
  }

  function openEditQuestion(q: QuestionWithOptions) {
    setEditingQuestion(q);
    setQuestionForm({
      track: q.track,
      category: q.category,
      questionEn: q.questionEn,
      questionEs: q.questionEs,
      gifUrl: q.gifUrl || "",
      multiSelect: q.multiSelect ?? false,
      isActive: q.isActive ?? true,
      sortOrder: q.sortOrder ?? 0,
      options: q.options.map(o => ({ value: o.value, labelEn: o.labelEn, labelEs: o.labelEs })),
    });
    setShowQuestionDialog(true);
  }

  function handleSaveQuestion() {
    if (editingQuestion) {
      updateQuestion.mutate({ id: editingQuestion.id, ...questionForm });
    } else {
      createQuestion.mutate(questionForm);
    }
  }

  function addOption() {
    setQuestionForm(f => ({ ...f, options: [...f.options, { value: "", labelEn: "", labelEs: "" }] }));
  }

  function removeOption(idx: number) {
    setQuestionForm(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }));
  }

  function updateOption(idx: number, field: string, value: string) {
    setQuestionForm(f => ({
      ...f,
      options: f.options.map((o, i) => i === idx ? { ...o, [field]: value } : o),
    }));
  }

  function openNewCareer() {
    setEditingCareer(null);
    setCareerForm({ ...emptyCareerForm, track: trackFilter });
    setShowCareerDialog(true);
  }

  function openEditCareer(c: AssessmentCareer) {
    setEditingCareer(c);
    setCareerForm({
      track: c.track,
      name: c.name,
      nameEs: c.nameEs || "",
      descriptionEn: c.descriptionEn || "",
      descriptionEs: c.descriptionEs || "",
      salaryEn: c.salaryEn || "",
      salaryEs: c.salaryEs || "",
      educationEn: c.educationEn || "",
      educationEs: c.educationEs || "",
      outlookEn: c.outlookEn || "",
      outlookEs: c.outlookEs || "",
    });
    setShowCareerDialog(true);
  }

  function handleSaveCareer() {
    if (editingCareer) {
      updateCareer.mutate({ id: editingCareer.id, ...careerForm });
    } else {
      createCareer.mutate(careerForm);
    }
  }

  async function aiAssistQuestion(type: "question" | "improve_question") {
    setAiLoading(type);
    try {
      const context = type === "question"
        ? { track: trackFilter, existingQuestions: filteredQuestions.map(q => q.category).join(", ") }
        : { questionEn: questionForm.questionEn, questionEs: questionForm.questionEs, options: questionForm.options };
      const res = await apiRequest("POST", "/api/admin/assessment/ai-assist", { type, context });
      const data = await res.json();
      if (data.result) {
        if (type === "question") {
          setQuestionForm(f => ({
            ...f,
            category: data.result.category || f.category,
            questionEn: data.result.questionEn || f.questionEn,
            questionEs: data.result.questionEs || f.questionEs,
            options: data.result.options || f.options,
          }));
          toast({ title: "AI generated a new question" });
        } else {
          setQuestionForm(f => ({
            ...f,
            questionEn: data.result.questionEn || f.questionEn,
            questionEs: data.result.questionEs || f.questionEs,
            options: data.result.options || f.options,
          }));
          toast({ title: "AI improved the question" });
        }
      }
    } catch {
      toast({ title: "AI assist failed", variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  }

  async function aiAssistGif() {
    setAiLoading("gif");
    try {
      const res = await apiRequest("POST", "/api/admin/assessment/ai-assist", {
        type: "gif",
        context: { questionEn: questionForm.questionEn },
      });
      const data = await res.json();
      if (data.result && Array.isArray(data.result)) {
        toast({ title: "GIF suggestions", description: data.result.join(", ") });
      }
    } catch {
      toast({ title: "AI GIF assist failed", variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  }

  async function aiAssistCareer() {
    setAiLoading("career");
    try {
      const res = await apiRequest("POST", "/api/admin/assessment/ai-assist", {
        type: "career",
        context: { track: careerForm.track, name: careerForm.name || undefined },
      });
      const data = await res.json();
      if (data.result) {
        setCareerForm(f => ({
          ...f,
          name: data.result.name || f.name,
          nameEs: data.result.nameEs || f.nameEs,
          descriptionEn: data.result.descriptionEn || f.descriptionEn,
          descriptionEs: data.result.descriptionEs || f.descriptionEs,
          salaryEn: data.result.salaryEn || f.salaryEn,
          salaryEs: data.result.salaryEs || f.salaryEs,
          educationEn: data.result.educationEn || f.educationEn,
          educationEs: data.result.educationEs || f.educationEs,
          outlookEn: data.result.outlookEn || f.outlookEn,
          outlookEs: data.result.outlookEs || f.outlookEs,
        }));
        toast({ title: "AI generated career profile" });
      }
    } catch {
      toast({ title: "AI career assist failed", variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  }

  function handleMoveQuestion(q: QuestionWithOptions, direction: "up" | "down") {
    const idx = filteredQuestions.indexOf(q);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= filteredQuestions.length) return;
    const other = filteredQuestions[swapIdx];
    reorderQuestion.mutate({ id: q.id, sortOrder: other.sortOrder ?? swapIdx });
    reorderQuestion.mutate({ id: other.id, sortOrder: q.sortOrder ?? idx });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10" data-testid="icon-self-assessment">
          <ClipboardCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold" data-testid="text-self-assessment-title">Self-Assessment Manager</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-self-assessment-subtitle">
            Manage quiz questions, options, and career profiles
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-3 flex-wrap">
          <TabsList data-testid="tabs-assessment">
            <TabsTrigger value="questions" data-testid="tab-questions">Questions</TabsTrigger>
            <TabsTrigger value="careers" data-testid="tab-careers">Careers</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <Button
              variant={trackFilter === "healthcare" ? "default" : "outline"}
              size="sm"
              onClick={() => setTrackFilter("healthcare")}
              data-testid="button-filter-healthcare"
            >
              <Stethoscope className="w-4 h-4 mr-1" />
              Healthcare
            </Button>
            <Button
              variant={trackFilter === "education" ? "default" : "outline"}
              size="sm"
              onClick={() => setTrackFilter("education")}
              data-testid="button-filter-education"
            >
              <GraduationCap className="w-4 h-4 mr-1" />
              Education
            </Button>
          </div>
        </div>

        <TabsContent value="questions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground" data-testid="text-question-count">
              {filteredQuestions.length} question{filteredQuestions.length !== 1 ? "s" : ""}
            </p>
            <Button onClick={openNewQuestion} data-testid="button-add-question">
              <Plus className="w-4 h-4 mr-1" />
              Add Question
            </Button>
          </div>

          {questionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <Card className="p-8 text-center" data-testid="card-no-questions">
              <p className="text-muted-foreground">No questions for this track yet.</p>
              <Button className="mt-3" onClick={openNewQuestion} data-testid="button-add-first-question">
                <Plus className="w-4 h-4 mr-1" /> Add First Question
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q, idx) => (
                <Card key={q.id} className="p-4" data-testid={`card-question-${q.id}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleMoveQuestion(q, "up")}
                        disabled={idx === 0}
                        data-testid={`button-move-up-${q.id}`}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleMoveQuestion(q, "down")}
                        disabled={idx === filteredQuestions.length - 1}
                        data-testid={`button-move-down-${q.id}`}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" data-testid={`badge-category-${q.id}`}>
                          {q.category}
                        </Badge>
                        <Badge variant={q.isActive ? "default" : "outline"} data-testid={`badge-active-${q.id}`}>
                          {q.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {q.multiSelect && (
                          <Badge variant="outline" data-testid={`badge-multiselect-${q.id}`}>Multi-select</Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">#{q.sortOrder}</span>
                      </div>

                      <p className="text-sm font-medium" data-testid={`text-question-en-${q.id}`}>{q.questionEn}</p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-question-es-${q.id}`}>{q.questionEs}</p>

                      {q.gifUrl && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Image className="w-3 h-3" />
                          <span className="truncate max-w-xs" data-testid={`text-gif-${q.id}`}>{q.gifUrl}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 mt-1">
                        {q.options.map(opt => (
                          <Badge key={opt.id} variant="outline" className="text-xs" data-testid={`badge-option-${opt.id}`}>
                            {opt.labelEn}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleQuestionActive.mutate({ id: q.id, isActive: !q.isActive })}
                        data-testid={`button-toggle-active-${q.id}`}
                      >
                        {q.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditQuestion(q)}
                        data-testid={`button-edit-question-${q.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { if (confirm("Delete this question?")) deleteQuestion.mutate(q.id); }}
                        data-testid={`button-delete-question-${q.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="careers" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground" data-testid="text-career-count">
              {filteredCareers.length} career{filteredCareers.length !== 1 ? "s" : ""}
            </p>
            <Button onClick={openNewCareer} data-testid="button-add-career">
              <Plus className="w-4 h-4 mr-1" />
              Add Career
            </Button>
          </div>

          {careersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : filteredCareers.length === 0 ? (
            <Card className="p-8 text-center" data-testid="card-no-careers">
              <p className="text-muted-foreground">No careers for this track yet.</p>
              <Button className="mt-3" onClick={openNewCareer} data-testid="button-add-first-career">
                <Plus className="w-4 h-4 mr-1" /> Add First Career
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredCareers.map(c => (
                <Card key={c.id} className="p-4" data-testid={`card-career-${c.id}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium" data-testid={`text-career-name-${c.id}`}>{c.name}</p>
                      {c.nameEs && (
                        <p className="text-xs text-muted-foreground" data-testid={`text-career-name-es-${c.id}`}>{c.nameEs}</p>
                      )}
                      {c.descriptionEn && (
                        <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-career-desc-${c.id}`}>
                          {c.descriptionEn}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-1">
                        {c.educationEn && (
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-education-${c.id}`}>
                            {c.educationEn}
                          </Badge>
                        )}
                        {c.salaryEn && (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-salary-${c.id}`}>
                            {c.salaryEn}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditCareer(c)}
                        data-testid={`button-edit-career-${c.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { if (confirm("Delete this career?")) deleteCareer.mutate(c.id); }}
                        data-testid={`button-delete-career-${c.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showQuestionDialog} onOpenChange={(open) => { setShowQuestionDialog(open); if (!open) setEditingQuestion(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-question">
              {editingQuestion ? "Edit Question" : "New Question"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => aiAssistQuestion("question")}
                disabled={!!aiLoading}
                data-testid="button-ai-generate-question"
              >
                {aiLoading === "question" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                AI Generate
              </Button>
              {(questionForm.questionEn || editingQuestion) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => aiAssistQuestion("improve_question")}
                  disabled={!!aiLoading}
                  data-testid="button-ai-improve-question"
                >
                  {aiLoading === "improve_question" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  AI Improve
                </Button>
              )}
              {questionForm.questionEn && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={aiAssistGif}
                  disabled={!!aiLoading}
                  data-testid="button-ai-gif"
                >
                  {aiLoading === "gif" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Image className="w-4 h-4 mr-1" />}
                  AI GIF Ideas
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Track</Label>
                <Select value={questionForm.track} onValueChange={v => setQuestionForm(f => ({ ...f, track: v }))}>
                  <SelectTrigger data-testid="select-question-track">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={questionForm.category}
                  onChange={e => setQuestionForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="e.g., Motivation, Work Style"
                  data-testid="input-question-category"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Question (English)</Label>
              <Textarea
                value={questionForm.questionEn}
                onChange={e => setQuestionForm(f => ({ ...f, questionEn: e.target.value }))}
                placeholder="What motivates you most about healthcare?"
                data-testid="input-question-en"
              />
            </div>

            <div className="space-y-2">
              <Label>Question (Spanish)</Label>
              <Textarea
                value={questionForm.questionEs}
                onChange={e => setQuestionForm(f => ({ ...f, questionEs: e.target.value }))}
                placeholder="Question in Spanish"
                data-testid="input-question-es"
              />
            </div>

            <div className="space-y-2">
              <Label>GIF URL</Label>
              <Input
                value={questionForm.gifUrl}
                onChange={e => setQuestionForm(f => ({ ...f, gifUrl: e.target.value }))}
                placeholder="https://media.giphy.com/..."
                data-testid="input-question-gif"
              />
              {questionForm.gifUrl && (
                <img
                  src={questionForm.gifUrl}
                  alt="GIF preview"
                  className="w-32 h-24 object-cover rounded-md"
                  data-testid="img-gif-preview"
                />
              )}
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch
                  checked={questionForm.multiSelect}
                  onCheckedChange={v => setQuestionForm(f => ({ ...f, multiSelect: v }))}
                  data-testid="switch-multi-select"
                />
                <Label>Multi-select</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={questionForm.isActive}
                  onCheckedChange={v => setQuestionForm(f => ({ ...f, isActive: v }))}
                  data-testid="switch-is-active"
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={questionForm.sortOrder}
                  onChange={e => setQuestionForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  className="w-20"
                  data-testid="input-sort-order"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>Answer Options</Label>
                <Button variant="outline" size="sm" onClick={addOption} data-testid="button-add-option">
                  <Plus className="w-3 h-3 mr-1" /> Add Option
                </Button>
              </div>
              {questionForm.options.map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Input
                      value={opt.value}
                      onChange={e => updateOption(idx, "value", e.target.value)}
                      placeholder="Slug (e.g., helping_others)"
                      data-testid={`input-option-value-${idx}`}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={opt.labelEn}
                        onChange={e => updateOption(idx, "labelEn", e.target.value)}
                        placeholder="English label"
                        data-testid={`input-option-label-en-${idx}`}
                      />
                      <Input
                        value={opt.labelEs}
                        onChange={e => updateOption(idx, "labelEs", e.target.value)}
                        placeholder="Spanish label"
                        data-testid={`input-option-label-es-${idx}`}
                      />
                    </div>
                  </div>
                  {questionForm.options.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeOption(idx)}
                      data-testid={`button-remove-option-${idx}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowQuestionDialog(false)} data-testid="button-cancel-question">
                Cancel
              </Button>
              <Button
                onClick={handleSaveQuestion}
                disabled={!questionForm.questionEn || !questionForm.category || questionForm.options.length === 0 || createQuestion.isPending || updateQuestion.isPending}
                data-testid="button-save-question"
              >
                {(createQuestion.isPending || updateQuestion.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {editingQuestion ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCareerDialog} onOpenChange={(open) => { setShowCareerDialog(open); if (!open) setEditingCareer(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-career">
              {editingCareer ? "Edit Career" : "New Career"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              variant="outline"
              size="sm"
              onClick={aiAssistCareer}
              disabled={!!aiLoading}
              data-testid="button-ai-career"
            >
              {aiLoading === "career" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              AI Generate Career
            </Button>

            <div className="space-y-2">
              <Label>Track</Label>
              <Select value={careerForm.track} onValueChange={v => setCareerForm(f => ({ ...f, track: v }))}>
                <SelectTrigger data-testid="select-career-track">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name (English)</Label>
                <Input
                  value={careerForm.name}
                  onChange={e => setCareerForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Registered Nurse"
                  data-testid="input-career-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Name (Spanish)</Label>
                <Input
                  value={careerForm.nameEs}
                  onChange={e => setCareerForm(f => ({ ...f, nameEs: e.target.value }))}
                  placeholder="Enfermera Registrada"
                  data-testid="input-career-name-es"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Description (English)</Label>
                <Textarea
                  value={careerForm.descriptionEn}
                  onChange={e => setCareerForm(f => ({ ...f, descriptionEn: e.target.value }))}
                  placeholder="Career description..."
                  data-testid="input-career-desc-en"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (Spanish)</Label>
                <Textarea
                  value={careerForm.descriptionEs}
                  onChange={e => setCareerForm(f => ({ ...f, descriptionEs: e.target.value }))}
                  placeholder="Descripcion..."
                  data-testid="input-career-desc-es"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Salary (English)</Label>
                <Input
                  value={careerForm.salaryEn}
                  onChange={e => setCareerForm(f => ({ ...f, salaryEn: e.target.value }))}
                  placeholder="$50,000 - $80,000/year"
                  data-testid="input-career-salary-en"
                />
              </div>
              <div className="space-y-2">
                <Label>Salary (Spanish)</Label>
                <Input
                  value={careerForm.salaryEs}
                  onChange={e => setCareerForm(f => ({ ...f, salaryEs: e.target.value }))}
                  placeholder="$50,000 - $80,000/ano"
                  data-testid="input-career-salary-es"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Education (English)</Label>
                <Input
                  value={careerForm.educationEn}
                  onChange={e => setCareerForm(f => ({ ...f, educationEn: e.target.value }))}
                  placeholder="Bachelor's degree + licensure"
                  data-testid="input-career-education-en"
                />
              </div>
              <div className="space-y-2">
                <Label>Education (Spanish)</Label>
                <Input
                  value={careerForm.educationEs}
                  onChange={e => setCareerForm(f => ({ ...f, educationEs: e.target.value }))}
                  placeholder="Licenciatura + certificacion"
                  data-testid="input-career-education-es"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Outlook (English)</Label>
                <Input
                  value={careerForm.outlookEn}
                  onChange={e => setCareerForm(f => ({ ...f, outlookEn: e.target.value }))}
                  placeholder="Strong growth expected"
                  data-testid="input-career-outlook-en"
                />
              </div>
              <div className="space-y-2">
                <Label>Outlook (Spanish)</Label>
                <Input
                  value={careerForm.outlookEs}
                  onChange={e => setCareerForm(f => ({ ...f, outlookEs: e.target.value }))}
                  placeholder="Se espera crecimiento fuerte"
                  data-testid="input-career-outlook-es"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCareerDialog(false)} data-testid="button-cancel-career">
                Cancel
              </Button>
              <Button
                onClick={handleSaveCareer}
                disabled={!careerForm.name || !careerForm.track || createCareer.isPending || updateCareer.isPending}
                data-testid="button-save-career"
              >
                {(createCareer.isPending || updateCareer.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {editingCareer ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
