import { useState } from "react";
import { Save, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useClinicalSuggestions } from "@/hooks/useClinicalSuggestions";
import { clinicalSuggestions, validContactEmail, whatsappUrl } from "@/lib/patientHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import TagsInput from "./TagsInput";

const contactFields = [
  ["representante1_nombre", "Nombre del Representante 1"],
  ["representante2_nombre", "Nombre del Representante 2"],
  ["contacto_celular", "Celular de contacto"],
  ["contacto_correo", "Correo electrónico de contacto"],
] as const;
const historyTextFields = [
  ["antecedentes_personales", "Antecedentes personales"],
  ["antecedentes_familiares", "Antecedentes familiares"],
  ["vitaminas_suplementos", "Vitaminas y suplementos"],
] as const;
const tagFields = [
  ["alergias", "Alergias"], ["intolerancias", "Intolerancias"],
  ["alimentos_gustan", "Alimentos que le gustan"], ["alimentos_no_gustan", "Alimentos que no le gustan"],
] as const;
type Patient = Tables<"pacientes">;
export type PatientHistoryData = Pick<Patient,
  typeof contactFields[number][0] | typeof historyTextFields[number][0] | typeof tagFields[number][0] | "datos_facturacion">;

export default function PatientHistoryCards({ patient, onSaved }: {
  patient: PatientHistoryData & { id: string };
  onSaved: (patch: Partial<PatientHistoryData>) => void;
}) {
  const { user } = useAuth();
  const [contact, setContact] = useState(() => ({
    representante1_nombre: patient.representante1_nombre ?? "",
    representante2_nombre: patient.representante2_nombre ?? "",
    contacto_celular: patient.contacto_celular ?? "",
    contacto_correo: patient.contacto_correo ?? "",
    datos_facturacion: patient.datos_facturacion ?? "",
  }));
  const [history, setHistory] = useState(() => ({
    antecedentes_personales: patient.antecedentes_personales ?? "",
    antecedentes_familiares: patient.antecedentes_familiares ?? "",
    vitaminas_suplementos: patient.vitaminas_suplementos ?? "",
    alergias: patient.alergias ?? [], intolerancias: patient.intolerancias ?? [],
    alimentos_gustan: patient.alimentos_gustan ?? [], alimentos_no_gustan: patient.alimentos_no_gustan ?? [],
  }));
  const [savingContact, setSavingContact] = useState(false);
  const [savingHistory, setSavingHistory] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const suggestionsQuery = useClinicalSuggestions();
  const suggestions = suggestionsQuery.data ?? clinicalSuggestions([]);
  const whatsapp = whatsappUrl(contact.contacto_celular);

  const save = async (patch: Partial<PatientHistoryData>) => {
    if (!user) throw new Error("No session");
    const { data, error } = await supabase.from("pacientes").update(patch)
      .eq("id", patient.id).eq("user_id", user.id).select("id").single();
    if (error || !data) throw error ?? new Error("Patient unavailable");
    onSaved(patch);
    toast.success("Datos actualizados");
  };

  return <>
    <Card className="rounded-2xl">
      <CardHeader><CardTitle className="text-lg">Contacto y facturación</CardTitle></CardHeader>
      <CardContent>
        <form noValidate className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          if (!validContactEmail(contact.contacto_correo)) { setEmailError(true); return; }
          setSavingContact(true);
          try { await save(Object.fromEntries(Object.entries(contact).map(([key, value]) => [key, value.trim() || null]))); }
          catch { toast.error("No se pudieron guardar los datos de contacto"); }
          finally { setSavingContact(false); }
        }}>
          <div className="grid gap-4 md:grid-cols-2">
            {contactFields.map(([field, label]) => <div key={field} className="min-w-0 space-y-2">
              <Label htmlFor={field}>{label}</Label>
              <div className="flex gap-2">
                <Input id={field} type={field === "contacto_correo" ? "email" : field === "contacto_celular" ? "tel" : "text"}
                  className="min-w-0 rounded-xl" value={contact[field]}
                  aria-invalid={field === "contacto_correo" && emailError}
                  aria-describedby={field === "contacto_correo" && emailError ? "contact-email-error" : undefined}
                  onChange={(event) => { setContact({ ...contact, [field]: event.target.value }); if (field === "contacto_correo") setEmailError(false); }} />
                {field === "contacto_celular" && <Tooltip><TooltipTrigger asChild>
                  {whatsapp ? <Button asChild variant="outline" size="icon" className="shrink-0 rounded-xl">
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp"><MessageCircle className="h-4 w-4" /></a>
                  </Button> : <Button type="button" disabled variant="outline" size="icon" className="shrink-0 rounded-xl" aria-label="Abrir WhatsApp"><MessageCircle className="h-4 w-4" /></Button>}
                </TooltipTrigger><TooltipContent>Abrir WhatsApp</TooltipContent></Tooltip>}
              </div>
              {field === "contacto_correo" && emailError && <p id="contact-email-error" role="alert" className="text-sm text-destructive">Ingresa un correo electrónico válido.</p>}
            </div>)}
          </div>
          <div className="space-y-2"><Label htmlFor="datos_facturacion">Datos de facturación</Label>
            <Textarea id="datos_facturacion" className="rounded-xl" rows={3} value={contact.datos_facturacion} onChange={(event) => setContact({ ...contact, datos_facturacion: event.target.value })} />
          </div>
          <Button type="submit" disabled={savingContact} className="rounded-xl"><Save className="mr-2 h-4 w-4" />Guardar cambios</Button>
        </form>
      </CardContent>
    </Card>
    <Card className="rounded-2xl">
      <CardHeader><CardTitle className="text-lg">Historia clínica</CardTitle></CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault(); setSavingHistory(true);
          try {
            await save({ ...history,
              antecedentes_personales: history.antecedentes_personales.trim() || null,
              antecedentes_familiares: history.antecedentes_familiares.trim() || null,
              vitaminas_suplementos: history.vitaminas_suplementos.trim() || null,
            });
            void suggestionsQuery.refetch();
          } catch { toast.error("No se pudo guardar la historia clínica"); }
          finally { setSavingHistory(false); }
        }}>
          <div className="grid gap-4 md:grid-cols-2">
            {historyTextFields.map(([field, label]) => <div key={field} className="space-y-2">
              <Label htmlFor={field}>{label}</Label><Textarea id={field} rows={3} className="rounded-xl" value={history[field]} onChange={(event) => setHistory({ ...history, [field]: event.target.value })} />
            </div>)}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {tagFields.map(([field, label]) => <div key={field} className="min-w-0 space-y-2">
              <Label htmlFor={field}>{label}</Label>
              <TagsInput id={field} label={label} value={history[field]} suggestions={suggestions[field]}
                onChange={(tags) => setHistory((current) => ({ ...current, [field]: tags }))} />
            </div>)}
          </div>
          {suggestionsQuery.isError && <p className="text-sm text-destructive">No se pudieron cargar las sugerencias de otros pacientes.</p>}
          <Button type="submit" disabled={savingHistory} className="rounded-xl"><Save className="mr-2 h-4 w-4" />Guardar cambios</Button>
        </form>
      </CardContent>
    </Card>
  </>;
}