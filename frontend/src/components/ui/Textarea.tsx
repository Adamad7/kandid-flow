import React, {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { cn } from "../../lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      id,
      rows = 1,
      value,
      onInput,
      onWheel,
      style,
      ...props
    },
    ref
  ) => {
    const textareaId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const innerRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const adjustHeight = () => {
      const el = innerRef.current;
      if (!el) return;

      // If element is hidden (e.g. parent container has display: none),
      // offsetParent is null and scrollHeight is 0. Do not overwrite with 0!
      if (el.offsetParent === null && el.scrollHeight === 0) {
        return;
      }

      const prevHeight = el.style.height;
      el.style.height = "auto";

      if (el.scrollHeight === 0) {
        el.style.height = prevHeight;
        return;
      }

      const borderOffset = el.offsetHeight - el.clientHeight;
      const minHeight = Math.max(42, (Number(rows) || 1) * 23 + 22);
      const targetHeight = Math.max(
        minHeight,
        el.scrollHeight + (borderOffset > 0 ? borderOffset : 2)
      );

      el.style.height = `${targetHeight}px`;
    };

    // Immediate adjustment on value or rows changes
    useLayoutEffect(() => {
      adjustHeight();
      const rafId = requestAnimationFrame(() => {
        adjustHeight();
      });
      return () => cancelAnimationFrame(rafId);
    }, [value, rows]);

    // IntersectionObserver to adjust height when element becomes visible
    // (e.g. switching tabs from hidden to block in App.tsx)
    useEffect(() => {
      const el = innerRef.current;
      if (!el || typeof IntersectionObserver === "undefined") return;

      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            adjustHeight();
          }
        }
      });

      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    // ResizeObserver to adjust height if width changes or un-hides
    useEffect(() => {
      const el = innerRef.current;
      if (!el || typeof ResizeObserver === "undefined") return;

      let lastWidth = el.offsetWidth;
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width > 0 && width !== lastWidth) {
            lastWidth = width;
            adjustHeight();
          }
        }
      });

      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      if (onInput) {
        onInput(e);
      }
    };

    const handleWheel = (e: React.WheelEvent<HTMLTextAreaElement>) => {
      if (onWheel) {
        onWheel(e);
      }
      const el = innerRef.current;
      if (!el) return;

      const delta = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY;
      if (delta === 0) return;

      // Find nearest ancestor scroll container that actually has scrollable content
      let scrollParent: HTMLElement | null = null;
      let current = el.parentElement;

      while (
        current &&
        current !== document.body &&
        current !== document.documentElement
      ) {
        if (
          current.matches(".overflow-y-auto, .overflow-auto") &&
          current.scrollHeight > current.clientHeight
        ) {
          scrollParent = current;
          break;
        }
        current = current.parentElement;
      }

      if (scrollParent) {
        const canScrollDown =
          delta > 0 &&
          scrollParent.scrollTop + scrollParent.clientHeight <
            scrollParent.scrollHeight - 1;
        const canScrollUp = delta < 0 && scrollParent.scrollTop > 0;

        if (canScrollDown || canScrollUp) {
          scrollParent.scrollTop += delta;
        } else if (typeof window !== "undefined") {
          window.scrollBy({ top: delta, left: 0, behavior: "auto" });
        }
      } else if (typeof window !== "undefined") {
        window.scrollBy({ top: delta, left: 0, behavior: "auto" });
      }
    };

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={innerRef}
          rows={rows}
          value={value}
          onInput={handleInput}
          onWheel={handleWheel}
          style={{ fieldSizing: "content", ...style } as React.CSSProperties}
          className={cn(
            "flex w-full min-h-[42px] rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 resize-none overflow-clip",
            error && "border-rose-500 focus-visible:ring-rose-500 dark:border-rose-500",
            className
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
        {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";


