import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export default function MacroSlider({
  label,
  color,
  pct,
  onChange,
  kcal,
  g,
  gxkg,
  disabled,
}: {
  label: string;
  color: string;
  pct: number;
  onChange?: (v: number) => void;
  kcal: number;
  g: number;
  gxkg: number;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${color}`} />
          <Label className="text-sm">{label}</Label>
        </div>
        <span className="text-sm font-semibold tabular-nums">{pct}%</span>
      </div>
      <Slider
        value={[pct]}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        onValueChange={(v) => onChange?.(v[0])}
      />
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <p className="text-muted-foreground">kcal</p>
          <p className="font-semibold tabular-nums">{kcal}</p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <p className="text-muted-foreground">gramos</p>
          <p className="font-semibold tabular-nums">{g}</p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <p className="text-muted-foreground">g/kg/día</p>
          <p className="font-semibold tabular-nums">{gxkg}</p>
        </div>
      </div>
    </div>
  );
}
