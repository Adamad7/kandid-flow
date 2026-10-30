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
  | "offer"
  | "archived";

export type JobLanguageType = "pl" | "en";

export type EventType =
  | "application_submitted"
  | "hr_screening"
  | "technical_interview"
  | "task_deadline"
  | "manager_interview"
  | "offer_received"
  | "other";

export type TailoringModeType = "targeted_summary_keywords" | "full";

export type AutoParseModeType =
  | "auto_ollama_fallback_api"
  | "auto_ollama_only"
  | "auto_api_only"
  | "manual";

export type ApiProviderType = "gemini" | "openai";

export type LLMProviderType = "default" | "local" | "api" | "ollama" | "gemini" | "openai";

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

export interface LanguageItem {
  name: string;
  level: string;
}

export interface TrainingItem {
  name: string;
  organizer: string;
  date: string;
  description: string;
}

export interface AchievementItem {
  title: string;
  issuer: string;
  date: string;
  description: string;
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

export interface LanguagesSectionBlock {
  id: string;
  type: "languages";
  title: string;
  items: LanguageItem[];
}

export interface TrainingsSectionBlock {
  id: string;
  type: "trainings";
  title: string;
  items: TrainingItem[];
}

export interface AchievementsSectionBlock {
  id: string;
  type: "achievements";
  title: string;
  items: AchievementItem[];
}

export interface InterestsSectionBlock {
  id: string;
  type: "interests";
  title: string;
  items: string[];
  content?: string;
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

export interface PageBreakSectionBlock {
  id: string;
  type: "pagebreak";
  title?: string;
}

export type CandidateSectionBlock =
  | SummarySectionBlock
  | SkillsSectionBlock
  | ExperienceSectionBlock
  | ProjectsSectionBlock
  | EducationSectionBlock
  | CertificatesSectionBlock
  | LanguagesSectionBlock
  | TrainingsSectionBlock
  | AchievementsSectionBlock
  | InterestsSectionBlock
  | ClauseSectionBlock
  | PageBreakSectionBlock
  | CustomSectionBlock;

export type SectionGenerationMode = "off" | "raw" | "ai";

export interface SectionDefaultConfig {
  id: string;
  mode: SectionGenerationMode;
}

export interface CandidateProfileBase {
  full_name: string;
  contact_info: CandidateContactInfo;
  sections: CandidateSectionBlock[];
  default_sections: SectionDefaultConfig[];
}

export interface CandidateProfileCreate extends CandidateProfileBase {}

export interface CandidateProfileUpdate {
  full_name?: string | null;
  contact_info?: CandidateContactInfo | null;
  sections?: CandidateSectionBlock[] | null;
  default_sections?: SectionDefaultConfig[] | null;
}

export interface CandidateProfileRead extends CandidateProfileBase {
  id: string; // UUID
  updated_at: string; // ISO 8601
}

export interface CandidateAIFillRequest {
  text: string;
  llm_provider?: LLMProviderType;
  llm_model?: string | null;
  api_key?: string | null;
  enable_thinking?: boolean;
  context_window?: number;
  mode?: "merge" | "replace";
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
  tags: string[];
  location_raw?: string | null;
  application_deadline?: string | null; // YYYY-MM-DD
  applied_at?: string | null; // ISO 8601
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
  tags?: string[];
  location_raw?: string | null;
  application_deadline?: string | null;
  applied_at?: string | null;
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

export interface JobBatchStatusUpdate {
  job_ids: string[];
  status: JobStatusType;
}

export interface JobBatchDelete {
  job_ids: string[];
}

export interface JobBatchResult {
  affected_count: number;
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
  attachments?: JobAttachmentRead[];
}

// ============================================================================
// CV Layout, Versions & Live Preview Schemas
// ============================================================================

export type FontWeight = "regular" | "medium" | "semibold" | "bold";

export interface CVElementStyle {
  font_family?: string | null;
  font_size_pt?: number | null;
  font_weight?: FontWeight | string | null;
}

export interface CVStyling {
  document_font_family: string;
  full_name: CVElementStyle;
  job_title: CVElementStyle;
  contact_info: CVElementStyle;
  section_headings: CVElementStyle;
  section_text: CVElementStyle;
  clause: CVElementStyle;
  heading_line_height_em: number;
  section_text_line_height_em: number;
  margin_x_cm: number;
  margin_y_cm: number;
  section_spacing_em: number;
}

export interface CVLayoutSchema {
  full_name?: string | null;
  job_title?: string | null;
  contact_info?: CandidateContactInfo | null;
  language: string;
  sections: CandidateSectionBlock[];
  styling?: CVStyling;
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

export interface CVSectionConfig {
  id: string;
  mode: SectionGenerationMode;
}

export interface CVGenerateRequest {
  job_offer_id: string; // UUID
  sections?: CVSectionConfig[];
  preset_id?: string | null; // UUID
  tailoring_mode?: TailoringModeType;
  language?: string;
  custom_instructions?: string | null;
  llm_provider?: LLMProviderType;
  llm_model?: string | null;
  api_key?: string | null;
  enable_thinking?: boolean;
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
  llm_provider?: "default" | "local" | "api" | "ollama" | "gemini" | "openai";
  llm_model?: string | null;
  enable_thinking?: boolean;
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

// ============================================================================
// Attachment Schemas
// ============================================================================

export type JobAttachmentCategory =
  | "cv_external"
  | "cover_letter"
  | "recruitment_task"
  | "offer_letter"
  | "other";

export interface JobAttachmentRead {
  id: string; // UUID
  job_offer_id: string; // UUID
  event_id?: string | null;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  category: JobAttachmentCategory;
  notes?: string | null;
  created_at: string; // ISO 8601
  download_url: string;
}

export interface JobAttachmentUpdate {
  category?: JobAttachmentCategory;
  event_id?: string | null;
  notes?: string | null;
}

// ============================================================================
// Analytics & Funnel Schemas
// ============================================================================

export interface RecruitmentFunnelStage {
  stage: string;
  label: string;
  count: number;
  percentage: number;
}

export interface PortalPerformanceMetric {
  portal: string;
  label: string;
  total_offers: number;
  applied_count: number;
  interview_count: number;
  offer_count: number;
  response_rate: number;
}

export interface WorkModelMetric {
  work_model: string;
  label: string;
  count: number;
  percentage: number;
}

export interface StaleApplicationAlert {
  job_id: string;
  role_title: string;
  company_name: string;
  applied_at: string;
  days_waiting: number;
  is_ghosting_risk: boolean;
}

export interface AnalyticsOverviewResponse {
  total_offers: number;
  inbox_count: number;
  ready_count: number;
  applied_count: number;
  interview_count: number;
  offer_count: number;
  rejected_count: number;
  archived_count: number;
  overall_response_rate: number;
  average_response_days: number | null;
  ghosting_alert_count: number;
  funnel: RecruitmentFunnelStage[];
  portals: PortalPerformanceMetric[];
  work_models: WorkModelMetric[];
  stale_applications: StaleApplicationAlert[];
}

// ============================================================================
// AI Follow-up Generation Schemas
// ============================================================================

export type FollowUpTone = "polite_inquiry" | "enthusiastic" | "short_checkin";
export type FollowUpPlatform = "email" | "linkedin";

export interface FollowUpGenerateRequest {
  tone: FollowUpTone;
  platform: FollowUpPlatform;
  custom_notes?: string | null;
}

export interface FollowUpGenerateResponse {
  subject?: string | null;
  content: string;
  generated_at: string; // ISO 8601
}
