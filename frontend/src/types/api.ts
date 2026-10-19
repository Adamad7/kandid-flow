/**
 * KandidFlow — API TypeScript Interfaces
 * Strictly mirrors backend Pydantic schemas (backend/app/schemas/) 1:1.
 * Strict typing: Zero `any` or untyped `Record<string, unknown>`.
 */

// ============================================================================
// Enums & Literal Types
// ============================================================================

export type SourcePortalType =
  | "justjoin"
  | "pracuj"
  | "nofluffjobs"
  | "linkedin"
  | "generic";

export type JobPortalType = SourcePortalType;

export type WorkModelType = "remote" | "hybrid" | "onsite";

export type JobStatusType =
  | "inbox"
  | "parsing"
  | "failed_parsing"
  | "ready"
  | "applied"
  | "interview"
  | "rejected"
  | "offer";

export type JobLanguageType = "pl" | "en";

export type EventType =
  | "hr_screening"
  | "technical_interview"
  | "task_deadline"
  | "manager_interview"
  | "other";

export type TailoringModeType = "targeted_summary_keywords" | "full";

export type AutoParseModeType =
  | "auto_ollama_fallback_api"
  | "auto_ollama_only"
  | "auto_api_only"
  | "manual";

export type ApiProviderType = "gemini" | "openai";

export type LLMProviderType = "default" | "ollama" | "gemini" | "openai";

// ============================================================================
// Inbox Schemas (Extension <-> Backend)
// ============================================================================

export interface ExtractorDiagnosticMetadata {
  page_title?: string | null;
  extracted_at?: string | null;
  extractor_version?: string | null;
  raw_selectors: string[];
  extra_info?: string | null;
}

export interface ExtractedJobPayload {
  source_url: string;
  source_portal: SourcePortalType;
  title?: string | null;
  company?: string | null;
  location_raw?: string | null;
  locations: string[];
  work_model?: WorkModelType | null;
  work_model_details?: string | null;
  salary_raw?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  description_html?: string | null;
  description_text: string;
  requirements_raw: string[];
  application_deadline?: string | null;
  notes?: string | null;
  custom_metadata?: ExtractorDiagnosticMetadata | null;
}

export interface InboxCheckResponse {
  exists: boolean;
  job_id?: string | null;
  status?: string | null;
  role_title?: string | null;
  company_name?: string | null;
}

export interface InboxResponse {
  id: string; // UUID
  status: string;
  message: string;
  created_at: string; // ISO 8601
}

// ============================================================================
// Candidate Profile & Knowledge Base Schemas
// ============================================================================

export interface CandidateContactInfo {
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  github?: string | null;
  linkedin?: string | null;
  portfolio?: string | null;
}

export interface SkillCategoryItem {
  category: string;
  skills: string[];
}

export interface ExperienceItem {
  position: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string;
  highlights: string[];
}

export interface ProjectItem {
  name: string;
  role: string;
  url: string;
  start_date: string;
  end_date: string;
  description: string;
  technologies: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
}

export interface CertificateItem {
  name: string;
  issuer: string;
  issue_date: string;
}

export interface SummarySectionBlock {
  id: string;
  type: "summary";
  title: string;
  content: string;
}

export interface SkillsSectionBlock {
  id: string;
  type: "skills";
  title: string;
  items: SkillCategoryItem[];
}

export interface ExperienceSectionBlock {
  id: string;
  type: "experience";
  title: string;
  items: ExperienceItem[];
}

export interface ProjectsSectionBlock {
  id: string;
  type: "projects";
  title: string;
  items: ProjectItem[];
}

export interface EducationSectionBlock {
  id: string;
  type: "education";
  title: string;
  items: EducationItem[];
}

export interface CertificatesSectionBlock {
  id: string;
  type: "certificates";
  title: string;
  items: CertificateItem[];
}

export interface ClauseSectionBlock {
  id: string;
  type: "clause";
  title: string;
  content: string;
}

export interface CustomSectionBlock {
  id: string;
  type: "custom" | string;
  title: string;
  content?: string | null;
  items: string[];
}

export type CandidateSectionBlock =
  | SummarySectionBlock
  | SkillsSectionBlock
  | ExperienceSectionBlock
  | ProjectsSectionBlock
  | EducationSectionBlock
  | CertificatesSectionBlock
  | ClauseSectionBlock
  | CustomSectionBlock;

export interface CandidateProfileBase {
  full_name: string;
  contact_info: CandidateContactInfo;
  sections: CandidateSectionBlock[];
  default_sections: string[];
}

export interface CandidateProfileCreate extends CandidateProfileBase {}

export interface CandidateProfileUpdate {
  full_name?: string | null;
  contact_info?: CandidateContactInfo | null;
  sections?: CandidateSectionBlock[] | null;
  default_sections?: string[] | null;
}

export interface CandidateProfileRead extends CandidateProfileBase {
  id: string; // UUID
  updated_at: string; // ISO 8601
}

// ============================================================================
// Job Offer Schemas
// ============================================================================

export interface StructuredJobData {
  role_summary?: string | null;
  must_have: string[];
  nice_to_have: string[];
  tech_stack: string[];
  benefits: string[];
  experience_level?: string | null;
}

export interface JobOfferBase {
  source_url: string;
  source_portal: JobPortalType;
  company_name?: string | null;
  role_title?: string | null;
  status: JobStatusType;
  error_message?: string | null;
  language: JobLanguageType;
  work_model?: WorkModelType | null;
  work_model_details?: string | null;
  locations: string[];
  location_raw?: string | null;
  application_deadline?: string | null; // YYYY-MM-DD
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  contract_type?: string | null;
  notes?: string | null;
}

export interface JobOfferCreate extends JobOfferBase {
  raw_payload: ExtractedJobPayload;
  structured_data?: StructuredJobData | null;
}

export interface JobOfferUpdate {
  source_url?: string;
  source_portal?: JobPortalType;
  company_name?: string | null;
  role_title?: string | null;
  status?: JobStatusType;
  error_message?: string | null;
  language?: JobLanguageType;
  work_model?: WorkModelType | null;
  work_model_details?: string | null;
  locations?: string[];
  location_raw?: string | null;
  application_deadline?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  contract_type?: string | null;
  structured_data?: StructuredJobData | null;
  notes?: string | null;
}

export interface JobOfferRead extends JobOfferBase {
  id: string; // UUID
  raw_payload: ExtractedJobPayload;
  structured_data?: StructuredJobData | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// ============================================================================
// Recruitment Event Schemas
// ============================================================================

export interface RecruitmentEventBase {
  job_offer_id: string; // UUID
  event_type: EventType;
  title: string;
  scheduled_at: string; // ISO 8601
  duration_minutes?: number | null;
  location_or_link?: string | null;
  interviewers?: string | null;
  notes?: string | null;
  is_completed: boolean;
}

export interface RecruitmentEventCreate extends RecruitmentEventBase {}

export interface RecruitmentEventUpdate {
  event_type?: EventType;
  title?: string;
  scheduled_at?: string;
  duration_minutes?: number | null;
  location_or_link?: string | null;
  interviewers?: string | null;
  notes?: string | null;
  is_completed?: boolean;
}

export interface RecruitmentEventRead extends RecruitmentEventBase {
  id: string; // UUID
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// ============================================================================
// CV Layout, Versions & Live Preview Schemas
// ============================================================================

export interface CVLayoutSchema {
  full_name?: string | null;
  contact_info?: CandidateContactInfo | null;
  language: string;
  sections: CandidateSectionBlock[];
}

export interface CVPreviewRequest {
  sections: string[];
  job_offer_id?: string | null; // UUID
  language: string;
  custom_instructions?: string | null;
  layout_schema?: CVLayoutSchema | null;
}

export interface CVPreviewResponse {
  svg_pages: string[];
  svg_content: string;
  version_id?: string | null; // UUID
}

export interface CVGenerateRequest {
  job_offer_id: string; // UUID
  sections?: string[];
  preset_id?: string | null; // UUID
  tailoring_mode?: TailoringModeType;
  language?: string;
  custom_instructions?: string | null;
  llm_provider?: LLMProviderType;
  llm_model?: string | null;
}

export interface CVVersionBase {
  job_offer_id: string; // UUID
  parent_preset_id?: string | null; // UUID
  version_number: number;
  is_active: boolean;
  language: string;
  layout_schema: CVLayoutSchema;
  change_summary?: string | null;
}

export interface CVVersionCreate extends CVVersionBase {}

export interface CVVersionUpdate {
  parent_preset_id?: string | null;
  is_active?: boolean;
  layout_schema?: CVLayoutSchema | null;
  change_summary?: string | null;
}

export interface CVVersionRead extends CVVersionBase {
  id: string; // UUID
  created_at: string; // ISO 8601
}

export interface CVRefineBlockRequest {
  block_id: string;
  instruction: string;
  current_block?: CandidateSectionBlock | null;
}

export interface CVRefineBlockResponse {
  block_id: string;
  refined_block: CandidateSectionBlock;
  version?: CVVersionRead | null;
}

// ============================================================================
// Base CV Presets / Archetypes Schemas
// ============================================================================

export interface BaseCVPresetBase {
  title: string;
  language: string;
  layout_schema: CVLayoutSchema;
}

export interface BaseCVPresetCreate extends BaseCVPresetBase {}

export interface BaseCVPresetUpdate {
  title?: string | null;
  language?: string | null;
  layout_schema?: CVLayoutSchema | null;
}

export interface BaseCVPresetRead extends BaseCVPresetBase {
  id: string; // UUID
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// ============================================================================
// Application Settings Schemas
// ============================================================================

export interface AppSettingsBase {
  auto_parse_mode: AutoParseModeType;
  ollama_base_url: string;
  ollama_model: string;
  api_provider: ApiProviderType;
  api_model: string;
}

export interface AppSettingsUpdate {
  auto_parse_mode?: AutoParseModeType | null;
  ollama_base_url?: string | null;
  ollama_model?: string | null;
  api_provider?: ApiProviderType | null;
  api_model?: string | null;
}

export interface AppSettingsRead extends AppSettingsBase {
  id: number;
  updated_at: string; // ISO 8601
}

// ============================================================================
// Realtime Server-Sent Events (SSE) Schemas
// ============================================================================

export type RealtimeEventType =
  | "job_created"
  | "job_updated"
  | "job_deleted"
  | "recruitment_event_created"
  | "recruitment_event_updated"
  | "recruitment_event_deleted"
  | "ping";

export interface RealtimeEventPayload {
  job_id?: string | null;
  event_id?: string | null;
  role_title?: string | null;
  company_name?: string | null;
  status?: string | null;
  message?: string | null;
}

export interface RealtimeEvent {
  event: RealtimeEventType;
  payload: RealtimeEventPayload;
  timestamp: string;
}
