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
  const [initialDefaultSections, setInitialDefaultSections] = useState<string[]>([]);
  const [initialSections, setInitialSections] = useState<CandidateSectionBlock[]>([]);

  // Current Form State
  const [fullName, setFullName] = useState("");
  const [contactInfo, setContactInfo] = useState<CandidateContactInfo>({});
  const [defaultSections, setDefaultSections] = useState<string[]>([
    "summary",
    "skills",
    "experience",
    "projects",
    "education",
  ]);
  const [sections, setSections] = useState<CandidateSectionBlock[]>([]);

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
      const defSecs = data.default_sections || [];
      const secs = data.sections || [];

      setFullName(fName);
      setContactInfo(cInfo);
      setDefaultSections(defSecs);
      setSections(secs);

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
      const defSecs = ["summary", "skills", "experience", "projects", "education"];
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

  const toggleDefaultSection = (secId: string) => {
    setDefaultSections((prev) =>
      prev.includes(secId) ? prev.filter((id) => id !== secId) : [...prev, secId]
    );
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
          return {
            ...s,
            items: [...s.items, { category: "Nowa kategoria", skills: [] }],
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
          return {
            ...s,
            items: s.items.filter((_, idx) => idx !== catIndex),
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

  const updateSkillCategoryTags = (catIndex: number, tagsStr: string) => {
    const skills = tagsStr
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
              {
                position: "Stanowisko",
                company: "Nazwa Firmy",
                location: "Warszawa",
                start_date: "2023",
                end_date: "present",
                highlights: ["Główny zakres obowiązków i osiągnięcia"],
              },
              ...s.items,
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
          return {
            ...s,
            items: [
              {
                name: "Nazwa Projektu",
                role: "Rola",
                url: "",
                start_date: "2024",
                end_date: "present",
                description: "Opis architektury i celu projektu",
                technologies: ["React", "TypeScript"],
              },
              ...s.items,
            ],
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

  const removeProjectItem = (index: number) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "projects") {
          const s = sec as ProjectsSectionBlock;
          return {
            ...s,
            items: s.items.filter((_, idx) => idx !== index),
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
              {
                institution: "Uczelnia / Szkoła",
                degree: "Inżynier / Magister",
                field_of_study: "Informatyka",
                start_date: "2018",
                end_date: "2022",
              },
              ...s.items,
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
              {
                name: "Nowy certyfikat",
                issuer: "Wydawca",
                issue_date: "2024",
              },
              ...s.items,
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
          <p className="text-sm font-medium text-slate-500">
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
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
            <Check className="h-3.5 w-3.5" />
            Zapisano
          </span>
        )}
        {errorThis && (
          <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-200">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Baza wiedzy o kandydacie
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Główny zasób Twoich doświadczeń, umiejętności i projektów, z którego AI generuje i dopasowuje CV
          </p>
        </div>

        <div className="flex items-center gap-3">
          {successSections["all"] && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
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
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">
              Dane kontaktowe i identyfikacja
            </h3>
          </div>
          {renderSectionSaveButton("contact", isContactDirty)}
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

        {/* Default sections selector */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Domyślnie zaznaczane sekcje przy generowaniu CV:
            </label>
            <div className="flex flex-wrap gap-2.5">
              {[
                { id: "summary", label: "O mnie" },
                { id: "skills", label: "Umiejętności" },
                { id: "experience", label: "Doświadczenie" },
                { id: "projects", label: "Projekty" },
                { id: "education", label: "Edukacja" },
                { id: "certificates", label: "Certyfikaty" },
                { id: "clause", label: "Klauzula RODO" },
                ...customSections.map((cs) => ({ id: cs.id, label: cs.title || "Własna" })),
              ].map((sec) => (
                <label
                  key={sec.id}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    defaultSections.includes(sec.id)
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={defaultSections.includes(sec.id)}
                    onChange={() => toggleDefaultSection(sec.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  {sec.label}
                </label>
              ))}
            </div>
          </div>
          <div className="self-end sm:self-auto">
            {renderSectionSaveButton("defaults", isDefaultsDirty)}
          </div>
        </div>
      </div>

      {/* O mnie (Summary) Section */}
      {summarySection && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <User className="h-5 w-5 text-indigo-600 shrink-0" />
              <input
                type="text"
                value={summarySection.title}
                onChange={(e) => updateSectionTitle("summary", e.target.value)}
                className="font-semibold text-slate-900 text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 font-mono">(Summary)</span>
            </div>
            {renderSectionSaveButton("summary", isSectionDirty("summary"))}
          </div>
          <Textarea
            value={summarySection.content}
            onChange={(e) => updateSummaryContent(e.target.value)}
            placeholder="Napisz krótki biogram opisujący Twoje kluczowe kompetencje, lata doświadczenia i domenę..."
            rows={4}
          />
        </div>
      )}

      {/* Skills Section (Umiejętności twarde i miękkie) */}
      {skillsSection && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <Code className="h-5 w-5 text-emerald-600 shrink-0" />
              <input
                type="text"
                value={skillsSection.title}
                onChange={(e) => updateSectionTitle(skillsSection.id, e.target.value)}
                className="font-semibold text-slate-900 text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 font-mono">(Skills)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={addSkillCategory} className="text-xs h-8">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Dodaj kategorię
              </Button>
              {renderSectionSaveButton(skillsSection.id, isSectionDirty(skillsSection.id))}
            </div>
          </div>

          <div className="space-y-4">
            {skillsSection.items.map((cat, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Edit2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={cat.category}
                      onChange={(e) => updateSkillCategoryTitle(idx, e.target.value)}
                      placeholder="Nazwa kategorii (np. Umiejętności twarde, Miękkie, Chmura...)"
                      className="font-semibold text-sm text-slate-800 bg-transparent border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-full max-w-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSkillCategory(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded"
                    title="Usuń kategorię"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <Input
                  label="Lista umiejętności (rozdzielone przecinkami)"
                  value={cat.skills.join(", ")}
                  onChange={(e) => updateSkillCategoryTags(idx, e.target.value)}
                  placeholder="np. Python, Docker, Komunikatywność, Zarządzanie czasem"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {cat.skills.map((skill, sIdx) => (
                    <span
                      key={sIdx}
                      className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono text-slate-700 shadow-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience Section */}
      {expSection && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <Briefcase className="h-5 w-5 text-blue-600 shrink-0" />
              <input
                type="text"
                value={expSection.title}
                onChange={(e) => updateSectionTitle(expSection.id, e.target.value)}
                className="font-semibold text-slate-900 text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 font-mono">(Experience)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={addExperienceItem} className="text-xs h-8">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Dodaj stanowisko
              </Button>
              {renderSectionSaveButton(expSection.id, isSectionDirty(expSection.id))}
            </div>
          </div>

          <div className="space-y-4">
            {expSection.items.map((exp, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800">
                    Pozycja #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExperienceItem(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1"
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
        </div>
      )}

      {/* Projects Section */}
      {projectsSection && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <Code className="h-5 w-5 text-purple-600 shrink-0" />
              <input
                type="text"
                value={projectsSection.title}
                onChange={(e) => updateSectionTitle(projectsSection.id, e.target.value)}
                className="font-semibold text-slate-900 text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 font-mono">(Projects)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={addProjectItem} className="text-xs h-8">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Dodaj projekt
              </Button>
              {renderSectionSaveButton(projectsSection.id, isSectionDirty(projectsSection.id))}
            </div>
          </div>

          <div className="space-y-4">
            {projectsSection.items.map((proj, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800">
                    Projekt #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeProjectItem(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1"
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
                  value={proj.technologies.join(", ")}
                  onChange={(e) =>
                    updateProjectItem(
                      idx,
                      "technologies",
                      e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="np. React, TypeScript, Vite, Tailwind CSS"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education Section */}
      {eduSection && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <GraduationCap className="h-5 w-5 text-indigo-600 shrink-0" />
              <input
                type="text"
                value={eduSection.title}
                onChange={(e) => updateSectionTitle(eduSection.id, e.target.value)}
                className="font-semibold text-slate-900 text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 font-mono">(Education)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={addEducationItem} className="text-xs h-8">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Dodaj edukację
              </Button>
              {renderSectionSaveButton(eduSection.id, isSectionDirty(eduSection.id))}
            </div>
          </div>

          <div className="space-y-4">
            {eduSection.items.map((edu, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800">
                    Wpis #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEducationItem(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1"
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
        </div>
      )}

      {/* Certificates Section */}
      {certsSection && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <Award className="h-5 w-5 text-rose-600 shrink-0" />
              <input
                type="text"
                value={certsSection.title}
                onChange={(e) => updateSectionTitle(certsSection.id, e.target.value)}
                className="font-semibold text-slate-900 text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 font-mono">(Certificates)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={addCertificateItem} className="text-xs h-8">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Dodaj certyfikat
              </Button>
              {renderSectionSaveButton(certsSection.id, isSectionDirty(certsSection.id))}
            </div>
          </div>

          <div className="space-y-4">
            {certsSection.items.map((cert, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800">
                    Certyfikat #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCertificateItem(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1"
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
        </div>
      )}

      {/* Custom User-Added Sections */}
      {customSections.map((cs) => {
        const isDirty = isSectionDirty(cs.id);
        return (
          <div key={cs.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 flex-1 mr-4">
                <FolderPlus className="h-5 w-5 text-teal-600 shrink-0" />
                <input
                  type="text"
                  value={cs.title}
                  onChange={(e) => updateSectionTitle(cs.id, e.target.value)}
                  placeholder="Wpisz nazwę sekcji (np. Języki obce, Zainteresowania, Publikacje)..."
                  className="font-semibold text-slate-900 text-base bg-transparent border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-full max-w-md"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => removeSection(cs.id)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded transition-colors mr-1"
                  title="Usuń sekcję"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {renderSectionSaveButton(cs.id, isDirty)}
              </div>
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
          </div>
        );
      })}

      {/* Add Custom Section Action */}
      <div className="flex justify-center pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={addCustomSection}
          className="border-dashed border-slate-300 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 py-4 px-6 text-sm font-medium w-full max-w-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Dodaj własną sekcję do bazy wiedzy
        </Button>
      </div>

      {/* GDPR Clause Section */}
      {clauseSection && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-4">
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
              <input
                type="text"
                value={clauseSection.title}
                onChange={(e) => updateSectionTitle(clauseSection.id, e.target.value)}
                className="font-semibold text-slate-900 text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                placeholder="Tytuł sekcji"
              />
              <span className="text-xs text-slate-400 font-mono">(RODO / GDPR)</span>
            </div>
            {renderSectionSaveButton(clauseSection.id, isSectionDirty(clauseSection.id))}
          </div>
          <Textarea
            value={clauseSection.content || ""}
            onChange={(e) => updateClauseContent(e.target.value)}
            rows={3}
            placeholder="Treść klauzuli zgody na przetwarzanie danych osobowych..."
          />
        </div>
      )}

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-4 border-t border-slate-200">
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
