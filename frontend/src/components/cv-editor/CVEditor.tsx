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
  GraduationCap,
  Award,
  FolderPlus,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
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
  EducationSectionBlock,
  EducationItem,
  CertificatesSectionBlock,
  CertificateItem,
  CustomSectionBlock,
  CandidateSectionBlock,
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Modal } from "../ui/Modal";
import { DateInput } from "../ui/DateInput";
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
    } catch {
      setRefinementError(
        "Błąd podczas udoskonalania sekcji przez AI. Spróbuj ponownie z inną instrukcją."
      );
    } finally {
      setIsRefining(false);
    }
  };

  // ==========================================
  // Section Reordering Handlers
  // ==========================================
  const moveSectionUp = (index: number) => {
    if (index <= 0) return;
    setLayoutSchema((prev) => {
      const newSections = [...prev.sections];
      const temp = newSections[index - 1];
      newSections[index - 1] = newSections[index];
      newSections[index] = temp;
      return { ...prev, sections: newSections };
    });
  };

  const moveSectionDown = (index: number) => {
    if (index >= layoutSchema.sections.length - 1) return;
    setLayoutSchema((prev) => {
      const newSections = [...prev.sections];
      const temp = newSections[index + 1];
      newSections[index + 1] = newSections[index];
      newSections[index] = temp;
      return { ...prev, sections: newSections };
    });
  };

  // ==========================================
  // Section Title & Management Handlers
  // ==========================================
  const updateSectionTitle = (sectionId: string, title: string) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, title } : sec
      ),
    }));
  };

  const removeSection = (sectionId: string) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.filter((sec) => sec.id !== sectionId),
    }));
  };

  const addCustomSection = () => {
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
  };

  // ==========================================
  // Content Handlers per Section Type
  // ==========================================
  const updateSummaryText = (sectionId: string, text: string) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, content: text } : sec
      ),
    }));
  };

  const updateClauseText = (sectionId: string, text: string) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, content: text } : sec
      ),
    }));
  };

  const updateSkillsCategory = (
    sectionId: string,
    catIndex: number,
    skills: string[]
  ) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "skills") {
          const skillsBlock = sec as SkillsSectionBlock;
          const items = [...skillsBlock.items];
          items[catIndex] = { ...items[catIndex], skills };
          return { ...skillsBlock, items };
        }
        return sec;
      }),
    }));
  };

  // Experience handlers
  const addExperienceItem = (sectionId: string) => {
    const newItem: ExperienceItem = {
      position: "",
      company: "",
      location: "",
      start_date: "",
      end_date: "",
      highlights: [],
    };
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "experience") {
          const exp = sec as ExperienceSectionBlock;
          return { ...exp, items: [...(exp.items || []), newItem] };
        }
        return sec;
      }),
    }));
  };

  const removeExperienceItem = (sectionId: string, itemIndex: number) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "experience") {
          const exp = sec as ExperienceSectionBlock;
          return {
            ...exp,
            items: (exp.items || []).filter((_, i) => i !== itemIndex),
          };
        }
        return sec;
      }),
    }));
  };

  const updateExperienceItem = (
    sectionId: string,
    itemIndex: number,
    field: keyof ExperienceItem,
    value: unknown
  ) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "experience") {
          const exp = sec as ExperienceSectionBlock;
          const items = [...(exp.items || [])];
          items[itemIndex] = { ...items[itemIndex], [field]: value };
          return { ...exp, items };
        }
        return sec;
      }),
    }));
  };

  // Project handlers
  const addProjectItem = (sectionId: string) => {
    const newItem: ProjectItem = {
      name: "",
      role: "",
      url: "",
      start_date: "",
      end_date: "",
      description: "",
      technologies: [],
    };
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "projects") {
          const pr = sec as ProjectsSectionBlock;
          return { ...pr, items: [...(pr.items || []), newItem] };
        }
        return sec;
      }),
    }));
  };

  const removeProjectItem = (sectionId: string, itemIndex: number) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "projects") {
          const pr = sec as ProjectsSectionBlock;
          return {
            ...pr,
            items: (pr.items || []).filter((_, i) => i !== itemIndex),
          };
        }
        return sec;
      }),
    }));
  };

  const updateProjectItem = (
    sectionId: string,
    itemIndex: number,
    field: keyof ProjectItem,
    value: unknown
  ) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "projects") {
          const pr = sec as ProjectsSectionBlock;
          const items = [...(pr.items || [])];
          items[itemIndex] = { ...items[itemIndex], [field]: value };
          return { ...pr, items };
        }
        return sec;
      }),
    }));
  };

  // Education handlers
  const addEducationItem = (sectionId: string) => {
    const newItem: EducationItem = {
      institution: "",
      degree: "",
      field_of_study: "",
      start_date: "",
      end_date: "",
    };
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "education") {
          const edu = sec as EducationSectionBlock;
          return { ...edu, items: [...(edu.items || []), newItem] };
        }
        return sec;
      }),
    }));
  };

  const removeEducationItem = (sectionId: string, itemIndex: number) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "education") {
          const edu = sec as EducationSectionBlock;
          return {
            ...edu,
            items: (edu.items || []).filter((_, i) => i !== itemIndex),
          };
        }
        return sec;
      }),
    }));
  };

  const updateEducationItem = (
    sectionId: string,
    itemIndex: number,
    field: keyof EducationItem,
    value: string
  ) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "education") {
          const edu = sec as EducationSectionBlock;
          const items = [...(edu.items || [])];
          items[itemIndex] = { ...items[itemIndex], [field]: value };
          return { ...edu, items };
        }
        return sec;
      }),
    }));
  };

  // Certificates handlers
  const addCertificateItem = (sectionId: string) => {
    const newItem: CertificateItem = {
      name: "",
      issuer: "",
      issue_date: "",
    };
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "certificates") {
          const cert = sec as CertificatesSectionBlock;
          return { ...cert, items: [...(cert.items || []), newItem] };
        }
        return sec;
      }),
    }));
  };

  const removeCertificateItem = (sectionId: string, itemIndex: number) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "certificates") {
          const cert = sec as CertificatesSectionBlock;
          return {
            ...cert,
            items: (cert.items || []).filter((_, i) => i !== itemIndex),
          };
        }
        return sec;
      }),
    }));
  };

  const updateCertificateItem = (
    sectionId: string,
    itemIndex: number,
    field: keyof CertificateItem,
    value: string
  ) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "certificates") {
          const cert = sec as CertificatesSectionBlock;
          const items = [...(cert.items || [])];
          items[itemIndex] = { ...items[itemIndex], [field]: value };
          return { ...cert, items };
        }
        return sec;
      }),
    }));
  };

  // Custom section handlers
  const updateCustomSectionContent = (sectionId: string, content: string) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, content } : sec
      ),
    }));
  };

  const updateCustomSectionItems = (sectionId: string, itemsText: string) => {
    const items = itemsText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, items } : sec
      ),
    }));
  };

  // Helper for section icons
  const getSectionIcon = (type: string) => {
    switch (type) {
      case "summary":
        return <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />;
      case "skills":
        return <Code className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case "experience":
        return <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />;
      case "projects":
        return <Code className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />;
      case "education":
        return <GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case "certificates":
        return <Award className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />;
      case "clause":
        return <ShieldCheck className="h-4 w-4 text-slate-600 dark:text-slate-400 shrink-0" />;
      default:
        return <FolderPlus className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />;
    }
  };

  // Helper to render section form body
  const renderSectionForm = (sec: CandidateSectionBlock) => {
    switch (sec.type) {
      case "summary": {
        const summarySec = sec as SummarySectionBlock;
        return (
          <Textarea
            value={summarySec.content || ""}
            onChange={(e) => updateSummaryText(sec.id, e.target.value)}
            rows={4}
            className="text-xs leading-relaxed"
            placeholder="Wprowadź treść podsumowania zawodowego..."
          />
        );
      }

      case "skills": {
        const skillsSec = sec as SkillsSectionBlock;
        return (
          <div className="space-y-3">
            {(skillsSec.items || []).map((cat, catIdx) => (
              <div
                key={catIdx}
                className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 text-xs dark:bg-slate-800/60 dark:border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                  <span>{cat.category}:</span>
                </div>
                <Input
                  value={cat.skills.join(", ")}
                  onChange={(e) => {
                    const newSkills = e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0);
                    updateSkillsCategory(sec.id, catIdx, newSkills);
                  }}
                  placeholder="np. React, TypeScript, Tailwind"
                />
              </div>
            ))}
          </div>
        );
      }

      case "experience": {
        const expSec = sec as ExperienceSectionBlock;
        return (
          <div className="space-y-4">
            {(expSec.items || []).map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Stanowisko #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExperienceItem(sec.id, idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                    title="Usuń stanowisko"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Stanowisko"
                    value={item.position}
                    onChange={(e) =>
                      updateExperienceItem(sec.id, idx, "position", e.target.value)
                    }
                    required
                  />
                  <Input
                    label="Firma"
                    value={item.company}
                    onChange={(e) =>
                      updateExperienceItem(sec.id, idx, "company", e.target.value)
                    }
                  />
                  <Input
                    label="Lokalizacja"
                    value={item.location}
                    onChange={(e) =>
                      updateExperienceItem(sec.id, idx, "location", e.target.value)
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DateInput
                    label="Początek"
                    value={item.start_date}
                    onChange={(val) =>
                      updateExperienceItem(sec.id, idx, "start_date", val)
                    }
                  />
                  <DateInput
                    label="Koniec"
                    value={item.end_date}
                    onChange={(val) =>
                      updateExperienceItem(sec.id, idx, "end_date", val)
                    }
                  />
                </div>

                <Textarea
                  label="Punkty osiągnięć (jeden w wierszu)"
                  value={item.highlights.join("\n")}
                  onChange={(e) =>
                    updateExperienceItem(
                      sec.id,
                      idx,
                      "highlights",
                      e.target.value.split("\n").filter((l) => l.trim().length > 0)
                    )
                  }
                  rows={3}
                  className="text-xs font-sans"
                />
              </div>
            ))}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addExperienceItem(sec.id)}
                className="text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                Dodaj stanowisko
              </Button>
            </div>
          </div>
        );
      }

      case "projects": {
        const prSec = sec as ProjectsSectionBlock;
        return (
          <div className="space-y-4">
            {(prSec.items || []).map((proj, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Projekt #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeProjectItem(sec.id, idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                    title="Usuń projekt"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Nazwa projektu"
                    value={proj.name}
                    onChange={(e) =>
                      updateProjectItem(sec.id, idx, "name", e.target.value)
                    }
                    required
                  />
                  <Input
                    label="Rola"
                    value={proj.role}
                    onChange={(e) =>
                      updateProjectItem(sec.id, idx, "role", e.target.value)
                    }
                  />
                  <Input
                    label="Link URL"
                    value={proj.url}
                    onChange={(e) =>
                      updateProjectItem(sec.id, idx, "url", e.target.value)
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DateInput
                    label="Początek"
                    value={proj.start_date}
                    onChange={(val) =>
                      updateProjectItem(sec.id, idx, "start_date", val)
                    }
                  />
                  <DateInput
                    label="Koniec"
                    value={proj.end_date}
                    onChange={(val) =>
                      updateProjectItem(sec.id, idx, "end_date", val)
                    }
                  />
                </div>

                <Textarea
                  label="Opis projektu"
                  value={proj.description}
                  onChange={(e) =>
                    updateProjectItem(sec.id, idx, "description", e.target.value)
                  }
                  rows={2}
                  className="text-xs"
                />

                <Input
                  label="Technologie (rozdzielone przecinkami)"
                  value={proj.technologies.join(", ")}
                  onChange={(e) => {
                    const techs = e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter((t) => t.length > 0);
                    updateProjectItem(sec.id, idx, "technologies", techs);
                  }}
                  placeholder="np. React, TypeScript, Tailwind"
                />
              </div>
            ))}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addProjectItem(sec.id)}
                className="text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                Dodaj projekt
              </Button>
            </div>
          </div>
        );
      }

      case "education": {
        const eduSec = sec as EducationSectionBlock;
        return (
          <div className="space-y-4">
            {(eduSec.items || []).map((edu, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Edukacja #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEducationItem(sec.id, idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                    title="Usuń wpis edukacji"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Uczelnia / Szkoła"
                    value={edu.institution}
                    onChange={(e) =>
                      updateEducationItem(sec.id, idx, "institution", e.target.value)
                    }
                    required
                  />
                  <Input
                    label="Stopień"
                    value={edu.degree}
                    onChange={(e) =>
                      updateEducationItem(sec.id, idx, "degree", e.target.value)
                    }
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Kierunek"
                      value={edu.field_of_study}
                      onChange={(e) =>
                        updateEducationItem(sec.id, idx, "field_of_study", e.target.value)
                      }
                    />
                  </div>
                  <DateInput
                    label="Początek"
                    value={edu.start_date}
                    onChange={(val) =>
                      updateEducationItem(sec.id, idx, "start_date", val)
                    }
                  />
                  <DateInput
                    label="Koniec"
                    value={edu.end_date}
                    onChange={(val) =>
                      updateEducationItem(sec.id, idx, "end_date", val)
                    }
                  />
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addEducationItem(sec.id)}
                className="text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                Dodaj edukację
              </Button>
            </div>
          </div>
        );
      }

      case "certificates": {
        const certSec = sec as CertificatesSectionBlock;
        return (
          <div className="space-y-4">
            {(certSec.items || []).map((cert, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Certyfikat #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCertificateItem(sec.id, idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                    title="Usuń certyfikat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Nazwa certyfikatu"
                    value={cert.name}
                    onChange={(e) =>
                      updateCertificateItem(sec.id, idx, "name", e.target.value)
                    }
                    required
                  />
                  <Input
                    label="Wydawca"
                    value={cert.issuer}
                    onChange={(e) =>
                      updateCertificateItem(sec.id, idx, "issuer", e.target.value)
                    }
                  />
                  <DateInput
                    label="Data wydania"
                    value={cert.issue_date}
                    onChange={(val) =>
                      updateCertificateItem(sec.id, idx, "issue_date", val)
                    }
                  />
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addCertificateItem(sec.id)}
                className="text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                Dodaj certyfikat
              </Button>
            </div>
          </div>
        );
      }

      case "clause": {
        const clauseSec = sec as ClauseSectionBlock;
        return (
          <Textarea
            value={clauseSec.content || ""}
            onChange={(e) => updateClauseText(sec.id, e.target.value)}
            rows={3}
            className="text-[11px] text-slate-600 dark:text-slate-300"
            placeholder="Treść klauzuli o przetwarzaniu danych osobowych..."
          />
        );
      }

      default: {
        const customSec = sec as CustomSectionBlock;
        return (
          <div className="space-y-3">
            <Textarea
              label="Treść opisowa"
              value={customSec.content || ""}
              onChange={(e) => updateCustomSectionContent(sec.id, e.target.value)}
              rows={2}
              placeholder="Opcjonalny tekst opisowy..."
            />
            <Textarea
              label="Punkty listy (jeden w nowym wierszu)"
              value={(customSec.items || []).join("\n")}
              onChange={(e) => updateCustomSectionItems(sec.id, e.target.value)}
              rows={3}
              placeholder="Wpisz punkty listy..."
            />
          </div>
        );
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] -m-6 bg-slate-50 dark:bg-slate-950 overflow-hidden">
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
        </div>
      </header>

      {/* Main Split-View Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Dynamic Block-Level Form Editor */}
        <div
          className={`w-full lg:w-1/2 h-full overflow-y-auto p-6 space-y-6 ${
            mobileTab === "preview" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Candidate Full Name and Basic Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
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

          {/* Dynamic Sections Rendered in layoutSchema.sections Order */}
          {layoutSchema.sections.map((sec, index) => {
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

            return (
              <div
                key={sec.id || index}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900 transition-shadow"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getSectionIcon(sec.type)}
                    <input
                      type="text"
                      value={sec.title}
                      onChange={(e) => updateSectionTitle(sec.id, e.target.value)}
                      className="font-semibold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5 truncate max-w-[240px] sm:max-w-xs"
                      title="Kliknij, aby edytować nagłówek sekcji"
                    />
                  </div>

                  {/* Section Actions: Reorder, AI Refine, Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Reordering Up/Down */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => moveSectionUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 transition-colors"
                        title="Przesuń sekcję w górę"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSectionDown(index)}
                        disabled={index === layoutSchema.sections.length - 1}
                        className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 transition-colors"
                        title="Przesuń sekcję w dół"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* AI Refine button (except for clause) */}
                    {sec.type !== "clause" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openRefineModal(sec.id)}
                        className="text-xs h-7 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-slate-800"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Udoskonal z AI</span>
                        <span className="sm:hidden">AI</span>
                      </Button>
                    )}

                    {/* Remove button for custom sections */}
                    {isCustomOrOther && (
                      <button
                        type="button"
                        onClick={() => removeSection(sec.id)}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Usuń sekcję"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Content Form based on sec.type */}
                {renderSectionForm(sec)}
              </div>
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
                    className="text-xs px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-left transition-colors"
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
