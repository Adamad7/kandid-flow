import React, { useEffect, useState, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "../../lib/api";
import type { CVLayoutSchema } from "../../types";

interface CVLivePreviewProps {
  layoutSchema: CVLayoutSchema;
  jobOfferId?: string | null;
  language?: string;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
}

const A4_WIDTH_PX = 793.7;
const A4_HEIGHT_PX = 1122.52;

const CVLivePreviewComponent: React.FC<CVLivePreviewProps> = ({
  layoutSchema,
  jobOfferId,
  language = "pl",
}) => {
  const [svgPages, setSvgPages] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(0.9);

  const previewContainerRef = useRef<HTMLDivElement>(null);
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

  // Non-passive Ctrl + wheel event listener for zoom
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const step = 0.05;
        if (e.deltaY < 0) {
          setZoomScale((prev) => Math.min(2.0, Math.round((prev + step) * 100) / 100));
        } else if (e.deltaY > 0) {
          setZoomScale((prev) => Math.max(0.4, Math.round((prev - step) * 100) / 100));
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div className="relative flex flex-col h-full w-full bg-slate-100/90 dark:bg-slate-950/50 overflow-hidden">
      {/* Discreet compilation indicator */}
      {isCompiling && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm text-xs font-medium text-blue-600 dark:text-blue-400 select-none animate-pulse">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Kompilacja...</span>
        </div>
      )}

      {/* Floating vertical Zoom Controls in bottom-right corner */}
      <div
        className="absolute bottom-6 right-6 z-20 flex flex-col items-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl shadow-md p-1 gap-1 select-none"
        title="Ctrl + kółko myszy = zoom"
      >
        <button
          type="button"
          onClick={() => setZoomScale((s) => Math.max(0.4, Math.round((s - 0.1) * 100) / 100))}
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg cursor-pointer transition-colors"
          title="Oddal (Ctrl + scroll w dół)"
          aria-label="Oddal"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-xs font-mono px-1 py-0.5 text-slate-600 dark:text-slate-300 select-none min-w-[42px] text-center">
          {Math.round(zoomScale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoomScale((s) => Math.min(2.0, Math.round((s + 0.1) * 100) / 100))}
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg cursor-pointer transition-colors"
          title="Przybliż (Ctrl + scroll w górę)"
          aria-label="Przybliż"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      {/* Pages Canvas */}
      <div ref={previewContainerRef} className="flex-1 overflow-auto p-6">
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
