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

export function formatDeadline(deadlineStr?: string | null): {
  text: string;
  isUrgent: boolean;
  isExpired: boolean;
} | null {
  if (!deadlineStr) return null;
  const deadline = new Date(deadlineStr);
  if (isNaN(deadline.getTime())) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `Termin minął (${deadlineStr})`,
      isUrgent: false,
      isExpired: true,
    };
  }
  if (diffDays === 0) {
    return {
      text: "Termin upływa dzisiaj!",
      isUrgent: true,
      isExpired: false,
    };
  }
  if (diffDays === 1) {
    return {
      text: "Termin upływa jutro",
      isUrgent: true,
      isExpired: false,
    };
  }
  if (diffDays <= 3) {
    return {
      text: `Zostały ${diffDays} dni`,
      isUrgent: true,
      isExpired: false,
    };
  }
  return {
    text: `Do ${deadlineStr} (${diffDays} dni)`,
    isUrgent: false,
    isExpired: false,
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

