import type {
  EventType,
  JobPortalType,
  JobStatusType,
  WorkModelType,
} from "../types";

export const STATUS_LABELS: Record<JobStatusType, string> = {
  inbox: "Oczekuje na parsowanie",
  parsing: "Parsowanie AI...",
  failed_parsing: "Błąd parsowania",
  ready: "Gotowe do aplikacji",
  applied: "Zaaplikowano",
  interview: "Rozmowy rekrutacyjne",
  offer: "Oferta pracy",
  rejected: "Odrzucone",
  archived: "Zarchiwizowane",
};

export const STATUS_COLORS: Record<
  JobStatusType,
  { bg: string; text: string; border: string; dot: string }
> = {
  inbox: {
    bg: "bg-slate-100 dark:bg-neutral-800",
    text: "text-slate-700 dark:text-neutral-300",
    border: "border-2 border-slate-300 dark:border-neutral-600",
    dot: "bg-slate-400",
  },
  parsing: {
    bg: "bg-indigo-50 dark:bg-indigo-950/60",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-2 border-indigo-300 dark:border-indigo-700",
    dot: "bg-indigo-500",
  },
  failed_parsing: {
    bg: "bg-rose-50 dark:bg-rose-950/60",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-2 border-rose-400 dark:border-rose-600",
    dot: "bg-rose-500",
  },
  ready: {
    bg: "bg-indigo-50 dark:bg-indigo-950/60",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-2 border-indigo-400 dark:border-indigo-600",
    dot: "bg-indigo-600",
  },
  applied: {
    bg: "bg-sky-50 dark:bg-sky-950/60",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-2 border-sky-300 dark:border-sky-600",
    dot: "bg-sky-500",
  },
  interview: {
    bg: "bg-purple-50 dark:bg-purple-950/60",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-2 border-purple-400 dark:border-purple-600",
    dot: "bg-purple-600",
  },
  offer: {
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-2 border-emerald-400 dark:border-emerald-600",
    dot: "bg-emerald-500",
  },
  rejected: {
    bg: "bg-rose-50 dark:bg-rose-950/60",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-2 border-red-400 dark:border-red-600",
    dot: "bg-rose-500",
  },
  archived: {
    bg: "bg-slate-100 dark:bg-neutral-800",
    text: "text-slate-700 dark:text-neutral-300",
    border: "border-2 border-slate-300 dark:border-neutral-600",
    dot: "bg-slate-400",
  },
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
  theprotocol: "the:protocol",
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
  languages: "Znajomość języków",
  trainings: "Szkolenia",
  achievements: "Osiągnięcia",
  interests: "Zainteresowania",
  clause: "Klauzula RODO",
};

export const SUGGESTED_LANGUAGE_LEVELS: string[] = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "Podstawowy",
  "Średniozaawansowany",
  "Biegły",
  "Ojczysty (Native)",
];

