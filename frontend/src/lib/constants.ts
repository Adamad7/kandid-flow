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
  inbox: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  parsing: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300" },
  failed_parsing: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-300" },
  ready: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-300" },
  applied: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300" },
  interview: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-300" },
  offer: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
  rejected: { bg: "bg-zinc-100", text: "text-zinc-600", border: "border-zinc-300" },
};

export const WORK_MODEL_LABELS: Record<WorkModelType, string> = {
  remote: "Zdalnie",
  hybrid: "Hybryda",
  onsite: "W biurze",
};

export const PORTAL_LABELS: Record<JobPortalType, string> = {
  justjoin: "Just Join IT",
  pracuj: "Pracuj.pl",
  nofluffjobs: "No Fluff Jobs",
  linkedin: "LinkedIn",
  generic: "Inny portal",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  hr_screening: "HR Screening",
  technical_interview: "Rozmowa techniczna",
  task_deadline: "Zadanie rekrutacyjne",
  manager_interview: "Rozmowa z managerem",
  other: "Inne spotkanie",
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
