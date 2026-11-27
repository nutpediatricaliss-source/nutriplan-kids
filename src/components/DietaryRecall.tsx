import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { insertDietaryRecallFormat } from "@/lib/dietaryRecall";

export default function DietaryRecall({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
  }, [value]);

  return <div className="space-y-2 rounded-xl border border-sage-border bg-sage/40 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Label htmlFor="recordatorio-24h">Recordatorio de 24 h</Label>
      <Button type="button" variant="outline" size="sm" className="rounded-xl"
        onClick={() => { onChange(insertDietaryRecallFormat(value)); textarea.current?.focus(); }}>
        <ListPlus className="mr-2 h-4 w-4" />Insertar formato
      </Button>
    </div>
    <Textarea ref={textarea} id="recordatorio-24h" value={value} rows={6}
      className="resize-none overflow-hidden rounded-xl" onChange={(event) => onChange(event.target.value)} />
  </div>;
}

export function DietaryRecallPreview({ value, consultationId }: { value: string; consultationId: string }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = `recordatorio-${consultationId}`;
  return <div className="pt-1" onClick={(event) => event.stopPropagation()}>
    <Button type="button" variant="ghost" size="sm" className="h-auto max-w-full justify-start whitespace-normal px-0 text-left text-primary"
      aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded((current) => !current)}>
      {expanded ? <ChevronUp className="mr-1 h-4 w-4 shrink-0" /> : <ChevronDown className="mr-1 h-4 w-4 shrink-0" />}
      Ver recordatorio de 24 h
    </Button>
    {expanded && <p id={contentId} className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{value}</p>}
  </div>;
}