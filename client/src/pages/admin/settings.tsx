import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, Bot, Zap, DollarSign, Key, FlaskConical, Eye, EyeOff } from "lucide-react";

interface ModelOption {
  value: string;
  label: string;
  desc: string;
  tier?: string;
  provider: string;
}

const chatModels: ModelOption[] = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Replit)", desc: "Fast and affordable via Replit — no API key needed", tier: "Budget-friendly", provider: "replit" },
  { value: "gpt-5-mini", label: "GPT-5 Mini (Replit)", desc: "More capable via Replit — no API key needed", tier: "Mid-range", provider: "replit" },
  { value: "gpt-5-nano", label: "GPT-5 Nano (Replit)", desc: "Lightweight via Replit — no API key needed", tier: "Most affordable", provider: "replit" },

  { value: "openai-direct/gpt-4o-mini", label: "GPT-4o Mini", desc: "Fast and affordable", tier: "Budget-friendly", provider: "openai" },
  { value: "openai-direct/gpt-4o", label: "GPT-4o", desc: "Flagship multimodal model", tier: "Premium", provider: "openai" },
  { value: "openai-direct/gpt-4.1-mini", label: "GPT-4.1 Mini", desc: "Latest mini model — great balance", tier: "Mid-range", provider: "openai" },
  { value: "openai-direct/gpt-4.1-nano", label: "GPT-4.1 Nano", desc: "Ultra-fast, ultra-cheap", tier: "Most affordable", provider: "openai" },

  { value: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4", desc: "Great at nuanced conversation and writing", tier: "Mid-range", provider: "anthropic" },
  { value: "anthropic/claude-haiku-3-5-20241022", label: "Claude 3.5 Haiku", desc: "Fast and affordable, great for chat", tier: "Budget-friendly", provider: "anthropic" },

  { value: "openrouter/deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3", desc: "Very capable, extremely cheap Chinese model", tier: "Ultra-cheap", provider: "openrouter" },
  { value: "openrouter/deepseek/deepseek-r1", label: "DeepSeek R1", desc: "Reasoning model — great for complex questions", tier: "Budget-friendly", provider: "openrouter" },
  { value: "openrouter/qwen/qwen-2.5-72b-instruct", label: "Qwen 2.5 72B", desc: "Alibaba's powerful model, very affordable", tier: "Budget-friendly", provider: "openrouter" },
  { value: "openrouter/mistralai/mistral-small-3.1-24b-instruct", label: "Mistral Small 3.1", desc: "Fast European model, good for chat", tier: "Budget-friendly", provider: "openrouter" },
  { value: "openrouter/google/gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Google's fast model, great price-performance", tier: "Budget-friendly", provider: "openrouter" },
  { value: "openrouter/google/gemini-2.5-pro-preview", label: "Gemini 2.5 Pro", desc: "Google's flagship — top-tier quality", tier: "Premium", provider: "openrouter" },
  { value: "openrouter/meta-llama/llama-4-maverick", label: "Llama 4 Maverick", desc: "Meta's latest open model, very capable", tier: "Budget-friendly", provider: "openrouter" },
  { value: "openrouter/x-ai/grok-3-mini-beta", label: "Grok 3 Mini", desc: "xAI's efficient model", tier: "Mid-range", provider: "openrouter" },
];

const profilingModels: ModelOption[] = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Replit)", desc: "Good balance — no API key needed", provider: "replit" },
  { value: "gpt-5-nano", label: "GPT-5 Nano (Replit)", desc: "Fastest via Replit — no API key needed", provider: "replit" },
  { value: "openai-direct/gpt-4.1-nano", label: "GPT-4.1 Nano", desc: "Ultra-cheap profiling", provider: "openai" },
  { value: "openai-direct/gpt-4o-mini", label: "GPT-4o Mini", desc: "Reliable and fast", provider: "openai" },
  { value: "anthropic/claude-haiku-3-5-20241022", label: "Claude 3.5 Haiku", desc: "Fast extraction", provider: "anthropic" },
  { value: "openrouter/deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3", desc: "Extremely cheap", provider: "openrouter" },
  { value: "openrouter/google/gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Fast and cheap", provider: "openrouter" },
];

const researchModels: ModelOption[] = [
  { value: "gpt-5-mini", label: "GPT-5 Mini (Replit)", desc: "Good research via Replit — no API key needed", tier: "Mid-range", provider: "replit" },
  { value: "openai-direct/gpt-4o", label: "GPT-4o", desc: "Strong reasoning and research", tier: "Premium", provider: "openai" },
  { value: "openai-direct/gpt-4.1-mini", label: "GPT-4.1 Mini", desc: "Great balance for research", tier: "Mid-range", provider: "openai" },
  { value: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4", desc: "Excellent at structured research", tier: "Mid-range", provider: "anthropic" },
  { value: "openrouter/deepseek/deepseek-r1", label: "DeepSeek R1", desc: "Reasoning model — great for deep research, very cheap", tier: "Budget-friendly", provider: "openrouter" },
  { value: "openrouter/google/gemini-2.5-pro-preview", label: "Gemini 2.5 Pro", desc: "Google's flagship — thorough research", tier: "Premium", provider: "openrouter" },
  { value: "perplexity/perplexity/sonar-pro", label: "Perplexity Sonar Pro", desc: "Web-connected research — finds real-time info", tier: "Premium", provider: "openrouter" },
  { value: "perplexity/perplexity/sonar", label: "Perplexity Sonar", desc: "Web-connected research — affordable option", tier: "Mid-range", provider: "openrouter" },
  { value: "perplexity/perplexity/sonar-deep-research", label: "Perplexity Deep Research", desc: "Most thorough web research — best for finding new programs", tier: "Premium", provider: "openrouter" },
];

const providerColors: Record<string, string> = {
  replit: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  openai: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  anthropic: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  openrouter: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

function ProviderBadge({ provider }: { provider: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${providerColors[provider] || "bg-muted text-muted-foreground"}`}>
      {provider === "replit" ? "Replit" : provider === "openai" ? "OpenAI" : provider === "anthropic" ? "Anthropic" : "OpenRouter"}
    </span>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [chatModel, setChatModel] = useState("gpt-4o-mini");
  const [profilingModel, setProfilingModel] = useState("gpt-4o-mini");
  const [researchModel, setResearchModel] = useState("gpt-5-mini");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
  });

  useEffect(() => {
    if (settings) {
      setChatModel(settings.chat_model || "gpt-4o-mini");
      setProfilingModel(settings.profiling_model || "gpt-4o-mini");
      setResearchModel(settings.research_model || "gpt-5-mini");
      setOpenaiKey(settings.openai_api_key || "");
      setAnthropicKey(settings.anthropic_api_key || "");
      setOpenrouterKey(settings.openrouter_api_key || "");
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
        saveSetting.mutateAsync({ key: "research_model", value: researchModel }),
        saveSetting.mutateAsync({ key: "openai_api_key", value: openaiKey }),
        saveSetting.mutateAsync({ key: "anthropic_api_key", value: anthropicKey }),
        saveSetting.mutateAsync({ key: "openrouter_api_key", value: openrouterKey }),
      ]);
      setHasChanges(false);
      toast({ title: "Settings saved", description: "All settings have been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };

  const currentChatInfo = chatModels.find(m => m.value === chatModel);
  const currentProfilingInfo = profilingModels.find(m => m.value === profilingModel);
  const currentResearchInfo = researchModels.find(m => m.value === researchModel);

  const needsApiKey = (model: string) => {
    if (model.startsWith("openai-direct/") && !openaiKey) return "OpenAI";
    if (model.startsWith("anthropic/") && !anthropicKey) return "Anthropic";
    if ((model.startsWith("openrouter/") || model.startsWith("perplexity/")) && !openrouterKey) return "OpenRouter";
    return null;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure AI models and application behavior</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-settings-title">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure AI providers, models, and API keys</p>
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
        <Card className="p-5" data-testid="card-api-keys">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">API Keys</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Configure API keys to use models from different providers. Replit-hosted models work without any keys.
          </p>
          <div className="space-y-4">
            {[
              { key: "openai", label: "OpenAI", value: openaiKey, setter: setOpenaiKey, placeholder: "sk-..." },
              { key: "anthropic", label: "Anthropic", value: anthropicKey, setter: setAnthropicKey, placeholder: "sk-ant-..." },
              { key: "openrouter", label: "OpenRouter", value: openrouterKey, setter: setOpenrouterKey, placeholder: "sk-or-..." },
            ].map(({ key, label, value, setter, placeholder }) => (
              <div key={key}>
                <Label className="text-xs font-medium">{label} API Key</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type={showKeys[key] ? "text" : "password"}
                    value={value}
                    onChange={(e) => { setter(e.target.value); setHasChanges(true); }}
                    placeholder={placeholder}
                    className="font-mono text-xs"
                    data-testid={`input-${key}-key`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowKeys({ ...showKeys, [key]: !showKeys[key] })}
                    data-testid={`button-toggle-${key}-key`}
                  >
                    {showKeys[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              OpenRouter provides access to DeepSeek, Qwen, Gemini, Llama, Perplexity and many more models through a single API key.
              Get one at <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-primary underline">openrouter.ai</a>
            </p>
          </div>
        </Card>

        <Separator />

        <Card className="p-5" data-testid="card-chat-model">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Chat Model</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Powers the student-facing chatbot. Faster models provide quicker responses but may be less detailed.
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
                        <ProviderBadge provider={m.provider} />
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
                    {currentChatInfo.tier && <Badge variant="secondary" className="text-xs">{currentChatInfo.tier}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{currentChatInfo.desc}</p>
                  {needsApiKey(chatModel) && (
                    <p className="text-xs text-destructive mt-1">Requires {needsApiKey(chatModel)} API key above</p>
                  )}
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
            Runs in the background to identify student type, county, and interests. A cheaper model works well here.
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
                      <div className="flex items-center gap-2">
                        <span>{m.label}</span>
                        <ProviderBadge provider={m.provider} />
                      </div>
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
                  {needsApiKey(profilingModel) && (
                    <p className="text-xs text-destructive mt-1">Requires {needsApiKey(profilingModel)} API key above</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5" data-testid="card-research-model">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Research Agent Model</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Powers the AI research tasks. Perplexity models can search the web for real-time information about programs and institutions.
          </p>
          <div className="space-y-3">
            <div>
              <Label>AI Model</Label>
              <Select
                value={researchModel}
                onValueChange={(v) => { setResearchModel(v); setHasChanges(true); }}
              >
                <SelectTrigger data-testid="select-research-model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {researchModels.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center gap-2">
                        <span>{m.label}</span>
                        <ProviderBadge provider={m.provider} />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {currentResearchInfo && (
              <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                <Zap className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{currentResearchInfo.label}</p>
                    {currentResearchInfo.tier && <Badge variant="secondary" className="text-xs">{currentResearchInfo.tier}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{currentResearchInfo.desc}</p>
                  {needsApiKey(researchModel) && (
                    <p className="text-xs text-destructive mt-1">Requires {needsApiKey(researchModel)} API key above</p>
                  )}
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
              <Badge variant="outline">{currentChatInfo?.label || chatModel}</Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Profiling model</span>
              <Badge variant="outline">{currentProfilingInfo?.label || profilingModel}</Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Research model</span>
              <Badge variant="outline">{currentResearchInfo?.label || researchModel}</Badge>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">OpenAI API</span>
              <Badge variant={openaiKey ? "default" : "secondary"} className="text-xs">{openaiKey ? "Configured" : "Not set"}</Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Anthropic API</span>
              <Badge variant={anthropicKey ? "default" : "secondary"} className="text-xs">{anthropicKey ? "Configured" : "Not set"}</Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">OpenRouter API</span>
              <Badge variant={openrouterKey ? "default" : "secondary"} className="text-xs">{openrouterKey ? "Configured" : "Not set"}</Badge>
            </div>
            <Separator className="my-2" />
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
