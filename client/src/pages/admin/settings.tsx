import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, Bot, Zap, DollarSign } from "lucide-react";

const chatModels = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Fast and affordable — best for most use cases", tier: "Budget-friendly" },
  { value: "gpt-5-mini", label: "GPT-5 Mini", desc: "More capable but slower response times", tier: "Mid-range" },
  { value: "gpt-5-nano", label: "GPT-5 Nano", desc: "Lightweight model for simple conversations", tier: "Most affordable" },
];

const profilingModels = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Good balance of speed and accuracy for profiling" },
  { value: "gpt-5-nano", label: "GPT-5 Nano", desc: "Fastest and cheapest for background profiling" },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [chatModel, setChatModel] = useState("gpt-4o-mini");
  const [profilingModel, setProfilingModel] = useState("gpt-4o-mini");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
  });

  useEffect(() => {
    if (settings) {
      setChatModel(settings.chat_model || "gpt-4o-mini");
      setProfilingModel(settings.profiling_model || "gpt-4o-mini");
      setHasChanges(false);
    }
  }, [settings]);

  const saveSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiRequest("POST", "/api/admin/settings", { key, value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    },
  });

  const saveAll = async () => {
    try {
      await Promise.all([
        saveSetting.mutateAsync({ key: "chat_model", value: chatModel }),
        saveSetting.mutateAsync({ key: "profiling_model", value: profilingModel }),
      ]);
      setHasChanges(false);
      toast({ title: "Settings saved", description: "Model preferences have been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };

  const currentChatInfo = chatModels.find(m => m.value === chatModel);
  const currentProfilingInfo = profilingModels.find(m => m.value === profilingModel);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure AI models and application behavior</p>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-settings-title">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure AI models and application behavior</p>
        </div>
        <Button
          onClick={saveAll}
          disabled={!hasChanges || saveSetting.isPending}
          data-testid="button-save-settings"
        >
          {saveSetting.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="space-y-5 max-w-2xl">
        <Card className="p-5" data-testid="card-chat-model">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Chat Model</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            This model powers the student-facing chatbot. Faster models provide quicker responses but may be less detailed.
          </p>
          <div className="space-y-3">
            <div>
              <Label>AI Model</Label>
              <Select
                value={chatModel}
                onValueChange={(v) => { setChatModel(v); setHasChanges(true); }}
              >
                <SelectTrigger data-testid="select-chat-model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {chatModels.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center gap-2">
                        <span>{m.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {currentChatInfo && (
              <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                <Zap className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{currentChatInfo.label}</p>
                    <Badge variant="secondary" className="text-xs">{currentChatInfo.tier}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{currentChatInfo.desc}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5" data-testid="card-profiling-model">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Profiling Model</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            This model runs in the background to identify student type, county, and interests from conversations. A cheaper model works well here.
          </p>
          <div className="space-y-3">
            <div>
              <Label>AI Model</Label>
              <Select
                value={profilingModel}
                onValueChange={(v) => { setProfilingModel(v); setHasChanges(true); }}
              >
                <SelectTrigger data-testid="select-profiling-model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {profilingModels.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {currentProfilingInfo && (
              <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                <Zap className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{currentProfilingInfo.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{currentProfilingInfo.desc}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Current Configuration</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Chat model</span>
              <Badge variant="outline">{chatModel}</Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Profiling model</span>
              <Badge variant="outline">{profilingModel}</Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Knowledge base cache</span>
              <Badge variant="outline">5 min TTL</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
