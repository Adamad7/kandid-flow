import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Save,
  Check,
  AlertCircle,
  FileText,
  User,
  Briefcase,
  Code,
  GraduationCap,
  Award,
  ShieldCheck,
  FolderPlus,
  Plus,
  Trash2,
  Edit2,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  BaseCVPresetRead,
  BaseCVPresetUpdate,
  CandidateContactInfo,
  CandidateSectionBlock,
  CertificateItem,
  ClauseSectionBlock,
  CustomSectionBlock,
  CVLayoutSchema,
  EducationItem,
  EducationSectionBlock,
  ExperienceItem,
  ExperienceSectionBlock,
  ProjectItem,
  ProjectsSectionBlock,
  SkillsSectionBlock,
  SummarySectionBlock,
  CertificatesSectionBlock,
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { DateInput } from "../ui/DateInput";
import { CVLivePreview } from "../cv-editor/CVLivePreview";

interface PresetEditorProps {
  preset: BaseCVPresetRead;
  onBack: () => void;
  onSaved: (updated: BaseCVPresetRead) => void;
}

export const PresetEditor: React.FC<PresetEditorProps> = ({
  preset,
  onBack,
  onSaved,
}) => {
  const [title, setTitle] = useState(preset.title);
  const [language, setLanguage] = useState<"pl" | "en">(
    (preset.language as "pl" | "en") || "pl"
  );

  // Extract layoutSchema
  const initialLayout: CVLayoutSchema = preset.layout_schema &&
    typeof preset.layout_schema === "object" &&
    "sections" in preset.layout_schema
      ? (preset.layout_schema as CVLayoutSchema)
      : {
          full_name: "Jan Kowalski",
          job_title: null,
          language: preset.language || "pl",
          sections: Array.isArray(preset.layout_schema)
            ? (preset.layout_schema as CandidateSectionBlock[])
            : [],
        };

  const [fullName, setFullName] = useState(initialLayout.full_name || "Jan Kowalski");
  const [jobTitle, setJobTitle] = useState(initialLayout.job_title || "");
  const [contactInfo, setContactInfo] = useState<CandidateContactInfo>(
    initialLayout.contact_info || {}
  );
  const [sections, setSections] = useState<CandidateSectionBlock[]>(
    initialLayout.sections || []
  );

  // Raw states for comma-separated inputs
  const [skillTagsRaw, setSkillTagsRaw] = useState<Record<number, string>>({});
  const [projectTechsRaw, setProjectTechsRaw] = useState<Record<number, string>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Mobile layout tab ("edit" | "preview")
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  // Initialize raw states on mount
  useEffect(() => {
    const sSec = sections.find((s) => s.type === "skills") as SkillsSectionBlock | undefined;
    if (sSec?.items) {
      const rawMap: Record<number, string> = {};
      sSec.items.forEach((cat, idx) => {
        rawMap[idx] = cat.skills.join(", ");
      });
      setSkillTagsRaw(rawMap);
    }

    const pSec = sections.find((s) => s.type === "projects") as ProjectsSectionBlock | undefined;
    if (pSec?.items) {
      const rawPMap: Record<number, string> = {};
      pSec.items.forEach((proj, idx) => {
        rawPMap[idx] = (proj.technologies || []).join(", ");
      });
      setProjectTechsRaw(rawPMap);
    }
  }, []);

  // Compute consolidated CVLayoutSchema for Live Preview
  const currentLayoutSchema: CVLayoutSchema = {
    full_name: fullName,
    job_title: jobTitle.trim() ? jobTitle.trim() : null,
    contact_info: contactInfo,
    language: language,
    sections: sections,
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Proszę podać nazwę szablonu.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSaveSuccess(false);

      const updatePayload: BaseCVPresetUpdate = {
        title: title.trim(),
        language: language,
        layout_schema: currentLayoutSchema,
      };

      const updated = await api.presets.update(preset.id, updatePayload);
      onSaved(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setErrorMessage("Nie udało się zapisać zmian w szablonie bazowym.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const blob = await api.cv.exportPdf({
        sections: sections.map((s) => s.id),
        job_offer_id: null,
        language: language,
        layout_schema: currentLayoutSchema,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      a.download = `Szablon_${safeTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Nie udało się wyeksportować pliku PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Section title modifier
  const updateSectionTitle = (secId: string, newTitle: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === secId ? { ...s, title: newTitle } : s))
    );
  };

  const removeSection = (secId: string) => {
    if (confirm("Czy na pewno chcesz usunąć tę sekcję z szablonu?")) {
      setSections((prev) => prev.filter((s) => s.id !== secId));
    }
  };

  // Summary
  const updateSummaryText = (content: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === "summary" ? { ...s, content } : s))
    );
  };

  // Skills
  const addSkillCategory = () => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "skills") {
          const s = sec as SkillsSectionBlock;
          const nextItems = [...s.items, { category: "Nowa kategoria", skills: [] }];
          const newIdx = nextItems.length - 1;
          setSkillTagsRaw((r) => ({ ...r, [newIdx]: "" }));
          return { ...s, items: nextItems };
        }
        return sec;
      })
    );
  };

  const removeSkillCategory = (catIndex: number) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "skills") {
          const s = sec as SkillsSectionBlock;
          const items = s.items.filter((_, idx) => idx !== catIndex);
          const nextRaw: Record<number, string> = {};
          items.forEach((item, idx) => {
            nextRaw[idx] = item.skills.join(", ");
          });
          setSkillTagsRaw(nextRaw);
          return { ...s, items };
        }
        return sec;
      })
    );
  };

  const updateSkillCategoryTitle = (catIndex: number, newCategoryName: string) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "skills") {
          const s = sec as SkillsSectionBlock;
          const items = [...s.items];
          items[catIndex] = { ...items[catIndex], category: newCategoryName };
          return { ...s, items };
        }
        return sec;
      })
    );
  };

  const handleSkillTagsChange = (catIndex: number, rawValue: string) => {
    setSkillTagsRaw((prev) => ({ ...prev, [catIndex]: rawValue }));
    const skills = rawValue
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "skills") {
          const s = sec as SkillsSectionBlock;
          const items = [...s.items];
          items[catIndex] = { ...items[catIndex], skills };
          return { ...s, items };
        }
        return sec;
      })
    );
  };

  // Experience
  const addExperienceItem = () => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "experience") {
          const s = sec as ExperienceSectionBlock;
          return {
            ...s,
            items: [
              ...s.items,
              {
                position: "Stanowisko",
                company: "Firma",
                location: "Warszawa",
                start_date: "2023",
                end_date: "present",
                highlights: ["Kluczowe osiągnięcie lub zakres odpowiedzialności"],
              },
            ],
          };
        }
        return sec;
      })
    );
  };

  const updateExperienceItem = (
    index: number,
    field: keyof ExperienceItem,
    value: unknown
  ) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "experience") {
          const s = sec as ExperienceSectionBlock;
          const items = [...s.items];
          items[index] = { ...items[index], [field]: value };
          return { ...s, items };
        }
        return sec;
      })
    );
  };

  const removeExperienceItem = (index: number) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "experience") {
          const s = sec as ExperienceSectionBlock;
          return { ...s, items: s.items.filter((_, idx) => idx !== index) };
        }
        return sec;
      })
    );
  };

  // Projects
  const addProjectItem = () => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "projects") {
          const s = sec as ProjectsSectionBlock;
          const nextItems = [
            ...s.items,
            {
              name: "Nowy Projekt",
              role: "Rola",
              url: "",
              start_date: "2024",
              end_date: "present",
              description: "Krótki opis celów projektu i architektury",
              technologies: ["React", "TypeScript"],
            },
          ];
          const newIdx = nextItems.length - 1;
          setProjectTechsRaw((r) => ({ ...r, [newIdx]: "React, TypeScript" }));
          return { ...s, items: nextItems };
        }
        return sec;
      })
    );
  };

  const updateProjectItem = (
    index: number,
    field: keyof ProjectItem,
    value: unknown
  ) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "projects") {
          const s = sec as ProjectsSectionBlock;
          const items = [...s.items];
          items[index] = { ...items[index], [field]: value };
          return { ...s, items };
        }
        return sec;
      })
    );
  };

  const handleProjectTechsChange = (index: number, rawValue: string) => {
    setProjectTechsRaw((prev) => ({ ...prev, [index]: rawValue }));
    const technologies = rawValue
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "projects") {
          const s = sec as ProjectsSectionBlock;
          const items = [...s.items];
          items[index] = { ...items[index], technologies };
          return { ...s, items };
        }
        return sec;
      })
    );
  };

  const removeProjectItem = (index: number) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "projects") {
          const s = sec as ProjectsSectionBlock;
          const items = s.items.filter((_, idx) => idx !== index);
          const nextRaw: Record<number, string> = {};
          items.forEach((proj, idx) => {
            nextRaw[idx] = (proj.technologies || []).join(", ");
          });
          setProjectTechsRaw(nextRaw);
          return { ...s, items };
        }
        return sec;
      })
    );
  };

  // Education
  const addEducationItem = () => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "education") {
          const s = sec as EducationSectionBlock;
          return {
            ...s,
            items: [
              ...s.items,
              {
                institution: "Uczelnia / Szkoła",
                degree: "Inżynier / Magister",
                field_of_study: "Informatyka",
                start_date: "2018",
                end_date: "2022",
              },
            ],
          };
        }
        return sec;
      })
    );
  };

  const updateEducationItem = (
    index: number,
    field: keyof EducationItem,
    value: string
  ) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "education") {
          const s = sec as EducationSectionBlock;
          const items = [...s.items];
          items[index] = { ...items[index], [field]: value };
          return { ...s, items };
        }
        return sec;
      })
    );
  };

  const removeEducationItem = (index: number) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "education") {
          const s = sec as EducationSectionBlock;
          return { ...s, items: s.items.filter((_, idx) => idx !== index) };
        }
        return sec;
      })
    );
  };

  // Certificates
  const addCertificateItem = () => {
    setSections((prev) => {
      const hasCerts = prev.some((s) => s.type === "certificates");
      if (!hasCerts) {
        return [
          ...prev,
          {
            id: "certificates",
            type: "certificates",
            title: "Certyfikaty",
            items: [
              {
                name: "Nowy certyfikat",
                issuer: "Wydawca",
                issue_date: "2024",
              },
            ],
          } as CertificatesSectionBlock,
        ];
      }
      return prev.map((sec) => {
        if (sec.type === "certificates") {
          const s = sec as CertificatesSectionBlock;
          return {
            ...s,
            items: [
              ...s.items,
              {
                name: "Nowy certyfikat",
                issuer: "Wydawca",
                issue_date: "2024",
              },
            ],
          };
        }
        return sec;
      });
    });
  };

  const updateCertificateItem = (
    index: number,
    field: keyof CertificateItem,
    value: string
  ) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "certificates") {
          const s = sec as CertificatesSectionBlock;
          const items = [...s.items];
          items[index] = { ...items[index], [field]: value };
          return { ...s, items };
        }
        return sec;
      })
    );
  };

  const removeCertificateItem = (index: number) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "certificates") {
          const s = sec as CertificatesSectionBlock;
          return { ...s, items: s.items.filter((_, idx: number) => idx !== index) };
        }
        return sec;
      })
    );
  };

  // Custom Section
  const addCustomSection = () => {
    const newId = `custom_${Date.now()}`;
    const newSec: CustomSectionBlock = {
      id: newId,
      type: "custom",
      title: "Własna sekcja",
      content: "",
      items: [],
    };
    setSections((prev) => [...prev, newSec]);
  };

  const updateCustomSectionContent = (secId: string, content: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === secId ? { ...s, content } : s))
    );
  };

  const updateCustomSectionItems = (secId: string, itemsText: string) => {
    const items = itemsText
      .split("\n")
      .map((i) => i.trim())
      .filter(Boolean);
    setSections((prev) =>
      prev.map((s) => (s.id === secId ? { ...s, items } : s))
    );
  };

  // Clause
  const updateClauseContent = (content: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === "clause" ? { ...s, content } : s))
    );
  };

  const summaryBlock = sections.find((s) => s.type === "summary") as SummarySectionBlock | undefined;
  const skillsBlock = sections.find((s) => s.type === "skills") as SkillsSectionBlock | undefined;
  const expBlock = sections.find((s) => s.type === "experience") as ExperienceSectionBlock | undefined;
  const projectsBlock = sections.find((s) => s.type === "projects") as ProjectsSectionBlock | undefined;
  const eduBlock = sections.find((s) => s.type === "education") as EducationSectionBlock | undefined;
  const certsBlock = sections.find((s) => s.type === "certificates") as CertificatesSectionBlock | undefined;
  const clauseBlock = sections.find((s) => s.type === "clause") as ClauseSectionBlock | undefined;
  const customBlocks = sections.filter(
    (s) =>
      s.type === "custom" ||
      ![
        "summary",
        "skills",
        "experience",
        "projects",
        "education",
        "certificates",
        "languages",
        "trainings",
        "achievements",
        "interests",
        "clause",
      ].includes(s.type)
  ) as CustomSectionBlock[];

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] -m-6 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 shrink-0 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3 truncate">
          <Button
            size="sm"
            variant="ghost"
            onClick={onBack}
            className="text-xs h-8 text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Wróć do listy szablonów
          </Button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          <div className="flex items-center gap-2 truncate">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nazwa szablonu / Stanowisko"
              className="font-bold text-slate-900 dark:text-slate-100 text-sm bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 focus:border-blue-500 focus:outline-none px-1 py-0.5 min-w-[200px]"
            />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Szablon bazowy)</span>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMobileTab("edit")}
              className={`px-3 py-1 rounded-md text-xs font-semibold ${
                mobileTab === "edit"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Edycja
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={`px-3 py-1 rounded-md text-xs font-semibold ${
                mobileTab === "preview"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Podgląd
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "pl" | "en")}
              className="text-xs h-8 w-28"
            >
              <option value="pl">Polski (PL)</option>
              <option value="en">English (EN)</option>
            </Select>
          </div>

          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
              <Check className="h-4 w-4" />
              Zapisano pomyślnie!
            </span>
          )}

          {errorMessage && (
            <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50">
              <AlertCircle className="h-4 w-4" />
              {errorMessage}
            </span>
          )}

          <Button
            size="sm"
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            className="text-xs h-8 shadow-xs"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Zapisz szablon
          </Button>
        </div>
      </header>

      {/* Split-View Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Detailed Form Editor */}
        <div
          className={`w-full lg:w-1/2 h-full overflow-y-auto p-6 space-y-6 ${
            mobileTab === "preview" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Header & Basic Candidate Identity for Preview */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Nagłówek i dane kandydata (do podglądu szablonu)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Imię i nazwisko"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                label="Stanowisko docelowe / Nagłówek"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder='np. "Flutter Developer", "DevOps Engineer"'
              />
              <Input
                label="Adres e-mail"
                value={contactInfo.email || ""}
                onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
              />
              <Input
                label="Telefon"
                value={contactInfo.phone || ""}
                onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
              />
              <Input
                label="Lokalizacja"
                value={contactInfo.location || ""}
                onChange={(e) => setContactInfo({ ...contactInfo, location: e.target.value })}
              />
            </div>
          </div>

          {/* O mnie (Summary) Block */}
          {summaryBlock && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 flex-1 mr-3">
                  <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <input
                    type="text"
                    value={summaryBlock.title}
                    onChange={(e) => updateSectionTitle("summary", e.target.value)}
                    className="font-semibold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                  />
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Summary)</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeSection("summary")}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                  title="Usuń sekcję"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <Textarea
                value={summaryBlock.content}
                onChange={(e) => updateSummaryText(e.target.value)}
                rows={4}
                placeholder="Napisz profil zawodowy dla tego archetypu stanowiska..."
                className="text-xs leading-relaxed"
              />
            </div>
          )}

          {/* Skills Block */}
          {skillsBlock && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 flex-1 mr-3">
                  <Code className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <input
                    type="text"
                    value={skillsBlock.title}
                    onChange={(e) => updateSectionTitle(skillsBlock.id, e.target.value)}
                    className="font-semibold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                  />
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Skills)</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeSection(skillsBlock.id)}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                  title="Usuń sekcję"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {skillsBlock.items.map((cat, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-3 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <Edit2 className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                        <input
                          type="text"
                          value={cat.category}
                          onChange={(e) => updateSkillCategoryTitle(idx, e.target.value)}
                          placeholder="Kategoria umiejętności"
                          className="font-semibold text-xs text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-full max-w-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSkillCategory(idx)}
                        className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <Input
                      label="Umiejętności (rozdzielone przecinkami)"
                      value={skillTagsRaw[idx] ?? cat.skills.join(", ")}
                      onChange={(e) => handleSkillTagsChange(idx, e.target.value)}
                      placeholder="np. Flutter, Dart, Bloc, Git, CI/CD"
                    />

                    <div className="flex flex-wrap gap-1 pt-1">
                      {cat.skills.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[11px] font-mono text-slate-700 dark:text-slate-300 shadow-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button size="sm" variant="outline" onClick={addSkillCategory} className="text-xs h-7">
                  <Plus className="h-3 w-3 mr-1" />
                  Dodaj kategorię umiejętności
                </Button>
              </div>
            </div>
          )}

          {/* Experience Block */}
          {expBlock && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 flex-1 mr-3">
                  <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <input
                    type="text"
                    value={expBlock.title}
                    onChange={(e) => updateSectionTitle(expBlock.id, e.target.value)}
                    className="font-semibold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                  />
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Experience)</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeSection(expBlock.id)}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                  title="Usuń sekcję"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {expBlock.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Pozycja #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExperienceItem(idx)}
                        className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Stanowisko"
                        value={item.position}
                        onChange={(e) => updateExperienceItem(idx, "position", e.target.value)}
                        required
                      />
                      <Input
                        label="Firma"
                        value={item.company}
                        onChange={(e) => updateExperienceItem(idx, "company", e.target.value)}
                        required
                      />
                      <Input
                        label="Lokalizacja / Tryb"
                        value={item.location}
                        onChange={(e) => updateExperienceItem(idx, "location", e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <DateInput
                          label="Początek"
                          value={item.start_date}
                          onChange={(val) => updateExperienceItem(idx, "start_date", val)}
                        />
                        <DateInput
                          label="Koniec"
                          value={item.end_date}
                          onChange={(val) => updateExperienceItem(idx, "end_date", val)}
                        />
                      </div>
                    </div>

                    <Textarea
                      label="Punkty osiągnięć (jeden w wierszu)"
                      value={item.highlights.join("\n")}
                      onChange={(e) =>
                        updateExperienceItem(
                          idx,
                          "highlights",
                          e.target.value.split("\n").filter((l) => l.trim().length > 0)
                        )
                      }
                      rows={3}
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button size="sm" variant="outline" onClick={addExperienceItem} className="text-xs h-7">
                  <Plus className="h-3 w-3 mr-1" />
                  Dodaj stanowisko
                </Button>
              </div>
            </div>
          )}

          {/* Projects Block */}
          {projectsBlock && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 flex-1 mr-3">
                  <Code className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <input
                    type="text"
                    value={projectsBlock.title}
                    onChange={(e) => updateSectionTitle(projectsBlock.id, e.target.value)}
                    className="font-semibold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                  />
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Projects)</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeSection(projectsBlock.id)}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                  title="Usuń sekcję"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {projectsBlock.items.map((proj, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Projekt #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeProjectItem(idx)}
                        className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="Nazwa projektu"
                        value={proj.name}
                        onChange={(e) => updateProjectItem(idx, "name", e.target.value)}
                        required
                      />
                      <Input
                        label="Rola"
                        value={proj.role}
                        onChange={(e) => updateProjectItem(idx, "role", e.target.value)}
                      />
                      <Input
                        label="Link URL"
                        value={proj.url}
                        onChange={(e) => updateProjectItem(idx, "url", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <DateInput
                        label="Początek"
                        value={proj.start_date}
                        onChange={(val) => updateProjectItem(idx, "start_date", val)}
                      />
                      <DateInput
                        label="Koniec"
                        value={proj.end_date}
                        onChange={(val) => updateProjectItem(idx, "end_date", val)}
                      />
                    </div>

                    <Textarea
                      label="Opis projektu"
                      value={proj.description}
                      onChange={(e) => updateProjectItem(idx, "description", e.target.value)}
                      rows={2}
                    />

                    <Input
                      label="Technologie (rozdzielone przecinkami)"
                      value={projectTechsRaw[idx] ?? proj.technologies.join(", ")}
                      onChange={(e) => handleProjectTechsChange(idx, e.target.value)}
                      placeholder="np. React, Flutter, Python"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button size="sm" variant="outline" onClick={addProjectItem} className="text-xs h-7">
                  <Plus className="h-3 w-3 mr-1" />
                  Dodaj projekt
                </Button>
              </div>
            </div>
          )}

          {/* Education Block */}
          {eduBlock && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 flex-1 mr-3">
                  <GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <input
                    type="text"
                    value={eduBlock.title}
                    onChange={(e) => updateSectionTitle(eduBlock.id, e.target.value)}
                    className="font-semibold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                  />
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Education)</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeSection(eduBlock.id)}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                  title="Usuń sekcję"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {eduBlock.items.map((edu, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Edukacja #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEducationItem(idx)}
                        className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Uczelnia / Szkoła"
                        value={edu.institution}
                        onChange={(e) => updateEducationItem(idx, "institution", e.target.value)}
                        required
                      />
                      <Input
                        label="Stopień"
                        value={edu.degree}
                        onChange={(e) => updateEducationItem(idx, "degree", e.target.value)}
                      />
                      <div className="sm:col-span-2">
                        <Input
                          label="Kierunek"
                          value={edu.field_of_study}
                          onChange={(e) => updateEducationItem(idx, "field_of_study", e.target.value)}
                        />
                      </div>
                      <DateInput
                        label="Początek"
                        value={edu.start_date}
                        onChange={(val) => updateEducationItem(idx, "start_date", val)}
                      />
                      <DateInput
                        label="Koniec"
                        value={edu.end_date}
                        onChange={(val) => updateEducationItem(idx, "end_date", val)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button size="sm" variant="outline" onClick={addEducationItem} className="text-xs h-7">
                  <Plus className="h-3 w-3 mr-1" />
                  Dodaj edukację
                </Button>
              </div>
            </div>
          )}

          {/* Certificates Block */}
          {certsBlock && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 flex-1 mr-3">
                  <Award className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <input
                    type="text"
                    value={certsBlock.title}
                    onChange={(e) => updateSectionTitle(certsBlock.id, e.target.value)}
                    className="font-semibold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                  />
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Certificates)</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeSection(certsBlock.id)}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                  title="Usuń sekcję"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {certsBlock.items.map((cert: CertificateItem, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Certyfikat #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCertificateItem(idx)}
                        className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="Nazwa"
                        value={cert.name}
                        onChange={(e) => updateCertificateItem(idx, "name", e.target.value)}
                        required
                      />
                      <Input
                        label="Wydawca"
                        value={cert.issuer}
                        onChange={(e) => updateCertificateItem(idx, "issuer", e.target.value)}
                      />
                      <DateInput
                        label="Data"
                        value={cert.issue_date}
                        onChange={(val) => updateCertificateItem(idx, "issue_date", val)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button size="sm" variant="outline" onClick={addCertificateItem} className="text-xs h-7">
                  <Plus className="h-3 w-3 mr-1" />
                  Dodaj certyfikat
                </Button>
              </div>
            </div>
          )}

          {/* Custom Blocks */}
          {customBlocks.map((cs) => (
            <div key={cs.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 flex-1 mr-3">
                  <FolderPlus className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <input
                    type="text"
                    value={cs.title}
                    onChange={(e) => updateSectionTitle(cs.id, e.target.value)}
                    placeholder="Tytuł sekcji własnej"
                    className="font-semibold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-full max-w-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeSection(cs.id)}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                  title="Usuń sekcję"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <Textarea
                label="Treść opisowa"
                value={cs.content || ""}
                onChange={(e) => updateCustomSectionContent(cs.id, e.target.value)}
                rows={2}
              />

              <Textarea
                label="Punkty listy (jeden w nowym wierszu)"
                value={(cs.items || []).join("\n")}
                onChange={(e) => updateCustomSectionItems(cs.id, e.target.value)}
                rows={2}
              />
            </div>
          ))}

          {/* Add Custom Section Button */}
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={addCustomSection}
              className="border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 py-3 text-xs w-full max-w-md"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Dodaj własną sekcję do tego szablonu
            </Button>
          </div>

          {/* Clause Block */}
          {clauseBlock && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {clauseBlock.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => removeSection("clause")}
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                  title="Usuń sekcję"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Textarea
                value={clauseBlock.content}
                onChange={(e) => updateClauseContent(e.target.value)}
                rows={3}
                className="text-[11px] text-slate-600 dark:text-slate-300"
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
            layoutSchema={currentLayoutSchema}
            jobOfferId={null}
            language={language}
            onExportPdf={handleExportPdf}
            isExportingPdf={isExportingPdf}
          />
        </div>
      </div>
    </div>
  );
};
