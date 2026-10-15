export function formatSalary(
  min?: number | null,
  max?: number | null,
  currency: string | null = "PLN"
): string | null {
  const curr = currency || "PLN";
  if (min !== undefined && min !== null && max !== undefined && max !== null) {
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

export interface DeadlineInfo {
  text: string;
  detailText: string;
  isUrgent: boolean;
  isExpired: boolean;
  daysRemaining?: number;
  hoursRemaining?: number;
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

  return {
    text: daysText,
    detailText: `${daysText} (termin: ${formattedDate})`,
    isUrgent: days <= 3,
    isExpired: false,
    daysRemaining: days,
    hoursRemaining: Math.floor(diffMs / oneHourMs),
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

