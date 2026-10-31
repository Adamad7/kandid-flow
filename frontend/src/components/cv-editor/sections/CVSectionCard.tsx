import React from "react";
import {
  FileText,
  Code,
  Briefcase,
  GraduationCap,
  Award,
  Languages,
  BookOpen,
  Trophy,
  Heart,
  ShieldCheck,
  FolderPlus,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "../../ui/Button";

export interface CVSectionCardProps {
  id: string;
  type: string;
  title?: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isExpanded: boolean;
  canRefine: boolean;
  canRemove: boolean;
  onToggleExpand: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRefine: (id: string) => void;
  onRemove?: (id: string) => void;
  children: React.ReactNode;
}

const getSectionIcon = (type: string) => {
  switch (type) {
    case "summary":
      return <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />;
    case "skills":
      return <Code className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    case "experience":
      return <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />;
    case "projects":
      return <Code className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />;
    case "education":
      return <GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />;
    case "certificates":
      return <Award className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />;
    case "languages":
      return <Languages className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />;
    case "trainings":
      return <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />;
    case "achievements":
      return <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />;
    case "interests":
      return <Heart className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />;
    case "clause":
      return <ShieldCheck className="h-4 w-4 text-slate-600 dark:text-slate-400 shrink-0" />;
    default:
      return <FolderPlus className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />;
  }
};

interface BlockPropHolder {
  block?: unknown;
}

function areSectionCardPropsEqual(
  prev: CVSectionCardProps,
  next: CVSectionCardProps
): boolean {
  if (
    prev.id !== next.id ||
    prev.type !== next.type ||
    prev.title !== next.title ||
    prev.index !== next.index ||
    prev.isFirst !== next.isFirst ||
    prev.isLast !== next.isLast ||
    prev.isExpanded !== next.isExpanded ||
    prev.canRefine !== next.canRefine ||
    prev.canRemove !== next.canRemove ||
    prev.onToggleExpand !== next.onToggleExpand ||
    prev.onUpdateTitle !== next.onUpdateTitle ||
    prev.onMoveUp !== next.onMoveUp ||
    prev.onMoveDown !== next.onMoveDown ||
    prev.onRefine !== next.onRefine ||
    prev.onRemove !== next.onRemove
  ) {
    return false;
  }

  if (prev.children === next.children) {
    return true;
  }

  if (
    React.isValidElement<BlockPropHolder>(prev.children) &&
    React.isValidElement<BlockPropHolder>(next.children)
  ) {
    return (
      prev.children.type === next.children.type &&
      prev.children.props.block === next.children.props.block
    );
  }

  return false;
}

const CVSectionCardComponent: React.FC<CVSectionCardProps> = ({
  id,
  type,
  title,
  index,
  isFirst,
  isLast,
  isExpanded,
  canRefine,
  canRemove,
  onToggleExpand,
  onUpdateTitle,
  onMoveUp,
  onMoveDown,
  onRefine,
  onRemove,
  children,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-shadow [contain:content]">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Section Icon + Editable Title */}
        <div className="flex items-center gap-2.5 min-w-0 sm:flex-1">
          <div className="shrink-0 text-blue-600 dark:text-blue-400">
            {getSectionIcon(type)}
          </div>
          <input
            type="text"
            value={title || ""}
            onChange={(e) => onUpdateTitle(id, e.target.value)}
            className="font-semibold text-sm text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5 truncate w-full max-w-[160px] sm:max-w-xs transition-colors"
            title="Kliknij, aby edytować nagłówek sekcji"
          />
        </div>

        {/* Center: Reorder Up / Down buttons */}
        <div className="flex items-center justify-center shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => onMoveUp(index)}
              disabled={isFirst}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:pointer-events-none"
              title="Przesuń sekcję w górę"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onMoveDown(index)}
              disabled={isLast}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:pointer-events-none"
              title="Przesuń sekcję w dół"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right: Actions and Expand/Collapse Button */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 sm:flex-1">
          {/* AI Refine button */}
          {canRefine && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRefine(id)}
              className="text-xs h-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-slate-800"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Udoskonal z AI</span>
              <span className="sm:hidden">AI</span>
            </Button>
          )}

          {/* Remove button for custom or optional sections */}
          {canRemove && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(id)}
              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Usuń sekcję"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {/* Expand/Collapse button */}
          <button
            type="button"
            onClick={() => onToggleExpand(id)}
            className="px-3.5 py-1.5 h-8 min-w-[48px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
            title={isExpanded ? "Zwiń sekcję" : "Rozwiń sekcję"}
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-300 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Section Content Form based on sec.type */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0 pointer-events-none"
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="border-t border-slate-100 dark:border-slate-800 mt-4 pt-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CVSectionCard = React.memo(
  CVSectionCardComponent,
  areSectionCardPropsEqual
);

CVSectionCard.displayName = "CVSectionCard";
