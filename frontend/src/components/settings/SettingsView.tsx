import React, { useEffect, useState } from "react";
import {
  Cpu,
  Cloud,
  Save,
  Check,
  AlertCircle,
  ShieldAlert,
  Info,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Sparkles,
  Edit3,
  BrainCircuit,
  Lock,
  Copy,
  Server,
  Layers,
  RefreshCw,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  AITaskType,
  AITasksConfig,
  ApiProviderType,
  AppSettingsRead,
  AppSettingsUpdate,
  CloudModelConfig,
  LocalModelConfig,
  OllamaModelItem,
  ReasoningEffortType,
  SettingsConnectionTestResponse,
  TaskModelConfig,
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

interface TaskMetadata {
  key: AITaskType;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const AI_TASKS: TaskMetadata[] = [
  {
    key: "job_parsing",
    title: "Parsowanie ofert pracy i CV",
    badge: "Parsowanie",
    icon: FileText,
    description:
      "Ekstrakcja i strukturyzacja danych ze stron portali z ofertami, schowka systemowego oraz zaimportowanych plików CV.",
  },
  {
    key: "cv_generation",
    title: "Generowanie CV pod ofertę",
    badge: "Generowanie",
    icon: Sparkles,
    description:
      "Dopasowanie profilu kandydata do wymagań ogłoszenia, selekcja doświadczenia i tworzenie spersonalizowanego CV.",
  },
  {
    key: "cv_refinement",
    title: "Ulepszanie sekcji CV",
    badge: "Ulepszanie",
    icon: Edit3,
    description:
      "Punktowe ulepszanie podsumowania zawodowego, opisów stanowisk oraz kluczowych osiągnięć i umiejętności.",
  },
  {
    key: "knowledge_base_parsing",
    title: "Parsowanie bazy wiedzy kandydata",
    badge: "Baza wiedzy",
    icon: BrainCircuit,
    description:
      "Strukturyzacja surowego tekstu, notatek lub dotychczasowego życiorysu do profilu wiedzy kandydata.",
  },
];

const LOCAL_CONTEXT_PRESETS = [8192, 16384, 32768, 65536, 131072];
const CLOUD_CONTEXT_PRESETS = [16384, 32768, 65536, 128000, 200000];

const OLLAMA_MODEL_SUGGESTIONS = [
  "qwen2.5:14b",
  "qwen2.5:7b",
  "llama3.1:8b",
  "mistral-nemo",
];

const GEMINI_MODEL_SUGGESTIONS = [
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

const OPENAI_MODEL_SUGGESTIONS = [
  "gpt-4o-mini",
  "gpt-4o",
  "o3-mini",
];

const formatModelOptionLabel = (model: OllamaModelItem): string => {
  const details: string[] = [];
  if (model.parameter_size) {
    details.push(model.parameter_size);
  }
  if (model.quantization_level) {
    details.push(model.quantization_level);
  }
  if (model.size_bytes && details.length === 0) {
    const gb = (model.size_bytes / (1024 * 1024 * 1024)).toFixed(1);
    details.push(`${gb} GB`);
  }
  if (details.length > 0) {
    return `${model.name} (${details.join(", ")})`;
  }
  return model.name;
};

const formatModelsCount = (count: number): string => {
  if (count === 1) return "1 model";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} modele`;
  }
  return `${count} modeli`;
};

const createDefaultLocalModel = (): LocalModelConfig => ({
  model: "qwen2.5:14b",
  context_window: 32768,
  enable_thinking: false,
  reasoning_effort: "medium",
  thinking_budget: null,
});

const createDefaultCloudModel = (): CloudModelConfig => ({
  provider: "gemini",
  model: "gemini-3.8-flash",
  context_window: 32768,
  enable_thinking: false,
  reasoning_effort: "medium",
  thinking_budget: null,
});

const createDefaultTaskConfig = (): TaskModelConfig => ({
  routing_mode: "fallback",
  local_model: createDefaultLocalModel(),
  cloud_model: createDefaultCloudModel(),
  local_test_passed: false,
  local_test_message: null,
  cloud_test_passed: false,
  cloud_test_message: null,
});

const createDefaultTasksConfig = (): AITasksConfig => ({
  job_parsing: createDefaultTaskConfig(),
  cv_generation: createDefaultTaskConfig(),
  cv_refinement: createDefaultTaskConfig(),
  knowledge_base_parsing: createDefaultTaskConfig(),
});

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettingsRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copySuccessMessage, setCopySuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Global settings state
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://host.docker.internal:11434");

  // Per-task AI Configuration state
  const [tasksConfig, setTasksConfig] = useState<AITasksConfig>(createDefaultTasksConfig());
  const [activeTaskKey, setActiveTaskKey] = useState<AITaskType>("job_parsing");

  // Testing indicators per task
  const [isTestingLocal, setIsTestingLocal] = useState<Record<AITaskType, boolean>>({
    job_parsing: false,
    cv_generation: false,
    cv_refinement: false,
    knowledge_base_parsing: false,
  });

  const [isTestingCloud, setIsTestingCloud] = useState<Record<AITaskType, boolean>>({
    job_parsing: false,
    cv_generation: false,
    cv_refinement: false,
    knowledge_base_parsing: false,
  });

  const [localLatencies, setLocalLatencies] = useState<Record<AITaskType, number | null>>({
    job_parsing: null,
    cv_generation: null,
    cv_refinement: null,
    knowledge_base_parsing: null,
  });

  const [cloudLatencies, setCloudLatencies] = useState<Record<AITaskType, number | null>>({
    job_parsing: null,
    cv_generation: null,
    cv_refinement: null,
    knowledge_base_parsing: null,
  });

  // Discovered Ollama models metadata
  const [installedOllamaModels, setInstalledOllamaModels] = useState<OllamaModelItem[]>([]);
  const [isDetectingModels, setIsDetectingModels] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);
  const [detectionSuccess, setDetectionSuccess] = useState<boolean | null>(null);

  // Per-task override flag for custom model manual input mode
  const [customModelMode, setCustomModelMode] = useState<Record<AITaskType, boolean>>({
    job_parsing: false,
    cv_generation: false,
    cv_refinement: false,
    knowledge_base_parsing: false,
  });

  // Global Ollama connectivity test state
  const [isTestingGlobalOllama, setIsTestingGlobalOllama] = useState(false);
  const [globalOllamaTestResult, setGlobalOllamaTestResult] =
    useState<SettingsConnectionTestResponse | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchInstalledModels = async (url?: string) => {
    const targetUrl = (url !== undefined ? url : ollamaBaseUrl).trim();
    if (!targetUrl) {
      setDetectionSuccess(false);
      setDetectionMessage("Adres URL serwera Ollama nie może być pusty.");
      setInstalledOllamaModels([]);
      return;
    }

    try {
      setIsDetectingModels(true);
      setDetectionMessage(null);
      const res = await api.settings.getOllamaModels(targetUrl);
      setInstalledOllamaModels(res.models || []);
      setDetectionSuccess(res.success);
      setDetectionMessage(res.message);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Nie udało się połączyć z serwerem Ollama.";
      setInstalledOllamaModels([]);
      setDetectionSuccess(false);
      setDetectionMessage(msg);
    } finally {
      setIsDetectingModels(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await api.settings.get();
      setSettings(data);
      setOllamaBaseUrl(data.ollama_base_url);

      const mergedTasks = createDefaultTasksConfig();
      if (data.tasks_config) {
        for (const k of AI_TASKS.map((t) => t.key)) {
          if (data.tasks_config[k]) {
            mergedTasks[k] = {
              ...mergedTasks[k],
              ...data.tasks_config[k],
              local_model: {
                ...mergedTasks[k].local_model,
                ...(data.tasks_config[k].local_model || {}),
              },
              cloud_model: {
                ...mergedTasks[k].cloud_model,
                ...(data.tasks_config[k].cloud_model || {}),
              },
            };
          }
        }
      } else {
        // Fallback from legacy fields if tasks_config was empty
        for (const k of AI_TASKS.map((t) => t.key)) {
          mergedTasks[k].local_model.model = data.ollama_model || "qwen2.5:14b";
          mergedTasks[k].cloud_model.provider = data.api_provider || "gemini";
          mergedTasks[k].cloud_model.model = data.api_model || "gemini-3.8-flash";
        }
      }
      setTasksConfig(mergedTasks);
      // Fetch installed models immediately after settings load
      fetchInstalledModels(data.ollama_base_url);
    } catch {
      setErrorMessage("Nie udało się pobrać ustawień aplikacji.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskConfig = (
    key: AITaskType,
    updater: (prev: TaskModelConfig) => TaskModelConfig
  ) => {
    setTasksConfig((prev) => ({
      ...prev,
      [key]: updater(prev[key]),
    }));
  };

  const updateLocalModel = (
    key: AITaskType,
    patch: Partial<LocalModelConfig>
  ) => {
    updateTaskConfig(key, (task) => ({
      ...task,
      local_model: {
        ...task.local_model,
        ...patch,
      },
    }));
  };

  const updateCloudModel = (
    key: AITaskType,
    patch: Partial<CloudModelConfig>
  ) => {
    updateTaskConfig(key, (task) => ({
      ...task,
      cloud_model: {
        ...task.cloud_model,
        ...patch,
      },
    }));
  };

  const handleTestGlobalOllama = async () => {
    const trimmedUrl = ollamaBaseUrl.trim();
    if (!trimmedUrl) {
      setErrorMessage("Adres URL serwera Ollama nie może być pusty.");
      return;
    }

    try {
      setIsTestingGlobalOllama(true);
      setGlobalOllamaTestResult(null);
      const res = await api.settings.testOllama({
        ollama_base_url: trimmedUrl,
      });
      setGlobalOllamaTestResult(res);
      if (res.success) {
        fetchInstalledModels(trimmedUrl);
      }
    } catch (err: unknown) {
      setGlobalOllamaTestResult({
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Wystąpił błąd podczas testowania połączenia z serwerem Ollama.",
        available_models: null,
        latency_ms: null,
      });
    } finally {
      setIsTestingGlobalOllama(false);
    }
  };

  const handleTestLocalForTask = async (taskKey: AITaskType) => {
    const task = tasksConfig[taskKey];
    const trimmedModel = task.local_model.model.trim();
    if (!trimmedModel) {
      setErrorMessage("Identyfikator modelu Ollama nie może być pusty.");
      return;
    }

    try {
      setIsTestingLocal((prev) => ({ ...prev, [taskKey]: true }));
      setErrorMessage(null);
      const res = await api.settings.testOllama({
        ollama_base_url: ollamaBaseUrl.trim(),
        ollama_model: trimmedModel,
        context_window: task.local_model.context_window,
        enable_thinking: task.local_model.enable_thinking,
        reasoning_effort: task.local_model.reasoning_effort,
        thinking_budget: task.local_model.thinking_budget,
        task: taskKey,
      });

      updateTaskConfig(taskKey, (t) => ({
        ...t,
        local_test_passed: res.success,
        local_test_message: res.message,
      }));
      setLocalLatencies((prev) => ({ ...prev, [taskKey]: res.latency_ms }));

      if (res.success && installedOllamaModels.length === 0) {
        fetchInstalledModels(ollamaBaseUrl);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Wystąpił błąd podczas testowania modelu lokalnego.";
      updateTaskConfig(taskKey, (t) => ({
        ...t,
        local_test_passed: false,
        local_test_message: msg,
      }));
    } finally {
      setIsTestingLocal((prev) => ({ ...prev, [taskKey]: false }));
    }
  };

  const handleTestCloudForTask = async (taskKey: AITaskType) => {
    const task = tasksConfig[taskKey];
    const trimmedModel = task.cloud_model.model.trim();
    if (!trimmedModel) {
      setErrorMessage("Identyfikator modelu w chmurze nie może być pusty.");
      return;
    }

    try {
      setIsTestingCloud((prev) => ({ ...prev, [taskKey]: true }));
      setErrorMessage(null);
      const res = await api.settings.testCloud({
        provider: task.cloud_model.provider,
        model: trimmedModel,
        context_window: task.cloud_model.context_window,
        enable_thinking: task.cloud_model.enable_thinking,
        reasoning_effort: task.cloud_model.reasoning_effort,
        thinking_budget: task.cloud_model.thinking_budget,
        task: taskKey,
      });

      updateTaskConfig(taskKey, (t) => ({
        ...t,
        cloud_test_passed: res.success,
        cloud_test_message: res.message,
      }));
      setCloudLatencies((prev) => ({ ...prev, [taskKey]: res.latency_ms }));
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Wystąpił błąd podczas testowania modelu w chmurze.";
      updateTaskConfig(taskKey, (t) => ({
        ...t,
        cloud_test_passed: false,
        cloud_test_message: msg,
      }));
    } finally {
      setIsTestingCloud((prev) => ({ ...prev, [taskKey]: false }));
    }
  };

  const handleCopyModelsToAllTasks = (sourceKey: AITaskType) => {
    const sourceTask = tasksConfig[sourceKey];
    setTasksConfig((prev) => {
      const updated = { ...prev };
      for (const targetKey of AI_TASKS.map((t) => t.key)) {
        if (targetKey !== sourceKey) {
          updated[targetKey] = {
            ...updated[targetKey],
            local_model: { ...sourceTask.local_model },
            cloud_model: { ...sourceTask.cloud_model },
          };
        }
      }
      return updated;
    });

    setCopySuccessMessage(
      `Skopiowano konfigurację modeli z zadania „${
        AI_TASKS.find((t) => t.key === sourceKey)?.title
      }” do pozostałych zadań.`
    );
    setTimeout(() => setCopySuccessMessage(null), 4000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!ollamaBaseUrl.trim()) {
      setErrorMessage("Adres URL serwera Ollama nie może być pusty.");
      return;
    }

    // Validate that models are not empty in any task
    for (const taskDef of AI_TASKS) {
      const task = tasksConfig[taskDef.key];
      if (!task.local_model.model.trim()) {
        setErrorMessage(
          `Zadanie „${taskDef.title}”: Podaj model lokalny Ollama.`
        );
        setActiveTaskKey(taskDef.key);
        return;
      }
      if (!task.cloud_model.model.trim()) {
        setErrorMessage(
          `Zadanie „${taskDef.title}”: Podaj model w chmurze.`
        );
        setActiveTaskKey(taskDef.key);
        return;
      }
    }

    setErrorMessage(null);
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      // Main job_parsing task drives backward-compatible legacy settings
      const mainTask = tasksConfig.job_parsing;
      const legacyAutoParseMode =
        mainTask.routing_mode === "fallback"
          ? "auto_ollama_fallback_api"
          : mainTask.routing_mode === "local"
          ? "auto_ollama_only"
          : "auto_api_only";

      const updatePayload: AppSettingsUpdate = {
        ollama_base_url: ollamaBaseUrl.trim(),
        tasks_config: tasksConfig,
        auto_parse_mode: legacyAutoParseMode,
        ollama_model: mainTask.local_model.model.trim(),
        api_provider: mainTask.cloud_model.provider,
        api_model: mainTask.cloud_model.model.trim(),
      };

      const updated = await api.settings.update(updatePayload);
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Błąd podczas zapisywania konfiguracji w bazie danych."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-slate-400 dark:text-neutral-500 animate-pulse">
        Ładowanie ustawień aplikacji i modeli AI...
      </div>
    );
  }

  const activeTask = tasksConfig[activeTaskKey];
  const activeTaskMeta = AI_TASKS.find((t) => t.key === activeTaskKey)!;
  const isFallbackAllowed =
    activeTask.local_test_passed && activeTask.cloud_test_passed;
  const isCurrentModelInstalled = installedOllamaModels.some(
    (m) => m.name === activeTask.local_model.model
  );
  const isCustomModel =
    Boolean(customModelMode[activeTaskKey]) || !isCurrentModelInstalled;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-none dark:border-transparent dark:bg-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-neutral-100">
                Ustawienia modeli AI i routingu zadań
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Niezależna konfiguracja modeli lokalnych (Ollama) i chmurowych (Gemini / OpenAI) dla każdego procesu
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 dark:bg-neutral-950 dark:border-transparent dark:text-emerald-400">
              <Check className="h-4 w-4" />
              Zapisano pomyślnie!
            </span>
          )}
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            className="text-sm font-semibold rounded-xl shadow-none"
          >
            <Save className="h-4 w-4 mr-1.5" />
            Zapisz ustawienia
          </Button>
        </div>
      </div>

      {/* Realtime Runtime Persistence Architecture Banner */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4.5 text-xs text-indigo-950 dark:bg-neutral-900 dark:border-transparent dark:text-neutral-200 flex items-start gap-3.5 shadow-none">
        <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-xs tracking-wide uppercase text-indigo-800 dark:text-indigo-300">
            Architektura Runtime — Zapis natychmiastowy bez restartu
          </p>
          <p className="leading-relaxed text-slate-700 dark:text-neutral-300 text-xs">
            Wszystkie konfiguracje są zapisywane bezpośrednio w tabeli bazy danych PostgreSQL i zaczynają obowiązywać natychmiast w całym systemie bez konieczności restartowania kontenerów. Wartości w pliku{" "}
            <code className="px-1.5 py-0.5 rounded bg-indigo-100/90 dark:bg-neutral-800 font-mono text-[11px] text-indigo-900 dark:text-indigo-300">
              .env
            </code>{" "}
            pełnią wyłącznie rolę seedu początkowego przy pierwszym uruchomieniu oraz bezpiecznego magazynu kluczy dostępowych.
          </p>
        </div>
      </div>

      {/* Global Connectivity & Environment Keys Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-none space-y-4 dark:border-transparent dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-neutral-100">
              Infrastruktura globalna: Serwer Ollama i klucze środowiskowe
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Global Ollama URL with test */}
          <div className="space-y-3">
            <Input
              label="Adres serwera Ollama (Base URL)"
              value={ollamaBaseUrl}
              onChange={(e) => setOllamaBaseUrl(e.target.value)}
              placeholder="http://host.docker.internal:11434"
              helperText="W kontenerze Docker użyj adresu host.docker.internal"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleTestGlobalOllama}
                isLoading={isTestingGlobalOllama}
                className="text-xs"
              >
                <Zap className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                Sprawdź połączenie z serwerem Ollama
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchInstalledModels()}
                isLoading={isDetectingModels}
                className="text-xs"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400 ${
                    isDetectingModels ? "animate-spin" : ""
                  }`}
                />
                {isDetectingModels ? "Wykrywanie modeli..." : "Wykryj zainstalowane modele"}
              </Button>
            </div>

            {/* Discovered models badge or connection warning */}
            {detectionSuccess !== null && (
              <div className="pt-0.5">
                {detectionSuccess ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-neutral-950 dark:border-transparent dark:text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="font-semibold">
                      Wykryto {formatModelsCount(installedOllamaModels.length)} w Ollama
                    </span>
                    {installedOllamaModels.length > 0 && (
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                        ({installedOllamaModels.map((m) => m.name).slice(0, 3).join(", ")}
                        {installedOllamaModels.length > 3 ? "..." : ""})
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 p-3 rounded-xl text-xs bg-rose-50/80 border border-rose-200 text-rose-800 dark:bg-neutral-950 dark:border-transparent dark:text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold">Brak połączenia z Ollama</p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400">
                        {detectionMessage || "Nie udało się połączyć z serwerem Ollama."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {globalOllamaTestResult && (
              <div
                className={`rounded-xl border p-3 text-xs space-y-1.5 ${
                  globalOllamaTestResult.success
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 dark:bg-neutral-950 dark:border-transparent dark:text-emerald-300"
                    : "bg-rose-50/70 border-rose-200 text-rose-900 dark:bg-neutral-950 dark:border-transparent dark:text-rose-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1.5">
                    {globalOllamaTestResult.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    )}
                    <span>{globalOllamaTestResult.message}</span>
                  </div>
                  {globalOllamaTestResult.latency_ms !== null && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-neutral-900 font-mono text-[11px] font-semibold text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-transparent">
                      <Clock className="h-3 w-3 text-slate-400 dark:text-neutral-500" />
                      {Math.round(globalOllamaTestResult.latency_ms)} ms
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Environment Keys Status */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 dark:bg-neutral-950 border border-slate-100 dark:border-transparent">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              Status kluczy API w pliku .env:
            </span>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200/60 dark:border-transparent">
                <span className="font-mono text-xs font-medium text-slate-800 dark:text-neutral-200">
                  GEMINI_API_KEY
                </span>
                {settings?.has_gemini_api_key ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-neutral-950 dark:border-transparent dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Aktywny w .env
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-neutral-950 dark:border-transparent dark:text-rose-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Brak w .env
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200/60 dark:border-transparent">
                <span className="font-mono text-xs font-medium text-slate-800 dark:text-neutral-200">
                  OPENAI_API_KEY
                </span>
                {settings?.has_openai_api_key ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-neutral-950 dark:border-transparent dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Aktywny w .env
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-neutral-950 dark:border-transparent dark:text-rose-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Brak w .env
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-slate-400 dark:text-neutral-500 shrink-0" />
              Klucze API są chronione i nigdy nie trafiają do bazy danych.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 dark:bg-neutral-950 dark:border-transparent dark:text-rose-300 flex items-center gap-2 shadow-none">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {copySuccessMessage && (
        <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-4 text-xs text-indigo-800 dark:bg-neutral-950 dark:border-transparent dark:text-indigo-300 flex items-center gap-2 shadow-none">
          <Check className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span>{copySuccessMessage}</span>
        </div>
      )}

      {/* 4 AI Tasks Module Tabs */}
      <div className="space-y-4">
        {/* Navigation Tabs Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {AI_TASKS.map((taskDef) => {
            const task = tasksConfig[taskDef.key];
            const isCurrent = activeTaskKey === taskDef.key;
            const Icon = taskDef.icon;

            const bothPassed = task.local_test_passed && task.cloud_test_passed;
            const hasError =
              (task.local_test_message && !task.local_test_passed) ||
              (task.cloud_test_message && !task.cloud_test_passed);

            return (
              <button
                key={taskDef.key}
                type="button"
                onClick={() => setActiveTaskKey(taskDef.key)}
                className={`flex flex-col items-start p-3.5 rounded-2xl text-left transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-white dark:bg-neutral-900 border-2 border-indigo-600 dark:border-indigo-500 shadow-sm"
                    : "bg-white/80 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-transparent hover:bg-slate-50 dark:hover:bg-neutral-800/40 text-slate-700 dark:text-neutral-300"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isCurrent
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300"
                        : "bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Status test indicator dot */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      bothPassed
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : hasError
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                        : "bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400"
                    }`}
                  >
                    {bothPassed ? "2/2 OK" : task.local_test_passed || task.cloud_test_passed ? "1/2 OK" : "Brak testu"}
                  </span>
                </div>

                <span className="font-semibold text-xs text-slate-900 dark:text-neutral-100 truncate w-full">
                  {taskDef.title}
                </span>

                <span className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 capitalize font-medium flex items-center gap-1">
                  Tryb:{" "}
                  <span
                    className={
                      task.routing_mode === "fallback"
                        ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                        : task.routing_mode === "local"
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "text-sky-600 dark:text-sky-400 font-semibold"
                    }
                  >
                    {task.routing_mode === "fallback"
                      ? "Fallback"
                      : task.routing_mode === "local"
                      ? "Lokalny"
                      : "Chmura"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Task Configuration Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-none space-y-6 dark:border-transparent dark:bg-neutral-900">
          {/* Header of Active Task with Apply-To-All Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-neutral-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <activeTaskMeta.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">
                  {activeTaskMeta.title}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                {activeTaskMeta.description}
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleCopyModelsToAllTasks(activeTaskKey)}
              className="text-xs shrink-0 self-start sm:self-auto"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5 text-slate-500 dark:text-neutral-400" />
              Zastosuj te modele do pozostałych zadań
            </Button>
          </div>

          {/* Strategy / Routing Selector for this Task */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              Strategia routingu dla tego zadania:
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: Local Only */}
              <label
                className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  activeTask.routing_mode === "local"
                    ? "border-2 border-emerald-600 bg-emerald-50/40 dark:border-emerald-500 dark:bg-emerald-950/20"
                    : "border-slate-200/80 hover:border-slate-300 bg-white dark:border-transparent dark:bg-neutral-950 dark:hover:bg-neutral-800/35"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name={`routing_mode_${activeTaskKey}`}
                    value="local"
                    checked={activeTask.routing_mode === "local"}
                    onChange={() =>
                      updateTaskConfig(activeTaskKey, (t) => ({
                        ...t,
                        routing_mode: "local",
                      }))
                    }
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Tylko model lokalny
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                      100% prywatności i brak opłat API. Wymaga sprawnej instancji Ollama.
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 dark:text-neutral-500">Test lokalny:</span>
                  <span
                    className={`font-semibold ${
                      activeTask.local_test_passed
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {activeTask.local_test_passed ? "Pomyślny" : "Nieweryfikowany"}
                  </span>
                </div>
              </label>

              {/* Option 2: Cloud Only */}
              <label
                className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  activeTask.routing_mode === "cloud"
                    ? "border-2 border-sky-600 bg-sky-50/40 dark:border-sky-500 dark:bg-sky-950/20"
                    : "border-slate-200/80 hover:border-slate-300 bg-white dark:border-transparent dark:bg-neutral-950 dark:hover:bg-neutral-800/35"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name={`routing_mode_${activeTaskKey}`}
                    value="cloud"
                    checked={activeTask.routing_mode === "cloud"}
                    onChange={() =>
                      updateTaskConfig(activeTaskKey, (t) => ({
                        ...t,
                        routing_mode: "cloud",
                      }))
                    }
                    className="mt-0.5 text-sky-600 focus:ring-sky-500 h-4 w-4"
                  />
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <Cloud className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                      Tylko model w chmurze
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                      Zadanie trafia bezpośrednio do API (Gemini / OpenAI). Najwyższa szybkość.
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 dark:text-neutral-500">Test chmurowy:</span>
                  <span
                    className={`font-semibold ${
                      activeTask.cloud_test_passed
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {activeTask.cloud_test_passed ? "Pomyślny" : "Nieweryfikowany"}
                  </span>
                </div>
              </label>

              {/* Option 3: Fallback (Strict rule: Enabled ONLY if BOTH passed) */}
              <label
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  !isFallbackAllowed
                    ? "opacity-60 cursor-not-allowed border-slate-200/80 bg-slate-50/50 dark:border-transparent dark:bg-neutral-950/60"
                    : activeTask.routing_mode === "fallback"
                    ? "border-2 border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30 cursor-pointer"
                    : "border-slate-200/80 hover:border-slate-300 bg-white dark:border-transparent dark:bg-neutral-950 dark:hover:bg-neutral-800/35 cursor-pointer"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name={`routing_mode_${activeTaskKey}`}
                    value="fallback"
                    disabled={!isFallbackAllowed}
                    checked={activeTask.routing_mode === "fallback"}
                    onChange={() => {
                      if (isFallbackAllowed) {
                        updateTaskConfig(activeTaskKey, (t) => ({
                          ...t,
                          routing_mode: "fallback",
                        }));
                      }
                    }}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500 h-4 w-4 disabled:opacity-40"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-neutral-100 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Fallback: Ollama ➔ Chmura
                      </h4>
                      {!isFallbackAllowed && (
                        <Lock className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                      Próba lokalna na Ollama; w razie błędu automatyczne przełączenie do chmury.
                    </p>
                  </div>
                </div>

                {!isFallbackAllowed ? (
                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-neutral-800/80">
                    <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium leading-tight">
                      🔒 Wymaga pomyślnego przetestowania zarówno modelu lokalnego, jak i chmurowego.
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 dark:text-neutral-500">Status modeli:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Oba przetestowane ✓
                    </span>
                  </div>
                )}
              </label>
            </div>

            {/* Warning if currently in fallback but one of the tests has failed */}
            {activeTask.routing_mode === "fallback" && !isFallbackAllowed && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-neutral-950 dark:border-transparent dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Aktywny tryb tego zadania to <strong>Fallback</strong>, ale co najmniej jeden z modeli nie przeszedł pomyślnie testu. Wykonaj testy poniżej, aby odblokować pełną niezawodność, lub wybierz tryb pojedynczego modelu.
                </span>
              </div>
            )}
          </div>

          {/* Model Panels: Panel A (Local Ollama) & Panel B (Cloud Model) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* PANEL A: MODEL LOKALNY (OLLAMA) */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4 dark:border-transparent dark:bg-neutral-950">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-neutral-100">
                      Panel A: Model lokalny (Ollama)
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Wykonywanie na własnej maszynie
                    </span>
                  </div>
                </div>

                {activeTask.local_test_passed ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Gotowy
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200/70 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400">
                    Nieweryfikowany
                  </span>
                )}
              </div>

              {/* Model identifier selector / manual input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                    Model Ollama
                  </label>
                  <button
                    type="button"
                    onClick={() => fetchInstalledModels()}
                    disabled={isDetectingModels}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors"
                    title="Odśwież listę zainstalowanych modeli z serwera Ollama"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${isDetectingModels ? "animate-spin" : ""}`}
                    />
                    <span>{isDetectingModels ? "Wykrywanie..." : "Odśwież listę"}</span>
                  </button>
                </div>

                {installedOllamaModels.length > 0 ? (
                  <div className="space-y-2">
                    <Select
                      value={isCustomModel ? "__custom__" : activeTask.local_model.model}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__custom__") {
                          setCustomModelMode((prev) => ({
                            ...prev,
                            [activeTaskKey]: true,
                          }));
                        } else {
                          setCustomModelMode((prev) => ({
                            ...prev,
                            [activeTaskKey]: false,
                          }));
                          updateLocalModel(activeTaskKey, { model: val });
                        }
                      }}
                    >
                      {installedOllamaModels.map((m) => (
                        <option
                          key={m.name}
                          value={m.name}
                          className="bg-white text-slate-900 dark:bg-neutral-900 dark:text-white"
                        >
                          {formatModelOptionLabel(m)}
                        </option>
                      ))}
                      <option
                        value="__custom__"
                        className="bg-white text-slate-900 dark:bg-neutral-900 dark:text-white"
                      >
                        ✍️ Wpisz inny model ręcznie...
                      </option>
                    </Select>

                    {isCustomModel && (
                      <div className="pt-1">
                        <Input
                          label="Własna nazwa modelu Ollama"
                          value={activeTask.local_model.model}
                          onChange={(e) =>
                            updateLocalModel(activeTaskKey, { model: e.target.value })
                          }
                          placeholder="np. gemma4:12b lub mistral:instruct"
                          helperText="Wpisz dowolny identyfikator z tagiem modelu dostępnego w Ollama"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Input
                      value={activeTask.local_model.model}
                      onChange={(e) =>
                        updateLocalModel(activeTaskKey, { model: e.target.value })
                      }
                      placeholder="np. qwen2.5:14b"
                      helperText={
                        detectionSuccess === false
                          ? "Brak połączenia z Ollama. Upewnij się, że serwer działa i kliknij 'Odśwież listę'."
                          : "Brak wykrytych modeli w Ollama. Wpisz nazwę modelu ręcznie lub kliknij 'Odśwież listę'."
                      }
                    />
                  </div>
                )}

                {/* Suggestions */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase font-semibold">
                      Sugestie:
                    </span>
                    {OLLAMA_MODEL_SUGGESTIONS.map((sug) => {
                      const isCur = activeTask.local_model.model === sug;
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            const isInst = installedOllamaModels.some((m) => m.name === sug);
                            setCustomModelMode((prev) => ({
                              ...prev,
                              [activeTaskKey]: !isInst,
                            }));
                            updateLocalModel(activeTaskKey, { model: sug });
                          }}
                          className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                            isCur
                              ? "bg-emerald-600 text-white font-semibold dark:bg-emerald-600"
                              : "bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-transparent dark:hover:bg-neutral-800"
                          }`}
                        >
                          {sug}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Context Window input and presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                    Rozmiar okna kontekstu (tokeny)
                  </label>
                  <span className="font-mono text-xs text-slate-500 dark:text-neutral-400 font-semibold">
                    {activeTask.local_model.context_window.toLocaleString("pl-PL")} tok.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={2048}
                    max={131072}
                    step={1024}
                    value={activeTask.local_model.context_window}
                    onChange={(e) =>
                      updateLocalModel(activeTaskKey, {
                        context_window: parseInt(e.target.value, 10) || 32768,
                      })
                    }
                    className="font-mono"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase font-semibold">
                    Presety:
                  </span>
                  {LOCAL_CONTEXT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        updateLocalModel(activeTaskKey, {
                          context_window: preset,
                        })
                      }
                      className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                        activeTask.local_model.context_window === preset
                          ? "bg-emerald-600 text-white font-semibold"
                          : "bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-transparent dark:hover:bg-neutral-800"
                      }`}
                    >
                      {preset >= 1024 ? `${preset / 1024}k` : preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thinking / Reasoning Section */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200/70 dark:border-transparent space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-semibold text-slate-800 dark:text-neutral-200">
                      Tryb namysłu (Thinking / Reasoning)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Dla modeli z mechanizmem myślenia (np. Qwen 2.5 Max/Thinking, DeepSeek)
                    </span>
                  </div>

                  {/* 2-state toggle switch */}
                  <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-neutral-950 border border-slate-200/80 dark:border-transparent shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        updateLocalModel(activeTaskKey, { enable_thinking: false })
                      }
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                        !activeTask.local_model.enable_thinking
                          ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 shadow-sm"
                          : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
                      }`}
                    >
                      Wyłączony
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateLocalModel(activeTaskKey, { enable_thinking: true })
                      }
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                        activeTask.local_model.enable_thinking
                          ? "bg-emerald-600 text-white shadow-sm font-semibold"
                          : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
                      }`}
                    >
                      Włączony
                    </button>
                  </div>
                </div>

                {activeTask.local_model.enable_thinking && (
                  <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                        Wysiłek myślenia (Reasoning Effort):
                      </span>

                      <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-neutral-950 border border-slate-200/80 dark:border-transparent">
                        {(["low", "medium", "high"] as ReasoningEffortType[]).map((effort) => {
                          const labels: Record<ReasoningEffortType, string> = {
                            low: "Niski",
                            medium: "Średni",
                            high: "Wysoki",
                          };
                          const isCur = activeTask.local_model.reasoning_effort === effort;
                          return (
                            <button
                              key={effort}
                              type="button"
                              onClick={() =>
                                updateLocalModel(activeTaskKey, { reasoning_effort: effort })
                              }
                              className={`px-2 py-0.5 text-xs font-medium rounded transition-all ${
                                isCur
                                  ? "bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-sm font-bold"
                                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
                              }`}
                            >
                              {labels[effort]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Input
                      type="number"
                      label="Budżet tokenów namysłu (opcjonalny)"
                      value={activeTask.local_model.thinking_budget ?? ""}
                      onChange={(e) =>
                        updateLocalModel(activeTaskKey, {
                          thinking_budget: e.target.value ? parseInt(e.target.value, 10) : null,
                        })
                      }
                      placeholder="Domyślny dla modelu (pozostaw puste)"
                    />
                  </div>
                )}
              </div>

              {/* Test Action & Results for Local */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTestLocalForTask(activeTaskKey)}
                    isLoading={isTestingLocal[activeTaskKey]}
                    className="w-full justify-center text-xs"
                  >
                    <Zap className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                    Testuj model lokalny ({activeTask.local_model.model})
                  </Button>
                </div>

                {/* Feedback status */}
                {activeTask.local_test_message && (
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      activeTask.local_test_passed
                        ? "bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-neutral-900 dark:border-transparent dark:text-emerald-300"
                        : "bg-rose-50/80 border-rose-200 text-rose-900 dark:bg-neutral-900 dark:border-transparent dark:text-rose-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5">
                        {activeTask.local_test_passed ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                        )}
                        <span className="font-medium leading-relaxed">
                          {activeTask.local_test_message}
                        </span>
                      </div>

                      {localLatencies[activeTaskKey] !== null && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-neutral-950 font-mono text-[10px] text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-transparent font-semibold">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {Math.round(localLatencies[activeTaskKey]!)} ms
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PANEL B: MODEL W CHMURZE (GEMINI / OPENAI) */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4 dark:border-transparent dark:bg-neutral-950">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
                    <Cloud className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-neutral-100">
                      Panel B: Model w chmurze (Cloud API)
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Google Gemini lub OpenAI
                    </span>
                  </div>
                </div>

                {activeTask.cloud_test_passed ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Gotowy
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200/70 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400">
                    Nieweryfikowany
                  </span>
                )}
              </div>

              {/* Provider Selection with Key Status */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                    Dostawca API
                  </label>

                  {/* Active provider key indicator */}
                  {activeTask.cloud_model.provider === "gemini" ? (
                    settings?.has_gemini_api_key ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        GEMINI_API_KEY dostępny
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Brak GEMINI_API_KEY w .env
                      </span>
                    )
                  ) : settings?.has_openai_api_key ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      OPENAI_API_KEY dostępny
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Brak OPENAI_API_KEY w .env
                    </span>
                  )}
                </div>

                <Select
                  value={activeTask.cloud_model.provider}
                  onChange={(e) => {
                    const newProv = e.target.value as ApiProviderType;
                    const defaultMod =
                      newProv === "gemini" ? "gemini-3.8-flash" : "gpt-4o-mini";
                    updateCloudModel(activeTaskKey, {
                      provider: newProv,
                      model: defaultMod,
                    });
                  }}
                >
                  <option value="gemini">Google Gemini (Zalecany)</option>
                  <option value="openai">OpenAI (ChatGPT / GPT-4o)</option>
                </Select>
              </div>

              {/* Model identifier input */}
              <div className="space-y-1.5">
                <Input
                  label="Model w chmurze"
                  value={activeTask.cloud_model.model}
                  onChange={(e) =>
                    updateCloudModel(activeTaskKey, { model: e.target.value })
                  }
                  placeholder={
                    activeTask.cloud_model.provider === "gemini"
                      ? "gemini-3.8-flash"
                      : "gpt-4o-mini"
                  }
                />

                {/* Suggestions */}
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase font-semibold">
                    Szybki wybór:
                  </span>
                  {(activeTask.cloud_model.provider === "gemini"
                    ? GEMINI_MODEL_SUGGESTIONS
                    : OPENAI_MODEL_SUGGESTIONS
                  ).map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() =>
                        updateCloudModel(activeTaskKey, { model: sug })
                      }
                      className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                        activeTask.cloud_model.model === sug
                          ? "bg-sky-600 text-white font-semibold dark:bg-sky-600"
                          : "bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-transparent dark:hover:bg-neutral-800"
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Context Window input and presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                    Rozmiar okna kontekstu (tokeny)
                  </label>
                  <span className="font-mono text-xs text-slate-500 dark:text-neutral-400 font-semibold">
                    {activeTask.cloud_model.context_window.toLocaleString("pl-PL")} tok.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={2048}
                    max={2000000}
                    step={1024}
                    value={activeTask.cloud_model.context_window}
                    onChange={(e) =>
                      updateCloudModel(activeTaskKey, {
                        context_window: parseInt(e.target.value, 10) || 32768,
                      })
                    }
                    className="font-mono"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase font-semibold">
                    Presety:
                  </span>
                  {CLOUD_CONTEXT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        updateCloudModel(activeTaskKey, {
                          context_window: preset,
                        })
                      }
                      className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                        activeTask.cloud_model.context_window === preset
                          ? "bg-sky-600 text-white font-semibold"
                          : "bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-transparent dark:hover:bg-neutral-800"
                      }`}
                    >
                      {preset >= 1024 ? `${preset / 1024}k` : preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thinking / Reasoning Section */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200/70 dark:border-transparent space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-semibold text-slate-800 dark:text-neutral-200">
                      Tryb namysłu (Thinking / Reasoning)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Dla modeli o3, o1 lub Gemini 2.0 Flash Thinking
                    </span>
                  </div>

                  {/* 2-state toggle switch */}
                  <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-neutral-950 border border-slate-200/80 dark:border-transparent shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        updateCloudModel(activeTaskKey, { enable_thinking: false })
                      }
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                        !activeTask.cloud_model.enable_thinking
                          ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 shadow-sm"
                          : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
                      }`}
                    >
                      Wyłączony
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateCloudModel(activeTaskKey, { enable_thinking: true })
                      }
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                        activeTask.cloud_model.enable_thinking
                          ? "bg-sky-600 text-white shadow-sm font-semibold"
                          : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
                      }`}
                    >
                      Włączony
                    </button>
                  </div>
                </div>

                {activeTask.cloud_model.enable_thinking && (
                  <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                        Wysiłek myślenia (Reasoning Effort):
                      </span>

                      <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-neutral-950 border border-slate-200/80 dark:border-transparent">
                        {(["low", "medium", "high"] as ReasoningEffortType[]).map((effort) => {
                          const labels: Record<ReasoningEffortType, string> = {
                            low: "Niski",
                            medium: "Średni",
                            high: "Wysoki",
                          };
                          const isCur = activeTask.cloud_model.reasoning_effort === effort;
                          return (
                            <button
                              key={effort}
                              type="button"
                              onClick={() =>
                                updateCloudModel(activeTaskKey, { reasoning_effort: effort })
                              }
                              className={`px-2 py-0.5 text-xs font-medium rounded transition-all ${
                                isCur
                                  ? "bg-white dark:bg-neutral-800 text-sky-700 dark:text-sky-400 shadow-sm font-bold"
                                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200"
                              }`}
                            >
                              {labels[effort]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Input
                      type="number"
                      label="Budżet tokenów namysłu (opcjonalny)"
                      value={activeTask.cloud_model.thinking_budget ?? ""}
                      onChange={(e) =>
                        updateCloudModel(activeTaskKey, {
                          thinking_budget: e.target.value ? parseInt(e.target.value, 10) : null,
                        })
                      }
                      placeholder="Domyślny dla modelu (pozostaw puste)"
                    />
                  </div>
                )}
              </div>

              {/* Test Action & Results for Cloud */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTestCloudForTask(activeTaskKey)}
                    isLoading={isTestingCloud[activeTaskKey]}
                    className="w-full justify-center text-xs"
                  >
                    <Zap className="h-3.5 w-3.5 mr-1.5 text-sky-600 dark:text-sky-400" />
                    Testuj model chmurowy ({activeTask.cloud_model.model})
                  </Button>
                </div>

                {/* Feedback status */}
                {activeTask.cloud_test_message && (
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      activeTask.cloud_test_passed
                        ? "bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-neutral-900 dark:border-transparent dark:text-emerald-300"
                        : "bg-rose-50/80 border-rose-200 text-rose-900 dark:bg-neutral-900 dark:border-transparent dark:text-rose-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5">
                        {activeTask.cloud_test_passed ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                        )}
                        <span className="font-medium leading-relaxed">
                          {activeTask.cloud_test_message}
                        </span>
                      </div>

                      {cloudLatencies[activeTaskKey] !== null && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-neutral-950 font-mono text-[10px] text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-transparent font-semibold">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {Math.round(cloudLatencies[activeTaskKey]!)} ms
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating/Fixed Save Bar for convenience */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-none dark:border-transparent dark:bg-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
          <Info className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span>
            Pamiętaj o kliknięciu przycisku zapisu, aby utrwalić wybrane modele i strategie w bazie danych.
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 dark:bg-neutral-950 dark:border-transparent dark:text-emerald-400">
              <Check className="h-4 w-4" />
              Zapisano pomyślnie!
            </span>
          )}
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            className="text-sm font-semibold rounded-xl shadow-none w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-1.5" />
            Zapisz ustawienia
          </Button>
        </div>
      </div>
    </div>
  );
};
