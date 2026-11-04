import React, { useEffect, useState } from "react";
import {
  Cpu,
  Cloud,
  Save,
  Check,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  ApiProviderType,
  AppSettingsRead,
  AppSettingsUpdate,
  AutoParseModeType,
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export const SettingsView: React.FC = () => {
  const [, setSettings] = useState<AppSettingsRead | null>(null);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSaveSuccess(false);

      const updatePayload: AppSettingsUpdate = {
        auto_parse_mode: autoParseMode,
        ollama_base_url: ollamaBaseUrl,
        ollama_model: ollamaModel,
        api_provider: apiProvider,
        api_model: apiModel,
      };

      const updated = await api.settings.update(updatePayload);
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setErrorMessage("Błąd podczas zapisywania konfiguracji.");
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
                      : "border border-slate-200/80 hover:border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
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
              onChange={(e) => setOllamaBaseUrl(e.target.value)}
              placeholder="http://host.docker.internal:11434"
              helperText="W kontenerze Docker użyj host.docker.internal"
            />
            <Input
              label="Identyfikator modelu Ollama"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              placeholder="qwen2.5:14b lub llama3.1:8b"
              helperText="Zainstalowany model obsługujący JSON Schema"
            />
          </div>
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
            <Select
              label="Dostawca API"
              value={apiProvider}
              onChange={(e) =>
                setApiProvider(e.target.value as ApiProviderType)
              }
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
            </Select>

            <Input
              label="Model w chmurze"
              value={apiModel}
              onChange={(e) => setApiModel(e.target.value)}
              placeholder="gemini-2.5-flash lub gpt-4o-mini"
              helperText="Model używany do fallbacku oraz generowania CV"
            />
          </div>

          <div className="rounded-xl bg-slate-50/60 border border-slate-200/80 p-3.5 text-xs text-slate-600 dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-300 flex items-start gap-2 shadow-none">
            <ShieldAlert className="h-4 w-4 text-slate-400 dark:text-neutral-500 mt-0.5 shrink-0" />
            <p>
              <strong>Bezpieczeństwo kluczy:</strong> Zgodnie ze specyfikacją, klucze API (<code>GEMINI_API_KEY</code>, <code>OPENAI_API_KEY</code>, <code>EXTENSION_API_TOKEN</code>) są konfigurowane wyłącznie w pliku środowiskowym <code>.env</code> na serwerze i nie są przechowywane w bazie danych.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
