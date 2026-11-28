import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { normalizeItemMark, toggleItemMark, type ItemMark } from "@/lib/itemMarks";

export default function ItemMarkControls({ value, onChange }: { value: string | null; onChange: (value: ItemMark | null) => void }) {
  return <span className="inline-flex shrink-0 items-center gap-1">
    {(["alergeno", "blw"] as const).map((mark) => {
      const label = mark === "alergeno" ? "Alergénico" : "BLW";
      return <Tooltip key={mark}><TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} aria-pressed={normalizeItemMark(value) === mark}
          className={`item-mark-control h-3 w-3 min-w-3 rounded-full p-0 ${mark === "alergeno" ? "mark-allergen-control" : "mark-blw-control"}`}
          onClick={() => onChange(toggleItemMark(value, mark))} />
      </TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
    })}
  </span>;
}