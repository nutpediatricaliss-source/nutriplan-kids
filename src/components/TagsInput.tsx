import { useId, useState } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addTags, matchingTags, normalizeTag } from "@/lib/diagnosisTags";

type Props = { value: string[]; onChange: (tags: string[]) => void; suggestions: string[]; id?: string };

export default function TagsInput({ value, onChange, suggestions, id }: Props) {
  const listId = useId();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = matchingTags(suggestions, value, text);
  const query = text.trim();
  const canCreate = Boolean(query) && ![...value, ...suggestions].some((tag) => normalizeTag(tag) === normalizeTag(query));
  const options = [...matches, ...(canCreate ? [query] : [])];
  const commit = (label: string) => {
    onChange(addTags(value, label));
    setText("");
    setActive(-1);
  };

  return (
    <div className="relative space-y-2" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        if (query) commit(text);
        setFocused(false);
      }
    }}>
      {value.length > 0 && <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => <Badge key={normalizeTag(tag)} variant="secondary" className="max-w-full gap-1 rounded-lg font-normal">
          <span className="break-words min-w-0">{tag}</span>
          <Button type="button" variant="ghost" size="icon" className="h-5 w-5 shrink-0" aria-label={`Quitar ${tag}`} title={`Quitar ${tag}`}
            onClick={() => onChange(value.filter((item) => normalizeTag(item) !== normalizeTag(tag)))}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>)}
      </div>}
      <Input id={id} aria-label="Diagnóstico" role="combobox" aria-expanded={focused && Boolean(query) && options.length > 0}
        aria-controls={listId} aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        value={text} placeholder="Agregar diagnóstico…" className="rounded-xl"
        onFocus={() => setFocused(true)}
        onChange={(event) => {
          const next = event.target.value;
          if (next.includes(",")) commit(next);
          else { setText(next); setActive(-1); }
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit(active >= 0 ? options[active] ?? text : text);
          } else if (event.key === "ArrowDown" && options.length) {
            event.preventDefault(); setActive((index) => (index + 1) % options.length);
          } else if (event.key === "ArrowUp" && options.length) {
            event.preventDefault(); setActive((index) => (index <= 0 ? options.length - 1 : index - 1));
          } else if (event.key === "Escape") { setFocused(false); setActive(-1); }
        }} />
      {focused && query && options.length > 0 && <div id={listId} role="listbox" aria-label="Diagnósticos sugeridos"
        className="max-h-48 w-full overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-md">
        {options.map((option, index) => <Button key={normalizeTag(option)} type="button" variant="ghost" role="option"
          id={`${listId}-${index}`} aria-selected={active === index} className="h-auto w-full justify-start whitespace-normal text-left"
          onMouseDown={(event) => event.preventDefault()} onClick={() => commit(option)}>
          {canCreate && index === options.length - 1 ? <><Plus className="mr-2 h-4 w-4 shrink-0" />Crear ‘{query}’</> : option}
        </Button>)}
      </div>}
    </div>
  );
}