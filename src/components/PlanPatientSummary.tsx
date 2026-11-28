import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ExternalLink, UserRound } from "lucide-react";
import { edadLegible } from "@/lib/nutritionCalc";
import { foodPreferenceText } from "@/lib/patientHistory";
import { patientAlertText, type PatientAlert, type SafetyPatient } from "@/lib/patientSafety";

export function PatientAlertBadge({ alert }: { alert: PatientAlert }) {
  return <Badge variant="outline" title={alert.kind === "dislike" ? alert.label : undefined}
    className={`max-w-full whitespace-normal break-words rounded-lg text-[10px] ${alert.kind === "allergy" ? "allergy-badge" : alert.kind === "intolerance" ? "intolerance-badge" : "patient-dislike-badge"}`}>{patientAlertText(alert)}</Badge>;
}

function PreferenceLine({ label, text }: { label: string; text: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text.trim()) return null;
  return <div className="flex min-w-0 items-start gap-2 text-xs">
    <span className="shrink-0 font-semibold">{label}:</span>
    <p className={`min-w-0 flex-1 text-muted-foreground ${expanded ? "whitespace-pre-wrap break-words" : "truncate"}`}>{text}</p>
    <Button variant="ghost" size="sm" className="h-5 shrink-0 px-1 text-xs" onClick={() => setExpanded(!expanded)} aria-label={`${expanded ? "Ver menos" : "Ver más"}: ${label}`}>{expanded ? "Ver menos" : "Ver más"}</Button>
  </div>;
}

export default function PlanPatientSummary({ patient }: { patient: SafetyPatient }) {
  const [open, setOpen] = useState(Boolean(patient.alergias?.length || patient.intolerancias?.length));
  return <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border bg-card px-3 py-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="h-auto min-w-0 justify-start gap-2 whitespace-normal px-0 py-0 text-left" aria-label="Resumen del paciente">
        <UserRound className="h-4 w-4 shrink-0 text-primary" /><span className="break-words font-semibold">{patient.nombre}</span><span className="text-xs font-normal text-muted-foreground">{edadLegible(patient.fecha_nacimiento)}</span><ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform motion-reduce:transition-none ${open ? "" : "-rotate-90"}`} />
      </Button></CollapsibleTrigger>
      <Button asChild variant="link" size="sm" className="h-5 gap-1 px-0 text-xs"><a href={`/pacientes/${patient.id}`} target="_blank" rel="noopener noreferrer">Ver ficha<ExternalLink className="h-3 w-3" /></a></Button>
    </div>
    <CollapsibleContent className="grid gap-x-4 gap-y-1 pt-2 sm:grid-cols-2">
      <div className="space-y-1">
      {patient.diagnosticos.length > 0 && <div className="flex flex-wrap items-center gap-1 text-xs"><span className="mr-1 font-semibold">Diagnósticos:</span>{patient.diagnosticos.map((tag) => <Badge key={tag} variant="secondary" className="max-w-full whitespace-normal break-words rounded-lg text-[10px]">{tag}</Badge>)}</div>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <div className="flex flex-wrap items-center gap-1"><span className="font-semibold">Alergias:</span>{patient.alergias?.length ? patient.alergias.map((tag) => <Badge key={tag} variant="outline" className="allergy-badge max-w-full whitespace-normal break-words rounded-lg text-[10px]">{tag}</Badge>) : <span className="text-muted-foreground">Sin alergias registradas</span>}</div>
        <div className="flex flex-wrap items-center gap-1"><span className="font-semibold">Intolerancias:</span>{patient.intolerancias?.length ? patient.intolerancias.map((tag) => <Badge key={tag} variant="outline" className="intolerance-badge max-w-full whitespace-normal break-words rounded-lg text-[10px]">{tag}</Badge>) : <span className="text-muted-foreground">Sin intolerancias registradas</span>}</div>
      </div>
      </div>
      <div className="min-w-0 space-y-1">
      <PreferenceLine label="Le gustan" text={foodPreferenceText(patient.alimentos_gustan_texto, patient.alimentos_gustan)} />
      <PreferenceLine label="No le gustan" text={foodPreferenceText(patient.alimentos_no_gustan_texto, patient.alimentos_no_gustan)} />
      </div>
    </CollapsibleContent>
  </Collapsible>;
}