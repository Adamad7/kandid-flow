import React, { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  User,
  Layers,
  Settings,
  Briefcase,
  List,
  BarChart3,
  Archive,
  Palette,
} from "lucide-react";
import type {
  CVVersionRead,
  JobOfferRead,
} from "./types";
import { KanbanBoard } from "./components/kanban/KanbanBoard";
import { UpcomingEventsWidget } from "./components/events/UpcomingEventsWidget";
import { JobDetailsModal } from "./components/kanban/JobDetailsModal";
import { CVGeneratorModal } from "./components/cv-generator/CVGeneratorModal";
import { CVEditor } from "./components/cv-editor/CVEditor";
import { KnowledgeBaseEditor } from "./components/profile/KnowledgeBaseEditor";
import { PresetsManager } from "./components/presets/PresetsManager";
import { SettingsView } from "./components/settings/SettingsView";
import { JobListView } from "./components/jobs/JobListView";
import { AnalyticsDashboard } from "./components/analytics/AnalyticsDashboard";
import { TestViewsContainer } from "./components/test-views/TestViewsContainer";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { api } from "./lib/api";
import { useRealtime } from "./hooks/useRealtime";

type ActiveTab = "list" | "kanban" | "archive" | "analytics" | "profile" | "presets" | "settings" | "test-menu";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() =>
    typeof window !== "undefined" && window.location.pathname === "/test-menu"
      ? "test-menu"
      : "list"
  );

  // Selection & Modal States
  const [selectedJob, setSelectedJob] = useState<JobOfferRead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // CV Generator Modal
  const [jobForCVGeneration, setJobForCVGeneration] =
    useState<JobOfferRead | null>(null);
  const [isCVGeneratorOpen, setIsCVGeneratorOpen] = useState(false);

  // Active Split-View CV Editor
  const [editingCVVersion, setEditingCVVersion] =
    useState<CVVersionRead | null>(null);
  const [editingCVJob, setEditingCVJob] = useState<JobOfferRead | null>(null);

  // Refresh trigger counter
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Keep a ref to the selected job for realtime event handlers
  const selectedJobRef = useRef<JobOfferRead | null>(null);
  useEffect(() => {
    selectedJobRef.current = selectedJob;
  }, [selectedJob]);

  // Real-time SSE synchronization
  const { status: realtimeStatus } = useRealtime({
    onEvent: (event) => {
      if (event.event === "ping") return;

      if (
        event.event === "job_created" ||
        event.event === "job_updated" ||
        event.event === "job_deleted"
      ) {
        setRefreshTrigger((prev) => prev + 1);

        const currentJob = selectedJobRef.current;
        if (currentJob && event.payload.job_id === currentJob.id) {
          if (event.event === "job_deleted") {
            setIsDetailsOpen(false);
            setSelectedJob(null);
          } else if (event.event === "job_updated") {
            api.jobs
              .get(currentJob.id)
              .then((updated) => {
                setSelectedJob(updated);
              })
              .catch(() => {
                // Job might have been deleted or unavailable
              });
          }
        }
      }

      if (
        event.event === "recruitment_event_created" ||
        event.event === "recruitment_event_updated" ||
        event.event === "recruitment_event_deleted"
      ) {
        setRefreshTrigger((prev) => prev + 1);
      }
    },
  });

  const handleSelectJob = (job: JobOfferRead) => {
    setSelectedJob(job);
    setIsDetailsOpen(true);
  };

  const handleSelectJobById = async (jobId: string) => {
    try {
      const job = await api.jobs.get(jobId);
      setSelectedJob(job);
      setIsDetailsOpen(true);
    } catch {
      alert("Nie udało się pobrać szczegółów oferty.");
    }
  };

  const handleOpenCVGenerator = (job: JobOfferRead) => {
    setJobForCVGeneration(job);
    setIsCVGeneratorOpen(true);
  };

  const handleCVGenerationSuccess = (
    version: CVVersionRead,
    job: JobOfferRead
  ) => {
    setIsCVGeneratorOpen(false);
    setIsDetailsOpen(false);
    // Switch to Split-View CV Editor!
    setEditingCVVersion(version);
    setEditingCVJob(job);
  };

  const handleOpenCVVersion = (
    version: CVVersionRead,
    job: JobOfferRead
  ) => {
    setIsDetailsOpen(false);
    setEditingCVVersion(version);
    setEditingCVJob(job);
  };

  const handleJobUpdated = (updatedJob: JobOfferRead) => {
    setSelectedJob(updatedJob);
    setRefreshTrigger((prev) => prev + 1);
  };

  // If currently in Split-View CV Editor:
  if (editingCVVersion && editingCVJob) {
    return (
      <div className="h-screen bg-slate-50 dark:bg-neutral-950 flex flex-col transition-colors overflow-hidden">
        <CVEditor
          initialVersion={editingCVVersion}
          job={editingCVJob}
          onBack={() => {
            setEditingCVVersion(null);
            setEditingCVJob(null);
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex flex-col font-sans text-slate-900 dark:text-neutral-100 transition-colors">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md px-6 py-3.5 shadow-none">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-none">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Kandid<span className="text-indigo-600 dark:text-indigo-400">Flow</span>
                </span>
                <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70">
                  v1.1
                </span>

                {/* Real-time SSE Status Badge */}
                {realtimeStatus === "connected" && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-2 border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-600 shadow-none"
                    title="Połączono ze strumieniem zdarzeń w czasie rzeczywistym"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Na żywo
                  </span>
                )}
                {realtimeStatus === "connecting" && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border-2 border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-600 shadow-none"
                    title="Nawiązywanie połączenia na żywo..."
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Łączenie...
                  </span>
                )}
                {realtimeStatus === "disconnected" && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border-2 border-slate-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 shadow-none"
                    title="Brak połączenia na żywo (aktywne odpytywanie rezerwowe)"
                  >
                    <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-neutral-500" />
                    Offline
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium hidden sm:block">
                Automatyzacja rekrutacji IT & Wektorowy generator CV
              </p>
            </div>
          </div>

          {/* Right Header: Navigation Tabs + Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="flex items-center gap-1 sm:gap-2">

              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "list"
                    ? "bg-indigo-600 text-white shadow-none"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Lista ofert</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("kanban")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "kanban"
                    ? "bg-indigo-600 text-white shadow-none"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Tablica ofert</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("archive")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "archive"
                    ? "bg-indigo-600 text-white shadow-none"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                }`}
              >
                <Archive className="h-4 w-4" />
                <span className="hidden sm:inline">Archiwum</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("analytics")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "analytics"
                    ? "bg-indigo-600 text-white shadow-none"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Statystyki</span>
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-indigo-600 text-white shadow-none"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                }`}
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Moja baza wiedzy</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("presets")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "presets"
                    ? "bg-indigo-600 text-white shadow-none"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                }`}
              >
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Szablony bazowe</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-indigo-600 text-white shadow-none"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                }`}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Ustawienia</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("test-menu")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "test-menu"
                    ? "bg-indigo-600 text-white shadow-none"
                    : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-neutral-800"
                }`}
                title="Sandbox testowania stylów UI (/test-menu)"
              >
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Testy UI</span>
              </button>
            </nav>

            {/* Dark Mode Toggle on the right side */}
            <div className="pl-2 border-l border-slate-200/80 dark:border-neutral-800 flex items-center shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <main className="flex-1 max-w-[1800px] mx-auto w-full px-4 sm:px-6 py-6">
        {/* Upcoming Interviews / Recruitment Events Widget (shared between Kanban and List views) */}
        <div
          className={
            activeTab === "kanban" || activeTab === "list" ? "mb-6" : "hidden"
          }
        >
          <UpcomingEventsWidget
            onSelectJob={handleSelectJobById}
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* Tab Views */}
        <div className={activeTab === "kanban" ? "block" : "hidden"}>
          <KanbanBoard
            onSelectJob={handleSelectJob}
            onGenerateCV={handleOpenCVGenerator}
            refreshTrigger={refreshTrigger}
            onSwitchView={(v) => setActiveTab(v)}
          />
        </div>

        <div className={activeTab === "list" ? "block" : "hidden"}>
          <JobListView
            isArchive={false}
            onSelectJob={handleSelectJob}
            onGenerateCV={handleOpenCVGenerator}
            refreshTrigger={refreshTrigger}
            onSwitchView={(v) => setActiveTab(v)}
          />
        </div>

        <div className={activeTab === "archive" ? "block" : "hidden"}>
          <JobListView
            isArchive={true}
            onSelectJob={handleSelectJob}
            onGenerateCV={handleOpenCVGenerator}
            refreshTrigger={refreshTrigger}
            onSwitchView={(v) => setActiveTab(v)}
          />
        </div>

        <div className={activeTab === "analytics" ? "block" : "hidden"}>
          <AnalyticsDashboard onSelectJob={handleSelectJob} />
        </div>

        <div className={activeTab === "profile" ? "block" : "hidden"}>
          <KnowledgeBaseEditor />
        </div>

        <div className={activeTab === "presets" ? "block" : "hidden"}>
          <PresetsManager />
        </div>

        <div className={activeTab === "settings" ? "block" : "hidden"}>
          <SettingsView />
        </div>

        <div className={activeTab === "test-menu" ? "block" : "hidden"}>
          <TestViewsContainer />
        </div>
      </main>

      {/* Job Details Modal */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onGenerateCV={handleOpenCVGenerator}
        onOpenCVVersion={handleOpenCVVersion}
        onJobUpdated={handleJobUpdated}
      />

      {/* CV Generator Modal */}
      <CVGeneratorModal
        job={jobForCVGeneration}
        isOpen={isCVGeneratorOpen}
        onClose={() => setIsCVGeneratorOpen(false)}
        onSuccess={handleCVGenerationSuccess}
      />
    </div>
  );
};

export default App;
