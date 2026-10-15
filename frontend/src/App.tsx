import React, { useState } from "react";
import {
  LayoutDashboard,
  User,
  Layers,
  Settings,
  Briefcase,
  List,
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
import { api } from "./lib/api";

type ActiveTab = "kanban" | "list" | "profile" | "presets" | "settings";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("kanban");

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
      <div className="min-h-screen bg-slate-100 flex flex-col p-6">
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-3.5 shadow-xs">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900">
                  Kandid<span className="text-blue-600">Flow</span>
                </span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                  v1.1
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Automatyzacja rekrutacji IT & Wektorowy generator CV
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("kanban")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "kanban"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Tablica ofert</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "list"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista ofert</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "profile"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Moja baza wiedzy</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("presets")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "presets"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Szablony bazowe</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "settings"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Ustawienia</span>
            </button>
          </nav>
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
          <UpcomingEventsWidget onSelectJob={handleSelectJobById} />
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
            onSelectJob={handleSelectJob}
            onGenerateCV={handleOpenCVGenerator}
            refreshTrigger={refreshTrigger}
            onSwitchView={(v) => setActiveTab(v)}
          />
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
