/**
 * KandidFlow — Typed REST API Client
 * Connects Web UI with FastAPI backend (/api/v1/)
 */

import type {
  AppSettingsRead,
  AppSettingsUpdate,
  BaseCVPresetCreate,
  BaseCVPresetRead,
  BaseCVPresetUpdate,
  CandidateProfileRead,
  CandidateProfileUpdate,
  CVGenerateRequest,
  CVPreviewRequest,
  CVPreviewResponse,
  CVRefineBlockRequest,
  CVRefineBlockResponse,
  CVVersionRead,
  CVVersionUpdate,
  EventType,
  ExtractedJobPayload,
  InboxCheckResponse,
  InboxResponse,
  JobLanguageType,
  JobOfferRead,
  JobOfferUpdate,
  JobPortalType,
  JobStatusType,
  RecruitmentEventCreate,
  RecruitmentEventRead,
  RecruitmentEventUpdate,
  WorkModelType,
} from "../types";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(`API Error ${status}: ${detail}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson && typeof errJson.detail === "string") {
        errorDetail = errJson.detail;
      } else if (errJson && Array.isArray(errJson.detail)) {
        errorDetail = errJson.detail.map((d: { msg?: string }) => d.msg || "").join("; ");
      }
    } catch {
      // response is not json
    }
    throw new ApiError(response.status, errorDetail);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  jobs: {
    list: (params?: {
      status?: JobStatusType;
      work_model?: WorkModelType;
      source_portal?: JobPortalType;
      language?: JobLanguageType;
      salary_min?: number;
      salary_max?: number;
      search?: string;
      limit?: number;
      offset?: number;
    }): Promise<JobOfferRead[]> => {
      const query = new URLSearchParams();
      if (params?.status) query.set("status", params.status);
      if (params?.work_model) query.set("work_model", params.work_model);
      if (params?.source_portal) query.set("source_portal", params.source_portal);
      if (params?.language) query.set("language", params.language);
      if (params?.salary_min !== undefined) query.set("salary_min", String(params.salary_min));
      if (params?.salary_max !== undefined) query.set("salary_max", String(params.salary_max));
      if (params?.search) query.set("search", params.search);
      if (params?.limit !== undefined) query.set("limit", String(params.limit));
      if (params?.offset !== undefined) query.set("offset", String(params.offset));

      const qs = query.toString();
      return request<JobOfferRead[]>(`/api/v1/jobs${qs ? `?${qs}` : ""}`);
    },

    get: (jobId: string): Promise<JobOfferRead> => {
      return request<JobOfferRead>(`/api/v1/jobs/${jobId}`);
    },

    update: (jobId: string, data: JobOfferUpdate): Promise<JobOfferRead> => {
      return request<JobOfferRead>(`/api/v1/jobs/${jobId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    reparse: (
      jobId: string,
      mode: "ai" | "traditional" = "ai"
    ): Promise<JobOfferRead> => {
      return request<JobOfferRead>(`/api/v1/jobs/${jobId}/reparse?mode=${mode}`, {
        method: "POST",
      });
    },

    delete: (jobId: string): Promise<void> => {
      return request<void>(`/api/v1/jobs/${jobId}`, {
        method: "DELETE",
      });
    },
  },

  events: {
    list: (params?: {
      job_offer_id?: string;
      event_type?: EventType;
      is_completed?: boolean;
      upcoming_only?: boolean;
      limit?: number;
      offset?: number;
    }): Promise<RecruitmentEventRead[]> => {
      const query = new URLSearchParams();
      if (params?.job_offer_id) query.set("job_offer_id", params.job_offer_id);
      if (params?.event_type) query.set("event_type", params.event_type);
      if (params?.is_completed !== undefined) query.set("is_completed", String(params.is_completed));
      if (params?.upcoming_only !== undefined) query.set("upcoming_only", String(params.upcoming_only));
      if (params?.limit !== undefined) query.set("limit", String(params.limit));
      if (params?.offset !== undefined) query.set("offset", String(params.offset));

      const qs = query.toString();
      return request<RecruitmentEventRead[]>(`/api/v1/events${qs ? `?${qs}` : ""}`);
    },

    create: (data: RecruitmentEventCreate): Promise<RecruitmentEventRead> => {
      return request<RecruitmentEventRead>("/api/v1/events", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    get: (eventId: string): Promise<RecruitmentEventRead> => {
      return request<RecruitmentEventRead>(`/api/v1/events/${eventId}`);
    },

    update: (eventId: string, data: RecruitmentEventUpdate): Promise<RecruitmentEventRead> => {
      return request<RecruitmentEventRead>(`/api/v1/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    delete: (eventId: string): Promise<void> => {
      return request<void>(`/api/v1/events/${eventId}`, {
        method: "DELETE",
      });
    },
  },

  candidate: {
    get: (): Promise<CandidateProfileRead> => {
      return request<CandidateProfileRead>("/api/v1/candidate");
    },

    update: (data: CandidateProfileUpdate): Promise<CandidateProfileRead> => {
      return request<CandidateProfileRead>("/api/v1/candidate", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
  },

  presets: {
    list: (language?: string): Promise<BaseCVPresetRead[]> => {
      const qs = language ? `?language=${encodeURIComponent(language)}` : "";
      return request<BaseCVPresetRead[]>(`/api/v1/presets${qs}`);
    },

    create: (data: BaseCVPresetCreate): Promise<BaseCVPresetRead> => {
      return request<BaseCVPresetRead>("/api/v1/presets", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    get: (presetId: string): Promise<BaseCVPresetRead> => {
      return request<BaseCVPresetRead>(`/api/v1/presets/${presetId}`);
    },

    update: (presetId: string, data: BaseCVPresetUpdate): Promise<BaseCVPresetRead> => {
      return request<BaseCVPresetRead>(`/api/v1/presets/${presetId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    delete: (presetId: string): Promise<void> => {
      return request<void>(`/api/v1/presets/${presetId}`, {
        method: "DELETE",
      });
    },

    preview: (presetId: string): Promise<CVPreviewResponse> => {
      return request<CVPreviewResponse>(`/api/v1/presets/${presetId}/preview`, {
        method: "POST",
      });
    },
  },

  cv: {
    preview: (data: CVPreviewRequest): Promise<CVPreviewResponse> => {
      return request<CVPreviewResponse>("/api/v1/cv/preview", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    exportPdf: async (data: CVPreviewRequest): Promise<Blob> => {
      const url = `${API_BASE}/api/v1/cv/export-pdf`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new ApiError(response.status, "Błąd podczas generowania pliku PDF");
      }
      return response.blob();
    },

    generate: (data: CVGenerateRequest): Promise<CVVersionRead> => {
      return request<CVVersionRead>("/api/v1/cv/generate", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    listVersions: (jobOfferId: string): Promise<CVVersionRead[]> => {
      return request<CVVersionRead[]>(`/api/v1/cv/versions/${jobOfferId}`);
    },

    getVersion: (cvVersionId: string): Promise<CVVersionRead> => {
      return request<CVVersionRead>(`/api/v1/cv/${cvVersionId}`);
    },

    updateVersion: (cvVersionId: string, data: CVVersionUpdate): Promise<CVVersionRead> => {
      return request<CVVersionRead>(`/api/v1/cv/${cvVersionId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    refineBlock: (
      cvVersionId: string,
      data: CVRefineBlockRequest
    ): Promise<CVRefineBlockResponse> => {
      return request<CVRefineBlockResponse>(`/api/v1/cv/${cvVersionId}/refine-block`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  settings: {
    get: (): Promise<AppSettingsRead> => {
      return request<AppSettingsRead>("/api/v1/settings");
    },

    update: (data: AppSettingsUpdate): Promise<AppSettingsRead> => {
      return request<AppSettingsRead>("/api/v1/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
  },

  inbox: {
    check: (url: string): Promise<InboxCheckResponse> => {
      return request<InboxCheckResponse>(
        `/api/v1/inbox/check?url=${encodeURIComponent(url)}`
      );
    },

    submit: (data: ExtractedJobPayload): Promise<InboxResponse> => {
      return request<InboxResponse>("/api/v1/inbox", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },
};

export { ApiError };
