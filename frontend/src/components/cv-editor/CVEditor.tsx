import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Save,
  Check,
  AlertCircle,
  FileText,
  User,
  Briefcase,
  Code,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  CVLayoutSchema,
  CVRefineBlockRequest,
  CVVersionRead,
  CVVersionUpdate,
  ExperienceItem,
  ExperienceSectionBlock,
  JobOfferRead,
  ProjectItem,
  ProjectsSectionBlock,
  SkillsSectionBlock,
  SummarySectionBlock,
  ClauseSectionBlock,
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Modal } from "../ui/Modal";
import { CVLivePreview } from "./CVLivePreview";

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
    initialVersion.layout_schema || {
      full_name: "Jan Kowalski",
      language: initialVersion.language || "pl",
      sections: [],
    }
  );

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

  useEffect(() => {
    loadVersions();
  }, [job.id]);

  const loadVersions = async () => {
    try {
      const data = await api.cv.listVersions(job.id);
      if (data.length > 0) {
        setAllVersions(data);
      }
    } catch {
      // ignore
    }
  };

  const handleSwitchVersion = (version: CVVersionRead) => {
    setCurrentVersion(version);
    setLayoutSchema(version.layout_schema);
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
  const openRefineModal = (blockId: string) => {
    setRefiningBlockId(blockId);
    setRefinementInstruction("");
    setRefinementError(null);
  };

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
    } catch (err: unknown) {
      setRefinementError(
        "Błąd podczas udoskonalania sekcji przez AI. Spróbuj ponownie z inną instrukcją."
      );
    } finally {
      setIsRefining(false);
    }
  };

  // Section Block Handlers
  const updateSummaryText = (text: string) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === "summary" ? { ...sec, content: text } : sec
      ),
    }));
  };

  const updateClauseText = (text: string) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === "clause" ? { ...sec, content: text } : sec
      ),
    }));
  };

  const updateExperienceItem = (
    index: number,
    field: keyof ExperienceItem,
    value: unknown
  ) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.type === "experience") {
          const exp = sec as ExperienceSectionBlock;
          const items = [...exp.items];
          items[index] = { ...items[index], [field]: value };
          return { ...exp, items };
        }
        return sec;
      }),
    }));
  };

  const updateProjectItem = (
    index: number,
    field: keyof ProjectItem,
    value: unknown
  ) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.type === "projects") {
          const pr = sec as ProjectsSectionBlock;
          const items = [...pr.items];
          items[index] = { ...items[index], [field]: value };
          return { ...pr, items };
        }
        return sec;
      }),
    }));
  };

  const summaryBlock = layoutSchema.sections.find(
    (s) => s.type === "summary"
  ) as SummarySectionBlock | undefined;
  const skillsBlock = layoutSchema.sections.find(
    (s) => s.type === "skills"
  ) as SkillsSectionBlock | undefined;
  const expBlock = layoutSchema.sections.find(
    (s) => s.type === "experience"
  ) as ExperienceSectionBlock | undefined;
  const projectsBlock = layoutSchema.sections.find(
    (s) => s.type === "projects"
  ) as ProjectsSectionBlock | undefined;
  const clauseBlock = layoutSchema.sections.find(
    (s) => s.type === "clause"
  ) as ClauseSectionBlock | undefined;

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] -m-6 bg-slate-50 overflow-hidden">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white px-6 py-3 shrink-0 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3 truncate">
          <Button
            size="sm"
            variant="ghost"
            onClick={onBack}
            className="text-xs h-8 text-slate-600"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Wróć do ofert
          </Button>

          <div className="h-4 w-px bg-slate-200" />

          <div className="truncate">
            <h2 className="font-bold text-slate-900 text-sm truncate flex items-center gap-2">
              <span>{job.role_title || "CV bez tytułu"}</span>
              <span className="text-slate-400 font-normal">w</span>
              <span className="text-slate-700 font-medium">{job.company_name}</span>
            </h2>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Version Switcher Dropdown */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="cv-version-select"
              className="text-[11px] font-semibold text-slate-500 uppercase whitespace-nowrap"
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
              className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-xs transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {allVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} {v.is_active ? "(aktywna)" : ""} {v.change_summary ? `— ${v.change_summary}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Edit/Preview Tabs (visible < lg) */}
          <div className="flex lg:hidden bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setMobileTab("edit")}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                mobileTab === "edit"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600"
              }`}
            >
              Edycja
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                mobileTab === "preview"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600"
              }`}
            >
              Podgląd
            </button>
          </div>

          {/* Save Status / Button */}
          {saveSuccess && (
            <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
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
        </div>
      </header>

      {/* Main Split-View Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Block-Level Form Editor */}
        <div
          className={`w-full lg:w-1/2 h-full overflow-y-auto p-6 space-y-6 ${
            mobileTab === "preview" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Candidate Full Name and Basic Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <User className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-sm text-slate-900">
                Nagłówek dokumentu
              </h3>
            </div>
            <Input
              label="Imię i nazwisko kandydata"
              value={layoutSchema.full_name || ""}
              onChange={(e) =>
                setLayoutSchema({ ...layoutSchema, full_name: e.target.value })
              }
            />
          </div>

          {/* Summary Block */}
          {summaryBlock && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <h4 className="font-semibold text-sm text-slate-900">
                    {summaryBlock.title}
                  </h4>
                </div>

                {/* Inline AI Refine Trigger */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openRefineModal("summary")}
                  className="text-xs h-7 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Udoskonal z AI
                </Button>
              </div>

              <Textarea
                value={summaryBlock.content}
                onChange={(e) => updateSummaryText(e.target.value)}
                rows={4}
                className="text-xs leading-relaxed"
              />
            </div>
          )}

          {/* Skills Block */}
          {skillsBlock && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-emerald-600" />
                  <h4 className="font-semibold text-sm text-slate-900">
                    {skillsBlock.title}
                  </h4>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openRefineModal("skills")}
                  className="text-xs h-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Dopasuj pod ofertę
                </Button>
              </div>

              <div className="space-y-2">
                {skillsBlock.items.map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 text-xs"
                  >
                    <span className="font-semibold text-slate-800">
                      {cat.category}:
                    </span>{" "}
                    <span className="text-slate-600">
                      {cat.skills.join(", ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experience Block */}
          {expBlock && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-sm text-slate-900">
                    {expBlock.title}
                  </h4>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openRefineModal("experience")}
                  className="text-xs h-7 text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Udoskonal doświadczenie
                </Button>
              </div>

              <div className="space-y-4">
                {expBlock.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>
                        {item.position} — {item.company}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {item.start_date} - {item.end_date}
                      </span>
                    </div>

                    <Textarea
                      label="Punkty osiągnięć (jeden w wierszu)"
                      value={item.highlights.join("\n")}
                      onChange={(e) =>
                        updateExperienceItem(
                          idx,
                          "highlights",
                          e.target.value
                            .split("\n")
                            .filter((l) => l.trim().length > 0)
                        )
                      }
                      rows={3}
                      className="text-xs font-sans"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects Block */}
          {projectsBlock && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-purple-600" />
                  <h4 className="font-semibold text-sm text-slate-900">
                    {projectsBlock.title}
                  </h4>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openRefineModal("projects")}
                  className="text-xs h-7 text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Dopasuj projekty
                </Button>
              </div>

              <div className="space-y-4">
                {projectsBlock.items.map((proj, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>{proj.name}</span>
                      <span className="text-slate-500">{proj.role}</span>
                    </div>
                    <Textarea
                      label="Opis projektu"
                      value={proj.description}
                      onChange={(e) =>
                        updateProjectItem(idx, "description", e.target.value)
                      }
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clause Block */}
          {clauseBlock && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-sm text-slate-900">
                  {clauseBlock.title}
                </h4>
              </div>
              <Textarea
                value={clauseBlock.content}
                onChange={(e) => updateClauseText(e.target.value)}
                rows={3}
                className="text-[11px] text-slate-600"
              />
            </div>
          )}
        </div>

        {/* Right Pane: Live Typst SVG Preview */}
        <div
          className={`w-full lg:w-1/2 h-full p-4 ${
            mobileTab === "edit" ? "hidden lg:block" : "block"
          }`}
        >
          <CVLivePreview
            layoutSchema={layoutSchema}
            jobOfferId={job.id}
            language={layoutSchema.language || currentVersion.language || "pl"}
            onExportPdf={handleExportPdf}
            isExportingPdf={isExportingPdf}
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
              <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{refinementError}</span>
              </div>
            )}

            {/* Quick Action Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase">
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
                    className="text-xs px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-left transition-colors"
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

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
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
