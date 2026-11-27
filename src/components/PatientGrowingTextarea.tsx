import { useLayoutEffect, useRef } from "react";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function PatientGrowingTextarea({ value, className, rows = 2, ...props }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resize = () => {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
    };
    resize();
    // Observe width only: changing height must not trigger a resize loop.
    let width = element.clientWidth;
    const widthObserver = new ResizeObserver(() => {
      if (width === element.clientWidth) return;
      width = element.clientWidth;
      resize();
    });
    widthObserver.observe(element);
    return () => widthObserver.disconnect();
  }, [value, rows]);
  return <Textarea ref={ref} value={value} rows={rows}
    className={cn("min-h-0 resize-none overflow-hidden rounded-xl py-1.5", className)} {...props} />;
}