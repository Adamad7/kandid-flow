import type { JobOfferRead } from "../types";
import { STATUS_COLORS } from "./constants";

export function formatSalary(
  min?: number | null,
  max?: number | null,
  currency: string | null = "PLN"
): string | null {
  const curr = currency || "PLN";
  if (min !== undefined && min !== null && max !== undefined && max !== null) {
    if (min === max) {
      return `${min.toLocaleString("pl-PL")} ${curr}`;
    }
    return `${min.toLocaleString("pl-PL")} - ${max.toLocaleString("pl-PL")} ${curr}`;
  }
  if (min !== undefined && min !== null) {
    return `od ${min.toLocaleString("pl-PL")} ${curr}`;
  }
  if (max !== undefined && max !== null) {
    return `do ${max.toLocaleString("pl-PL")} ${curr}`;
  }
  return null;
}

export function getSalaryPeriodLabel(period?: string | null): string {
  if (period === "hour") {
    return "Stawka za godzinę (wynagrodzenie godzinowe)";
  }
  if (period === "day") {
    return "Stawka za dzień (wynagrodzenie dzienne)";
  }
  return "Wynagrodzenie miesięczne";
}

export type DeadlineColor = "default" | "yellow" | "orange" | "red";

export const DEADLINE_BADGE_CLASSES: Record<DeadlineColor, string> = {
  red: "bg-rose-50 text-rose-700 border-2 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700",
  orange: "bg-orange-50 text-orange-700 border-2 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700",
  yellow: "bg-yellow-50 text-yellow-800 border-2 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-700",
  default: "bg-slate-100 text-slate-700 border-2 border-slate-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-600",
};

export interface DeadlineInfo {
  text: string;
  detailText: string;
  isUrgent: boolean;
  isExpired: boolean;
  daysRemaining?: number;
  hoursRemaining?: number;
  deadlineColor: DeadlineColor;
}

export function formatDeadline(deadlineStr?: string | null): DeadlineInfo | null {
  if (!deadlineStr) return null;

  let deadlineDate: Date;
  const trimmed = deadlineStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    // End of that day in local timezone
    deadlineDate = new Date(year, month - 1, day, 23, 59, 59, 999);
  } else {
    deadlineDate = new Date(trimmed);
  }

  if (isNaN(deadlineDate.getTime())) return null;

  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();

  const formatShortDate = (d: Date): string => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };

  const formattedDate = formatShortDate(deadlineDate);

  if (diffMs <= 0) {
    return {
      text: `Termin minął (${formattedDate})`,
      detailText: `Termin minął (${formattedDate})`,
      isUrgent: false,
      isExpired: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      deadlineColor: "red",
    };
  }

  const oneHourMs = 1000 * 60 * 60;
  const oneDayMs = oneHourMs * 24;

  // If less than 24 hours remaining: display in hours (or minutes if < 1h)
  if (diffMs < oneDayMs) {
    const hours = Math.floor(diffMs / oneHourMs);
    let timeText: string;

    if (hours < 1) {
      const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      timeText = `Pozostało ${minutes} min`;
    } else if (hours === 1) {
      timeText = "Pozostała 1 godzina";
    } else if (hours >= 2 && hours <= 4) {
      timeText = `Pozostały ${hours} godziny`;
    } else if (hours >= 5 && hours <= 21) {
      timeText = `Pozostało ${hours} godzin`;
    } else {
      timeText = `Pozostały ${hours} godziny`;
    }

    return {
      text: timeText,
      detailText: `${timeText} (termin: ${formattedDate})`,
      isUrgent: true,
      isExpired: false,
      hoursRemaining: hours,
      daysRemaining: 0,
      deadlineColor: "orange",
    };
  }

  // If 24 hours or more remaining: display in days
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDateOnly = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
  const rawDays = Math.round((targetDateOnly.getTime() - nowDateOnly.getTime()) / oneDayMs);
  const days = Math.max(1, rawDays);
  let daysText: string;

  if (days === 1) {
    daysText = "Pozostał 1 dzień";
  } else if (days >= 2 && days <= 4) {
    daysText = `Pozostały ${days} dni`;
  } else {
    daysText = `Pozostało ${days} dni`;
  }

  let deadlineColor: DeadlineColor;
  if (diffMs < 2 * oneDayMs || days < 2) {
    deadlineColor = "orange";
  } else if (days <= 6) {
    deadlineColor = "yellow";
  } else {
    deadlineColor = "default";
  }

  return {
    text: daysText,
    detailText: `${daysText} (termin: ${formattedDate})`,
    isUrgent: deadlineColor === "orange" || deadlineColor === "yellow",
    isExpired: false,
    daysRemaining: days,
    hoursRemaining: Math.floor(diffMs / oneHourMs),
    deadlineColor,
  };
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats relative date when job was created.
 * Under 24h: "Dzisiaj"
 * 24h and more: "{dni}d" (e.g. "1d", "3d", "12d")
 */
export function formatRelativeCreatedDate(
  isoString?: string | null
): { text: string; fullDate: string } | null {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;

  const fullDate = formatDateTime(isoString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  const oneDayMs = 24 * 60 * 60 * 1000;
  if (diffMs < oneDayMs) {
    return { text: "Dzisiaj", fullDate };
  }

  const days = Math.floor(diffMs / oneDayMs);
  return { text: `${days}d`, fullDate };
}

/**
 * Normalizes a job offer URL for safe opening in external portals.
 * E.g. fixes legacy JustJoin.it /oferta-pracy/ path to active /job-offer/.
 */
export function normalizeJobOfferUrl(url?: string | null): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase().includes("justjoin.it")) {
      if (parsed.pathname.startsWith("/oferta-pracy/")) {
        parsed.pathname = parsed.pathname.replace(/^\/oferta-pracy\//, "/job-offer/");
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Formats time elapsed since job application submission according to calendar day boundaries (doby).
 * - On the same calendar day: "Zaaplikowano Xh temu" (or "< 1h temu")
 * - On subsequent calendar days: "Zaaplikowano Xd temu" (where 1d is the very next calendar day)
 */
export function formatAppliedTimeAgo(
  appliedAtStr?: string | null
): { text: string; fullDate: string; hours?: number; days?: number } | null {
  if (!appliedAtStr) return null;
  const d = new Date(appliedAtStr);
  if (isNaN(d.getTime())) return null;

  const fullDate = formatDateTime(appliedAtStr);
  const now = new Date();

  // Check if same calendar day in local time
  const isSameCalendarDay =
    now.getFullYear() === d.getFullYear() &&
    now.getMonth() === d.getMonth() &&
    now.getDate() === d.getDate();

  if (isSameCalendarDay) {
    const diffMs = Math.max(0, now.getTime() - d.getTime());
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 1) {
      return { text: "Zaaplikowano < 1h temu", fullDate, hours: 0, days: 0 };
    }
    return { text: `Zaaplikowano ${hours}h temu`, fullDate, hours, days: 0 };
  }

  // Calculate calendar days difference (doby)
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const appliedDateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const oneDayMs = 24 * 60 * 60 * 1000;
  const rawDays = Math.round((nowDateOnly.getTime() - appliedDateOnly.getTime()) / oneDayMs);
  const days = Math.max(1, rawDays);

  return { text: `Zaaplikowano ${days}d temu`, fullDate, days };
}

/**
 * Formats countdown to next recruitment interview stage according to calendar day boundaries (doby).
 * - On the same calendar day: "Rozmowy za Xh" (or "Rozmowy dzisiaj")
 * - On future calendar days: "Rozmowy za Xd"
 * - In the past / no event: "Rozmowy rekrutacyjne"
 */
export function formatInterviewCountdown(
  interviewAtStr?: string | null
): { text: string; fullDate: string; days?: number; hours?: number } | null {
  if (!interviewAtStr) return null;
  const d = new Date(interviewAtStr);
  if (isNaN(d.getTime())) return null;

  const fullDate = formatDateTime(interviewAtStr);
  const now = new Date();

  const isSameCalendarDay =
    now.getFullYear() === d.getFullYear() &&
    now.getMonth() === d.getMonth() &&
    now.getDate() === d.getDate();

  if (isSameCalendarDay) {
    const diffMs = d.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours > 0) {
      return { text: `Rozmowy za ${hours}h`, fullDate, hours, days: 0 };
    }
    return { text: "Rozmowy dzisiaj", fullDate, hours: 0, days: 0 };
  }

  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const interviewDateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const oneDayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((interviewDateOnly.getTime() - nowDateOnly.getTime()) / oneDayMs);

  if (diffDays > 0) {
    return { text: `Rozmowy za ${diffDays}d`, fullDate, days: diffDays };
  }

  return { text: "Rozmowy rekrutacyjne", fullDate, days: 0 };
}

export interface UnifiedJobStatusInfo {
  label: string;
  detailText?: string;
  badgeClass: string;
  dotClass?: string;
  iconType: "clock" | "send" | "users" | "award" | "x-circle" | "archive" | "inbox" | "refresh" | "alert";
  isUrgent?: boolean;
}

export function getUnifiedJobStatus(
  job: JobOfferRead,
  isReparsing: boolean = false
): UnifiedJobStatusInfo {
  if (isReparsing || job.status === "parsing") {
    return {
      label: "Parsowanie...",
      detailText: "Parsowanie AI oferty pracy jest w toku",
      badgeClass:
        "bg-indigo-50 text-indigo-700 border-2 border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-600",
      dotClass: "bg-indigo-500",
      iconType: "refresh",
    };
  }

  if (job.status === "failed_parsing") {
    return {
      label: "Błąd parsowania",
      detailText: job.error_message || "Wystąpił błąd podczas parsowania oferty",
      badgeClass: cnClass(
        STATUS_COLORS.failed_parsing.bg,
        STATUS_COLORS.failed_parsing.text,
        STATUS_COLORS.failed_parsing.border
      ),
      dotClass: STATUS_COLORS.failed_parsing.dot,
      iconType: "alert",
    };
  }

  if (job.status === "inbox") {
    return {
      label: "Oczekuje na parsowanie",
      detailText: "Oferta znajduje się w kolejce do sparsowania",
      badgeClass: cnClass(
        STATUS_COLORS.inbox.bg,
        STATUS_COLORS.inbox.text,
        STATUS_COLORS.inbox.border
      ),
      dotClass: STATUS_COLORS.inbox.dot,
      iconType: "inbox",
    };
  }

  if (job.status === "ready") {
    const deadlineInfo = formatDeadline(job.application_deadline);
    if (deadlineInfo) {
      const dot =
        deadlineInfo.deadlineColor === "red"
          ? "bg-rose-500"
          : deadlineInfo.deadlineColor === "orange"
          ? "bg-orange-500"
          : deadlineInfo.deadlineColor === "yellow"
          ? "bg-yellow-500"
          : "bg-indigo-600";
      return {
        label: deadlineInfo.text,
        detailText: deadlineInfo.detailText,
        badgeClass: DEADLINE_BADGE_CLASSES[deadlineInfo.deadlineColor],
        dotClass: dot,
        iconType: "clock",
        isUrgent: deadlineInfo.isUrgent,
      };
    }
    return {
      label: "Gotowe do aplikacji",
      detailText: "Oferta sparsowana, brak wyznaczonego terminu końca aplikacji",
      badgeClass: cnClass(
        STATUS_COLORS.ready.bg,
        STATUS_COLORS.ready.text,
        STATUS_COLORS.ready.border
      ),
      dotClass: STATUS_COLORS.ready.dot,
      iconType: "clock",
    };
  }

  if (job.status === "applied") {
    const appliedInfo = formatAppliedTimeAgo(job.applied_at);
    return {
      label: appliedInfo ? appliedInfo.text : "Zaaplikowano",
      detailText: appliedInfo
        ? `Aplikacja wysłana: ${appliedInfo.fullDate}`
        : "Aplikacja została wysłana",
      badgeClass: cnClass(
        STATUS_COLORS.applied.bg,
        STATUS_COLORS.applied.text,
        STATUS_COLORS.applied.border
      ),
      dotClass: STATUS_COLORS.applied.dot,
      iconType: "send",
    };
  }

  if (job.status === "interview") {
    const interviewInfo = formatInterviewCountdown(job.next_interview_at);
    return {
      label: interviewInfo ? interviewInfo.text : "Rozmowy rekrutacyjne",
      detailText: interviewInfo?.fullDate
        ? `Najbliższy etap: ${interviewInfo.fullDate}`
        : "Etap rozmów rekrutacyjnych",
      badgeClass: cnClass(
        STATUS_COLORS.interview.bg,
        STATUS_COLORS.interview.text,
        STATUS_COLORS.interview.border
      ),
      dotClass: STATUS_COLORS.interview.dot,
      iconType: "users",
    };
  }

  if (job.status === "offer") {
    return {
      label: "Oferta pracy",
      detailText: "Otrzymano ofertę pracy",
      badgeClass: cnClass(
        STATUS_COLORS.offer.bg,
        STATUS_COLORS.offer.text,
        STATUS_COLORS.offer.border
      ),
      dotClass: STATUS_COLORS.offer.dot,
      iconType: "award",
    };
  }

  if (job.status === "rejected") {
    return {
      label: "Odrzucone",
      detailText: "Aplikacja odrzucona",
      badgeClass: cnClass(
        STATUS_COLORS.rejected.bg,
        STATUS_COLORS.rejected.text,
        STATUS_COLORS.rejected.border
      ),
      dotClass: STATUS_COLORS.rejected.dot,
      iconType: "x-circle",
    };
  }

  // archived
  return {
    label: "Zarchiwizowane",
    detailText: "Oferta zarchiwizowana",
    badgeClass: cnClass(
      STATUS_COLORS.archived.bg,
      STATUS_COLORS.archived.text,
      STATUS_COLORS.archived.border
    ),
    dotClass: STATUS_COLORS.archived.dot,
    iconType: "archive",
  };
}

function cnClass(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

