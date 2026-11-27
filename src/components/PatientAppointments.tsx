import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { appointmentLabel, appointmentStates, appointmentTypes, DEFAULT_DURATION_MIN, groupAppointments, localDate, type Appointment } from "@/lib/appointments";
import { toast } from "sonner";

type Props = {
  patientId: string; patientName: string; appointments: Appointment[]; loading: boolean; error: boolean;
  dialogOpen: boolean; onDialogChange: (open: boolean) => void; onChanged: () => void;
  formOnly?: boolean; initialDate?: string;
};
const emptyForm = () => ({ fecha: localDate(), hora: "", tipo: "seguimiento", lugar: "", nota: "" });

export default function PatientAppointments({ patientId, patientName, appointments, loading, error, dialogOpen, onDialogChange, onChanged, formOnly = false, initialDate }: Props) {
  const { user } = useAuth();
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Appointment | null>(null);
  const [showAllPast, setShowAllPast] = useState(false);
  const groups = groupAppointments(appointments);
  const placesQuery = useQuery({
    queryKey: ["appointment-places", user?.id], enabled: Boolean(user && dialogOpen),
    queryFn: async () => {
      if (!user) return [];
      const places = new Set<string>();
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from("citas").select("lugar").eq("user_id", user.id)
          .not("lugar", "is", null).order("id").range(offset, offset + 999);
        if (error) throw error;
        data.forEach((row) => { if (row.lugar?.trim()) places.add(row.lugar.trim()); });
        if (data.length < 1000) break;
      }
      return [...places].sort((a, b) => a.localeCompare(b));
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    setForm(editing ? { fecha: editing.fecha, hora: editing.hora?.slice(0, 5) ?? "", tipo: editing.tipo, lugar: editing.lugar ?? "", nota: editing.nota ?? "" } : { ...emptyForm(), ...(initialDate ? { fecha: initialDate } : {}) });
  }, [dialogOpen, editing, initialDate]);

  const close = () => { if (saving) return; onDialogChange(false); setEditing(null); };
  const save = async () => {
    if (!user || !form.fecha || saving) { if (!form.fecha) toast.error("Selecciona la fecha de la cita"); return; }
    setSaving(true);
    try {
      const payload = { fecha: form.fecha, hora: form.hora || null, tipo: form.tipo, lugar: form.lugar.trim() || null, nota: form.nota.trim() || null };
      const result = editing
        ? await supabase.from("citas").update(payload).eq("id", editing.id).eq("user_id", user.id).select("id").single()
        : await supabase.from("citas").insert({ ...payload, user_id: user.id, paciente_id: patientId, duracion_min: DEFAULT_DURATION_MIN }).select("id").single();
      if (result.error) throw result.error;
      toast.success(editing ? "Cita actualizada" : "Cita agendada");
      onDialogChange(false); setEditing(null); onChanged(); void placesQuery.refetch();
    } catch { toast.error("No se pudo guardar la cita"); }
    finally { setSaving(false); }
  };
  const changeState = async (appointment: Appointment, estado: string) => {
    if (!user || busyId) return;
    setBusyId(appointment.id);
    const { error } = await supabase.from("citas").update({ estado }).eq("id", appointment.id).eq("user_id", user.id).select("id").single();
    setBusyId(null);
    if (error) toast.error("No se pudo cambiar el estado");
    else { toast.success("Estado actualizado"); onChanged(); }
  };
  const remove = async () => {
    if (!user || !toDelete) return;
    setBusyId(toDelete.id);
    const { error } = await supabase.from("citas").delete().eq("id", toDelete.id).eq("user_id", user.id);
    setBusyId(null);
    if (error) toast.error("No se pudo eliminar la cita");
    else { setToDelete(null); toast.success("Cita eliminada"); onChanged(); }
  };
  const renderAppointment = (appointment: Appointment) => (
    <div key={appointment.id} data-appointment-id={appointment.id} className="flex flex-wrap items-start justify-between gap-3 border-b py-3 last:border-0">
      <div className="min-w-0 w-full space-y-1 sm:w-auto sm:flex-1">
        <p className="font-medium">{appointmentLabel(appointment)}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{appointmentTypes[appointment.tipo as keyof typeof appointmentTypes]}</span>
          <Badge variant="secondary" className="rounded-lg font-normal">{appointmentStates[appointment.estado as keyof typeof appointmentStates]}</Badge>
        </div>
        {appointment.lugar && <p className="break-words text-sm text-muted-foreground">{appointment.lugar}</p>}
        {appointment.nota && <p className="whitespace-pre-wrap break-words text-sm">{appointment.nota}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Select value={appointment.estado} onValueChange={(state) => void changeState(appointment, state)} disabled={busyId !== null}>
          <SelectTrigger className="w-36 rounded-xl" aria-label={`Estado de cita ${appointmentLabel(appointment)}`}><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(appointmentStates).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="ghost" size="icon" aria-label="Editar cita" title="Editar cita" disabled={busyId !== null}
          onClick={() => { setEditing(appointment); onDialogChange(true); }}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" aria-label="Eliminar cita" title="Eliminar cita" disabled={busyId !== null}
          onClick={() => setToDelete(appointment)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );

  return <>
    {!formOnly && <Card className="rounded-2xl">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-lg">Citas</CardTitle>
        <Button onClick={() => { setEditing(null); onDialogChange(true); }} className="rounded-xl"><CalendarPlus className="mr-2 h-4 w-4" />Agendar cita</Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Cargando citas…</p> : error ? <div className="flex items-center gap-3"><p className="text-sm text-destructive">No se pudieron cargar las citas.</p><Button variant="outline" onClick={onChanged}>Reintentar</Button></div> : <div className="space-y-5">
          <section><h3 className="text-sm font-semibold text-muted-foreground">Próximas citas</h3>
            {groups.upcoming.length ? groups.upcoming.map(renderAppointment) : <p className="py-3 text-sm text-muted-foreground">Sin citas programadas.</p>}
          </section>
          {groups.past.length > 0 && <section><h3 className="text-sm font-semibold text-muted-foreground">Citas pasadas</h3>
            {(showAllPast ? groups.past : groups.past.slice(0, 5)).map(renderAppointment)}
            {groups.past.length > 5 && <Button variant="ghost" size="sm" onClick={() => setShowAllPast(!showAllPast)}>{showAllPast ? "Ver menos" : "Ver todas"}</Button>}
          </section>}
          {groups.other.length > 0 && <section><h3 className="text-sm font-semibold text-muted-foreground">Otras citas</h3>{groups.other.map(renderAppointment)}</section>}
        </div>}
      </CardContent>
    </Card>}
    <Dialog open={dialogOpen} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle>{editing ? "Editar cita" : "Agendar cita"}</DialogTitle></DialogHeader>
        <p className="break-words text-sm text-muted-foreground">{patientName}</p>
        <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="cita-fecha">Fecha</Label><Input id="cita-fecha" type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="rounded-xl" /></div>
            <div className="space-y-2"><Label htmlFor="cita-hora">Hora (opcional)</Label><Input id="cita-hora" type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} className="rounded-xl" /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="cita-tipo">Tipo</Label><Select value={form.tipo} onValueChange={(tipo) => setForm({ ...form, tipo })}><SelectTrigger id="cita-tipo" className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(appointmentTypes).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="cita-lugar">Lugar (opcional)</Label><Input id="cita-lugar" list="cita-lugares" value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} className="rounded-xl" /><datalist id="cita-lugares">{placesQuery.data?.map((place) => <option key={place} value={place} />)}</datalist>
            {placesQuery.isError && <p className="text-sm text-destructive">No se pudieron cargar los lugares sugeridos.</p>}
          </div>
          <div className="space-y-2"><Label htmlFor="cita-nota">Nota (opcional)</Label><Textarea id="cita-nota" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} className="rounded-xl" rows={3} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={close} disabled={saving} className="rounded-xl">Cancelar</Button><Button type="submit" disabled={saving} className="rounded-xl">{saving ? "Guardando…" : "Guardar cita"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={Boolean(toDelete)} onOpenChange={(next) => { if (!next && !busyId) setToDelete(null); }}>
      <AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>¿Eliminar esta cita?</AlertDialogTitle><AlertDialogDescription>Se eliminará la cita del {toDelete ? appointmentLabel(toDelete) : ""}. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busyId !== null}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={busyId !== null} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void remove(); }}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </>;
}