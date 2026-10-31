import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Sparkles,
  Save,
  Check,
  AlertCircle,
  FileText,
  Palette,
  Plus,
  Download,
} from "lucide-react";
import { api } from "../../lib/api";
import { useDebounce } from "../../hooks/useDebounce";
import type {
  CVLayoutSchema,
  CVRefineBlockRequest,
  CVVersionRead,
  CVVersionUpdate,
  CandidateContactInfo,
  JobOfferRead,
  SummarySectionBlock,
  SkillsSectionBlock,
  ExperienceSectionBlock,
  ProjectsSectionBlock,
  EducationSectionBlock,
  CertificatesSectionBlock,
  LanguagesSectionBlock,
  TrainingsSectionBlock,
  AchievementsSectionBlock,
  InterestsSectionBlock,
  ClauseSectionBlock,
  CustomSectionBlock,
  CandidateSectionBlock,
  PageBreakSectionBlock,
} from "../../types";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";
import { Modal } from "../ui/Modal";
import { CVLivePreview } from "./CVLivePreview";
import { CVStylePanel, DEFAULT_CV_STYLING } from "./CVStylePanel";
import { ThemeToggle } from "../ui/ThemeToggle";
import {
  CVHeaderCard,
  CVSectionCard,
  PageBreakCard,
  SummarySectionForm,
  SkillsSectionForm,
  ExperienceSectionForm,
  ProjectsSectionForm,
  EducationSectionForm,
  CertificatesSectionForm,
  LanguagesSectionForm,
  TrainingsSectionForm,
  AchievementsSectionForm,
  InterestsSectionForm,
  ClauseSectionForm,
  CustomSectionForm,
} from "./sections";

interface CVEditorProps {
  initialVersion: CVVersionRead;
  job: JobOfferRead;
  onBack: () => void;
}

export const CVEditor: React.FC<CVEditorProps> = ({
  initialVersion,
  job,
  onBack,
}) => {
  const [currentVersion, setCurrentVersion] =
    useState<CVVersionRead>(initialVersion);
  const [allVersions, setAllVersions] = useState<CVVersionRead[]>([
    initialVersion,
  ]);

  // Layout Schema State for active version
  const [layoutSchema, setLayoutSchema] = useState<CVLayoutSchema>(
    initialVersion.layout_schema
      ? {
          ...initialVersion.layout_schema,
          job_title:
            initialVersion.layout_schema.job_title ?? job?.role_title ?? null,
          styling: initialVersion.layout_schema.styling || DEFAULT_CV_STYLING,
        }
      : {
          full_name: "Jan Kowalski",
          job_title: job?.role_title ?? null,
          language: initialVersion.language || "pl",
          sections: [],
          styling: DEFAULT_CV_STYLING,
        }
  );

  // Debounced layout schema for Live Preview (Typst SVG isolation)
  const debouncedLayoutSchema = useDebounce(layoutSchema, 300);

  // Left Panel Mode: "data" (Forms) or "style" (Typography, Margins, Spacing)
  const [leftPanelMode, setLeftPanelMode] = useState<"data" | "style">("data");

  // Collapsed / Expanded sections tracking (Default: all collapsed!)
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(
    new Set()
  );
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Inline AI Refinement Modal State
  const [refiningBlockId, setRefiningBlockId] = useState<string | null>(null);
  const [refinementInstruction, setRefinementInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);

  // Responsive mobile view tab ("edit" | "preview")
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  // Draggable Split-View State (desktop)
  const [splitRatio, setSplitRatio] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const workspaceContainerRef = useRef<HTMLDivElement>(null);
  const currentRatioRef = useRef<number>(50);
  const rafIdRef = useRef<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Splitter mouse dragging with requestAnimationFrame (zero re-renders during mousemove)
  useEffect(() => {
    if (!isDragging) return;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      const container = workspaceContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const width = rect.width;

      if (width > 0) {
        const rawRatio = (offsetX / width) * 100;
        const clampedRatio = Math.max(25, Math.min(75, rawRatio));
        const rounded = Math.round(clampedRatio * 10) / 10;
        currentRatioRef.current = rounded;

        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(() => {
            if (workspaceContainerRef.current) {
              workspaceContainerRef.current.style.setProperty(
                "--split-ratio",
                `${currentRatioRef.current}%`
              );
            }
            rafIdRef.current = null;
          });
        }
      }
    };

    const handleMouseUp = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setIsDragging(false);
      setSplitRatio(currentRatioRef.current);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    currentRatioRef.current = splitRatio;
    setIsDragging(true);
  };

  const loadVersions = useCallback(async () => {
    try {
      const data = await api.cv.listVersions(job.id);
      if (data.length > 0) {
        setAllVersions(data);
      }
    } catch {
      // ignore
    }
  }, [job.id]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleSwitchVersion = (version: CVVersionRead) => {
    setCurrentVersion(version);
    setLayoutSchema(
      version.layout_schema
        ? {
            ...version.layout_schema,
            job_title:
              version.layout_schema.job_title ?? job?.role_title ?? null,
            styling: version.layout_schema.styling || DEFAULT_CV_STYLING,
          }
        : {
            full_name: "Jan Kowalski",
            job_title: job?.role_title ?? null,
            language: version.language || "pl",
            sections: [],
            styling: DEFAULT_CV_STYLING,
          }
    );
  };

  const handleSaveVersion = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      const updateData: CVVersionUpdate = {
        layout_schema: layoutSchema,
        change_summary: `Zmiany w wersji v${currentVersion.version_number}`,
      };

      const updated = await api.cv.updateVersion(currentVersion.id, updateData);
      setCurrentVersion(updated);
      setAllVersions((prev) =>
        prev.map((v) => (v.id === updated.id ? updated : v))
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert("Błąd podczas zapisywania wersji CV.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const blob = await api.cv.exportPdf({
        sections: layoutSchema.sections.map((s) => s.id),
        job_offer_id: job.id,
        language: layoutSchema.language || currentVersion.language || "pl",
        layout_schema: layoutSchema,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = (job.role_title || "cv")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_");
      a.download = `CV_${safeTitle}_v${currentVersion.version_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Nie udało się pobrać pliku PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Inline AI Block Refinement
  const openRefineModal = useCallback((blockId: string) => {
    setRefiningBlockId(blockId);
    setRefinementInstruction("");
    setRefinementError(null);
  }, []);

  const executeBlockRefinement = async (instructionToRun?: string) => {
    if (!refiningBlockId) return;
    const finalInstruction = instructionToRun || refinementInstruction;
    if (!finalInstruction.trim()) {
      setRefinementError("Podaj instrukcję dla modelu AI.");
      return;
    }

    try {
      setIsRefining(true);
      setRefinementError(null);

      const currentBlock = layoutSchema.sections.find(
        (s) => s.id === refiningBlockId
      );

      const req: CVRefineBlockRequest = {
        block_id: refiningBlockId,
        instruction: finalInstruction,
        current_block: currentBlock || null,
      };

      const res = await api.cv.refineBlock(currentVersion.id, req);

      // Replace block in layout schema
      setLayoutSchema((prev) => ({
        ...prev,
        sections: prev.sections.map((sec) =>
          sec.id === refiningBlockId ? res.refined_block : sec
        ),
      }));

      if (res.version) {
        setCurrentVersion(res.version);
      }

      setRefiningBlockId(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setRefinementError(
        "Błąd podczas udoskonalania sekcji przez AI. Spróbuj ponownie z inną instrukcją."
      );
    } finally {
      setIsRefining(false);
    }
  };

  // ==========================================
  // Section & Page Break Reordering Handlers
  // ==========================================
  const moveSectionUp = useCallback((index: number) => {
    if (index <= 0) return;
    setLayoutSchema((prev) => {
      const newSections = [...prev.sections];
      const temp = newSections[index - 1];
      newSections[index - 1] = newSections[index];
      newSections[index] = temp;
      return { ...prev, sections: newSections };
    });
  }, []);

  const moveSectionDown = useCallback((index: number) => {
    setLayoutSchema((prev) => {
      if (index >= prev.sections.length - 1) return prev;
      const newSections = [...prev.sections];
      const temp = newSections[index + 1];
      newSections[index + 1] = newSections[index];
      newSections[index] = temp;
      return { ...prev, sections: newSections };
    });
  }, []);

  const addPageBreakAt = useCallback((index: number) => {
    const newPageBreak: PageBreakSectionBlock = {
      id: `pagebreak_${Date.now()}`,
      type: "pagebreak",
      title: "Separator stron",
    };
    setLayoutSchema((prev) => {
      const newSections = [...prev.sections];
      newSections.splice(index, 0, newPageBreak);
      return { ...prev, sections: newSections };
    });
  }, []);

  const removePageBreakAt = useCallback((index: number) => {
    setLayoutSchema((prev) => {
      const newSections = prev.sections.filter((_, i) => i !== index);
      return { ...prev, sections: newSections };
    });
  }, []);

  const updateSectionBlock = useCallback((updated: CandidateSectionBlock) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === updated.id ? updated : sec
      ),
    }));
  }, []);

  const updateSectionTitle = useCallback((sectionId: string, title: string) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, title } : sec
      ),
    }));
  }, []);

  const removeSection = useCallback((sectionId: string) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.filter((sec) => sec.id !== sectionId),
    }));
    setExpandedSectionIds((prev) => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
  }, []);

  const addCustomSection = useCallback(() => {
    const newId = `custom_${Date.now()}`;
    const newBlock: CustomSectionBlock = {
      id: newId,
      type: "custom",
      title: "Dodatkowa sekcja",
      content: "",
      items: [],
    };
    setLayoutSchema((prev) => ({
      ...prev,
      sections: [...prev.sections, newBlock],
    }));
    setExpandedSectionIds((prev) => new Set(prev).add(newId));
  }, []);

  const toggleSectionExpanded = useCallback((sectionId: string) => {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const expandAllSections = useCallback(() => {
    setLayoutSchema((prev) => {
      const allIds = prev.sections.map((s) => s.id).filter(Boolean);
      setExpandedSectionIds(new Set(allIds));
      return prev;
    });
  }, []);

  const collapseAllSections = useCallback(() => {
    setExpandedSectionIds(new Set());
  }, []);

  // Candidate Details Handlers
  const handleUpdateFullName = useCallback((name: string) => {
    setLayoutSchema((prev) => ({ ...prev, full_name: name }));
  }, []);

  const handleUpdateJobTitle = useCallback((title: string) => {
    setLayoutSchema((prev) => ({ ...prev, job_title: title }));
  }, []);

  const handleApplySuggestedJobTitle = useCallback(() => {
    if (job?.role_title) {
      setLayoutSchema((prev) => ({ ...prev, job_title: job.role_title }));
    }
  }, [job?.role_title]);

  const handleUpdateContactInfo = useCallback(
    (field: keyof CandidateContactInfo, value: string) => {
      setLayoutSchema((prev) => ({
        ...prev,
        contact_info: {
          ...(prev.contact_info || {}),
          [field]: value || null,
        },
      }));
    },
    []
  );

  const handleToggleHeaderExpand = useCallback(() => {
    setIsHeaderExpanded((prev) => !prev);
  }, []);

  const renderSectionForm = (sec: CandidateSectionBlock) => {
    switch (sec.type) {
      case "summary":
        return (
          <SummarySectionForm
            block={sec as SummarySectionBlock}
            onChange={updateSectionBlock}
          />
        );
      case "skills":
        return (
          <SkillsSectionForm
            block={sec as SkillsSectionBlock}
            onChange={updateSectionBlock}
          />
        );
      case "experience":
        return (
          <ExperienceSectionForm
            block={sec as ExperienceSectionBlock}
            onChange={updateSectionBlock}
          />
        );
      case "projects":
        return (
          <ProjectsSectionForm
            block={sec as ProjectsSectionBlock}
            onChange={updateSectionBlock}
          />
        );
      case "education":
        return (
          <EducationSectionForm
            block={sec as EducationSectionBlock}
            onChange={updateSectionBlock}
          />
        );
      case "certificates":
        return (
          <CertificatesSectionForm
            block={sec as CertificatesSectionBlock}
            onChange={updateSectionBlock}
          />
        );
      case "languages":
        return (
          <LanguagesSectionForm
            block={sec as LanguagesSectionBlock}
            onChange={updateSectionBlock}
          />
        );
      case "trainings":
        return (
          <TrainingsSectionForm
            block={sec as TrainingsSectionBlock}
            onChange={updateSectionBlock}
          />
        );
      case "achievements":
        return (
          <AchievementsSectionForm
            block={sec as AchievementsSectionBlock}
            onChange={updateSectionBlock}
          />
        );
      case "interests":
        return (
          <InterestsSectionForm
            block={sec as InterestsSectionBlock}
            onChange={updateSectionBlock}
          />
        );
      case "clause":
        return (
          <ClauseSectionForm
            block={sec as ClauseSectionBlock}
            onChange={updateSectionBlock}
          />
        );
      default:
        return (
          <CustomSectionForm
            block={sec as CustomSectionBlock}
            onChange={updateSectionBlock}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white px-6 py-3 shrink-0 flex items-center justify-between gap-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 truncate">
          <Button
            size="sm"
            variant="ghost"
            onClick={onBack}
            className="text-xs h-8 text-slate-600 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Wróć do ofert
          </Button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          <div className="truncate">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate flex items-center gap-2">
              <span>{job.role_title || "CV bez tytułu"}</span>
              <span className="text-slate-400 dark:text-slate-500 font-normal">w</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">{job.company_name}</span>
            </h2>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Version Switcher Dropdown */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="cv-version-select"
              className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap"
            >
              Wersja:
            </label>
            <select
              id="cv-version-select"
              value={currentVersion.id}
              onChange={(e) => {
                const selected = allVersions.find((v) => v.id === e.target.value);
                if (selected) {
                  handleSwitchVersion(selected);
                }
              }}
              className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-xs transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {allVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} {v.is_active ? "(aktywna)" : ""} {v.change_summary ? `— ${v.change_summary}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Mobile Edit/Preview Tabs (visible < lg) */}
          <div className="flex lg:hidden bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMobileTab("edit")}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                mobileTab === "edit"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Edycja
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                mobileTab === "preview"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Podgląd
            </button>
          </div>

          {/* Save Status / Button */}
          {saveSuccess && (
            <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded dark:bg-emerald-950/50 dark:text-emerald-300 dark:border dark:border-emerald-800">
              <Check className="h-3.5 w-3.5" />
              Zapisano
            </span>
          )}

          <Button
            size="sm"
            variant="default"
            onClick={handleSaveVersion}
            isLoading={isSaving}
            className="text-xs h-8"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            Zapisz zmiany
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPdf}
            isLoading={isExportingPdf}
            className="text-xs h-8"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Pobierz PDF
          </Button>
        </div>
      </header>

      {/* Main Split-View Workspace */}
      <div
        ref={workspaceContainerRef}
        style={
          isDesktop
            ? ({ "--split-ratio": `${splitRatio}%` } as React.CSSProperties)
            : undefined
        }
        className={`flex-1 flex flex-col lg:flex-row overflow-hidden relative ${
          isDragging ? "select-none" : ""
        }`}
      >
        {/* Left Pane: Dynamic Block-Level Form Editor */}
        <div
          style={isDesktop ? { width: "var(--split-ratio, 50%)" } : undefined}
          className={`h-full overflow-y-auto p-4 sm:p-6 space-y-4 ${
            mobileTab === "preview" ? "hidden lg:block" : "block"
          } ${isDragging ? "pointer-events-none select-none" : ""}`}
        >
          {/* Segmented Mode Switcher: Data vs Style */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setLeftPanelMode("data")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                leftPanelMode === "data"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Wprowadzanie danych</span>
            </button>
            <button
              type="button"
              onClick={() => setLeftPanelMode("style")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                leftPanelMode === "style"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Palette className="h-4 w-4" />
              <span>Stylizowanie</span>
            </button>
          </div>

          {leftPanelMode === "style" ? (
            <CVStylePanel
              styling={layoutSchema.styling || DEFAULT_CV_STYLING}
              onChange={(newStyling) =>
                setLayoutSchema((prev) => ({
                  ...prev,
                  styling: newStyling,
                }))
              }
            />
          ) : (
            <>
              {/* Candidate Full Name and Contact Info (Memoized) */}
              <CVHeaderCard
                fullName={layoutSchema.full_name}
                jobTitle={layoutSchema.job_title}
                contactInfo={layoutSchema.contact_info || null}
                suggestedJobTitle={job?.role_title}
                isExpanded={isHeaderExpanded}
                onToggleExpand={handleToggleHeaderExpand}
                onUpdateFullName={handleUpdateFullName}
                onUpdateJobTitle={handleUpdateJobTitle}
                onApplySuggestedJobTitle={handleApplySuggestedJobTitle}
                onUpdateContactInfo={handleUpdateContactInfo}
              />

              {/* Sections Header with Collapse/Expand Controls */}
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sekcje CV ({layoutSchema.sections.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={expandAllSections}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Rozwiń wszystkie
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={collapseAllSections}
                    className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
                  >
                    Zwiń wszystkie
                  </button>
                </div>
              </div>

              {/* Dynamic Sections Rendered in layoutSchema.sections Order */}
              {layoutSchema.sections.map((sec, index) => {
                if (sec.type === "pagebreak") {
                  return (
                    <PageBreakCard
                      key={sec.id || index}
                      index={index}
                      onRemove={removePageBreakAt}
                    />
                  );
                }

                const isCustomOrOther =
                  sec.type === "custom" ||
                  ![
                    "summary",
                    "skills",
                    "experience",
                    "projects",
                    "education",
                    "certificates",
                    "clause",
                  ].includes(sec.type);

                const hasNextSection = index < layoutSchema.sections.length - 1;
                const nextSec = hasNextSection
                  ? layoutSchema.sections[index + 1]
                  : null;
                const canShowAddPageBreak =
                  hasNextSection &&
                  sec.type !== "pagebreak" &&
                  nextSec?.type !== "pagebreak";

                return (
                  <React.Fragment key={sec.id || index}>
                    <CVSectionCard
                      id={sec.id}
                      type={sec.type}
                      title={sec.title}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === layoutSchema.sections.length - 1}
                      isExpanded={expandedSectionIds.has(sec.id)}
                      canRefine={sec.type !== "clause"}
                      canRemove={isCustomOrOther}
                      onToggleExpand={toggleSectionExpanded}
                      onUpdateTitle={updateSectionTitle}
                      onMoveUp={moveSectionUp}
                      onMoveDown={moveSectionDown}
                      onRefine={openRefineModal}
                      onRemove={removeSection}
                    >
                      {renderSectionForm(sec)}
                    </CVSectionCard>

                    {canShowAddPageBreak && (
                      <div className="flex items-center justify-center py-0.5 group">
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1 transition-colors group-hover:bg-blue-300 dark:group-hover:bg-blue-700" />
                        <button
                          type="button"
                          onClick={() => addPageBreakAt(index + 1)}
                          className="mx-3 inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 rounded-full shadow-2xs transition-all hover:scale-105 cursor-pointer"
                          title="Wstaw podział na nową stronę w tym miejscu"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Dodaj separator stron</span>
                        </button>
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1 transition-colors group-hover:bg-blue-300 dark:group-hover:bg-blue-700" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Add Custom Section Button */}
              <div className="flex justify-center pt-2 pb-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomSection}
                  className="border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 py-3 text-xs w-full max-w-md"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Dodaj własną sekcję do CV
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Draggable Splitter Bar (desktop only) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={splitRatio}
          aria-label="Zmień szerokość paneli"
          onMouseDown={handleSplitterMouseDown}
          className={`hidden lg:flex w-2.5 shrink-0 items-center justify-center cursor-col-resize hover:bg-blue-500/15 active:bg-blue-500/25 transition-colors z-20 group select-none border-x border-slate-200/60 dark:border-slate-800/60 bg-slate-100/60 dark:bg-slate-900/40 ${
            isDragging
              ? "bg-blue-500/20 dark:bg-blue-900/30 ring-1 ring-blue-500/30"
              : ""
          }`}
          title="Przeciągnij, aby zmienić szerokość paneli"
        >
          <div
            className={`w-0.5 h-12 rounded-full transition-colors ${
              isDragging
                ? "bg-blue-600 dark:bg-blue-400"
                : "bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-500 dark:group-hover:bg-blue-400"
            }`}
          />
        </div>

        {/* Right Pane: Live Typst SVG Preview */}
        <div
          style={
            isDesktop
              ? { width: "calc(100% - var(--split-ratio, 50%))" }
              : undefined
          }
          className={`w-full h-full overflow-hidden ${
            mobileTab === "edit" ? "hidden lg:block" : "block"
          } ${isDragging ? "pointer-events-none select-none" : ""}`}
        >
          <CVLivePreview
            layoutSchema={debouncedLayoutSchema}
            jobOfferId={job.id}
            language={layoutSchema.language || currentVersion.language || "pl"}
          />
        </div>
      </div>

      {/* Inline AI Refinement Modal */}
      {refiningBlockId && (
        <Modal
          isOpen={!!refiningBlockId}
          onClose={() => setRefiningBlockId(null)}
          title="Udoskonal sekcję za pomocą AI"
          description={`Wprowadź polecenie lub wybierz szybką akcję dla sekcji "${
            layoutSchema.sections.find((s) => s.id === refiningBlockId)?.title ||
            refiningBlockId
          }"`}
          maxWidth="md"
        >
          <div className="space-y-4">
            {refinementError && (
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-3 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{refinementError}</span>
              </div>
            )}

            {/* Quick Action Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                Szybkie modyfikacje:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  "Skróć i uczyń bardziej zwięzłym",
                  "Zmień nacisk na umiejętności DevOps i chmurę",
                  "Przeformułuj osiągnięcia z mierzalnymi metrykami",
                  "Dostosuj słownictwo bezpośrednio pod ofertę pracy",
                ].map((action, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRefinementInstruction(action)}
                    className="text-xs px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-left transition-colors cursor-pointer"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              label="Twoja własna instrukcja dla AI:"
              value={refinementInstruction}
              onChange={(e) => setRefinementInstruction(e.target.value)}
              placeholder="np. Podkreśl doświadczenie w architekturze mikroserwisowej i usuń wzmianki o starszych technologiach..."
              rows={3}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setRefiningBlockId(null)}
                disabled={isRefining}
              >
                Anuluj
              </Button>
              <Button
                variant="primary"
                onClick={() => executeBlockRefinement()}
                isLoading={isRefining}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Zastosuj udoskonalenie AI
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
