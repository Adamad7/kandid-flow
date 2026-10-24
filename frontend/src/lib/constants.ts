import type {
  EventType,
  JobPortalType,
  JobStatusType,
  WorkModelType,
} from "../types";

export const STATUS_LABELS: Record<JobStatusType, string> = {
  inbox: "Do przetworzenia",
  parsing: "Parsowanie AI...",
  failed_parsing: "Błąd parsowania",
  ready: "Gotowe do aplikacji",
  applied: "Zaaplikowano",
  interview: "Rozmowy rekrutacyjne",
  offer: "Oferta pracy",
  rejected: "Odrzucone",
};

export const STATUS_COLORS: Record<
  JobStatusType,
  { bg: string; text: string; border: string }
> = {
  inbox: { bg: "bg-slate-100 dark:bg-slate-800/80", text: "text-slate-700 dark:text-slate-300", border: "border-slate-300 dark:border-slate-700" },
  parsing: { bg: "bg-blue-50 dark:bg-blue-950/60", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300 dark:border-blue-800" },
  failed_parsing: { bg: "bg-rose-50 dark:bg-rose-950/60", text: "text-rose-700 dark:text-rose-300", border: "border-rose-300 dark:border-rose-800" },
  ready: { bg: "bg-indigo-50 dark:bg-indigo-950/60", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-300 dark:border-indigo-800" },
  applied: { bg: "bg-amber-50 dark:bg-amber-950/60", text: "text-amber-700 dark:text-amber-300", border: "border-amber-300 dark:border-amber-800" },
  interview: { bg: "bg-purple-50 dark:bg-purple-950/60", text: "text-purple-700 dark:text-purple-300", border: "border-purple-300 dark:border-purple-800" },
  offer: { bg: "bg-emerald-50 dark:bg-emerald-950/60", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300 dark:border-emerald-800" },
  rejected: { bg: "bg-zinc-100 dark:bg-zinc-800/80", text: "text-zinc-600 dark:text-zinc-400", border: "border-zinc-300 dark:border-zinc-700" },
};

export const WORK_MODEL_LABELS: Record<WorkModelType, string> = {
  remote: "Zdalnie",
  hybrid: "Hybryda",
  onsite: "Biuro",
};

export const PORTAL_LABELS: Record<JobPortalType, string> = {
  justjoin: "Just Join IT",
  pracuj: "Pracuj.pl",
  nofluffjobs: "No Fluff Jobs",
  linkedin: "LinkedIn",
  generic: "Inny portal",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  application_submitted: "Wysłanie aplikacji",
  hr_screening: "HR Screening",
  technical_interview: "Rozmowa techniczna",
  task_deadline: "Zadanie rekrutacyjne",
  manager_interview: "Rozmowa z managerem",
  offer_received: "Otrzymanie oferty",
  other: "Inne spotkanie",
};

export const ATTACHMENT_CATEGORY_LABELS: Record<string, string> = {
  cv_external: "Zewnętrzne CV",
  cover_letter: "List motywacyjny",
  recruitment_task: "Zadanie rekrutacyjne",
  offer_letter: "Oferta pracy (Offer Letter)",
  other: "Inny dokument",
};

export const SECTION_NAMES: Record<string, string> = {
  summary: "Podsumowanie zawodowe",
  skills: "Umiejętności techniczne",
  experience: "Doświadczenie zawodowe",
  projects: "Projekty",
  education: "Edukacja",
  certificates: "Certyfikaty",
  clause: "Klauzula RODO",
};
