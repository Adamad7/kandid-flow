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
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  ApiProviderType,
  AppSettingsRead,
  AppSettingsUpdate,
  AutoParseModeType,
  SettingsConnectionTestResponse,
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettingsRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [autoParseMode, setAutoParseMode] = useState<AutoParseModeType>(
    "auto_ollama_fallback_api"
  );
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(
    "http://host.docker.internal:11434"
  );
  const [ollamaModel, setOllamaModel] = useState("qwen2.5:14b");
  const [apiProvider, setApiProvider] = useState<ApiProviderType>("gemini");
  const [apiModel, setApiModel] = useState("gemini-2.5-flash");

  // Connection Testing States
  const [isTestingOllama, setIsTestingOllama] = useState(false);
  const [ollamaTestResult, setOllamaTestResult] =
    useState<SettingsConnectionTestResponse | null>(null);

  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [cloudTestResult, setCloudTestResult] =
    useState<SettingsConnectionTestResponse | null>(null);

  // Field Validation Errors
  const [fieldErrors, setFieldErrors] = useState<{
    ollamaBaseUrl?: string;
    ollamaModel?: string;
    apiModel?: string;
  }>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await api.settings.get();
      setSettings(data);
      setAutoParseMode(data.auto_parse_mode);
      setOllamaBaseUrl(data.ollama_base_url);
      setOllamaModel(data.ollama_model);
      setApiProvider(data.api_provider);
      setApiModel(data.api_model);
    } catch {
      setErrorMessage("Nie udało się pobrać ustawień aplikacji.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestOllama = async () => {
    const trimmedUrl = ollamaBaseUrl.trim();
    if (!trimmedUrl) {
      setFieldErrors((prev) => ({
        ...prev,
        ollamaBaseUrl: "Adres URL Ollama jest wymagany do przetestowania połączenia.",
      }));
      return;
    }

    try {
      setIsTestingOllama(true);
      setOllamaTestResult(null);
      const res = await api.settings.testOllama({
        ollama_base_url: trimmedUrl,
        ollama_model: ollamaModel.trim() || undefined,
      });
      setOllamaTestResult(res);
    } catch (err: unknown) {
      setOllamaTestResult({
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Wystąpił nieoczekiwany błąd podczas testowania połączenia z Ollama.",
        available_models: null,
        latency_ms: null,
      });
    } finally {
      setIsTestingOllama(false);
    }
  };

  const handleTestCloud = async () => {
    const trimmedModel = apiModel.trim();
    if (!trimmedModel) {
      setFieldErrors((prev) => ({
        ...prev,
        apiModel: "Identyfikator modelu w chmurze jest wymagany do wykonania testu.",
      }));
      return;
    }

    try {
      setIsTestingCloud(true);
      setCloudTestResult(null);
      const res = await api.settings.testCloud({
        provider: apiProvider,
        model: trimmedModel,
      });
      setCloudTestResult(res);
    } catch (err: unknown) {
      setCloudTestResult({
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Wystąpił nieoczekiwany błąd podczas testowania dostawcy chmurowego.",
        available_models: null,
        latency_ms: null,
      });
    } finally {
      setIsTestingCloud(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const errors: {
      ollamaBaseUrl?: string;
      ollamaModel?: string;
      apiModel?: string;
    } = {};

    if (!ollamaBaseUrl.trim()) {
      errors.ollamaBaseUrl = "Adres bazowy Ollama nie może być pusty.";
    }
    if (!ollamaModel.trim()) {
      errors.ollamaModel = "Identyfikator modelu Ollama nie może być pusty.";
    }
    if (!apiModel.trim()) {
      errors.apiModel = "Identyfikator modelu w chmurze nie może być pusty.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage("Popraw błędy walidacji w formularzu przed zapisaniem konfiguracji.");
      return;
    }

    setFieldErrors({});
    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSaveSuccess(false);

      const updatePayload: AppSettingsUpdate = {
        auto_parse_mode: autoParseMode,
        ollama_base_url: ollamaBaseUrl.trim(),
        ollama_model: ollamaModel.trim(),
        api_provider: apiProvider,
        api_model: apiModel.trim(),
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
      <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
        Ładowanie ustawień aplikacji...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-none dark:border-transparent dark:bg-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-neutral-100">
            Ustawienia aplikacji i modeli AI
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            Skonfiguruj silnik parsowania ofert, lokalną instancję Ollama oraz dostawcę modeli chmurowych
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border-2 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300">
              <Check className="h-4 w-4" />
              Zapisano!
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
            Natychmiastowe obowiązywanie zmian
          </p>
          <p className="leading-relaxed text-slate-700 dark:text-neutral-300 text-xs">
            Ustawienia w tym widoku są zapisywane bezpośrednio w bazie danych i obowiązują natychmiast bez konieczności restartu kontenerów. Wartości w pliku{" "}
            <code className="px-1.5 py-0.5 rounded bg-indigo-100/90 dark:bg-neutral-800 font-mono text-[11px] text-indigo-900 dark:text-indigo-300">
              .env
            </code>{" "}
            pełnią wyłącznie rolę seedu początkowego przy pierwszym uruchomieniu oraz bezpiecznego magazynu na klucze API.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200/80 p-4 text-xs text-rose-700 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-300 flex items-center gap-2 shadow-none">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Pipeline & Parsing Mode */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-none space-y-4 dark:border-transparent dark:bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
            <Cpu className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-slate-900 dark:text-neutral-100">
              Tryb parsowania ofert (LLM Orchestration)
            </h3>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              Wybierz strategię kolejki przetwarzania:
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {[
                {
                  id: "auto_ollama_fallback_api",
                  title: "Lokalna Ollama z automatycznym fallbackiem do chmury (Zalecane)",
                  desc: "Próbuje sparsować ofertę lokalnie za darmo; w razie błędu, przekroczenia limitu czasu lub walidacji schematu, automatycznie przełącza na model chmurowy.",
                },
                {
                  id: "auto_ollama_only",
                  title: "Tylko lokalna Ollama (100% prywatności)",
                  desc: "Żadne dane o ofertach nie są wysyłane do chmury. Wymaga działającej instancji Ollama.",
                },
                {
                  id: "auto_api_only",
                  title: "Tylko API w chmurze (Gemini / OpenAI)",
                  desc: "Oferty są przetwarzane bezpośrednio przez szybkie API w chmurze.",
                },
                {
                  id: "manual",
                  title: "Ręczne przetwarzanie (Manual)",
                  desc: "Oferty trafiają do skrzynki i oczekują na manualne wywołanie parsowania przez użytkownika.",
                },
              ].map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all shadow-none ${
                    autoParseMode === m.id
                      ? "border-2 border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/40"
                      : "border border-slate-200/80 hover:border-slate-300 bg-white dark:border-neutral-800/80 dark:bg-neutral-950/40 dark:hover:border-neutral-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="auto_parse_mode"
                    value={m.id}
                    checked={autoParseMode === m.id}
                    onChange={(e) =>
                      setAutoParseMode(e.target.value as AutoParseModeType)
                    }
                    className="mt-1 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-neutral-100">
                      {m.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Ollama Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-none space-y-4 dark:border-transparent dark:bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
            <Cpu className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-semibold text-slate-900 dark:text-neutral-100">
              Konfiguracja lokalnej Ollama
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Adres bazowy Ollama (Base URL)"
              value={ollamaBaseUrl}
              onChange={(e) => {
                setOllamaBaseUrl(e.target.value);
                if (fieldErrors.ollamaBaseUrl) {
                  setFieldErrors((prev) => ({ ...prev, ollamaBaseUrl: undefined }));
                }
              }}
              error={fieldErrors.ollamaBaseUrl}
              placeholder="http://host.docker.internal:11434"
              helperText="W kontenerze Docker użyj host.docker.internal"
            />
            <Input
              label="Identyfikator modelu Ollama"
              value={ollamaModel}
              onChange={(e) => {
                setOllamaModel(e.target.value);
                if (fieldErrors.ollamaModel) {
                  setFieldErrors((prev) => ({ ...prev, ollamaModel: undefined }));
                }
              }}
              error={fieldErrors.ollamaModel}
              placeholder="qwen2.5:14b lub llama3.1:8b"
              helperText="Zainstalowany model obsługujący JSON Schema"
            />
          </div>

          {/* Ollama Connection Test Action Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-neutral-800">
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Sprawdź dostępność serwera Ollama i zweryfikuj czy wskazany model jest pobrany.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleTestOllama}
              isLoading={isTestingOllama}
              className="shrink-0"
            >
              <Zap className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
              Testuj połączenie z Ollama
            </Button>
          </div>

          {/* Ollama Test Result Feedback */}
          {ollamaTestResult && (
            <div
              className={`rounded-xl border p-4 text-xs space-y-2.5 transition-all shadow-none ${
                ollamaTestResult.success
                  ? "bg-emerald-50/70 border-emerald-200/90 text-emerald-900 dark:bg-neutral-950 dark:border-transparent dark:text-emerald-300"
                  : "bg-rose-50/70 border-rose-200/90 text-rose-900 dark:bg-neutral-950 dark:border-transparent dark:text-rose-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {ollamaTestResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  )}
                  <span className="font-medium leading-relaxed">{ollamaTestResult.message}</span>
                </div>
                {ollamaTestResult.latency_ms !== null && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-neutral-900 font-mono text-[11px] font-semibold text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-transparent">
                    <Clock className="h-3 w-3 text-slate-400 dark:text-neutral-500" />
                    {Math.round(ollamaTestResult.latency_ms)} ms
                  </span>
                )}
              </div>

              {ollamaTestResult.available_models && ollamaTestResult.available_models.length > 0 && (
                <div className="pt-2 border-t border-emerald-200/60 dark:border-neutral-800 space-y-1.5">
                  <span className="font-semibold block text-[11px] text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                    Zainstalowane modele Ollama (kliknij, aby wybrać):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ollamaTestResult.available_models.map((modelName) => {
                      const isCurrent =
                        ollamaModel.trim() === modelName ||
                        modelName.startsWith(`${ollamaModel.trim()}:`) ||
                        ollamaModel.trim().startsWith(`${modelName}:`);
                      return (
                        <button
                          key={modelName}
                          type="button"
                          onClick={() => {
                            setOllamaModel(modelName);
                            if (fieldErrors.ollamaModel) {
                              setFieldErrors((prev) => ({ ...prev, ollamaModel: undefined }));
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                            isCurrent
                              ? "bg-emerald-600 text-white font-bold dark:bg-emerald-600 dark:text-white"
                              : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:border-transparent"
                          }`}
                          title={`Użyj modelu ${modelName}`}
                        >
                          {modelName}
                          {isCurrent && " (wybrany)"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cloud API Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-none space-y-4 dark:border-transparent dark:bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
            <Cloud className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-slate-900 dark:text-neutral-100">
              Dostawca modeli w chmurze (Fallback)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* API Provider Selector with Realtime Key Status */}
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="api-provider-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-300"
                >
                  Dostawca API
                </label>

                {/* Dynamic Key Badge for Chosen Provider */}
                {apiProvider === "gemini" ? (
                  settings?.has_gemini_api_key ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-neutral-950 dark:text-emerald-400 dark:border-transparent">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Klucz GEMINI_API_KEY aktywny w .env
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300 dark:bg-neutral-950 dark:text-rose-400 dark:border-transparent">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Brak klucza GEMINI_API_KEY w .env
                    </span>
                  )
                ) : settings?.has_openai_api_key ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-neutral-950 dark:text-emerald-400 dark:border-transparent">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Klucz OPENAI_API_KEY aktywny w .env
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300 dark:bg-neutral-950 dark:text-rose-400 dark:border-transparent">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Brak klucza OPENAI_API_KEY w .env
                  </span>
                )}
              </div>

              <Select
                id="api-provider-select"
                value={apiProvider}
                onChange={(e) => {
                  const newProvider = e.target.value as ApiProviderType;
                  setApiProvider(newProvider);
                  // Provide friendly defaults if switching
                  if (newProvider === "gemini" && !apiModel.startsWith("gemini")) {
                    setApiModel("gemini-2.5-flash");
                  } else if (newProvider === "openai" && !apiModel.startsWith("gpt") && !apiModel.startsWith("o3")) {
                    setApiModel("gpt-4o-mini");
                  }
                }}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
              </Select>
            </div>

            {/* Cloud Model Input with Suggestion Chips */}
            <div className="w-full space-y-1.5">
              <Input
                label="Model w chmurze"
                value={apiModel}
                onChange={(e) => {
                  setApiModel(e.target.value);
                  if (fieldErrors.apiModel) {
                    setFieldErrors((prev) => ({ ...prev, apiModel: undefined }));
                  }
                }}
                error={fieldErrors.apiModel}
                placeholder={apiProvider === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini"}
                helperText="Model używany do fallbacku oraz generowania treści CV"
              />

              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 dark:text-neutral-500">Szybki wybór:</span>
                {(apiProvider === "gemini"
                  ? ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
                  : ["gpt-4o-mini", "gpt-4o", "o3-mini"]
                ).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setApiModel(m);
                      if (fieldErrors.apiModel) {
                        setFieldErrors((prev) => ({ ...prev, apiModel: undefined }));
                      }
                    }}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                      apiModel === m
                        ? "bg-indigo-100 text-indigo-700 font-semibold dark:bg-indigo-950/80 dark:text-indigo-300"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Overview of both environment keys */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-500 dark:text-neutral-400 font-medium">Status kluczy w pliku .env:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono text-[11px] ${
                settings?.has_gemini_api_key
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-neutral-950 dark:text-emerald-400 dark:border-transparent"
                  : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-neutral-950 dark:text-rose-400 dark:border-transparent"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${settings?.has_gemini_api_key ? "bg-emerald-500" : "bg-rose-500"}`} />
              GEMINI_API_KEY: {settings?.has_gemini_api_key ? "aktywny" : "brak"}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono text-[11px] ${
                settings?.has_openai_api_key
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-neutral-950 dark:text-emerald-400 dark:border-transparent"
                  : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-neutral-950 dark:text-rose-400 dark:border-transparent"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${settings?.has_openai_api_key ? "bg-emerald-500" : "bg-rose-500"}`} />
              OPENAI_API_KEY: {settings?.has_openai_api_key ? "aktywny" : "brak"}
            </span>
          </div>

          {/* Cloud Connection Test Action Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-neutral-800">
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Wyślij próbne żądanie do API dostawcy ({apiProvider === "gemini" ? "Google Gemini" : "OpenAI"}), aby zweryfikować poprawność klucza i uprawnień.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleTestCloud}
              isLoading={isTestingCloud}
              className="shrink-0"
            >
              <Zap className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
              Testuj model chmurowy
            </Button>
          </div>

          {/* Cloud Test Result Feedback */}
          {cloudTestResult && (
            <div
              className={`rounded-xl border p-4 text-xs space-y-2.5 transition-all shadow-none ${
                cloudTestResult.success
                  ? "bg-emerald-50/70 border-emerald-200/90 text-emerald-900 dark:bg-neutral-950 dark:border-transparent dark:text-emerald-300"
                  : "bg-rose-50/70 border-rose-200/90 text-rose-900 dark:bg-neutral-950 dark:border-transparent dark:text-rose-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {cloudTestResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  )}
                  <span className="font-medium leading-relaxed">{cloudTestResult.message}</span>
                </div>
                {cloudTestResult.latency_ms !== null && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-neutral-900 font-mono text-[11px] font-semibold text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-transparent">
                    <Clock className="h-3 w-3 text-slate-400 dark:text-neutral-500" />
                    {Math.round(cloudTestResult.latency_ms)} ms
                  </span>
                )}
              </div>

              {cloudTestResult.available_models && cloudTestResult.available_models.length > 0 && (
                <div className="pt-2 border-t border-emerald-200/60 dark:border-neutral-800 space-y-1.5">
                  <span className="font-semibold block text-[11px] text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                    Wykryte modele w API (kliknij, aby wybrać):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {cloudTestResult.available_models.map((modelName) => {
                      const isCurrent = apiModel.trim() === modelName;
                      return (
                        <button
                          key={modelName}
                          type="button"
                          onClick={() => {
                            setApiModel(modelName);
                            if (fieldErrors.apiModel) {
                              setFieldErrors((prev) => ({ ...prev, apiModel: undefined }));
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                            isCurrent
                              ? "bg-indigo-600 text-white font-bold dark:bg-indigo-600 dark:text-white"
                              : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:border-transparent"
                          }`}
                          title={`Użyj modelu ${modelName}`}
                        >
                          {modelName}
                          {isCurrent && " (wybrany)"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security Notice */}
          <div className="rounded-xl bg-slate-50/60 border border-slate-200/80 p-3.5 text-xs text-slate-600 dark:bg-neutral-950 dark:border-transparent dark:text-neutral-300 flex items-start gap-2 shadow-none">
            <ShieldAlert className="h-4 w-4 text-slate-400 dark:text-neutral-500 mt-0.5 shrink-0" />
            <p>
              <strong>Bezpieczeństwo kluczy:</strong> Zgodnie ze specyfikacją architektoniczną, klucze API (<code>GEMINI_API_KEY</code>, <code>OPENAI_API_KEY</code>, <code>EXTENSION_API_TOKEN</code>) są konfigurowane wyłącznie w pliku środowiskowym <code>.env</code> na serwerze i nie są przechowywane w bazie danych.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
