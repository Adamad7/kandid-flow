import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Brain,
  Zap,
  AlertCircle,
  GitMerge,
  Replace,
  Sliders,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  CandidateAIFillRequest,
  CandidateProfileRead,
  LLMProviderType,
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { Modal } from "../ui/Modal";

const CONTEXT_WINDOW_PRESETS = [
  { label: "16 384 (16k)", value: 16384 },
  { label: "32 768 (32k - domyślne)", value: 32768 },
  { label: "65 536 (64k)", value: 65536 },
  { label: "131 072 (128k)", value: 131072 },
];

interface KnowledgeBaseAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProfile: CandidateProfileRead) => void;
}

export const KnowledgeBaseAIModal: React.FC<KnowledgeBaseAIModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [text, setText] = useState("");
  const [llmEngine, setLlmEngine] = useState<"default" | "local" | "api">("default");
  const [useDefaultApiKey, setUseDefaultApiKey] = useState(true);
  const [customApiKey, setCustomApiKey] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [enableThinking, setEnableThinking] = useState(true);
  const [contextWindow, setContextWindow] = useState<number>(32768);
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  const [activeSettings, setActiveSettings] = useState<{
    ollama_model: string;
    api_model: string;
  } | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.settings
        .get()
        .then((data) => {
          setActiveSettings({
            ollama_model: data.ollama_model,
            api_model: data.api_model,
          });
        })
        .catch(() => {
          // Ignore settings fetch failure silently
        });
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!isAnalyzing) {
      setErrorMessage(null);
      onClose();
    }
  };

  const handleSubmit = async () => {
    const trimmedText = text.trim();
    if (!trimmedText || trimmedText.length < 5) {
      setErrorMessage("Wprowadź tekst o długości minimum 5 znaków.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage(null);

      let providerValue: LLMProviderType = "default";
      if (llmEngine === "local") {
        providerValue = "ollama";
      } else if (llmEngine === "api") {
        const trimmedKey = customApiKey.trim();
        if (!useDefaultApiKey && trimmedKey) {
          providerValue = trimmedKey.startsWith("sk-") ? "openai" : "gemini";
        } else {
          providerValue = "api";
        }
      }

      const payload: CandidateAIFillRequest = {
        text: trimmedText,
        llm_provider: providerValue,
        llm_model:
          llmEngine !== "default" && customModel.trim() ? customModel.trim() : null,
        api_key:
          llmEngine === "api" && !useDefaultApiKey && customApiKey.trim()
            ? customApiKey.trim()
            : null,
        enable_thinking: enableThinking,
        context_window: contextWindow > 0 ? contextWindow : 32768,
        mode: mode,
      };

      const updatedProfile = await api.candidate.aiFill(payload);
      onSuccess(updatedProfile);
      handleClose();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(
        error?.message ||
          "Wystąpił błąd podczas analizowania tekstu. Upewnij się, że usługa LLM jest aktywna i dostępna."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Inteligentne uzupełnianie Bazy Wiedzy przez AI"
      description="Wklej swoje CV, profil z LinkedIn, opis doświadczeń lub notatki — model AI automatycznie wyodrębni informacje i zorganizuje strukturę bazy wiedzy."
      maxWidth="4xl"
    >
      {isAnalyzing ? (
        /* Analyzing / Loading View */
        <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-blue-500/20 animate-ping" />
            <div className="relative h-20 w-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="h-10 w-10 text-white animate-spin" />
            </div>
          </div>

          <div className="space-y-2 max-w-md">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Analizowanie i strukturyzacja danych...
            </h3>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 animate-pulse">
              Model AI analizuje wprowadzony tekst i dopasowuje go do struktury bazy wiedzy...
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <div className="h-2 w-8 rounded-full bg-blue-600 dark:bg-blue-500 animate-pulse" />
            <div className="h-2 w-8 rounded-full bg-blue-600/70 dark:bg-blue-500/70 animate-pulse delay-75" />
            <div className="h-2 w-8 rounded-full bg-blue-600/40 dark:bg-blue-500/40 animate-pulse delay-150" />
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
            Model językowy weryfikuje chronologię, wydobywa technologie, formułuje
            osiągnięcia oraz mapuje sekcje kontaktu i edukacji.
          </p>
        </div>
      ) : (
        /* Form View */
        <div className="space-y-6">
          {errorMessage && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Raw Textarea Input */}
          <div className="space-y-1.5">
            <Textarea
              label="1. Treść źródłowa (CV, LinkedIn, projekty, notatki):"
              placeholder="Wklej tutaj całą treść swojego CV, profil z LinkedIn, listę projektów, osiągnięć lub surowe notatki o Twoim doświadczeniu..."
              rows={16}
              className="min-h-[320px] font-mono text-sm leading-relaxed"
              value={text}
              onChange={(e) => setText(e.target.value)}
              helperText="Im więcej szczegółów podasz (daty, technologie, odpowiedzialności), tym dokładniej model wypełni poszczególne sekcje."
            />
          </div>

          {/* 2. AI Engine Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              2. Silnik sztucznej inteligencji:
            </label>
            <Select
              value={llmEngine}
              onChange={(e) => setLlmEngine(e.target.value as "default" | "local" | "api")}
            >
              <option value="default">Domyślnie (zgodnie z konfiguracją systemu)</option>
              <option value="local">Lokalny model (Ollama na Twoim sprzęcie)</option>
              <option value="api">API w chmurze (Gemini / OpenAI)</option>
            </Select>

            {/* API Options */}
            {llmEngine === "api" && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={useDefaultApiKey}
                    onChange={(e) => setUseDefaultApiKey(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Użyj domyślnego klucza API z konfiguracji serwera</span>
                </label>

                <Input
                  label="Własny klucz API"
                  type="password"
                  placeholder={
                    useDefaultApiKey
                      ? "Aktywny klucz domyślny z pliku .env"
                      : "Wklej swój klucz API (np. AIza... lub sk-...)"
                  }
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  disabled={useDefaultApiKey}
                  helperText={
                    useDefaultApiKey
                      ? "Odznacz powyższy checkbox, aby podać inny klucz API."
                      : "System automatycznie rozpozna dostawcę na podstawie formatu klucza."
                  }
                />
              </div>
            )}

            {/* Optional Model Override */}
            {llmEngine !== "default" && (
              <Input
                label="Niestandardowa nazwa modelu (Opcjonalnie)"
                placeholder={
                  llmEngine === "local"
                    ? activeSettings?.ollama_model || "gemma4:12b"
                    : activeSettings?.api_model || "gemini-2.5-flash"
                }
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                helperText={
                  llmEngine === "local"
                    ? `Pozostaw puste, aby zastosować aktywny model z ustawień (${activeSettings?.ollama_model || "gemma4:12b"}).`
                    : `Pozostaw puste, aby zastosować aktywny model z ustawień (${activeSettings?.api_model || "gemini-2.5-flash"}).`
                }
              />
            )}

            {/* Thinking / Reasoning Mode Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tryb pracy modelu:
              </span>

              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setEnableThinking(true)}
                  className={`px-3 py-1.5 rounded-md transition-colors duration-150 flex items-center gap-1.5 select-none whitespace-nowrap font-medium ${
                    enableThinking
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <Brain className="h-3.5 w-3.5 shrink-0" />
                  Tryb namysłu
                </button>
                <button
                  type="button"
                  onClick={() => setEnableThinking(false)}
                  className={`px-3 py-1.5 rounded-md transition-colors duration-150 flex items-center gap-1.5 select-none whitespace-nowrap font-medium ${
                    !enableThinking
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5 shrink-0" />
                  Natychmiastowa odpowiedź
                </button>
              </div>
            </div>

            {/* Context Window Configuration */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Rozmiar okna kontekstowego (tokeny):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32">
                    <Input
                      type="number"
                      min={2048}
                      max={262144}
                      step={1024}
                      value={contextWindow || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setContextWindow(isNaN(val) ? 0 : val);
                      }}
                      className="text-right font-mono text-xs h-8"
                      placeholder="32768"
                    />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">tok.</span>
                </div>
              </div>

              {/* Preset pill buttons */}
              <div className="flex flex-wrap gap-2">
                {CONTEXT_WINDOW_PRESETS.map((preset) => {
                  const isSelected = contextWindow === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setContextWindow(preset.value)}
                      className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all duration-150 select-none ${
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                          : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Domyślnie 32 768 tokenów (32k). Wyższa wartość zapobiega ucinaniu długich odpowiedzi i pozwala na swobodne generowanie toku rozumowania (thinking) przez model.
              </p>
            </div>
          </div>

          {/* 3. Integration Mode Selection (Merge vs Replace) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              3. Sposób wdrożenia zmian do bazy wiedzy:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("merge")}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                  mode === "merge"
                    ? "border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30 ring-1 ring-blue-500"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-slate-100">
                  <GitMerge className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Scal z istniejącymi danymi (zalecane)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Zachowuje obecne wpisy i dołącza nowo wykryte pozycje, projekty oraz technologie.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode("replace")}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                  mode === "replace"
                    ? "border-rose-600 bg-rose-50/50 dark:border-rose-500 dark:bg-rose-950/30 ring-1 ring-rose-500"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-slate-100">
                  <Replace className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span>Zastąp całą bazę wiedzy</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Zastępuje profil nowymi danymi. Wszystkie dotychczasowe wpisy zostaną nadpisane.
                </p>
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isAnalyzing}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={!text.trim() || isAnalyzing}
              isLoading={isAnalyzing}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Rozpocznij uzupełnianie AI
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
