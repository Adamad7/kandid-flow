import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Layers,
  User,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  BaseCVPresetRead,
  CVGenerateRequest,
  CVVersionRead,
  JobOfferRead,
  TailoringModeType,
} from "../../types";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { Modal } from "../ui/Modal";

interface CVGeneratorModalProps {
  job: JobOfferRead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (version: CVVersionRead, job: JobOfferRead) => void;
}

export const CVGeneratorModal: React.FC<CVGeneratorModalProps> = ({
  job,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [presets, setPresets] = useState<BaseCVPresetRead[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);

  // Form State
  const [baselineType, setBaselineType] = useState<"profile" | "preset">("profile");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [tailoringMode, setTailoringMode] =
    useState<TailoringModeType>("full");
  const [language, setLanguage] = useState<"pl" | "en">("pl");
  const [customInstructions, setCustomInstructions] = useState("");
  const [selectedSections, setSelectedSections] = useState<string[]>([
    "summary",
    "skills",
    "experience",
    "projects",
    "education",
    "clause",
  ]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPresets();
      if (job) {
        setLanguage(job.language || "pl");
      }
      setIsGenerating(false);
      setErrorMessage(null);
    }
  }, [isOpen, job]);

  const loadPresets = async () => {
    try {
      setIsLoadingPresets(true);
      const data = await api.presets.list();
      setPresets(data);
      if (data.length > 0) {
        setSelectedPresetId(data[0].id);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingPresets(false);
    }
  };

  const toggleSection = (secId: string) => {
    setSelectedSections((prev) =>
      prev.includes(secId) ? prev.filter((s) => s !== secId) : [...prev, secId]
    );
  };

  const stages = [
    "Analiza profilu i wymagań oferty pracy...",
    "Ekstrakcja kluczowych słów i kompetencji...",
    "Synteza sekcji zawodowych przez model LLM...",
    "Kompilacja szablonu Typst i zapis wersji v1...",
  ];

  const handleGenerate = async () => {
    if (!job) return;

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setGenerationStage(0);

      // Simulate step progression for pleasant 2D animation
      const stageInterval = setInterval(() => {
        setGenerationStage((prev) => (prev < 3 ? prev + 1 : prev));
      }, 1400);

      const requestPayload: CVGenerateRequest = {
        job_offer_id: job.id,
        sections: selectedSections,
        preset_id: baselineType === "preset" ? selectedPresetId || null : null,
        tailoring_mode: tailoringMode,
        language: language,
        custom_instructions: customInstructions.trim() || null,
      };

      const newVersion = await api.cv.generate(requestPayload);
      clearInterval(stageInterval);

      // Trigger success callback to open Split-View CV Editor
      onSuccess(newVersion, job);
    } catch (err: unknown) {
      setIsGenerating(false);
      setErrorMessage(
        "Wystąpił błąd podczas generowania CV. Upewnij się, że usługa LLM jest dostępna."
      );
    }
  };

  if (!job) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isGenerating ? () => {} : onClose}
      title="Generator dopasowanego CV (AI)"
      description={`Dostosuj dokument aplikacyjny do oferty: ${
        job.role_title || "Stanowisko"
      } w ${job.company_name || "Firma"}`}
      maxWidth="2xl"
    >
      {isGenerating ? (
        /* 2D Loading Animation View */
        <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative">
            {/* Pulsing ring animation */}
            <div className="absolute -inset-4 rounded-full bg-blue-500/20 animate-ping" />
            <div className="relative h-20 w-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="h-10 w-10 text-white animate-spin" />
            </div>
          </div>

          <div className="space-y-2 max-w-md">
            <h3 className="text-lg font-bold text-slate-900">
              Inteligentne dopasowywanie CV w toku...
            </h3>
            <p className="text-sm font-medium text-blue-600 animate-pulse">
              {stages[generationStage]}
            </p>
          </div>

          {/* Stepper pills */}
          <div className="flex items-center gap-2 pt-4">
            {stages.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-500 ${
                  idx <= generationStage
                    ? "w-8 bg-blue-600"
                    : "w-2 bg-slate-200"
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-slate-400 max-w-xs">
            Model językowy weryfikuje Twoje doświadczenie z wymaganiami oferty,
            formułując uderzające punkty osiągnięć.
          </p>
        </div>
      ) : (
        /* Configuration Form View */
        <div className="space-y-6">
          {errorMessage && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Baseline Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              1. Wybierz punkt wyjścia (Baseline):
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setBaselineType("profile")}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${
                  baselineType === "profile"
                    ? "border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-sm text-slate-900">
                      Moja baza wiedzy
                    </span>
                  </div>
                  {baselineType === "profile" && (
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Wykorzystaj kompletny profil kandydata i automatycznie wybierz najtrafniejsze sekcje.
                </p>
              </div>

              <div
                onClick={() => setBaselineType("preset")}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${
                  baselineType === "preset"
                    ? "border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    <span className="font-semibold text-sm text-slate-900">
                      Szablon bazowy (Archetyp)
                    </span>
                  </div>
                  {baselineType === "preset" && (
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Użyj predefiniowanego wzorca stanowiskowego (np. Flutter Dev, DevOps) jako fundamentu.
                </p>
              </div>
            </div>

            {baselineType === "preset" && (
              <div className="pt-1">
                {isLoadingPresets ? (
                  <p className="text-xs text-slate-400">Ładowanie szablonów...</p>
                ) : presets.length === 0 ? (
                  <p className="text-xs text-amber-600">
                    Brak szablonów bazowych. Utwórz szablon w zakładce "Szablony bazowe" lub wybierz Bazę wiedzy.
                  </p>
                ) : (
                  <Select
                    label="Wybierz szablon archetypu"
                    value={selectedPresetId}
                    onChange={(e) => setSelectedPresetId(e.target.value)}
                  >
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.language.toUpperCase()})
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            )}
          </div>

          {/* 2. Tailoring Mode */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              2. Tryb dostosowania AI:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setTailoringMode("targeted_summary_keywords")}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${
                  tailoringMode === "targeted_summary_keywords"
                    ? "border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-slate-900">
                    Słowa kluczowe i podsumowanie
                  </span>
                  {tailoringMode === "targeted_summary_keywords" && (
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Zachowuje chronologię doświadczeń, modyfikując podsumowanie oraz akcentując kluczowe umiejętności pod ATS.
                </p>
              </div>

              <div
                onClick={() => setTailoringMode("full")}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${
                  tailoringMode === "full"
                    ? "border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-slate-900">
                    Pełne dostosowanie sekcji
                  </span>
                  {tailoringMode === "full" && (
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Przebudowuje i akcentuje punkty osiągnięć w doświadczeniu i projektach, precyzyjnie odpowiadając na profil oferty.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Language & Sections Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Język wyjściowy CV"
              value={language}
              onChange={(e) => setLanguage(e.target.value as "pl" | "en")}
            >
              <option value="pl">Polski (PL)</option>
              <option value="en">Angielski (EN)</option>
            </Select>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Sekcje do wygenerowania:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "summary", label: "Podsumowanie" },
                  { id: "skills", label: "Umiejętności" },
                  { id: "experience", label: "Doświadczenie" },
                  { id: "projects", label: "Projekty" },
                  { id: "education", label: "Edukacja" },
                  { id: "clause", label: "Klauzula" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSection(s.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      selectedSections.includes(s.id)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Custom Instructions */}
          <Textarea
            label="Dodatkowe wytyczne dla AI (Opcjonalne)"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="np. Połóż szczególny nacisk na znajomość Kubernetes, architektury event-driven i optymalizacji zapytań SQL..."
            rows={2}
          />

          {/* Dialog Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerate}
              className="px-6 font-semibold shadow-md"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generuj CV (v1)
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
