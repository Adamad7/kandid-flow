import React, { useEffect, useState } from "react";
import {
  Building,
  MapPin,
  ExternalLink,
  Sparkles,
  Clock,
  CheckCircle,
  FileText,
  AlertCircle,
  Calendar,
  Layers,
  Edit3,
  Cpu,
  X,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  CVVersionRead,
  JobOfferRead,
  JobStatusType,
} from "../../types";
import {
  PORTAL_LABELS,
  WORK_MODEL_LABELS,
} from "../../lib/constants";
import { formatDeadline, formatSalary, normalizeJobOfferUrl } from "../../lib/formatters";
import { RecruitmentTimeline } from "../events/RecruitmentTimeline";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";

interface JobDetailsModalProps {
  job: JobOfferRead | null;
  isOpen: boolean;
  onClose: () => void;
  onGenerateCV: (job: JobOfferRead) => void;
  onOpenCVVersion: (version: CVVersionRead, job: JobOfferRead) => void;
  onJobUpdated: (updatedJob: JobOfferRead) => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  isOpen,
  onClose,
  onGenerateCV,
  onOpenCVVersion,
  onJobUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<
    "structured" | "timeline" | "notes" | "raw" | "versions"
  >("structured");
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isReparsing, setIsReparsing] = useState(false);
  const [cvVersions, setCvVersions] = useState<CVVersionRead[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  useEffect(() => {
    if (job) {
      setNotes(job.notes || "");
      loadCVVersions(job.id);
    }
  }, [job]);

  const loadCVVersions = async (jobId: string) => {
    try {
      setIsLoadingVersions(true);
      const versions = await api.cv.listVersions(jobId);
      setCvVersions(versions);
    } catch {
      // ignore
    } finally {
      setIsLoadingVersions(false);
    }
  };

  if (!job) return null;

  const salaryText = formatSalary(
    job.salary_min,
    job.salary_max,
    job.salary_currency
  );
  const deadlineInfo = formatDeadline(job.application_deadline);
  const structured = job.structured_data;

  const handleSaveNotes = async () => {
    try {
      setIsSavingNotes(true);
      const updated = await api.jobs.update(job.id, { notes });
      onJobUpdated(updated);
      alert("Notatki zostały zapisane.");
    } catch {
      alert("Błąd podczas zapisywania notatek.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleStatusChange = async (newStatus: JobStatusType) => {
    try {
      const updated = await api.jobs.update(job.id, { status: newStatus });
      onJobUpdated(updated);
    } catch {
      alert("Nie udało się zaktualizować statusu oferty.");
    }
  };

  const handleReparse = async (mode: "ai" | "traditional" = "ai") => {
    try {
      setIsReparsing(true);
      const updated = await api.jobs.reparse(job.id, mode);
      onJobUpdated(updated);
      alert(
        mode === "ai"
          ? "Parsowanie AI zakończone pomyślnie."
          : "Tradycyjne parsowanie zakończone pomyślnie."
      );
    } catch {
      alert(
        mode === "ai"
          ? "Błąd podczas ponownego parsowania oferty przez AI."
          : "Błąd podczas tradycyjnego parsowania oferty."
      );
    } finally {
      setIsReparsing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      className="p-0 overflow-hidden w-full max-w-4xl h-[85vh] max-h-[85vh] flex flex-col"
      contentClassName="p-0 flex flex-col flex-1 overflow-hidden h-full"
    >
      {/* Header Container */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 shrink-0 dark:bg-slate-800/80 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Badge variant="secondary">
                {PORTAL_LABELS[job.source_portal] || job.source_portal}
              </Badge>
              {job.work_model && (
                <Badge variant="outline">
                  {WORK_MODEL_LABELS[job.work_model] || job.work_model}
                  {job.work_model_details ? ` (${job.work_model_details})` : ""}
                </Badge>
              )}
              {job.contract_type && (
                <Badge variant="outline">{job.contract_type}</Badge>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {job.role_title || "Nieokreślone stanowisko"}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                <Building className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                {job.company_name || "Nieznana firma"}
              </span>

              {job.locations && job.locations.length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  {job.locations.join(", ")}
                </span>
              )}

              {salaryText && (
                <span className="font-semibold text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                  {salaryText}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status:</label>
                <select
                  value={job.status}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as JobStatusType)
                  }
                  className="text-xs font-medium rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                <option value="inbox">Do przetworzenia</option>
                <option value="ready">Gotowe do aplikacji</option>
                <option value="applied">Zaaplikowano</option>
                <option value="interview">Rozmowy rekrutacyjne</option>
                <option value="offer">Oferta</option>
                <option value="rejected">Odrzucone</option>
              </select>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none"
              aria-label="Zamknij"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

            {job.source_url && (
              <a
                href={normalizeJobOfferUrl(job.source_url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:underline"
              >
                Otwórz ogłoszenie źródłowe
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Failed parsing banner */}
        {job.status === "failed_parsing" && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-800 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-300">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Błąd podczas przetwarzania AI</p>
                <p className="mt-0.5">{job.error_message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReparse("ai")}
                isLoading={isReparsing}
                className="text-xs bg-white border-blue-300 text-blue-700 hover:bg-blue-50 dark:bg-slate-900 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-slate-800"
              >
                <Sparkles className="h-3 w-3 mr-1 text-blue-600 dark:text-blue-400" />
                Parsuj przez AI
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReparse("traditional")}
                isLoading={isReparsing}
                className="text-xs bg-white border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Cpu className="h-3 w-3 mr-1 text-slate-600 dark:text-slate-400" />
                Auto-parsuj tradycyjne
              </Button>
            </div>
          </div>
        )}

        {/* Deadline Banner */}
        {deadlineInfo && (
          <div className="mt-3">
            <Badge
              variant={
                deadlineInfo.isExpired
                  ? "danger"
                  : deadlineInfo.isUrgent
                  ? "warning"
                  : "secondary"
              }
              className="text-xs"
            >
              <Clock className="h-3.5 w-3.5 mr-1" />
              {deadlineInfo.detailText}
            </Badge>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white px-6 shrink-0 dark:border-slate-800 dark:bg-slate-900">
        <nav className="flex space-x-6 text-sm font-medium overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("structured")}
            className={`py-3.5 border-b-2 transition-colors ${
              activeTab === "structured"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Wymagania i AI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "timeline"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Oś czasu rekrutacji
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("versions")}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "versions"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Layers className="h-4 w-4" />
            Wersje CV ({cvVersions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "notes"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Edit3 className="h-4 w-4" />
            Moje notatki
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("raw")}
            className={`py-3.5 border-b-2 transition-colors ${
              activeTab === "raw"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Treść ogłoszenia
          </button>
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="p-6 overflow-y-auto flex-1 dark:bg-slate-900">
        {activeTab === "structured" && (
          <div className="space-y-6">
            {structured ? (
              <>
                {structured.role_summary && (
                  <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-4 dark:bg-blue-950/40 dark:border-blue-900">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-1.5">
                      Podsumowanie roli
                    </h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {structured.role_summary}
                    </p>
                  </div>
                )}

                {/* Tech Stack */}
                {structured.tech_stack && structured.tech_stack.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Stos technologiczny
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {structured.tech_stack.map((tech, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono font-medium text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Must Have */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Wymagania konieczne (Must-have)
                    </h4>
                    {structured.must_have && structured.must_have.length > 0 ? (
                      <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {structured.must_have.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic">Brak wyspecyfikowanych wymagań must-have.</p>
                    )}
                  </div>

                  {/* Nice to Have */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                      Mile widziane (Nice-to-have)
                    </h4>
                    {structured.nice_to_have && structured.nice_to_have.length > 0 ? (
                      <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {structured.nice_to_have.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic">Brak wymagań nice-to-have.</p>
                    )}
                  </div>
                </div>

                {/* Benefits */}
                {structured.benefits && structured.benefits.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Benefity i warunki
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {structured.benefits.map((b, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ta oferta nie posiada jeszcze przetworzonych danych strukturalnych AI.
                </p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleReparse("ai")}
                    isLoading={isReparsing}
                    className="text-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1 text-blue-200" />
                    Parsuj przez AI
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReparse("traditional")}
                    isLoading={isReparsing}
                    className="text-xs"
                  >
                    <Cpu className="h-3.5 w-3.5 mr-1 text-slate-600 dark:text-slate-400" />
                    Auto-parsuj tradycyjne
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "timeline" && (
          <RecruitmentTimeline jobOfferId={job.id} />
        )}

        {activeTab === "versions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Wygenerowane wersje CV
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Wersje dokumentu dostosowane do tej konkretnej oferty pracy
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => onGenerateCV(job)}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Generuj nową wersję
              </Button>
            </div>

            {isLoadingVersions ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                Ładowanie wersji...
              </div>
            ) : cvVersions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 py-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Brak wygenerowanych wersji CV dla tej oferty
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-3">
                  Użyj generatora AI, aby dopasować profil lub szablon bazowy
                </p>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onGenerateCV(job)}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Generuj CV (v1)
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {cvVersions.map((v) => (
                  <div
                    key={v.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 -mx-2 px-2 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          Wersja v{v.version_number}
                        </span>
                        {v.is_active && (
                          <Badge variant="success">Aktywna</Badge>
                        )}
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          Język: {v.language.toUpperCase()}
                        </span>
                      </div>
                      {v.change_summary && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {v.change_summary}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenCVVersion(v, job)}
                      className="text-xs"
                    >
                      Otwórz w edytorze
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-4 flex flex-col h-full">
            <Textarea
              label="Prywatne notatki o ofercie"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zapisz swoje przemyślenia, pytania do rekrutera, proponowaną stawkę lub uwagi ze spotkań..."
              rows={8}
              className="min-h-[180px]"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveNotes}
                isLoading={isSavingNotes}
              >
                Zapisz notatki
              </Button>
            </div>
          </div>
        )}

        {activeTab === "raw" && (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap rounded-lg bg-slate-50 p-4 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
            {job.raw_payload?.description_text || "Brak oryginalnej treści opisu oferty."}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between shrink-0 dark:border-slate-800 dark:bg-slate-800/80">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReparse("ai")}
            isLoading={isReparsing}
            className="text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
            Parsuj przez AI
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReparse("traditional")}
            isLoading={isReparsing}
            className="text-xs"
          >
            <Cpu className="h-3.5 w-3.5 mr-1.5 text-slate-600 dark:text-slate-400" />
            Auto-parsuj tradycyjne
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            Zamknij
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => onGenerateCV(job)}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Generuj CV
          </Button>
        </div>
      </div>
    </Modal>
  );
};
