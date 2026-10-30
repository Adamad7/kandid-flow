import React, { useEffect, useState, useRef } from "react";
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
  SplitSquareVertical,
  Languages,
  BookOpen,
  Trophy,
  Heart,
} from "lucide-react";
import { api } from "../../lib/api";
import { SUGGESTED_LANGUAGE_LEVELS } from "../../lib/constants";
import type {
  CVLayoutSchema,
  CVRefineBlockRequest,
  CVVersionRead,
  CVVersionUpdate,
  CandidateContactInfo,
  ExperienceItem,
  ExperienceSectionBlock,
  JobOfferRead,
  ProjectItem,
  ProjectsSectionBlock,
  SkillsSectionBlock,
  SkillCategoryItem,
  SummarySectionBlock,
  ClauseSectionBlock,
  EducationSectionBlock,
  EducationItem,
  CertificatesSectionBlock,
  CertificateItem,
  LanguageItem,
  LanguagesSectionBlock,
  TrainingItem,
  TrainingsSectionBlock,
  AchievementItem,
  AchievementsSectionBlock,
  InterestsSectionBlock,
  CustomSectionBlock,
  CandidateSectionBlock,
  PageBreakSectionBlock,
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Modal } from "../ui/Modal";
import { DateInput } from "../ui/DateInput";
import { CVLivePreview } from "./CVLivePreview";

interface CommaSeparatedInputProps {
  label?: string;
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

const CommaSeparatedInput: React.FC<CommaSeparatedInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  className,
}) => {
  const [text, setText] = useState(() => (value || []).join(", "));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setText((value || []).join(", "));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);
    const parsed = val
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    onChange(parsed);
  };

  return (
    <Input
      label={label}
      value={text}
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onBlur={() => {
        isFocusedRef.current = false;
        setText((value || []).join(", "));
      }}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
};


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
        }
      : {
          full_name: "Jan Kowalski",
          job_title: job?.role_title ?? null,
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
    setLayoutSchema(
      version.layout_schema
        ? {
            ...version.layout_schema,
            job_title:
              version.layout_schema.job_title ?? job?.role_title ?? null,
          }
        : {
            full_name: "Jan Kowalski",
            job_title: job?.role_title ?? null,
            language: version.language || "pl",
            sections: [],
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
  // Section & Page Break Reordering Handlers
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

  const addPageBreakAt = (index: number) => {
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
  };

  const removePageBreakAt = (index: number) => {
    setLayoutSchema((prev) => {
      const newSections = prev.sections.filter((_, i) => i !== index);
      return { ...prev, sections: newSections };
    });
  };

  const updateContactInfo = (
    field: keyof CandidateContactInfo,
    value: string
  ) => {
    setLayoutSchema((prev) => ({
      ...prev,
      contact_info: {
        ...(prev.contact_info || {}),
        [field]: value || null,
      },
    }));
  };

  // ==========================================
  // Item-level Reordering Handlers (Inside Sections)
  // ==========================================
  const moveExperienceItemUp = (sectionId: string, index: number) => {
    if (index <= 0) return;
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "experience") {
          const exp = sec as ExperienceSectionBlock;
          const items = [...(exp.items || [])];
          const temp = items[index - 1];
          items[index - 1] = items[index];
          items[index] = temp;
          return { ...exp, items };
        }
        return sec;
      }),
    }));
  };

  const moveExperienceItemDown = (sectionId: string, index: number) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "experience") {
          const exp = sec as ExperienceSectionBlock;
          const items = [...(exp.items || [])];
          if (index >= items.length - 1) return sec;
          const temp = items[index + 1];
          items[index + 1] = items[index];
          items[index] = temp;
          return { ...exp, items };
        }
        return sec;
      }),
    }));
  };

  const moveProjectItemUp = (sectionId: string, index: number) => {
    if (index <= 0) return;
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "projects") {
          const pr = sec as ProjectsSectionBlock;
          const items = [...(pr.items || [])];
          const temp = items[index - 1];
          items[index - 1] = items[index];
          items[index] = temp;
          return { ...pr, items };
        }
        return sec;
      }),
    }));
  };

  const moveProjectItemDown = (sectionId: string, index: number) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "projects") {
          const pr = sec as ProjectsSectionBlock;
          const items = [...(pr.items || [])];
          if (index >= items.length - 1) return sec;
          const temp = items[index + 1];
          items[index + 1] = items[index];
          items[index] = temp;
          return { ...pr, items };
        }
        return sec;
      }),
    }));
  };

  const moveEducationItemUp = (sectionId: string, index: number) => {
    if (index <= 0) return;
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "education") {
          const edu = sec as EducationSectionBlock;
          const items = [...(edu.items || [])];
          const temp = items[index - 1];
          items[index - 1] = items[index];
          items[index] = temp;
          return { ...edu, items };
        }
        return sec;
      }),
    }));
  };

  const moveEducationItemDown = (sectionId: string, index: number) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "education") {
          const edu = sec as EducationSectionBlock;
          const items = [...(edu.items || [])];
          if (index >= items.length - 1) return sec;
          const temp = items[index + 1];
          items[index + 1] = items[index];
          items[index] = temp;
          return { ...edu, items };
        }
        return sec;
      }),
    }));
  };

  const moveCertificateItemUp = (sectionId: string, index: number) => {
    if (index <= 0) return;
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "certificates") {
          const cert = sec as CertificatesSectionBlock;
          const items = [...(cert.items || [])];
          const temp = items[index - 1];
          items[index - 1] = items[index];
          items[index] = temp;
          return { ...cert, items };
        }
        return sec;
      }),
    }));
  };

  const moveCertificateItemDown = (sectionId: string, index: number) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "certificates") {
          const cert = sec as CertificatesSectionBlock;
          const items = [...(cert.items || [])];
          if (index >= items.length - 1) return sec;
          const temp = items[index + 1];
          items[index + 1] = items[index];
          items[index] = temp;
          return { ...cert, items };
        }
        return sec;
      }),
    }));
  };

  const moveSkillsCategoryUp = (sectionId: string, index: number) => {
    if (index <= 0) return;
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "skills") {
          const sk = sec as SkillsSectionBlock;
          const items = [...(sk.items || [])];
          const temp = items[index - 1];
          items[index - 1] = items[index];
          items[index] = temp;
          return { ...sk, items };
        }
        return sec;
      }),
    }));
  };

  const moveSkillsCategoryDown = (sectionId: string, index: number) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "skills") {
          const sk = sec as SkillsSectionBlock;
          const items = [...(sk.items || [])];
          if (index >= items.length - 1) return sec;
          const temp = items[index + 1];
          items[index + 1] = items[index];
          items[index] = temp;
          return { ...sk, items };
        }
        return sec;
      }),
    }));
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

  // Skills handlers
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
          const items = [...(skillsBlock.items || [])];
          if (items[catIndex]) {
            items[catIndex] = { ...items[catIndex], skills };
          }
          return { ...skillsBlock, items };
        }
        return sec;
      }),
    }));
  };

  const addSkillsCategory = (sectionId: string) => {
    const newCat: SkillCategoryItem = {
      category: "Nowa kategoria",
      skills: [],
    };
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "skills") {
          const sk = sec as SkillsSectionBlock;
          return { ...sk, items: [...(sk.items || []), newCat] };
        }
        return sec;
      }),
    }));
  };

  const updateSkillsCategoryName = (
    sectionId: string,
    catIndex: number,
    category: string
  ) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "skills") {
          const sk = sec as SkillsSectionBlock;
          const items = [...(sk.items || [])];
          if (items[catIndex]) {
            items[catIndex] = { ...items[catIndex], category };
          }
          return { ...sk, items };
        }
        return sec;
      }),
    }));
  };

  const removeSkillsCategory = (sectionId: string, catIndex: number) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "skills") {
          const sk = sec as SkillsSectionBlock;
          return {
            ...sk,
            items: (sk.items || []).filter((_, i) => i !== catIndex),
          };
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

  // Languages handlers
  const addLanguageItem = (sectionId: string) => {
    const newItem: LanguageItem = {
      name: "",
      level: "",
    };
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "languages") {
          const lSec = sec as LanguagesSectionBlock;
          return { ...lSec, items: [...(lSec.items || []), newItem] };
        }
        return sec;
      }),
    }));
  };

  const removeLanguageItem = (sectionId: string, itemIndex: number) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "languages") {
          const lSec = sec as LanguagesSectionBlock;
          return {
            ...lSec,
            items: (lSec.items || []).filter((_, i) => i !== itemIndex),
          };
        }
        return sec;
      }),
    }));
  };

  const updateLanguageItem = (
    sectionId: string,
    itemIndex: number,
    field: keyof LanguageItem,
    value: string
  ) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "languages") {
          const lSec = sec as LanguagesSectionBlock;
          const items = [...(lSec.items || [])];
          items[itemIndex] = { ...items[itemIndex], [field]: value };
          return { ...lSec, items };
        }
        return sec;
      }),
    }));
  };

  // Trainings handlers
  const addTrainingItem = (sectionId: string) => {
    const newItem: TrainingItem = {
      name: "",
      organizer: "",
      date: "",
      description: "",
    };
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "trainings") {
          const tSec = sec as TrainingsSectionBlock;
          return { ...tSec, items: [...(tSec.items || []), newItem] };
        }
        return sec;
      }),
    }));
  };

  const removeTrainingItem = (sectionId: string, itemIndex: number) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "trainings") {
          const tSec = sec as TrainingsSectionBlock;
          return {
            ...tSec,
            items: (tSec.items || []).filter((_, i) => i !== itemIndex),
          };
        }
        return sec;
      }),
    }));
  };

  const updateTrainingItem = (
    sectionId: string,
    itemIndex: number,
    field: keyof TrainingItem,
    value: string
  ) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "trainings") {
          const tSec = sec as TrainingsSectionBlock;
          const items = [...(tSec.items || [])];
          items[itemIndex] = { ...items[itemIndex], [field]: value };
          return { ...tSec, items };
        }
        return sec;
      }),
    }));
  };

  // Achievements handlers
  const addAchievementItem = (sectionId: string) => {
    const newItem: AchievementItem = {
      title: "",
      issuer: "",
      date: "",
      description: "",
    };
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "achievements") {
          const aSec = sec as AchievementsSectionBlock;
          return { ...aSec, items: [...(aSec.items || []), newItem] };
        }
        return sec;
      }),
    }));
  };

  const removeAchievementItem = (sectionId: string, itemIndex: number) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "achievements") {
          const aSec = sec as AchievementsSectionBlock;
          return {
            ...aSec,
            items: (aSec.items || []).filter((_, i) => i !== itemIndex),
          };
        }
        return sec;
      }),
    }));
  };

  const updateAchievementItem = (
    sectionId: string,
    itemIndex: number,
    field: keyof AchievementItem,
    value: string
  ) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "achievements") {
          const aSec = sec as AchievementsSectionBlock;
          const items = [...(aSec.items || [])];
          items[itemIndex] = { ...items[itemIndex], [field]: value };
          return { ...aSec, items };
        }
        return sec;
      }),
    }));
  };

  // Interests handlers
  const updateInterestsTags = (sectionId: string, tagsRaw: string) => {
    const items = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "interests") {
          const iSec = sec as InterestsSectionBlock;
          return { ...iSec, items };
        }
        return sec;
      }),
    }));
  };

  const updateInterestsContent = (sectionId: string, content: string) => {
    setLayoutSchema((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId && sec.type === "interests") {
          const iSec = sec as InterestsSectionBlock;
          return { ...iSec, content };
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
      case "languages":
        return <Languages className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />;
      case "trainings":
        return <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case "achievements":
        return <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />;
      case "interests":
        return <Heart className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />;
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
        const items = skillsSec.items || [];
        return (
          <div className="space-y-3">
            {items.map((cat, catIdx) => (
              <div
                key={catIdx}
                className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 text-xs dark:bg-slate-800/60 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 max-w-xs sm:max-w-sm">
                    <Input
                      value={cat.category}
                      onChange={(e) =>
                        updateSkillsCategoryName(sec.id, catIdx, e.target.value)
                      }
                      placeholder="Nazwa kategorii (np. Języki i Frameworki)"
                      className="h-7 text-xs font-semibold"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveSkillsCategoryUp(sec.id, catIdx)}
                      disabled={catIdx === 0}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      title="Przesuń kategorię w górę"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSkillsCategoryDown(sec.id, catIdx)}
                      disabled={catIdx === items.length - 1}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      title="Przesuń kategorię w dół"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSkillsCategory(sec.id, catIdx)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer"
                      title="Usuń kategorię"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <CommaSeparatedInput
                  value={cat.skills || []}
                  onChange={(newSkills) =>
                    updateSkillsCategory(sec.id, catIdx, newSkills)
                  }
                  placeholder="np. React, TypeScript, Tailwind"
                />
              </div>
            ))}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addSkillsCategory(sec.id)}
                className="text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                Dodaj kategorię umiejętności
              </Button>
            </div>
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveExperienceItemUp(sec.id, idx)}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                      title="Przesuń stanowisko w górę"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveExperienceItemDown(sec.id, idx)}
                      disabled={idx === (expSec.items || []).length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                      title="Przesuń stanowisko w dół"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExperienceItem(sec.id, idx)}
                      className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                      title="Usuń stanowisko"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveProjectItemUp(sec.id, idx)}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                      title="Przesuń projekt w górę"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveProjectItemDown(sec.id, idx)}
                      disabled={idx === (prSec.items || []).length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                      title="Przesuń projekt w dół"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProjectItem(sec.id, idx)}
                      className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                      title="Usuń projekt"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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

                <CommaSeparatedInput
                  label="Technologie (rozdzielone przecinkami)"
                  value={proj.technologies}
                  onChange={(techs) =>
                    updateProjectItem(sec.id, idx, "technologies", techs)
                  }
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveEducationItemUp(sec.id, idx)}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                      title="Przesuń edukację w górę"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveEducationItemDown(sec.id, idx)}
                      disabled={idx === (eduSec.items || []).length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                      title="Przesuń edukację w dół"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEducationItem(sec.id, idx)}
                      className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                      title="Usuń wpis edukacji"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveCertificateItemUp(sec.id, idx)}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                      title="Przesuń certyfikat w górę"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCertificateItemDown(sec.id, idx)}
                      disabled={idx === (certSec.items || []).length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 rounded"
                      title="Przesuń certyfikat w dół"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCertificateItem(sec.id, idx)}
                      className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                      title="Usuń certyfikat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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

      case "languages": {
        const langSec = sec as LanguagesSectionBlock;
        return (
          <div className="space-y-4">
            {(langSec.items || []).map((lang, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Język #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLanguageItem(sec.id, idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                    title="Usuń język"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Nazwa języka"
                    value={lang.name}
                    onChange={(e) =>
                      updateLanguageItem(sec.id, idx, "name", e.target.value)
                    }
                    placeholder="np. Angielski, Niemiecki"
                    required
                  />
                  <div>
                    <Input
                      label="Poziom biegłości"
                      value={lang.level}
                      onChange={(e) =>
                        updateLanguageItem(sec.id, idx, "level", e.target.value)
                      }
                      placeholder="np. C1, B2, Średniozaawansowany, Biegły"
                      required
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {SUGGESTED_LANGUAGE_LEVELS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => updateLanguageItem(sec.id, idx, "level", preset)}
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

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addLanguageItem(sec.id)}
                className="text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                Dodaj język
              </Button>
            </div>
          </div>
        );
      }

      case "trainings": {
        const trnSec = sec as TrainingsSectionBlock;
        return (
          <div className="space-y-4">
            {(trnSec.items || []).map((trn, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Szkolenie #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTrainingItem(sec.id, idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                    title="Usuń szkolenie"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Nazwa szkolenia"
                    value={trn.name}
                    onChange={(e) =>
                      updateTrainingItem(sec.id, idx, "name", e.target.value)
                    }
                    required
                  />
                  <Input
                    label="Organizator"
                    value={trn.organizer}
                    onChange={(e) =>
                      updateTrainingItem(sec.id, idx, "organizer", e.target.value)
                    }
                  />
                  <DateInput
                    label="Data ukończenia"
                    value={trn.date}
                    onChange={(val) =>
                      updateTrainingItem(sec.id, idx, "date", val)
                    }
                  />
                </div>
                <Textarea
                  label="Opis"
                  value={trn.description}
                  onChange={(e) =>
                    updateTrainingItem(sec.id, idx, "description", e.target.value)
                  }
                  rows={2}
                />
              </div>
            ))}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addTrainingItem(sec.id)}
                className="text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                Dodaj szkolenie
              </Button>
            </div>
          </div>
        );
      }

      case "achievements": {
        const achSec = sec as AchievementsSectionBlock;
        return (
          <div className="space-y-4">
            {(achSec.items || []).map((ach, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Osiągnięcie #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAchievementItem(sec.id, idx)}
                    className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                    title="Usuń osiągnięcie"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Tytuł osiągnięcia"
                    value={ach.title}
                    onChange={(e) =>
                      updateAchievementItem(sec.id, idx, "title", e.target.value)
                    }
                    required
                  />
                  <Input
                    label="Instytucja / Konkurs"
                    value={ach.issuer}
                    onChange={(e) =>
                      updateAchievementItem(sec.id, idx, "issuer", e.target.value)
                    }
                  />
                  <DateInput
                    label="Data"
                    value={ach.date}
                    onChange={(val) =>
                      updateAchievementItem(sec.id, idx, "date", val)
                    }
                  />
                </div>
                <Textarea
                  label="Opis"
                  value={ach.description}
                  onChange={(e) =>
                    updateAchievementItem(sec.id, idx, "description", e.target.value)
                  }
                  rows={2}
                />
              </div>
            ))}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addAchievementItem(sec.id)}
                className="text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                Dodaj osiągnięcie
              </Button>
            </div>
          </div>
        );
      }

      case "interests": {
        const intSec = sec as InterestsSectionBlock;
        return (
          <div className="space-y-3">
            <Input
              label="Zainteresowania (rozdzielone przecinkami)"
              value={(intSec.items || []).join(", ")}
              onChange={(e) => updateInterestsTags(sec.id, e.target.value)}
              placeholder="np. Kolarstwo, Druk 3D, Żeglarstwo"
            />
            <Textarea
              label="Opis narracyjny (opcjonalnie)"
              value={intSec.content || ""}
              onChange={(e) => updateInterestsContent(sec.id, e.target.value)}
              rows={2}
              placeholder="Krótki opis pasji..."
            />
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
          {/* Candidate Full Name and Contact Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Nagłówek dokumentu i dane kontaktowe
              </h3>
            </div>
            <Input
              label="Imię i nazwisko kandydata"
              value={layoutSchema.full_name || ""}
              onChange={(e) =>
                setLayoutSchema({ ...layoutSchema, full_name: e.target.value })
              }
            />

            <div className="space-y-1.5">
              <Input
                label="Stanowisko docelowe / Nagłówek zawodowy"
                value={layoutSchema.job_title || ""}
                onChange={(e) =>
                  setLayoutSchema({
                    ...layoutSchema,
                    job_title: e.target.value,
                  })
                }
                placeholder='np. "Flutter Developer", "Junior DevOps Engineer"'
              />
              {job?.role_title && layoutSchema.job_title !== job.role_title && (
                <div className="flex items-center pt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setLayoutSchema({
                        ...layoutSchema,
                        job_title: job.role_title,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-md border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>
                      Użyj z oferty:{" "}
                      <strong className="font-semibold">{job.role_title}</strong>
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Adres e-mail"
                type="email"
                value={layoutSchema.contact_info?.email || ""}
                onChange={(e) => updateContactInfo("email", e.target.value)}
                placeholder="np. jan.kowalski@example.com"
              />
              <Input
                label="Numer telefonu"
                value={layoutSchema.contact_info?.phone || ""}
                onChange={(e) => updateContactInfo("phone", e.target.value)}
                placeholder="np. +48 500 600 700"
              />
              <Input
                label="Lokalizacja"
                value={layoutSchema.contact_info?.location || ""}
                onChange={(e) => updateContactInfo("location", e.target.value)}
                placeholder="np. Warszawa, Polska"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Profil LinkedIn"
                value={layoutSchema.contact_info?.linkedin || ""}
                onChange={(e) => updateContactInfo("linkedin", e.target.value)}
                placeholder="np. linkedin.com/in/jankowalski"
              />
              <Input
                label="Profil GitHub"
                value={layoutSchema.contact_info?.github || ""}
                onChange={(e) => updateContactInfo("github", e.target.value)}
                placeholder="np. github.com/jankowalski"
              />
              <Input
                label="Portfolio / WWW"
                value={layoutSchema.contact_info?.portfolio || ""}
                onChange={(e) => updateContactInfo("portfolio", e.target.value)}
                placeholder="np. jankowalski.dev"
              />
            </div>
          </div>

          {/* Dynamic Sections Rendered in layoutSchema.sections Order */}
          {layoutSchema.sections.map((sec, index) => {
            if (sec.type === "pagebreak") {
              return (
                <div
                  key={sec.id || index}
                  className="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 flex items-center justify-between gap-3 shadow-xs transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <SplitSquareVertical className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Separator strony (wymuszenie nowej strony w Typst / PDF)</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removePageBreakAt(index)}
                    className="text-xs h-7 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    title="Usuń separator stron"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Usuń separator
                  </Button>
                </div>
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
            const nextSec = hasNextSection ? layoutSchema.sections[index + 1] : null;
            const canShowAddPageBreak =
              hasNextSection &&
              sec.type !== "pagebreak" &&
              nextSec?.type !== "pagebreak";

            return (
              <React.Fragment key={sec.id || index}>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900 transition-shadow">
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

                {canShowAddPageBreak && (
                  <div className="flex items-center justify-center py-0.5 group">
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1 transition-colors group-hover:bg-blue-300 dark:group-hover:bg-blue-700" />
                    <button
                      type="button"
                      onClick={() => addPageBreakAt(index + 1)}
                      className="mx-3 inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 rounded-full shadow-2xs transition-all hover:scale-105"
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
