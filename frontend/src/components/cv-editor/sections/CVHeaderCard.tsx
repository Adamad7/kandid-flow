import React from "react";
import { User, ChevronDown, Sparkles } from "lucide-react";
import type { CandidateContactInfo } from "../../../types";
import { Input } from "../../ui/Input";

export interface CVHeaderCardProps {
  fullName?: string | null;
  jobTitle?: string | null;
  contactInfo?: CandidateContactInfo | null;
  suggestedJobTitle?: string | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateFullName: (name: string) => void;
  onUpdateJobTitle: (title: string) => void;
  onApplySuggestedJobTitle: () => void;
  onUpdateContactInfo: (field: keyof CandidateContactInfo, value: string) => void;
}

export const CVHeaderCard: React.FC<CVHeaderCardProps> = React.memo(
  ({
    fullName,
    jobTitle,
    contactInfo,
    suggestedJobTitle,
    isExpanded,
    onToggleExpand,
    onUpdateFullName,
    onUpdateJobTitle,
    onApplySuggestedJobTitle,
    onUpdateContactInfo,
  }) => {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 [contain:content]">
        <div
          className="flex items-center justify-between p-5 cursor-pointer select-none"
          onClick={onToggleExpand}
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              Nagłówek dokumentu i dane kontaktowe
            </h3>
            {!isExpanded && fullName && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal truncate max-w-[200px]">
                — {fullName}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="px-3.5 py-1.5 h-8 min-w-[48px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
            title={isExpanded ? "Zwiń nagłówek" : "Rozwiń nagłówek"}
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-300 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isExpanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden min-h-0">
            <div className="border-t border-slate-100 dark:border-slate-800 p-5 pt-4 space-y-4">
              <Input
                label="Imię i nazwisko kandydata"
                value={fullName || ""}
                onChange={(e) => onUpdateFullName(e.target.value)}
                data-cv-field="header:full_name"
              />

              <div className="space-y-1.5">
                <Input
                  label="Stanowisko docelowe / Nagłówek zawodowy"
                  value={jobTitle || ""}
                  onChange={(e) => onUpdateJobTitle(e.target.value)}
                  placeholder='np. "Flutter Developer", "Junior DevOps Engineer"'
                  data-cv-field="header:job_title"
                />
                {suggestedJobTitle && jobTitle !== suggestedJobTitle && (
                  <div className="flex items-center pt-0.5">
                    <button
                      type="button"
                      onClick={onApplySuggestedJobTitle}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-md border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>
                        Użyj z oferty:{" "}
                        <strong className="font-semibold">{suggestedJobTitle}</strong>
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Adres e-mail"
                  type="email"
                  value={contactInfo?.email || ""}
                  onChange={(e) => onUpdateContactInfo("email", e.target.value)}
                  placeholder="np. jan.kowalski@example.com"
                  data-cv-field="header:email"
                />
                <Input
                  label="Numer telefonu"
                  value={contactInfo?.phone || ""}
                  onChange={(e) => onUpdateContactInfo("phone", e.target.value)}
                  placeholder="np. +48 500 600 700"
                  data-cv-field="header:phone"
                />
                <Input
                  label="Lokalizacja"
                  value={contactInfo?.location || ""}
                  onChange={(e) => onUpdateContactInfo("location", e.target.value)}
                  placeholder="np. Warszawa, Polska"
                  data-cv-field="header:location"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Profil LinkedIn"
                  value={contactInfo?.linkedin || ""}
                  onChange={(e) => onUpdateContactInfo("linkedin", e.target.value)}
                  placeholder="np. linkedin.com/in/jankowalski"
                  data-cv-field="header:linkedin"
                />
                <Input
                  label="Profil GitHub"
                  value={contactInfo?.github || ""}
                  onChange={(e) => onUpdateContactInfo("github", e.target.value)}
                  placeholder="np. github.com/jankowalski"
                  data-cv-field="header:github"
                />
                <Input
                  label="Portfolio / WWW"
                  value={contactInfo?.portfolio || ""}
                  onChange={(e) => onUpdateContactInfo("portfolio", e.target.value)}
                  placeholder="np. jankowalski.dev"
                  data-cv-field="header:portfolio"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CVHeaderCard.displayName = "CVHeaderCard";
