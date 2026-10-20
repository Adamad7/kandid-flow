import React, { useEffect, useState } from "react";
import {
  User,
  Plus,
  Trash2,
  Save,
  Check,
  AlertCircle,
  Briefcase,
  Code,
  GraduationCap,
  Award,
  ShieldCheck,
  FolderPlus,
  Edit2,
  Sparkles,
  Cpu,
  FolderGit2,
  FileText,
  FileCode,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  CandidateContactInfo,
  CandidateProfileRead,
  CandidateProfileUpdate,
  CandidateSectionBlock,
  CertificateItem,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  SkillsSectionBlock,
  ExperienceSectionBlock,
  ProjectsSectionBlock,
  EducationSectionBlock,
  CertificatesSectionBlock,
  SummarySectionBlock,
  ClauseSectionBlock,
  CustomSectionBlock,
  SectionDefaultConfig,
  SectionGenerationMode,
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { DateInput } from "../ui/DateInput";

export const KnowledgeBaseEditor: React.FC = () => {
  const [, setProfile] = useState<CandidateProfileRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Per-section saving and success states
  // Keys: "contact", "defaults", sectionId (e.g. "summary", "skills", custom ids...)
  const [savingSections, setSavingSections] = useState<Record<string, boolean>>({});
  const [successSections, setSuccessSections] = useState<Record<string, boolean>>({});
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});

  // Original saved state snapshots for dirty-checking
  const [initialFullName, setInitialFullName] = useState("");
  const [initialContactInfo, setInitialContactInfo] = useState<CandidateContactInfo>({});
  const [initialDefaultSections, setInitialDefaultSections] = useState<SectionDefaultConfig[]>([]);
  const [initialSections, setInitialSections] = useState<CandidateSectionBlock[]>([]);

  // Current Form State
  const [fullName, setFullName] = useState("");
  const [contactInfo, setContactInfo] = useState<CandidateContactInfo>({});
  const [defaultSections, setDefaultSections] = useState<SectionDefaultConfig[]>([
    { id: "summary", mode: "ai" },
    { id: "skills", mode: "ai" },
    { id: "experience", mode: "ai" },
    { id: "projects", mode: "ai" },
    { id: "education", mode: "raw" },
    { id: "certificates", mode: "raw" },
    { id: "clause", mode: "ai" },
  ]);
  const [sections, setSections] = useState<CandidateSectionBlock[]>([]);

  // Raw text states for comma-separated inputs to allow typing commas, trailing spaces, special chars
  // Keyed by category index or project index
  const [skillTagsRaw, setSkillTagsRaw] = useState<Record<number, string>>({});
  const [projectTechsRaw, setProjectTechsRaw] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await api.candidate.get();
      setProfile(data);

      const fName = data.full_name || "";
      const cInfo = data.contact_info || {};
      const rawDefSecs = data.default_sections || [];
      const secs = data.sections || [];

      let defSecs: SectionDefaultConfig[] = [];
      if (Array.isArray(rawDefSecs) && rawDefSecs.length > 0) {
        defSecs = rawDefSecs.map((item: unknown) => {
          if (typeof item === "string") {
            return { id: item, mode: "ai" as SectionGenerationMode };
          }
          const obj = item as { id: string; mode?: SectionGenerationMode };
          return { id: obj.id, mode: (obj.mode || "ai") as SectionGenerationMode };
        });
      } else {
        defSecs = [
          { id: "summary", mode: "ai" },
          { id: "skills", mode: "ai" },
          { id: "experience", mode: "ai" },
          { id: "projects", mode: "ai" },
          { id: "education", mode: "raw" },
          { id: "certificates", mode: "raw" },
          { id: "clause", mode: "ai" },
        ];
      }

      setFullName(fName);
      setContactInfo(cInfo);
      setDefaultSections(defSecs);
      setSections(secs);

      // Initialize raw text for skills
      const sSec = secs.find((s) => s.type === "skills") as SkillsSectionBlock | undefined;
      if (sSec?.items) {
        const rawMap: Record<number, string> = {};
        sSec.items.forEach((cat, idx) => {
          rawMap[idx] = cat.skills.join(", ");
        });
        setSkillTagsRaw(rawMap);
      }

      // Initialize raw text for project technologies
      const pSec = secs.find((s) => s.type === "projects") as ProjectsSectionBlock | undefined;
      if (pSec?.items) {
        const rawPMap: Record<number, string> = {};
        pSec.items.forEach((proj, idx) => {
          rawPMap[idx] = (proj.technologies || []).join(", ");
        });
        setProjectTechsRaw(rawPMap);
      }

      setInitialFullName(fName);
      setInitialContactInfo(JSON.parse(JSON.stringify(cInfo)));
      setInitialDefaultSections(JSON.parse(JSON.stringify(defSecs)));
      setInitialSections(JSON.parse(JSON.stringify(secs)));
    } catch {
      // If 404 or error, initialize defaults
      const fName = "Jan Kowalski";
      const cInfo = {
        email: "jan.kowalski@example.com",
        phone: "+48 123 456 789",
        location: "Warszawa, Polska",
      };
      const defSecs: SectionDefaultConfig[] = [
        { id: "summary", mode: "ai" },
        { id: "skills", mode: "ai" },
        { id: "experience", mode: "ai" },
        { id: "projects", mode: "ai" },
        { id: "education", mode: "raw" },
        { id: "certificates", mode: "raw" },
        { id: "clause", mode: "ai" },
      ];
      const secs: CandidateSectionBlock[] = [
        {
          id: "summary",
          type: "summary",
          title: "O mnie",
          content: "Doświadczony inżynier oprogramowania zorientowany na wyniki.",
        },
        {
          id: "skills",
          type: "skills",
          title: "Umiejętności",
          items: [
            { category: "Języki i Technologie", skills: ["TypeScript", "Python", "Go"] },
            { category: "Frameworki", skills: ["React", "FastAPI", "Tailwind CSS"] },
          ],
        },
        {
          id: "experience",
          type: "experience",
          title: "Doświadczenie zawodowe",
          items: [
            {
              position: "Senior Software Engineer",
              company: "Tech Corp",
              location: "Warszawa (Hybrydowo)",
              start_date: "2021",
              end_date: "present",
              highlights: [
                "Projektowanie skalowalnych mikrousług w chmurze AWS",
                "Optymalizacja wydajności bazy danych PostgreSQL",
              ],
            },
          ],
        },
        {
          id: "projects",
          type: "projects",
          title: "Projekty",
          items: [
            {
              name: "KandidFlow",
              role: "Główny Architekt",
              url: "https://github.com/example/kandid-flow",
              start_date: "2024",
              end_date: "present",
              description: "Autonomiczna platforma do zarządzania procesem rekrutacji IT.",
              technologies: ["React", "TypeScript", "FastAPI", "PostgreSQL"],
            },
          ],
        },
        {
          id: "education",
          type: "education",
          title: "Edukacja",
          items: [
            {
              institution: "Politechnika Warszawska",
              degree: "Magister Inżynier",
              field_of_study: "Informatyka",
              start_date: "2015",
              end_date: "2020",
            },
          ],
        },
        {
          id: "clause",
          type: "clause",
          title: "Klauzula RODO",
          content:
            "Wyrażam zgodę na przetwarzanie moich danych osobowych dla potrzeb niezbędnych do realizacji procesu rekrutacji zgodnie z RODO.",
        },
      ];

      setFullName(fName);
      setContactInfo(cInfo);
      setDefaultSections(defSecs);
      setSections(secs);

      const rawMap: Record<number, string> = {
        0: "TypeScript, Python, Go",
        1: "React, FastAPI, Tailwind CSS",
      };
      setSkillTagsRaw(rawMap);

      setProjectTechsRaw({
        0: "React, TypeScript, FastAPI, PostgreSQL",
      });

      setInitialFullName(fName);
      setInitialContactInfo(JSON.parse(JSON.stringify(cInfo)));
      setInitialDefaultSections(JSON.parse(JSON.stringify(defSecs)));
      setInitialSections(JSON.parse(JSON.stringify(secs)));
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to save whole profile or single section
  const saveProfileData = async (sectionKey: string, customSectionsList?: CandidateSectionBlock[]) => {
    try {
      setSavingSections((prev) => ({ ...prev, [sectionKey]: true }));
      setSectionErrors((prev) => {
        const next = { ...prev };
        delete next[sectionKey];
        return next;
      });

      const currentSecs = customSectionsList || sections;
      const payload: CandidateProfileUpdate = {
        full_name: fullName,
        contact_info: contactInfo,
        default_sections: defaultSections,
        sections: currentSecs,
      };

      const updated = await api.candidate.update(payload);
      setProfile(updated);

      // Update initial baseline snapshots
      setInitialFullName(updated.full_name || "");
      setInitialContactInfo(JSON.parse(JSON.stringify(updated.contact_info || {})));
      setInitialDefaultSections(JSON.parse(JSON.stringify(updated.default_sections || [])));
      setInitialSections(JSON.parse(JSON.stringify(updated.sections || [])));

      setSuccessSections((prev) => ({ ...prev, [sectionKey]: true }));
      setTimeout(() => {
        setSuccessSections((prev) => ({ ...prev, [sectionKey]: false }));
      }, 3000);
    } catch {
      setSectionErrors((prev) => ({
        ...prev,
        [sectionKey]: "Nie udało się zapisać zmian sekcji.",
      }));
    } finally {
      setSavingSections((prev) => ({ ...prev, [sectionKey]: false }));
    }
  };

  // Dirty check functions
  const isContactDirty =
    fullName !== initialFullName ||
    JSON.stringify(contactInfo) !== JSON.stringify(initialContactInfo);

  const isDefaultsDirty =
    JSON.stringify(defaultSections) !== JSON.stringify(initialDefaultSections);

  const isSectionDirty = (secId: string) => {
    const current = sections.find((s) => s.id === secId);
    const initial = initialSections.find((s) => s.id === secId);
    if (!current && !initial) return false;
    if (!current || !initial) return true;
    return JSON.stringify(current) !== JSON.stringify(initial);
  };

  const isAnyDirty =
    isContactDirty ||
    isDefaultsDirty ||
    JSON.stringify(sections) !== JSON.stringify(initialSections);

  const handleSaveAll = async () => {
    await saveProfileData("all");
  };

  const getSectionDefaultMode = (secId: string): SectionGenerationMode => {
    const found = defaultSections.find((ds) => ds.id === secId);
    if (found) return found.mode;
    if (["summary", "skills", "experience", "projects", "clause"].includes(secId)) {
      return "ai";
    }
    return "raw";
  };

  const handleSetDefaultSectionMode = (secId: string, mode: SectionGenerationMode) => {
    setDefaultSections((prev) => {
      const existing = prev.find((ds) => ds.id === secId);
      if (existing) {
        return prev.map((ds) => (ds.id === secId ? { ...ds, mode } : ds));
      }
      return [...prev, { id: secId, mode }];
    });
  };

  // Section title modifier (generic for any section)
  const updateSectionTitle = (secId: string, newTitle: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === secId ? { ...s, title: newTitle } : s))
    );
  };

  // Block Modifiers
  const updateSummaryContent = (content: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === "summary" ? { ...s, content } : s))
    );
  };

  const updateClauseContent = (content: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === "clause" ? { ...s, content } : s))
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
          return {
            ...s,
            items: nextItems,
          };
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
          // Re-index skillTagsRaw
          const nextRaw: Record<number, string> = {};
          items.forEach((item, idx) => {
            nextRaw[idx] = item.skills.join(", ");
          });
          setSkillTagsRaw(nextRaw);
          return {
            ...s,
            items,
          };
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
    // 1. Keep the exact raw text so user can freely type commas, spaces, dashes, etc.
    setSkillTagsRaw((prev) => ({ ...prev, [catIndex]: rawValue }));

    // 2. Parse into list of items for the actual data model
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
                company: "Nazwa Firmy",
                location: "Warszawa",
                start_date: "2023",
                end_date: "present",
                highlights: ["Główny zakres obowiązków i osiągnięcia"],
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
          return {
            ...s,
            items: s.items.filter((_, idx) => idx !== index),
          };
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
              name: "Nazwa Projektu",
              role: "Rola",
              url: "",
              start_date: "2024",
              end_date: "present",
              description: "Opis architektury i celu projektu",
              technologies: ["React", "TypeScript"],
            },
          ];
          const newIdx = nextItems.length - 1;
          setProjectTechsRaw((r) => ({ ...r, [newIdx]: "React, TypeScript" }));
          return {
            ...s,
            items: nextItems,
          };
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
          return {
            ...s,
            items,
          };
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
          return {
            ...s,
            items: s.items.filter((_, idx) => idx !== index),
          };
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
          return {
            ...s,
            items: s.items.filter((_, idx) => idx !== index),
          };
        }
        return sec;
      })
    );
  };

  // Custom Sections Handler
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

  const removeSection = async (secId: string) => {
    if (confirm("Czy na pewno chcesz usunąć tę sekcję z bazy wiedzy?")) {
      const nextSecs = sections.filter((s) => s.id !== secId);
      setSections(nextSecs);
      await saveProfileData(`remove_${secId}`, nextSecs);
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Wczytywanie bazy wiedzy o kandydacie...
          </p>
        </div>
      </div>
    );
  }

  // Pre-categorize standard sections
  const summarySection = sections.find((s) => s.id === "summary") as SummarySectionBlock | undefined;
  const skillsSection = sections.find((s) => s.type === "skills") as SkillsSectionBlock | undefined;
  const expSection = sections.find((s) => s.type === "experience") as ExperienceSectionBlock | undefined;
  const projectsSection = sections.find((s) => s.type === "projects") as ProjectsSectionBlock | undefined;
  const eduSection = sections.find((s) => s.type === "education") as EducationSectionBlock | undefined;
  const certsSection = sections.find((s) => s.type === "certificates") as CertificatesSectionBlock | undefined;
  const clauseSection = sections.find((s) => s.type === "clause") as ClauseSectionBlock | undefined;
  const customSections = sections.filter(
    (s) =>
      s.type === "custom" ||
      !["summary", "skills", "experience", "projects", "education", "certificates", "clause"].includes(s.type)
  ) as CustomSectionBlock[];

  // Reusable Section Save Button Component
  const renderSectionSaveButton = (sectionKey: string, isDirty: boolean) => {
    const isSavingThis = !!savingSections[sectionKey];
    const isSuccessThis = !!successSections[sectionKey];
    const errorThis = sectionErrors[sectionKey];

    return (
      <div className="flex items-center gap-2">
        {isSuccessThis && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-900/50">
            <Check className="h-3.5 w-3.5" />
            Zapisano
          </span>
        )}
        {errorThis && (
          <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded border border-rose-200 dark:border-rose-900/50">
            <AlertCircle className="h-3.5 w-3.5" />
            {errorThis}
          </span>
        )}
        <Button
          size="sm"
          variant={isDirty ? "primary" : "secondary"}
          onClick={() => saveProfileData(sectionKey)}
          disabled={!isDirty || isSavingThis}
          isLoading={isSavingThis}
          className="text-xs h-8 px-3 font-medium transition-all"
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Zapisz sekcję
        </Button>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Baza wiedzy o kandydacie
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Główny zasób Twoich doświadczeń, umiejętności i projektów, z którego AI generuje i dopasowuje CV
          </p>
        </div>

        <div className="flex items-center gap-3">
          {successSections["all"] && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
              <Check className="h-4 w-4" />
              Wszystko zapisane!
            </span>
          )}
          <Button
            variant={isAnyDirty ? "primary" : "secondary"}
            onClick={handleSaveAll}
            disabled={!isAnyDirty || !!savingSections["all"]}
            isLoading={!!savingSections["all"]}
            className="text-sm font-semibold shadow-xs"
          >
            <Save className="h-4 w-4 mr-2" />
            Zapisz wszystkie zmiany
          </Button>
        </div>
      </div>

      {/* Basic Contact Info Block */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Dane kontaktowe i identyfikacja
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Imię i nazwisko"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="np. Jan Kowalski"
            required
          />
          <Input
            label="Adres e-mail"
            type="email"
            value={contactInfo.email || ""}
            onChange={(e) =>
              setContactInfo({ ...contactInfo, email: e.target.value })
            }
            placeholder="np. jan.kowalski@example.com"
          />
          <Input
            label="Telefon kontaktowy"
            value={contactInfo.phone || ""}
            onChange={(e) =>
              setContactInfo({ ...contactInfo, phone: e.target.value })
            }
            placeholder="np. +48 123 456 789"
          />
          <Input
            label="Lokalizacja (Miasto, Kraj)"
            value={contactInfo.location || ""}
            onChange={(e) =>
              setContactInfo({ ...contactInfo, location: e.target.value })
            }
            placeholder="np. Warszawa, Polska"
          />
          <Input
            label="Profil GitHub (URL)"
            value={contactInfo.github || ""}
            onChange={(e) =>
              setContactInfo({ ...contactInfo, github: e.target.value })
            }
            placeholder="https://github.com/twoj-profil"
          />
          <Input
            label="Profil LinkedIn (URL)"
            value={contactInfo.linkedin || ""}
            onChange={(e) =>
              setContactInfo({ ...contactInfo, linkedin: e.target.value })
            }
            placeholder="https://linkedin.com/in/twoj-profil"
          />
          <div className="sm:col-span-2">
            <Input
              label="Strona www / Portfolio (URL)"
              value={contactInfo.portfolio || ""}
              onChange={(e) =>
                setContactInfo({ ...contactInfo, portfolio: e.target.value })
              }
              placeholder="https://twojeportfolio.dev"
            />
          </div>
        </div>

        {/* Default sections selector with 3-position toggle switch */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Domyślne zachowanie sekcji przy generowaniu CV:
            </label>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Konfiguracja domyślna dla każdej nowo tworzonej oferty pracy
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                id: "summary",
                label: "O mnie",
                description: "Podsumowanie profilu zawodowego, mocnych stron i celów",
                icon: User,
              },
              {
                id: "skills",
                label: "Umiejętności",
                description: "Kategorie technologii, języków i kompetencji twardych",
                icon: Cpu,
              },
              {
                id: "experience",
                label: "Doświadczenie zawodowe",
                description: "Historia zatrudnienia z punktami osiągnięć",
                icon: Briefcase,
              },
              {
                id: "projects",
                label: "Projekty",
                description: "Portfolio zrealizowanych projektów",
                icon: FolderGit2,
              },
              {
                id: "education",
                label: "Edukacja",
                description: "Uczelnie, stopnie naukowe oraz kierunki kształcenia",
                icon: GraduationCap,
              },
              {
                id: "certificates",
                label: "Certyfikaty",
                description: "Uprawnienia branżowe, licencje i akredytacje",
                icon: Award,
              },
              {
                id: "clause",
                label: "Klauzula RODO",
                description: "Zgoda na przetwarzanie danych pod danego pracodawcę",
                icon: FileText,
              },
              ...customSections.map((cs) => ({
                id: cs.id,
                label: cs.title || "Własna sekcja",
                description: "Niestandardowy blok wiedzy",
                icon: FileCode,
              })),
            ].map((sec) => {
              const IconComp = sec.icon;
              const currentMode = getSectionDefaultMode(sec.id);
              const isOff = currentMode === "off";
              const isRaw = currentMode === "raw";
              const isAi = currentMode === "ai";

              return (
                <div
                  key={sec.id}
                  className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-colors duration-150 gap-3 ${
                    isOff
                      ? "bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/60 opacity-60"
                      : isAi
                      ? "bg-indigo-50/20 dark:bg-indigo-950/20 border-indigo-200/70 dark:border-indigo-900/60 shadow-xs"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isOff
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-400"
                          : isAi
                          ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                          : "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-medium truncate ${
                            isOff
                              ? "text-slate-400 dark:text-slate-500"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {sec.label}
                        </span>
                        {isOff && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Nie umieszczaj
                          </span>
                        )}
                        {isRaw && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Z bazy wiedzy
                          </span>
                        )}
                        {isAi && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5 shrink-0" />
                            Generuj AI
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {sec.description}
                      </p>
                    </div>
                  </div>

                  {/* 3-Position Toggle Switch */}
                  <div className="inline-flex shrink-0 self-end sm:self-auto rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => handleSetDefaultSectionMode(sec.id, "off")}
                      className={`px-2.5 py-1 rounded-md transition-colors duration-150 select-none whitespace-nowrap font-medium ${
                        isOff
                          ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      Nie umieszczaj
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDefaultSectionMode(sec.id, "raw")}
                      className={`px-2.5 py-1 rounded-md transition-colors duration-150 select-none whitespace-nowrap font-medium ${
                        isRaw
                          ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      Z bazy wiedzy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDefaultSectionMode(sec.id, "ai")}
                      className={`px-2.5 py-1 rounded-md transition-colors duration-150 flex items-center gap-1 select-none whitespace-nowrap font-medium ${
                        isAi
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
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

        {/* Bottom Save Action for Contact & Preferences */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          {renderSectionSaveButton("contact", isContactDirty || isDefaultsDirty)}
        </div>
      </div>

      {/* O mnie (Summary) Section */}
      {summarySection && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <input
                type="text"
                value={summarySection.title}
                onChange={(e) => updateSectionTitle("summary", e.target.value)}
                className="font-semibold text-slate-900 dark:text-slate-100 text-base bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Summary)</span>
            </div>
          </div>
          <Textarea
            value={summarySection.content}
            onChange={(e) => updateSummaryContent(e.target.value)}
            placeholder="Napisz krótki biogram opisujący Twoje kluczowe kompetencje, lata doświadczenia i domenę..."
            rows={4}
          />

          {/* Bottom Save Action */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            {renderSectionSaveButton("summary", isSectionDirty("summary"))}
          </div>
        </div>
      )}

      {/* Skills Section (Umiejętności twarde i miękkie) */}
      {skillsSection && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <Code className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <input
                type="text"
                value={skillsSection.title}
                onChange={(e) => updateSectionTitle(skillsSection.id, e.target.value)}
                className="font-semibold text-slate-900 dark:text-slate-100 text-base bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Skills)</span>
            </div>
          </div>

          <div className="space-y-4">
            {skillsSection.items.map((cat, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Edit2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <input
                      type="text"
                      value={cat.category}
                      onChange={(e) => updateSkillCategoryTitle(idx, e.target.value)}
                      placeholder="Nazwa kategorii (np. Umiejętności twarde, Miękkie, Chmura...)"
                      className="font-semibold text-sm text-slate-800 dark:text-slate-200 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-full max-w-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSkillCategory(idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded"
                    title="Usuń kategorię"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <Input
                  label="Lista umiejętności (rozdzielone przecinkami)"
                  value={skillTagsRaw[idx] ?? cat.skills.join(", ")}
                  onChange={(e) => handleSkillTagsChange(idx, e.target.value)}
                  placeholder="np. Python, Docker, Komunikatywność, C/C++, CI/CD"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {cat.skills.map((skill, sIdx) => (
                    <span
                      key={sIdx}
                      className="rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Actions for Skills: Add Category & Save Section */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={addSkillCategory} className="text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Dodaj kategorię
            </Button>
            {renderSectionSaveButton(skillsSection.id, isSectionDirty(skillsSection.id))}
          </div>
        </div>
      )}

      {/* Experience Section */}
      {expSection && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <input
                type="text"
                value={expSection.title}
                onChange={(e) => updateSectionTitle(expSection.id, e.target.value)}
                className="font-semibold text-slate-900 dark:text-slate-100 text-base bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Experience)</span>
            </div>
          </div>

          <div className="space-y-4">
            {expSection.items.map((exp, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    Pozycja #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExperienceItem(idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                    title="Usuń stanowisko"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Stanowisko / Rola"
                    value={exp.position}
                    onChange={(e) =>
                      updateExperienceItem(idx, "position", e.target.value)
                    }
                    required
                  />
                  <Input
                    label="Firma"
                    value={exp.company}
                    onChange={(e) =>
                      updateExperienceItem(idx, "company", e.target.value)
                    }
                    required
                  />
                  <Input
                    label="Lokalizacja / Tryb"
                    value={exp.location}
                    onChange={(e) =>
                      updateExperienceItem(idx, "location", e.target.value)
                    }
                    placeholder="np. Warszawa (Zdalnie)"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <DateInput
                      label="Data rozpoczęcia"
                      value={exp.start_date}
                      onChange={(val) =>
                        updateExperienceItem(idx, "start_date", val)
                      }
                      placeholder="YYYY, YYYY-MM lub data"
                    />
                    <DateInput
                      label="Data zakończenia"
                      value={exp.end_date}
                      onChange={(val) =>
                        updateExperienceItem(idx, "end_date", val)
                      }
                      placeholder="present, YYYY-MM lub data"
                    />
                  </div>
                </div>

                <Textarea
                  label="Osiągnięcia i zakres obowiązków (każdy punkt w nowej linii)"
                  value={exp.highlights.join("\n")}
                  onChange={(e) =>
                    updateExperienceItem(
                      idx,
                      "highlights",
                      e.target.value.split("\n").filter((l) => l.trim().length > 0)
                    )
                  }
                  rows={3}
                  placeholder="Wdrożenie klastra Kubernetes...&#10;Zwiększenie pokrycia testami o 40%..."
                />
              </div>
            ))}
          </div>

          {/* Bottom Actions for Experience: Add Position & Save Section */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={addExperienceItem} className="text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Dodaj stanowisko
            </Button>
            {renderSectionSaveButton(expSection.id, isSectionDirty(expSection.id))}
          </div>
        </div>
      )}

      {/* Projects Section */}
      {projectsSection && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <Code className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" />
              <input
                type="text"
                value={projectsSection.title}
                onChange={(e) => updateSectionTitle(projectsSection.id, e.target.value)}
                className="font-semibold text-slate-900 dark:text-slate-100 text-base bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Projects)</span>
            </div>
          </div>

          <div className="space-y-4">
            {projectsSection.items.map((proj, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    Projekt #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeProjectItem(idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                    title="Usuń projekt"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Nazwa projektu"
                    value={proj.name}
                    onChange={(e) =>
                      updateProjectItem(idx, "name", e.target.value)
                    }
                    required
                  />
                  <Input
                    label="Twoja rola"
                    value={proj.role}
                    onChange={(e) =>
                      updateProjectItem(idx, "role", e.target.value)
                    }
                  />
                  <Input
                    label="Link do repozytorium / demo"
                    value={proj.url}
                    onChange={(e) => updateProjectItem(idx, "url", e.target.value)}
                    placeholder="https://github.com/..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DateInput
                    label="Data rozpoczęcia projektu"
                    value={proj.start_date}
                    onChange={(val) =>
                      updateProjectItem(idx, "start_date", val)
                    }
                    placeholder="YYYY, YYYY-MM lub data"
                  />
                  <DateInput
                    label="Data zakończenia projektu"
                    value={proj.end_date}
                    onChange={(val) =>
                      updateProjectItem(idx, "end_date", val)
                    }
                    placeholder="present, YYYY-MM lub data"
                  />
                </div>

                <Textarea
                  label="Opis projektu"
                  value={proj.description}
                  onChange={(e) =>
                    updateProjectItem(idx, "description", e.target.value)
                  }
                  rows={2}
                />

                <Input
                  label="Użyte technologie (rozdzielone przecinkami)"
                  value={projectTechsRaw[idx] ?? proj.technologies.join(", ")}
                  onChange={(e) => handleProjectTechsChange(idx, e.target.value)}
                  placeholder="np. React, TypeScript, Vite, Tailwind CSS"
                />
              </div>
            ))}
          </div>

          {/* Bottom Actions for Projects: Add Project & Save Section */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={addProjectItem} className="text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Dodaj projekt
            </Button>
            {renderSectionSaveButton(projectsSection.id, isSectionDirty(projectsSection.id))}
          </div>
        </div>
      )}

      {/* Education Section */}
      {eduSection && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <input
                type="text"
                value={eduSection.title}
                onChange={(e) => updateSectionTitle(eduSection.id, e.target.value)}
                className="font-semibold text-slate-900 dark:text-slate-100 text-base bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Education)</span>
            </div>
          </div>

          <div className="space-y-4">
            {eduSection.items.map((edu, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    Wpis #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEducationItem(idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                    title="Usuń wpis edukacji"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Uczelnia / Szkoła"
                    value={edu.institution}
                    onChange={(e) =>
                      updateEducationItem(idx, "institution", e.target.value)
                    }
                    required
                  />
                  <Input
                    label="Tytuł / Stopień"
                    value={edu.degree}
                    onChange={(e) =>
                      updateEducationItem(idx, "degree", e.target.value)
                    }
                    placeholder="np. Magister Inżynier"
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Kierunek studiów"
                      value={edu.field_of_study}
                      onChange={(e) =>
                        updateEducationItem(idx, "field_of_study", e.target.value)
                      }
                      placeholder="np. Informatyka Stosowana"
                    />
                  </div>
                  <DateInput
                    label="Data / Rok rozpoczęcia"
                    value={edu.start_date}
                    onChange={(val) =>
                      updateEducationItem(idx, "start_date", val)
                    }
                    placeholder="YYYY, YYYY-MM lub data"
                  />
                  <DateInput
                    label="Data / Rok ukończenia"
                    value={edu.end_date}
                    onChange={(val) =>
                      updateEducationItem(idx, "end_date", val)
                    }
                    placeholder="present, YYYY lub data"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Actions for Education: Add Entry & Save Section */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={addEducationItem} className="text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Dodaj edukację
            </Button>
            {renderSectionSaveButton(eduSection.id, isSectionDirty(eduSection.id))}
          </div>
        </div>
      )}

      {/* Certificates Section */}
      {certsSection && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <Award className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <input
                type="text"
                value={certsSection.title}
                onChange={(e) => updateSectionTitle(certsSection.id, e.target.value)}
                className="font-semibold text-slate-900 dark:text-slate-100 text-base bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Certificates)</span>
            </div>
          </div>

          <div className="space-y-4">
            {certsSection.items.map((cert, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    Certyfikat #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCertificateItem(idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                    title="Usuń certyfikat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Nazwa certyfikatu"
                    value={cert.name}
                    onChange={(e) =>
                      updateCertificateItem(idx, "name", e.target.value)
                    }
                    required
                  />
                  <Input
                    label="Organizacja wydająca"
                    value={cert.issuer}
                    onChange={(e) =>
                      updateCertificateItem(idx, "issuer", e.target.value)
                    }
                    placeholder="np. AWS, Microsoft, CNCF"
                  />
                  <DateInput
                    label="Data uzyskania"
                    value={cert.issue_date}
                    onChange={(val) =>
                      updateCertificateItem(idx, "issue_date", val)
                    }
                    placeholder="np. 2023, 2023-08 lub data"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Actions for Certificates: Add Cert & Save Section */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={addCertificateItem} className="text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Dodaj certyfikat
            </Button>
            {renderSectionSaveButton(certsSection.id, isSectionDirty(certsSection.id))}
          </div>
        </div>
      )}

      {/* Custom User-Added Sections */}
      {customSections.map((cs) => {
        const isDirty = isSectionDirty(cs.id);
        return (
          <div key={cs.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 flex-1 mr-4">
                <FolderPlus className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0" />
                <input
                  type="text"
                  value={cs.title}
                  onChange={(e) => updateSectionTitle(cs.id, e.target.value)}
                  placeholder="Wpisz nazwę sekcji (np. Języki obce, Zainteresowania, Publikacje)..."
                  className="font-semibold text-slate-900 dark:text-slate-100 text-base bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-full max-w-md"
                />
              </div>
              <button
                type="button"
                onClick={() => removeSection(cs.id)}
                className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded transition-colors"
                title="Usuń sekcję"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <Textarea
              label="Treść opisowa sekcji (opcjonalnie)"
              value={cs.content || ""}
              onChange={(e) => updateCustomSectionContent(cs.id, e.target.value)}
              placeholder="Wpisz opis lub treść akapitu dla tej sekcji..."
              rows={3}
            />

            <Textarea
              label="Elementy listy punktowanej (każdy element w nowej linii, opcjonalnie)"
              value={(cs.items || []).join("\n")}
              onChange={(e) => updateCustomSectionItems(cs.id, e.target.value)}
              placeholder="Angielski - C1 (Biegle)&#10;Niemiecki - B1 (Podstawowy)"
              rows={3}
            />

            {/* Bottom Save Action for Custom Section */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              {renderSectionSaveButton(cs.id, isDirty)}
            </div>
          </div>
        );
      })}

      {/* Add Custom Section Action */}
      <div className="flex justify-center pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={addCustomSection}
          className="border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 py-4 px-6 text-sm font-medium w-full max-w-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Dodaj własną sekcję do bazy wiedzy
        </Button>
      </div>

      {/* GDPR Clause Section */}
      {clauseSection && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <input
                type="text"
                value={clauseSection.title}
                onChange={(e) => updateSectionTitle(clauseSection.id, e.target.value)}
                className="font-semibold text-slate-900 dark:text-slate-100 text-base bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(RODO / GDPR)</span>
            </div>
          </div>
          <Textarea
            value={clauseSection.content || ""}
            onChange={(e) => updateClauseContent(e.target.value)}
            rows={3}
            placeholder="Treść klauzuli zgody na przetwarzanie danych osobowych..."
          />

          {/* Bottom Save Action for Clause */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            {renderSectionSaveButton(clauseSection.id, isSectionDirty(clauseSection.id))}
          </div>
        </div>
      )}

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          size="lg"
          variant={isAnyDirty ? "primary" : "secondary"}
          onClick={handleSaveAll}
          disabled={!isAnyDirty || !!savingSections["all"]}
          isLoading={!!savingSections["all"]}
          className="px-8 font-semibold shadow-md"
        >
          <Save className="h-5 w-5 mr-2" />
          Zapisz wszystkie zmiany w bazie wiedzy
        </Button>
      </div>
    </div>
  );
};
