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
  RotateCcw,
  Languages,
  BookOpen,
  Trophy,
  Heart,
} from "lucide-react";
import { api } from "../../lib/api";
import { SUGGESTED_LANGUAGE_LEVELS } from "../../lib/constants";
import type {
  CandidateContactInfo,
  CandidateProfileRead,
  CandidateProfileUpdate,
  CandidateSectionBlock,
  CertificateItem,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  LanguageItem,
  TrainingItem,
  AchievementItem,
  SkillsSectionBlock,
  ExperienceSectionBlock,
  ProjectsSectionBlock,
  EducationSectionBlock,
  CertificatesSectionBlock,
  LanguagesSectionBlock,
  TrainingsSectionBlock,
  AchievementsSectionBlock,
  InterestsSectionBlock,
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
import { Modal } from "../ui/Modal";
import { KnowledgeBaseAIModal } from "./KnowledgeBaseAIModal";

export const STANDARD_SECTION_DEFAULTS: {
  id: string;
  type: CandidateSectionBlock["type"];
  title: string;
  createDefault: () => CandidateSectionBlock;
}[] = [
  {
    id: "summary",
    type: "summary",
    title: "O mnie",
    createDefault: () => ({ id: "summary", type: "summary", title: "O mnie", content: "" } as SummarySectionBlock),
  },
  {
    id: "skills",
    type: "skills",
    title: "Umiejętności",
    createDefault: () => ({ id: "skills", type: "skills", title: "Umiejętności", items: [] } as SkillsSectionBlock),
  },
  {
    id: "experience",
    type: "experience",
    title: "Doświadczenie zawodowe",
    createDefault: () => ({ id: "experience", type: "experience", title: "Doświadczenie zawodowe", items: [] } as ExperienceSectionBlock),
  },
  {
    id: "projects",
    type: "projects",
    title: "Projekty",
    createDefault: () => ({ id: "projects", type: "projects", title: "Projekty", items: [] } as ProjectsSectionBlock),
  },
  {
    id: "education",
    type: "education",
    title: "Edukacja",
    createDefault: () => ({ id: "education", type: "education", title: "Edukacja", items: [] } as EducationSectionBlock),
  },
  {
    id: "certificates",
    type: "certificates",
    title: "Certyfikaty",
    createDefault: () => ({ id: "certificates", type: "certificates", title: "Certyfikaty", items: [] } as CertificatesSectionBlock),
  },
  {
    id: "languages",
    type: "languages",
    title: "Znajomość języków",
    createDefault: () => ({ id: "languages", type: "languages", title: "Znajomość języków", items: [] } as LanguagesSectionBlock),
  },
  {
    id: "trainings",
    type: "trainings",
    title: "Szkolenia",
    createDefault: () => ({ id: "trainings", type: "trainings", title: "Szkolenia", items: [] } as TrainingsSectionBlock),
  },
  {
    id: "achievements",
    type: "achievements",
    title: "Osiągnięcia",
    createDefault: () => ({ id: "achievements", type: "achievements", title: "Osiągnięcia", items: [] } as AchievementsSectionBlock),
  },
  {
    id: "interests",
    type: "interests",
    title: "Zainteresowania",
    createDefault: () => ({ id: "interests", type: "interests", title: "Zainteresowania", items: [], content: "" } as InterestsSectionBlock),
  },
  {
    id: "clause",
    type: "clause",
    title: "Klauzula RODO",
    createDefault: () => ({ id: "clause", type: "clause", title: "Klauzula RODO", content: "" } as ClauseSectionBlock),
  },
];

export const ensureStandardSections = (secs: CandidateSectionBlock[]): CandidateSectionBlock[] => {
  const result: CandidateSectionBlock[] = [...secs];
  for (const std of STANDARD_SECTION_DEFAULTS) {
    const exists = result.some((s) => s.id === std.id || s.type === std.type);
    if (!exists) {
      result.push(std.createDefault());
    }
  }
  return result;
};

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
    { id: "languages", mode: "raw" },
    { id: "trainings", mode: "raw" },
    { id: "achievements", mode: "ai" },
    { id: "interests", mode: "raw" },
    { id: "clause", mode: "ai" },
  ]);
  const [sections, setSections] = useState<CandidateSectionBlock[]>([]);

  // Raw text states for comma-separated inputs to allow typing commas, trailing spaces, special chars
  // Keyed by category index or project index
  const [skillTagsRaw, setSkillTagsRaw] = useState<Record<number, string>>({});
  const [projectTechsRaw, setProjectTechsRaw] = useState<Record<number, string>>({});
  const [interestTagsRaw, setInterestTagsRaw] = useState<string>("");

  // Reset confirmation modal & AI modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const applyProfileData = (data: CandidateProfileRead) => {
    setProfile(data);

    const fName = data.full_name || "";
    const cInfo = data.contact_info || {};
    const rawDefSecs = data.default_sections || [];
    const rawSecs = data.sections || [];
    const secs = ensureStandardSections(rawSecs);

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
        { id: "languages", mode: "raw" },
        { id: "trainings", mode: "raw" },
        { id: "achievements", mode: "ai" },
        { id: "interests", mode: "raw" },
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
        rawMap[idx] = (cat.skills || []).join(", ");
      });
      setSkillTagsRaw(rawMap);
    } else {
      setSkillTagsRaw({});
    }

    // Initialize raw text for project technologies
    const pSec = secs.find((s) => s.type === "projects") as ProjectsSectionBlock | undefined;
    if (pSec?.items) {
      const rawPMap: Record<number, string> = {};
      pSec.items.forEach((proj, idx) => {
        rawPMap[idx] = (proj.technologies || []).join(", ");
      });
      setProjectTechsRaw(rawPMap);
    } else {
      setProjectTechsRaw({});
    }

    // Initialize raw text for interests
    const iSec = secs.find((s) => s.type === "interests") as InterestsSectionBlock | undefined;
    if (iSec?.items && Array.isArray(iSec.items)) {
      setInterestTagsRaw(iSec.items.join(", "));
    } else {
      setInterestTagsRaw("");
    }

    setInitialFullName(fName);
    setInitialContactInfo(JSON.parse(JSON.stringify(cInfo)));
    setInitialDefaultSections(JSON.parse(JSON.stringify(defSecs)));
    setInitialSections(JSON.parse(JSON.stringify(secs)));
  };

  const handleResetConfirm = async () => {
    try {
      setIsResetting(true);
      const updated = await api.candidate.resetDefault();
      applyProfileData(updated);
      setIsResetModalOpen(false);
      setFeedbackMessage("Przywrócono domyślne dane testowe kandydata (Jan Kowalski).");
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch {
      alert("Wystąpił błąd podczas przywracania danych testowych.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleAISuccess = (updated: CandidateProfileRead) => {
    applyProfileData(updated);
    setFeedbackMessage("Pomyślnie zaktualizowano bazę wiedzy przy użyciu AI!");
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await api.candidate.get();
      applyProfileData(data);
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
        { id: "languages", mode: "raw" },
        { id: "trainings", mode: "raw" },
        { id: "achievements", mode: "ai" },
        { id: "interests", mode: "raw" },
        { id: "clause", mode: "ai" },
      ];
      const rawSecs: CandidateSectionBlock[] = [
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
      const secs = ensureStandardSections(rawSecs);

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
      const ensuredSecs = ensureStandardSections(updated.sections || []);
      setSections(ensuredSecs);
      setInitialSections(JSON.parse(JSON.stringify(ensuredSecs)));

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
    if (["summary", "skills", "experience", "projects", "achievements", "clause"].includes(secId)) {
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

  // Languages Handlers
  const addLanguageItem = () => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "languages") {
          const s = sec as LanguagesSectionBlock;
          return {
            ...s,
            items: [
              ...(s.items || []),
              {
                name: "Nowy język",
                level: "B2",
              },
            ],
          };
        }
        return sec;
      })
    );
  };

  const updateLanguageItem = (
    index: number,
    field: keyof LanguageItem,
    value: string
  ) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "languages") {
          const s = sec as LanguagesSectionBlock;
          const items = [...(s.items || [])];
          items[index] = { ...items[index], [field]: value };
          return { ...s, items };
        }
        return sec;
      })
    );
  };

  const removeLanguageItem = (index: number) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "languages") {
          const s = sec as LanguagesSectionBlock;
          return {
            ...s,
            items: (s.items || []).filter((_, idx) => idx !== index),
          };
        }
        return sec;
      })
    );
  };

  // Trainings Handlers
  const addTrainingItem = () => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "trainings") {
          const s = sec as TrainingsSectionBlock;
          return {
            ...s,
            items: [
              ...(s.items || []),
              {
                name: "Nowe szkolenie",
                organizer: "Organizator",
                date: "2024",
                description: "",
              },
            ],
          };
        }
        return sec;
      })
    );
  };

  const updateTrainingItem = (
    index: number,
    field: keyof TrainingItem,
    value: string
  ) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "trainings") {
          const s = sec as TrainingsSectionBlock;
          const items = [...(s.items || [])];
          items[index] = { ...items[index], [field]: value };
          return { ...s, items };
        }
        return sec;
      })
    );
  };

  const removeTrainingItem = (index: number) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "trainings") {
          const s = sec as TrainingsSectionBlock;
          return {
            ...s,
            items: (s.items || []).filter((_, idx) => idx !== index),
          };
        }
        return sec;
      })
    );
  };

  // Achievements Handlers
  const addAchievementItem = () => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "achievements") {
          const s = sec as AchievementsSectionBlock;
          return {
            ...s,
            items: [
              ...(s.items || []),
              {
                title: "Nowe osiągnięcie",
                issuer: "Instytucja / Konkurs",
                date: "2024",
                description: "",
              },
            ],
          };
        }
        return sec;
      })
    );
  };

  const updateAchievementItem = (
    index: number,
    field: keyof AchievementItem,
    value: string
  ) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "achievements") {
          const s = sec as AchievementsSectionBlock;
          const items = [...(s.items || [])];
          items[index] = { ...items[index], [field]: value };
          return { ...s, items };
        }
        return sec;
      })
    );
  };

  const removeAchievementItem = (index: number) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "achievements") {
          const s = sec as AchievementsSectionBlock;
          return {
            ...s,
            items: (s.items || []).filter((_, idx) => idx !== index),
          };
        }
        return sec;
      })
    );
  };

  // Interests Handlers
  const handleInterestsTagsChange = (rawValue: string) => {
    setInterestTagsRaw(rawValue);
    const items = rawValue
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "interests") {
          const s = sec as InterestsSectionBlock;
          return { ...s, items };
        }
        return sec;
      })
    );
  };

  const updateInterestsContent = (content: string) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "interests") {
          const s = sec as InterestsSectionBlock;
          return { ...s, content };
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
  const summarySection = (sections.find((s) => s.id === "summary" || s.type === "summary") ||
    STANDARD_SECTION_DEFAULTS.find((s) => s.id === "summary")!.createDefault()) as SummarySectionBlock;
  const skillsSection = (sections.find((s) => s.type === "skills" || s.id === "skills") ||
    STANDARD_SECTION_DEFAULTS.find((s) => s.id === "skills")!.createDefault()) as SkillsSectionBlock;
  const expSection = (sections.find((s) => s.type === "experience" || s.id === "experience") ||
    STANDARD_SECTION_DEFAULTS.find((s) => s.id === "experience")!.createDefault()) as ExperienceSectionBlock;
  const projectsSection = (sections.find((s) => s.type === "projects" || s.id === "projects") ||
    STANDARD_SECTION_DEFAULTS.find((s) => s.id === "projects")!.createDefault()) as ProjectsSectionBlock;
  const eduSection = (sections.find((s) => s.type === "education" || s.id === "education") ||
    STANDARD_SECTION_DEFAULTS.find((s) => s.id === "education")!.createDefault()) as EducationSectionBlock;
  const certsSection = (sections.find((s) => s.type === "certificates" || s.id === "certificates") ||
    STANDARD_SECTION_DEFAULTS.find((s) => s.id === "certificates")!.createDefault()) as CertificatesSectionBlock;
  const languagesSection = (sections.find((s) => s.type === "languages" || s.id === "languages") ||
    STANDARD_SECTION_DEFAULTS.find((s) => s.id === "languages")!.createDefault()) as LanguagesSectionBlock;
  const trainingsSection = (sections.find((s) => s.type === "trainings" || s.id === "trainings") ||
    STANDARD_SECTION_DEFAULTS.find((s) => s.id === "trainings")!.createDefault()) as TrainingsSectionBlock;
  const achievementsSection = (sections.find((s) => s.type === "achievements" || s.id === "achievements") ||
    STANDARD_SECTION_DEFAULTS.find((s) => s.id === "achievements")!.createDefault()) as AchievementsSectionBlock;
  const interestsSection = (sections.find((s) => s.type === "interests" || s.id === "interests") ||
    STANDARD_SECTION_DEFAULTS.find((s) => s.id === "interests")!.createDefault()) as InterestsSectionBlock;
  const clauseSection = (sections.find((s) => s.type === "clause" || s.id === "clause") ||
    STANDARD_SECTION_DEFAULTS.find((s) => s.id === "clause")!.createDefault()) as ClauseSectionBlock;
  const customSections = sections.filter(
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

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="destructive"
            onClick={() => setIsResetModalOpen(true)}
            className="text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Przywróć dane testowe
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsAIModalOpen(true)}
            className="text-sm font-medium border-blue-200 dark:border-blue-900/60 bg-blue-50/50 hover:bg-blue-100/70 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 shadow-xs"
          >
            <Sparkles className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
            Uzupełnij za pomocą AI
          </Button>

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

      {feedbackMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 text-xs font-semibold ml-4"
          >
            Zamknij
          </button>
        </div>
      )}

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
                id: "languages",
                label: "Znajomość języków",
                description: "Języki obce i ojczyste wraz z poziomami biegłości",
                icon: Languages,
              },
              {
                id: "trainings",
                label: "Szkolenia",
                description: "Kursy specjalistyczne, warsztaty i programy szkoleniowe",
                icon: BookOpen,
              },
              {
                id: "achievements",
                label: "Osiągnięcia",
                description: "Nagrody, wyróżnienia, hackathony i kluczowe sukcesy",
                icon: Trophy,
              },
              {
                id: "interests",
                label: "Zainteresowania",
                description: "Pasje, hobby i zainteresowania pozazawodowe",
                icon: Heart,
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

      {/* Languages Section */}
      {languagesSection && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <Languages className="h-5 w-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <input
                type="text"
                value={languagesSection.title}
                onChange={(e) => updateSectionTitle(languagesSection.id, e.target.value)}
                className="font-semibold text-slate-900 dark:text-slate-100 text-base bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Languages)</span>
            </div>
          </div>

          <div className="space-y-4">
            {(languagesSection.items || []).map((lang, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    Język #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLanguageItem(idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                    title="Usuń język"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nazwa języka"
                    value={lang.name}
                    onChange={(e) => updateLanguageItem(idx, "name", e.target.value)}
                    placeholder="np. Angielski, Niemiecki, Polski"
                    required
                  />
                  <div>
                    <Input
                      label="Poziom biegłości"
                      value={lang.level}
                      onChange={(e) => updateLanguageItem(idx, "level", e.target.value)}
                      placeholder="np. C1, B2, Średniozaawansowany, Biegły, Ojczysty"
                      required
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {SUGGESTED_LANGUAGE_LEVELS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => updateLanguageItem(idx, "level", preset)}
                          className="px-1.5 py-0.5 text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Actions for Languages */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={addLanguageItem} className="text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Dodaj język
            </Button>
            {renderSectionSaveButton(languagesSection.id, isSectionDirty(languagesSection.id))}
          </div>
        </div>
      )}

      {/* Trainings Section */}
      {trainingsSection && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <input
                type="text"
                value={trainingsSection.title}
                onChange={(e) => updateSectionTitle(trainingsSection.id, e.target.value)}
                className="font-semibold text-slate-900 dark:text-slate-100 text-base bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Trainings)</span>
            </div>
          </div>

          <div className="space-y-4">
            {(trainingsSection.items || []).map((trn, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    Szkolenie #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTrainingItem(idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                    title="Usuń szkolenie"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Nazwa szkolenia / kursu"
                    value={trn.name}
                    onChange={(e) => updateTrainingItem(idx, "name", e.target.value)}
                    placeholder="np. Kubernetes Administrator Bootcamp"
                    required
                  />
                  <Input
                    label="Organizator / Platforma"
                    value={trn.organizer}
                    onChange={(e) => updateTrainingItem(idx, "organizer", e.target.value)}
                    placeholder="np. Udemy, Sages, Coursera"
                  />
                  <DateInput
                    label="Data ukończenia"
                    value={trn.date}
                    onChange={(val) => updateTrainingItem(idx, "date", val)}
                    placeholder="np. 2024, 2024-03 lub data"
                  />
                </div>

                <Textarea
                  label="Opis szkolenia / zdobyte umiejętności (opcjonalnie)"
                  value={trn.description}
                  onChange={(e) => updateTrainingItem(idx, "description", e.target.value)}
                  placeholder="Krótki opis poruszanych zagadnień i zrealizowanych projektów warsztatowych..."
                  rows={2}
                />
              </div>
            ))}
          </div>

          {/* Bottom Actions for Trainings */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={addTrainingItem} className="text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Dodaj szkolenie
            </Button>
            {renderSectionSaveButton(trainingsSection.id, isSectionDirty(trainingsSection.id))}
          </div>
        </div>
      )}

      {/* Achievements Section */}
      {achievementsSection && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
              <input
                type="text"
                value={achievementsSection.title}
                onChange={(e) => updateSectionTitle(achievementsSection.id, e.target.value)}
                className="font-semibold text-slate-900 dark:text-slate-100 text-base bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Achievements)</span>
            </div>
          </div>

          <div className="space-y-4">
            {(achievementsSection.items || []).map((ach, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    Osiągnięcie #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAchievementItem(idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                    title="Usuń osiągnięcie"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Nazwa osiągnięcia / nagrody"
                    value={ach.title}
                    onChange={(e) => updateAchievementItem(idx, "title", e.target.value)}
                    placeholder="np. Laureat 1. miejsca w Hackathonie"
                    required
                  />
                  <Input
                    label="Instytucja przyznająca / Konkurs"
                    value={ach.issuer}
                    onChange={(e) => updateAchievementItem(idx, "issuer", e.target.value)}
                    placeholder="np. Tech Summit Polska, Uczelnia"
                  />
                  <DateInput
                    label="Data / Rok uzyskania"
                    value={ach.date}
                    onChange={(val) => updateAchievementItem(idx, "date", val)}
                    placeholder="np. 2023, 2023-10 lub data"
                  />
                </div>

                <Textarea
                  label="Opis osiągnięcia i uzyskane rezultaty (opcjonalnie)"
                  value={ach.description}
                  onChange={(e) => updateAchievementItem(idx, "description", e.target.value)}
                  placeholder="Krótki opis kontekstu, skali projektu oraz wymiernych efektów..."
                  rows={2}
                />
              </div>
            ))}
          </div>

          {/* Bottom Actions for Achievements */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={addAchievementItem} className="text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Dodaj osiągnięcie
            </Button>
            {renderSectionSaveButton(achievementsSection.id, isSectionDirty(achievementsSection.id))}
          </div>
        </div>
      )}

      {/* Interests Section */}
      {interestsSection && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <Heart className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <input
                type="text"
                value={interestsSection.title}
                onChange={(e) => updateSectionTitle(interestsSection.id, e.target.value)}
                className="font-semibold text-slate-900 dark:text-slate-100 text-base bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">(Interests)</span>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Lista zainteresowań (rozdzielone przecinkami)"
              value={interestTagsRaw}
              onChange={(e) => handleInterestsTagsChange(e.target.value)}
              placeholder="np. Kolarstwo gravelowe, Druk 3D, Automatyka domowa, Żeglarstwo"
            />

            {(interestsSection.items || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {interestsSection.items.map((item, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1 text-xs text-rose-700 dark:text-rose-300 font-medium shadow-xs"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}

            <Textarea
              label="Opis narracyjny pasji (opcjonalnie)"
              value={interestsSection.content || ""}
              onChange={(e) => updateInterestsContent(e.target.value)}
              placeholder="Krótki akapit opisujący Twoje zainteresowania poza pracą zawodową..."
              rows={3}
            />
          </div>

          {/* Bottom Actions for Interests */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            {renderSectionSaveButton(interestsSection.id, isSectionDirty(interestsSection.id))}
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

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => !isResetting && setIsResetModalOpen(false)}
        title="Przywrócenie domyślnych danych testowych"
        description="Czy na pewno chcesz przywrócić domyślne dane testowe? Wszystkie dotychczasowe wpisy w Twojej bazie wiedzy zostaną zastąpione wzorcowymi danymi profilu (Jan Kowalski)."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <p className="leading-relaxed">
              Ta operacja jest nieodwracalna. Wszystkie zmodyfikowane lub dodane przez Ciebie sekcje, doświadczenia i projekty zostaną zastąpione standardowym zestawem demonstracyjnym.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResetModalOpen(false)}
              disabled={isResetting}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleResetConfirm}
              disabled={isResetting}
              isLoading={isResetting}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Tak, przywróć dane
            </Button>
          </div>
        </div>
      </Modal>

      {/* Knowledge Base AI Fill Modal */}
      <KnowledgeBaseAIModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onSuccess={handleAISuccess}
      />
    </div>
  );
};
