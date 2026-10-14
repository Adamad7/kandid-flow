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
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

export const KnowledgeBaseEditor: React.FC = () => {
  const [, setProfile] = useState<CandidateProfileRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
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
      setFullName(data.full_name || "");
      setContactInfo(data.contact_info || {});
      setDefaultSections(data.default_sections || []);
      setSections(data.sections || []);
    } catch (err: unknown) {
      // If 404, we can initialize empty
      setFullName("Jan Kowalski");
      setContactInfo({
        email: "jan.kowalski@example.com",
        phone: "+48 123 456 789",
        location: "Warszawa, Polska",
      });
      setSections([
        {
          id: "summary",
          type: "summary",
          title: "Podsumowanie zawodowe",
          content: "Doświadczony inżynier oprogramowania zorientowany na wyniki.",
        },
        {
          id: "skills",
          type: "skills",
          title: "Umiejętności techniczne",
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
            "Wyrażam zgodę na przetwarzanie moich danych osobowych dla potrzeb niezbędnych do realizacji procesu rekrutacji (zgodnie z ustawą z dnia 10 maja 2018 roku o ochronie danych osobowych (Dz. Ustaw z 2018, poz. 1000) oraz zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. w sprawie ochrony osób fizycznych w związku z przetwarzaniem danych osobowych i w sprawie swobodnego przepływu takich danych oraz uchylenia dyrektywy 95/46/WE (RODO)).",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSaveSuccess(false);

      const payload: CandidateProfileUpdate = {
        full_name: fullName,
        contact_info: contactInfo,
        default_sections: defaultSections,
        sections: sections,
      };

      const updated = await api.candidate.update(payload);
      setProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setErrorMessage("Nie udało się zapisać profilu kandydata.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDefaultSection = (secId: string) => {
    setDefaultSections((prev) =>
      prev.includes(secId) ? prev.filter((id) => id !== secId) : [...prev, secId]
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

  const updateSkillCategoryTitle = (catIndex: number, newTitle: string) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.type === "skills") {
          const s = sec as SkillsSectionBlock;
          const items = [...s.items];
          items[catIndex] = { ...items[catIndex], category: newTitle };
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
                name: "AWS Certified Solutions Architect",
                issuer: "Amazon Web Services",
                issue_date: "2023",
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

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
        Ładowanie bazy wiedzy kandydata...
      </div>
    );
  }

  const summarySection = sections.find(
    (s) => s.type === "summary"
  ) as SummarySectionBlock | undefined;
  const skillsSection = sections.find(
    (s) => s.type === "skills"
  ) as SkillsSectionBlock | undefined;
  const expSection = sections.find(
    (s) => s.type === "experience"
  ) as ExperienceSectionBlock | undefined;
  const projectsSection = sections.find(
    (s) => s.type === "projects"
  ) as ProjectsSectionBlock | undefined;
  const eduSection = sections.find(
    (s) => s.type === "education"
  ) as EducationSectionBlock | undefined;
  const certsSection = sections.find(
    (s) => s.type === "certificates"
  ) as CertificatesSectionBlock | undefined;
  const clauseSection = sections.find(
    (s) => s.type === "clause"
  ) as ClauseSectionBlock | undefined;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Header & Save Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-2 z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Moja baza wiedzy (Profil kandydata)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Główny zasób Twoich doświadczeń, umiejętności i projektów, z którego AI generuje i dopasowuje CV
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
              <Check className="h-4 w-4" />
              Zapisano pomyślnie!
            </span>
          )}
          {errorMessage && (
            <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200">
              <AlertCircle className="h-4 w-4" />
              {errorMessage}
            </span>
          )}
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            className="text-sm font-semibold"
          >
            <Save className="h-4 w-4 mr-2" />
            Zapisz zmiany
          </Button>
        </div>
      </div>

      {/* Basic Contact Info Block */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <User className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900">
            Dane kontaktowe i identyfikacja
          </h3>
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
        <div className="pt-4 border-t border-slate-100">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Domyślnie zaznaczane sekcje przy generowaniu CV:
          </label>
          <div className="flex flex-wrap gap-3">
            {[
              { id: "summary", label: "Podsumowanie" },
              { id: "skills", label: "Umiejętności" },
              { id: "experience", label: "Doświadczenie" },
              { id: "projects", label: "Projekty" },
              { id: "education", label: "Edukacja" },
              { id: "certificates", label: "Certyfikaty" },
              { id: "clause", label: "Klauzula RODO" },
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
      </div>

      {/* Professional Summary Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">
              Podsumowanie zawodowe (Summary)
            </h3>
          </div>
        </div>
        <Textarea
          value={summarySection?.content || ""}
          onChange={(e) => updateSummaryContent(e.target.value)}
          placeholder="Napisz krótki biogram opisujący Twoje kluczowe kompetencje, lata doświadczenia i domenę..."
          rows={4}
        />
      </div>

      {/* Technical Skills Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900">
              Umiejętności techniczne (Skills)
            </h3>
          </div>
          <Button size="sm" variant="outline" onClick={addSkillCategory}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Dodaj kategorię
          </Button>
        </div>

        <div className="space-y-4">
          {skillsSection?.items.map((cat, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={cat.category}
                  onChange={(e) => updateSkillCategoryTitle(idx, e.target.value)}
                  className="font-semibold text-sm text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                />
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
                label="Lista technologii (rozdzielone przecinkami)"
                value={cat.skills.join(", ")}
                onChange={(e) => updateSkillCategoryTags(idx, e.target.value)}
                placeholder="np. Python, FastAPI, Docker, PostgreSQL"
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

      {/* Experience Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">
              Doświadczenie zawodowe (Experience)
            </h3>
          </div>
          <Button size="sm" variant="outline" onClick={addExperienceItem}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Dodaj stanowisko
          </Button>
        </div>

        <div className="space-y-4">
          {expSection?.items.map((exp, idx) => (
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
                  <Input
                    label="Data rozpoczęcia"
                    value={exp.start_date}
                    onChange={(e) =>
                      updateExperienceItem(idx, "start_date", e.target.value)
                    }
                    placeholder="YYYY lub YYYY-MM"
                  />
                  <Input
                    label="Data zakończenia"
                    value={exp.end_date}
                    onChange={(e) =>
                      updateExperienceItem(idx, "end_date", e.target.value)
                    }
                    placeholder="present lub YYYY-MM"
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

      {/* Projects Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-slate-900">
              Projekty i portfolio (Projects)
            </h3>
          </div>
          <Button size="sm" variant="outline" onClick={addProjectItem}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Dodaj projekt
          </Button>
        </div>

        <div className="space-y-4">
          {projectsSection?.items.map((proj, idx) => (
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

      {/* Education Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-slate-900">Edukacja (Education)</h3>
          </div>
          <Button size="sm" variant="outline" onClick={addEducationItem}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Dodaj uczelnię
          </Button>
        </div>

        <div className="space-y-4">
          {eduSection?.items.map((edu, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-800">
                  Pozycja edukacyjna #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeEducationItem(idx)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Uczelnia / Instytucja"
                  value={edu.institution}
                  onChange={(e) =>
                    updateEducationItem(idx, "institution", e.target.value)
                  }
                  required
                />
                <Input
                  label="Uzyskany tytuł / Stopień"
                  value={edu.degree}
                  onChange={(e) =>
                    updateEducationItem(idx, "degree", e.target.value)
                  }
                  placeholder="np. Magister Inżynier, Licencjat"
                  required
                />
                <Input
                  label="Kierunek / Specjalizacja"
                  value={edu.field_of_study}
                  onChange={(e) =>
                    updateEducationItem(idx, "field_of_study", e.target.value)
                  }
                  placeholder="np. Informatyka Stosowana"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Rok rozpoczęcia"
                    value={edu.start_date}
                    onChange={(e) =>
                      updateEducationItem(idx, "start_date", e.target.value)
                    }
                  />
                  <Input
                    label="Rok ukończenia"
                    value={edu.end_date}
                    onChange={(e) =>
                      updateEducationItem(idx, "end_date", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Certificates Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-rose-600" />
            <h3 className="font-semibold text-slate-900">
              Certyfikaty (Certificates)
            </h3>
          </div>
          <Button size="sm" variant="outline" onClick={addCertificateItem}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Dodaj certyfikat
          </Button>
        </div>

        <div className="space-y-4">
          {certsSection?.items.map((cert, idx) => (
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
                <Input
                  label="Data uzyskania"
                  value={cert.issue_date}
                  onChange={(e) =>
                    updateCertificateItem(idx, "issue_date", e.target.value)
                  }
                  placeholder="np. 2023 lub 2023-08"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GDPR Clause Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">
              Klauzula RODO / GDPR
            </h3>
          </div>
        </div>
        <Textarea
          value={clauseSection?.content || ""}
          onChange={(e) => updateClauseContent(e.target.value)}
          rows={3}
          placeholder="Treść klauzuli zgody na przetwarzanie danych osobowych..."
        />
      </div>

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-4">
        <Button
          size="lg"
          variant="primary"
          onClick={handleSave}
          isLoading={isSaving}
          className="px-8 font-semibold shadow-md"
        >
          <Save className="h-5 w-5 mr-2" />
          Zapisz wszystkie zmiany w bazie wiedzy
        </Button>
      </div>
    </div>
  );
};
