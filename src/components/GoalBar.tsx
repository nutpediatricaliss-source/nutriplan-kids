import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Pencil } from "lucide-react";
import { Macros4, progressTone } from "@/lib/goalProgress";

const toneBar = { bajo: "bg-muted-foreground/40", ok: "bg-success", alto: "bg-warning" };
const toneText = { bajo: "text-muted-foreground", ok: "text-success", alto: "text-warning" };

function fmt(n: number, int = false) {
  return int ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, "");
}

function Metric({ label, llevo, meta, unit, int }: { label: string; llevo: number; meta: number | null; unit: string; int?: boolean }) {
  const tone = meta ? progressTone(llevo, meta) : "bajo";
  const pct = meta ? Math.min(100, (llevo / meta) * 100) : 0;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-1 text-[11px]">
        <span className="font-semibold text-muted-foreground">{label}</span>
        <span className={`tabular-nums ${meta ? toneText[tone] : "text-foreground"}`}>
          {fmt(llevo, int)}{meta ? ` / ${fmt(meta, int)}` : ""} {unit}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${toneBar[tone]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function GoalBar({
  llevo, meta, fuente, manual, onManualChange,
}: {
  llevo: Macros4;
  meta: Macros4 | null;
  fuente: string | null; // texto si viene de consulta
  manual: Macros4 | null;
  onManualChange: (m: Macros4 | null) => void;
}) {
  const [draft, setDraft] = useState({ kcal: "", prot: "", grasa: "", carbs: "" });
  useEffect(() => {
    setDraft({
      kcal: manual?.kcal ? String(manual.kcal) : "",
      prot: manual?.prot ? String(manual.prot) : "",
      grasa: manual?.grasa ? String(manual.grasa) : "",
      carbs: manual?.carbs ? String(manual.carbs) : "",
    });
  }, [manual]);

  const diff = meta?.kcal ? Math.round(meta.kcal - llevo.kcal) : null;
  const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

  return (
    <div className="sticky top-16 z-20 rounded-2xl border border-border/60 bg-card/95 px-4 py-2 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 items-center gap-1.5 text-xs">
          <Target className="h-4 w-4 text-primary" />
          <div className="leading-tight">
            <p className="font-semibold">Meta del día</p>
            <p className="text-[10px] text-muted-foreground">
              {diff == null ? "Sin meta" : diff >= 0 ? `Faltan ${diff} kcal` : `Sobran ${-diff} kcal`}
            </p>
          </div>
        </div>
        <Metric label="Kcal" llevo={llevo.kcal} meta={meta?.kcal || null} unit="" int />
        <Metric label="Proteína" llevo={llevo.prot} meta={meta?.prot || null} unit="g" />
        <Metric label="Grasa" llevo={llevo.grasa} meta={meta?.grasa || null} unit="g" />
        <Metric label="Carbs" llevo={llevo.carbs} meta={meta?.carbs || null} unit="g" />
        {fuente ? (
          <span className="hidden shrink-0 text-[10px] text-muted-foreground xl:inline" title={fuente}>{fuente}</span>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Meta manual">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-2" align="end">
              <p className="text-xs font-semibold">Meta manual para este plan</p>
              {([["kcal", "Kcal"], ["prot", "Proteína (g)"], ["grasa", "Grasa (g)"], ["carbs", "Carbohidrato (g)"]] as const).map(([k, l]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <Label className="text-xs">{l}</Label>
                  <Input className="h-8 w-24" inputMode="decimal" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
                </div>
              ))}
              <div className="flex justify-between pt-1">
                <Button variant="ghost" size="sm" onClick={() => onManualChange(null)}>Quitar</Button>
                <Button size="sm" onClick={() => onManualChange({ kcal: num(draft.kcal), prot: num(draft.prot), grasa: num(draft.grasa), carbs: num(draft.carbs) })}>Guardar</Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
