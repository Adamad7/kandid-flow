import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  User,
  AlertCircle,
  AlertTriangle,
  Brain,
  Zap,
  Cpu,
  Briefcase,
  FolderGit2,
  GraduationCap,
  Award,
  FileText,
  FileCode,
  Languages,
  BookOpen,
  Trophy,
  Heart,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  BaseCVPresetRead,
  CandidateProfileRead,
  CVGenerateRequest,
  CVSectionConfig,
  CVVersionRead,
  JobOfferRead,
  LLMProviderType,
  SectionGenerationMode,
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { Modal } from "../ui/Modal";

interface CVGeneratorModalProps {
  job: JobOfferRead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (version: CVVersionRead, job: JobOfferRead) => void;
}

interface SectionDefinition {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STANDARD_SECTIONS: SectionDefinition[] = [
  {
    id: "summary",
    title: "O mnie",
    description: "Podsumowanie profilu zawodowego, mocnych stron i celów",
    icon: User,
  },
  {
    id: "skills",
    title: "Umiejętności",
    description: "Kategorie technologii, języków i kompetencji twardych",
    icon: Cpu,
  },
  {
    id: "experience",
    title: "Doświadczenie zawodowe",
    description: "Historia zatrudnienia z uderzającymi punktami osiągnięć",
    icon: Briefcase,
  },
  {
    id: "projects",
    title: "Projekty",
    description: "Najważniejsze realizacje, architektura i stack technologiczny",
    icon: FolderGit2,
  },
  {
    id: "education",
    title: "Edukacja",
    description: "Uczelnie, stopnie naukowe oraz kierunki kształcenia",
    icon: GraduationCap,
  },
  {
    id: "certificates",
    title: "Certyfikaty",
    description: "Uprawnienia branżowe, licencje i ukończone akredytacje",
    icon: Award,
  },
  {
    id: "languages",
    title: "Znajomość języków",
    description: "Języki obce i ojczyste z poziomami biegłości",
    icon: Languages,
  },
  {
    id: "trainings",
    title: "Szkolenia",
    description: "Kursy specjalistyczne, warsztaty i programy szkoleniowe",
    icon: BookOpen,
  },
  {
    id: "achievements",
    title: "Osiągnięcia",
    description: "Nagrody, wyróżnienia, hackathony i kluczowe sukcesy",
    icon: Trophy,
  },
  {
    id: "interests",
    title: "Zainteresowania",
    description: "Pasje, hobby i zainteresowania pozazawodowe",
    icon: Heart,
  },
  {
    id: "clause",
    title: "Klauzula RODO",
    description: "Zgoda na przetwarzanie danych osobowych pod danego pracodawcę",
    icon: FileText,
  },
];

/**
 * Check if a specific section has data in the given baseline sections array.
 */
function isSectionEmptyInBaseline(
  secId: string,
  baselineSections: any[] | undefined
): boolean {
  if (!baselineSections || !Array.isArray(baselineSections)) {
    return true;
  }
  const block = baselineSections.find(
    (s: any) => (s?.id && s.id === secId) || (s?.type && s.type === secId)
  );

  if (!block) {
    return true;
  }

  const type = block.type || block.id;

  if (type === "summary" || type === "clause") {
    const text = block.content || block.text || "";
    return typeof text === "string" ? text.trim().length === 0 : true;
  }

  if (type === "skills") {
    if (!block.items || !Array.isArray(block.items) || block.items.length === 0) {
      return true;
    }
    return !block.items.some((cat: any) => {
      if (typeof cat === "string") return cat.trim().length > 0;
      if (cat && Array.isArray(cat.skills)) return cat.skills.length > 0;
      return false;
    });
  }

  if (type === "interests" || type === "custom") {
    const hasItems =
      Array.isArray(block.items) &&
      block.items.some((i: any) => typeof i === "string" && i.trim().length > 0);
    const hasContent = typeof block.content === "string" && block.content.trim().length > 0;
    return !hasItems && !hasContent;
  }

  // List sections: experience, projects, education, certificates, languages, trainings, achievements
  if (Array.isArray(block.items)) {
    return block.items.length === 0;
  }

  return true;
}

function getBaselineSectionsForPreset(
  presetId: string,
  presetsList: BaseCVPresetRead[],
  profile: CandidateProfileRead | null
): any[] {
  if (presetId.trim()) {
    const preset = presetsList.find((p) => p.id === presetId);
    if (preset && preset.layout_schema) {
      if (typeof preset.layout_schema === "object" && "sections" in preset.layout_schema) {
        return (preset.layout_schema as any).sections || [];
      }
      if (Array.isArray(preset.layout_schema)) {
        return preset.layout_schema;
      }
    }
    return [];
  }
  return profile?.sections || [];
}

export const CVGeneratorModal: React.FC<CVGeneratorModalProps> = ({
  job,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [presets, setPresets] = useState<BaseCVPresetRead[]>([]);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfileRead | null>(null);
  const [availableSections, setAvailableSections] = useState<SectionDefinition[]>(STANDARD_SECTIONS);
  const defaultModesRef = useRef<Record<string, SectionGenerationMode>>({});

  // Form State
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [llmEngine, setLlmEngine] = useState<"default" | "local" | "api">("default");
  const [useDefaultApiKey, setUseDefaultApiKey] = useState(true);
  const [customApiKey, setCustomApiKey] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [language, setLanguage] = useState<"pl" | "en">("pl");
  const [customInstructions, setCustomInstructions] = useState("");
  const [enableThinking, setEnableThinking] = useState(true);

  // Map of sectionId -> mode ('off' | 'raw' | 'ai')
  const [sectionModes, setSectionModes] = useState<Record<string, SectionGenerationMode>>({
    summary: "ai",
    skills: "ai",
    experience: "ai",
    projects: "ai",
    education: "raw",
    certificates: "raw",
    languages: "raw",
    trainings: "raw",
    achievements: "ai",
    interests: "raw",
    clause: "ai",
  });

  // Active baseline sections from preset or candidate profile
  const activeBaselineSections = useMemo(() => {
    return getBaselineSectionsForPreset(selectedPresetId, presets, candidateProfile);
  }, [selectedPresetId, presets, candidateProfile]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      if (job) {
        setLanguage((job.language as "pl" | "en") || "pl");
      }
      setIsGenerating(false);
      setErrorMessage(null);
    }
  }, [isOpen, job]);

  const loadInitialData = async () => {
    try {
      const [presetsData, profileData] = await Promise.all([
        api.presets.list().catch(() => [] as BaseCVPresetRead[]),
        api.candidate.get().catch(() => null as CandidateProfileRead | null),
      ]);

      setPresets(presetsData);
      setCandidateProfile(profileData);

      // Assemble sections: standard + custom from candidate profile
      const sectionsList: SectionDefinition[] = [...STANDARD_SECTIONS];
      const initialModes: Record<string, SectionGenerationMode> = {
        summary: "ai",
        skills: "ai",
        experience: "ai",
        projects: "ai",
        education: "raw",
        certificates: "raw",
        languages: "raw",
        trainings: "raw",
        achievements: "ai",
        interests: "raw",
        clause: "ai",
      };

      if (profileData) {
        // Find custom sections
        if (profileData.sections) {
          profileData.sections.forEach((sec) => {
            if (sec.type === "custom") {
              const existing = sectionsList.find((s) => s.id === sec.id);
              if (!existing) {
                sectionsList.push({
                  id: sec.id,
                  title: sec.title || "Własna sekcja",
                  description: "Niestandardowa sekcja z Twojej bazy wiedzy",
                  icon: FileCode,
                });
                initialModes[sec.id] = "raw";
              }
            }
          });
        }

        // Apply saved default_sections from profile
        if (profileData.default_sections && Array.isArray(profileData.default_sections)) {
          profileData.default_sections.forEach((item) => {
            if (typeof item === "string") {
              initialModes[item] = "ai";
            } else if (item && typeof item === "object" && item.id) {
              initialModes[item.id] = item.mode || "ai";
            }
          });
        }
      }

      defaultModesRef.current = initialModes;

      // Determine initial baseline sections
      const initialBaseline = getBaselineSectionsForPreset(
        selectedPresetId,
        presetsData,
        profileData
      );

      const computedModes: Record<string, SectionGenerationMode> = {};
      sectionsList.forEach((sec) => {
        const empty = isSectionEmptyInBaseline(sec.id, initialBaseline);
        if (empty) {
          computedModes[sec.id] = "off";
        } else {
          computedModes[sec.id] = initialModes[sec.id] || "ai";
        }
      });

      setAvailableSections(sectionsList);
      setSectionModes(computedModes);
    } catch {
      // Fallback
    }
  };

  const handlePresetChange = (newPresetId: string) => {
    setSelectedPresetId(newPresetId);
    const newBaseline = getBaselineSectionsForPreset(newPresetId, presets, candidateProfile);

    setSectionModes((prev) => {
      const nextModes = { ...prev };
      availableSections.forEach((sec) => {
        const empty = isSectionEmptyInBaseline(sec.id, newBaseline);
        if (empty) {
          nextModes[sec.id] = "off";
        } else if (nextModes[sec.id] === "off") {
          // If section was set to 'off' because it was previously empty,
          // restore its baseline default mode
          nextModes[sec.id] = defaultModesRef.current[sec.id] || "ai";
        }
      });
      return nextModes;
    });
  };

  const handleSetSectionMode = (secId: string, mode: SectionGenerationMode) => {
    const empty = isSectionEmptyInBaseline(secId, activeBaselineSections);
    if (empty && mode !== "off") {
      return;
    }
    setSectionModes((prev) => ({
      ...prev,
      [secId]: mode,
    }));
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

      // Convert section modes to CVSectionConfig array
      const sectionsConfig: CVSectionConfig[] = availableSections.map((sec) => ({
        id: sec.id,
        mode: sectionModes[sec.id] || "ai",
      }));

      // Map llmEngine to provider
      let providerValue: LLMProviderType = "default";
      if (llmEngine === "local") {
        providerValue = "local";
      } else if (llmEngine === "api") {
        providerValue = "api";
      }

      const requestPayload: CVGenerateRequest = {
        job_offer_id: job.id,
        sections: sectionsConfig,
        preset_id: selectedPresetId.trim() ? selectedPresetId : null,
        tailoring_mode: "full",
        language: language,
        custom_instructions: customInstructions.trim() || null,
        llm_provider: providerValue,
        llm_model:
          llmEngine !== "default" && customModel.trim() ? customModel.trim() : null,
        api_key:
          llmEngine === "api" && !useDefaultApiKey && customApiKey.trim()
            ? customApiKey.trim()
            : null,
        enable_thinking: enableThinking,
      };

      const newVersion = await api.cv.generate(requestPayload);
      clearInterval(stageInterval);

      // Trigger success callback to open Split-View CV Editor
      onSuccess(newVersion, job);
    } catch {
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
            <div className="absolute -inset-4 rounded-full bg-indigo-500/20 animate-ping" />
            <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-none">
              <Sparkles className="h-10 w-10 text-white animate-spin" />
            </div>
          </div>

          <div className="space-y-2 max-w-md">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Inteligentne dopasowywanie CV w toku...
            </h3>
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 animate-pulse">
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
                    ? "w-8 bg-indigo-600 dark:bg-indigo-500"
                    : "w-2 bg-slate-200 dark:bg-neutral-800"
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-slate-400 dark:text-neutral-500 max-w-xs">
            Model językowy weryfikuje Twoje doświadczenie z wymaganiami oferty,
            formułując uderzające punkty osiągnięć.
          </p>
        </div>
      ) : (
        /* Configuration Form View */
        <div className="space-y-6">
          {errorMessage && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Base Template Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              1. Szablon bazowy:
            </label>
            <Select
              value={selectedPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              helperText="Brak wyboru szablonu oznacza użycie danych z całej bazy wiedzy."
            >
              <option value="">Brak szablonu (użyj całej bazy wiedzy)</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.language.toUpperCase()})
                </option>
              ))}
            </Select>
          </div>

          {/* 2. AI Engine Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
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
              <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={useDefaultApiKey}
                    onChange={(e) => setUseDefaultApiKey(e.target.checked)}
                    className="rounded border-slate-300 dark:border-neutral-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
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
                      : "System automatycznie rozpozna dostawcę (Gemini lub OpenAI) na podstawie formatu klucza."
                  }
                />
              </div>
            )}

            {/* Optional Model Override (shown only when not default engine) */}
            {llmEngine !== "default" && (
              <Input
                label="Niestandardowa nazwa modelu (Opcjonalnie)"
                placeholder={
                  llmEngine === "local"
                    ? "np. qwen2.5:14b, deepseek-r1:14b"
                    : "np. gemini-2.5-flash, gpt-4o, gpt-4o-mini"
                }
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                helperText="Pozostaw puste, aby zastosować zalecany model domyślny dla wybranego silnika."
              />
            )}

            {/* Thinking / Reasoning Mode Switch */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950">
              <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                Tryb pracy modelu:
              </span>

              {/* 2-Option Switch: Tryb namysłu (LEFT), Natychmiastowa odpowiedź (RIGHT) */}
              <div className="inline-flex rounded-xl border border-slate-200 dark:border-neutral-700 p-0.5 bg-slate-100 dark:bg-neutral-900 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setEnableThinking(true)}
                  className={`px-3 py-1.5 rounded-lg transition-colors duration-150 flex items-center gap-1.5 select-none whitespace-nowrap font-semibold ${
                    enableThinking
                      ? "bg-indigo-600 text-white shadow-none"
                      : "text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  <Brain className="h-3.5 w-3.5 shrink-0" />
                  Tryb namysłu
                </button>
                <button
                  type="button"
                  onClick={() => setEnableThinking(false)}
                  className={`px-3 py-1.5 rounded-lg transition-colors duration-150 flex items-center gap-1.5 select-none whitespace-nowrap font-semibold ${
                    !enableThinking
                      ? "bg-amber-500 text-white shadow-none"
                      : "text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5 shrink-0" />
                  Natychmiastowa odpowiedź
                </button>
              </div>
            </div>
          </div>

          {/* 3. Output Language */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              3. Język wyjściowy CV:
            </label>
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "pl" | "en")}
            >
              <option value="pl">Polski (PL)</option>
              <option value="en">Angielski (EN)</option>
            </Select>
          </div>

          {/* 4. Sections to Generate (Full Width Stack with 3-Position Toggles) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                4. Sekcje do wygenerowania:
              </label>
              <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                Domyślne ustawienia pobrane z Bazy Wiedzy
              </span>
            </div>

            <div className="space-y-2.5">
              {availableSections.map((sec) => {
                const IconComponent = sec.icon;
                const isEmpty = isSectionEmptyInBaseline(sec.id, activeBaselineSections);
                const currentMode = sectionModes[sec.id] || "ai";
                const isOff = currentMode === "off";
                const isRaw = currentMode === "raw";
                const isAi = currentMode === "ai";
                const emptyMessage = selectedPresetId.trim()
                  ? "Brak danych w wybranym szablonie"
                  : "Brak danych w bazie wiedzy";

                return (
                  <div
                    key={sec.id}
                    className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-colors duration-150 gap-3 ${
                      isOff
                        ? "bg-slate-50/60 dark:bg-neutral-950/40 border-slate-200/60 dark:border-neutral-800/60 opacity-70"
                        : isAi
                        ? "bg-indigo-50/30 dark:bg-neutral-900 border-2 border-indigo-200/90 dark:border-indigo-900/60 shadow-none"
                        : "bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 shadow-none"
                    }`}
                  >
                    {/* Section Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isOff
                            ? "bg-slate-200 dark:bg-neutral-800 text-slate-400"
                            : isAi
                            ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                            : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300"
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold truncate ${
                              isOff
                                ? "text-slate-400 dark:text-neutral-500"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {sec.title}
                          </span>
                          {isEmpty && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800/60">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              {emptyMessage}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 truncate">
                          {sec.description}
                        </p>
                      </div>
                    </div>

                    {/* 3-Position Toggle Switch */}
                    <div className="inline-flex shrink-0 self-end sm:self-auto rounded-xl border border-slate-200 dark:border-neutral-700 p-0.5 bg-slate-100 dark:bg-neutral-950 text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => handleSetSectionMode(sec.id, "off")}
                        className={`px-2.5 py-1 rounded-lg transition-colors duration-150 select-none whitespace-nowrap font-semibold ${
                          isOff
                            ? "bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-100 shadow-none"
                            : "text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white"
                        }`}
                      >
                        Nie umieszczaj
                      </button>
                      <button
                        type="button"
                        disabled={isEmpty}
                        title={isEmpty ? emptyMessage : undefined}
                        onClick={() => !isEmpty && handleSetSectionMode(sec.id, "raw")}
                        className={`px-2.5 py-1 rounded-lg transition-colors duration-150 select-none whitespace-nowrap font-semibold ${
                          isEmpty
                            ? "opacity-35 cursor-not-allowed text-slate-400 dark:text-neutral-600"
                            : isRaw
                            ? "bg-slate-700 dark:bg-neutral-700 text-white shadow-none"
                            : "text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white"
                        }`}
                      >
                        Z bazy wiedzy
                      </button>
                      <button
                        type="button"
                        disabled={isEmpty}
                        title={isEmpty ? emptyMessage : undefined}
                        onClick={() => !isEmpty && handleSetSectionMode(sec.id, "ai")}
                        className={`px-2.5 py-1 rounded-lg transition-colors duration-150 flex items-center gap-1 select-none whitespace-nowrap font-bold ${
                          isEmpty
                            ? "opacity-35 cursor-not-allowed text-slate-400 dark:text-neutral-600"
                            : isAi
                            ? "bg-indigo-600 text-white shadow-none"
                            : "text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white"
                        }`}
                      >
                        <Sparkles className="h-3 w-3 shrink-0" />
                        Generuj AI
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Custom Instructions */}
          <Textarea
            label="5. Dodatkowe wytyczne dla AI (Opcjonalne)"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="np. Połóż szczególny nacisk na znajomość Kubernetes, architektury event-driven i optymalizacji zapytań SQL..."
            rows={2}
          />

          {/* Dialog Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-neutral-800">
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              Anuluj
            </Button>
            <Button
              variant="success"
              onClick={handleGenerate}
              className="px-6 font-bold rounded-xl shadow-none"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generuj dedykowane CV (v1)
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
