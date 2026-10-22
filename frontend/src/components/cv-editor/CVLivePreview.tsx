import React, { useEffect, useState, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  FileText,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "../../lib/api";
import type { CVLayoutSchema } from "../../types";
import { Button } from "../ui/Button";

interface CVLivePreviewProps {
  layoutSchema: CVLayoutSchema;
  jobOfferId?: string | null;
  language?: string;
  onExportPdf: () => void;
  isExportingPdf?: boolean;
}

const A4_WIDTH_PX = 793.7;
const A4_HEIGHT_PX = 1122.52;

const CVLivePreviewComponent: React.FC<CVLivePreviewProps> = ({
  layoutSchema,
  jobOfferId,
  language = "pl",
  onExportPdf,
  isExportingPdf = false,
}) => {
  const [svgPages, setSvgPages] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(0.9);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerPreview = async () => {
    try {
      setIsCompiling(true);
      setCompileError(null);

      const res = await api.cv.preview({
        sections: layoutSchema.sections.map((s) => s.id),
        job_offer_id: jobOfferId,
        language: language,
        layout_schema: layoutSchema,
      });

      setSvgPages(res.svg_pages || []);
    } catch {
      setCompileError(
        "Błąd kompilacji podglądu Typst. Sprawdź poprawność wprowadzonych danych."
      );
    } finally {
      setIsCompiling(false);
    }
  };

  // Debounced 400ms preview compilation
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerPreview();
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [layoutSchema, jobOfferId, language]);

  return (
    <div className="flex flex-col h-full bg-slate-100/90 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Top Preview Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Podgląd Typst (Na żywo)</span>
          </div>

          {isCompiling ? (
            <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium animate-pulse ml-2">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Kompilacja...
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-2">
              {svgPages.length} {svgPages.length === 1 ? "strona" : "strony"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setZoomScale((s) => Math.max(0.5, Math.round((s - 0.1) * 10) / 10))}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded"
              title="Oddal"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-slate-600 dark:text-slate-300 min-w-[42px] text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((s) => Math.min(2.0, Math.round((s + 0.1) * 10) / 10))}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded"
              title="Przybliż"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1.0)}
              className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded border-l border-slate-200 dark:border-slate-700 ml-0.5"
              title="Resetuj zoom (100%)"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          {/* Download PDF Button */}
          <Button
            size="sm"
            variant="primary"
            onClick={onExportPdf}
            isLoading={isExportingPdf}
            className="text-xs h-8 shadow-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Pobierz PDF
          </Button>
        </div>
      </div>

      {/* Pages Canvas */}
      <div className="flex-1 overflow-auto p-6">
        <div className="min-w-full w-fit flex flex-col items-center gap-8 pb-8">
          {compileError && (
            <div className="w-full max-w-xl rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-3 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{compileError}</span>
            </div>
          )}

          {svgPages.length === 0 && isCompiling ? (
            <div className="py-24 text-center text-sm text-slate-400 dark:text-slate-500 animate-pulse">
              Inicjalizacja i kompilacja wektorowa Typst...
            </div>
          ) : svgPages.length === 0 ? (
            <div className="py-24 text-center text-sm text-slate-400 dark:text-slate-500">
              Brak stron do wyświetlenia. Upewnij się, że wybrano aktywne sekcje.
            </div>
          ) : (
            svgPages.map((pageSvg, idx) => {
              const scaledWidth = Math.round(A4_WIDTH_PX * zoomScale);
              const scaledHeight = Math.round(A4_HEIGHT_PX * zoomScale);

              return (
                <div
                  key={idx}
                  className="relative shrink-0 flex flex-col items-center select-text"
                >
                  <div
                    className="bg-white shadow-xl rounded-xs overflow-hidden"
                    style={{
                      width: `${scaledWidth}px`,
                      height: `${scaledHeight}px`,
                    }}
                  >
                    <div
                      className="cv-preview-page typst-page-svg w-full h-full select-text [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                      dangerouslySetInnerHTML={{ __html: pageSvg }}
                    />
                  </div>
                  <div className="absolute -bottom-5 right-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono select-none">
                    Strona {idx + 1} z {svgPages.length}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export const CVLivePreview = React.memo(CVLivePreviewComponent);
