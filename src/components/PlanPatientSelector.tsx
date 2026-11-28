import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { edadLegible } from "@/lib/nutritionCalc";
import { normalizeTag } from "@/lib/diagnosisTags";
import { patientAssignment } from "@/lib/patientPlans";

type Patient = { id: string; nombre: string; fecha_nacimiento: string };
type Assignment = ReturnType<typeof patientAssignment>;

export default function PlanPatientSelector({ name, patientId, onChange }: {
  name: string; patientId: string | null; onChange: (assignment: Assignment) => Promise<boolean>;
}) {
  const { user } = useAuth();
  const [text, setText] = useState(name);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const draft = useRef(false);
  const dirty = useRef(false);
  const revision = useRef(0);
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const { data: patients = [], isLoading, isError } = useQuery({
    queryKey: ["plan-patient-options", user?.id], enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return [];
      const all: Patient[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from("pacientes").select("id,nombre,fecha_nacimiento")
          .eq("user_id", user.id).order("nombre").order("id").range(offset, offset + 999);
        if (error) throw error;
        all.push(...data);
        if (data.length < 1000) return all;
      }
    },
  });
  useEffect(() => { if (!draft.current) setText(name); }, [name, patientId]);
  const persist = (assignment: Assignment) => {
    const version = revision.current;
    pending.current = pending.current.then(() => changeRef.current(assignment)).then((saved) => {
      if (revision.current === version) draft.current = false;
      return saved;
    });
    return pending.current;
  };
  const flush = () => {
    clearTimeout(timer.current);
    if (dirty.current) { dirty.current = false; void persist(patientAssignment(null, text)); }
  };
  useEffect(() => () => { clearTimeout(timer.current); }, []);
  const matches = patients.filter((patient) => normalizeTag(patient.nombre).includes(normalizeTag(text)));
  const assign = async (patient: Patient | null) => {
    clearTimeout(timer.current);
    revision.current += 1;
    draft.current = true;
    dirty.current = false;
    setBusy(true);
    setOpen(false);
    const next = patientAssignment(patient, text);
    setText(next.nombre_paciente);
    await persist(next);
    setBusy(false);
  };
  return <div className="relative w-64 max-w-full" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) { flush(); setOpen(false); }
  }}>
    <div className="flex items-center gap-1">
      <Input aria-label="Paciente del plan" role="combobox" aria-expanded={open} aria-controls="plan-patients"
        autoComplete="off" value={text} disabled={busy} className="min-w-0 bg-background font-semibold"
        onFocus={() => setOpen(true)} onChange={(event) => {
          const value = event.target.value;
          setText(value); setOpen(true); draft.current = true; dirty.current = true; revision.current += 1;
          clearTimeout(timer.current);
          timer.current = setTimeout(() => { dirty.current = false; void persist(patientAssignment(null, value)); }, 500);
        }} onKeyDown={(event) => {
          if (event.key === "Escape") { flush(); setOpen(false); }
          if (event.key === "Enter") { event.preventDefault(); flush(); setOpen(false); }
          if (event.key === "ArrowDown") { event.preventDefault(); document.querySelector<HTMLButtonElement>("#plan-patients button")?.focus(); }
        }} />
      <Button variant="ghost" size="icon" title="Buscar paciente" aria-label="Buscar paciente" disabled={busy}
        onClick={() => setOpen(!open)}><Search className="h-4 w-4" /></Button>
      {patientId && <Button variant="ghost" size="icon" title="Quitar paciente asignado" aria-label="Quitar paciente asignado"
        disabled={busy} onClick={() => void assign(null)}><X className="h-4 w-4" /></Button>}
    </div>
    {open && <div id="plan-patients" className="absolute left-0 top-full z-50 mt-1 max-h-64 w-80 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
      {isLoading && <p className="p-2 text-sm text-muted-foreground">Cargando pacientes…</p>}
      {isError && <p className="p-2 text-sm text-destructive">No se pudieron cargar los pacientes.</p>}
      {matches.map((patient) => <Button key={patient.id} variant="ghost" className="h-auto w-full justify-start whitespace-normal px-2 py-2 text-left"
        onClick={() => void assign(patient)}><span><span className="block">{patient.nombre}</span><span className="block text-xs text-muted-foreground">{edadLegible(patient.fecha_nacimiento)}</span></span></Button>)}
      {!isLoading && !isError && matches.length === 0 && <p className="p-2 text-sm text-muted-foreground">Sin coincidencias.</p>}
    </div>}
  </div>;
}