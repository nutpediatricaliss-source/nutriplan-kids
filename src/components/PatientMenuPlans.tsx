import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { PlanMenu } from "@/lib/types";
import { duplicatePatientPlan } from "@/lib/patientPlans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Copy, FileText, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function PatientMenuPlans({ patientId, onCreate }: { patientId: string; onCreate: () => void }) {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState<PlanMenu | null>(null);
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["patient-menu-plans", user?.id, patientId], enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return [];
      const all: PlanMenu[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from("planes_menu").select("*").eq("user_id", user.id)
          .eq("paciente_id", patientId).or("es_plantilla.eq.false,es_plantilla.is.null").order("created_at", { ascending: false })
          .order("id").range(offset, offset + 999);
        if (error) throw error;
        all.push(...data);
        if (data.length < 1000) return all;
      }
    },
  });
  const duplicate = async (plan: PlanMenu) => {
    if (!user || busy) return;
    setBusy(true);
    try { await duplicatePatientPlan(plan, user.id); await query.refetch(); toast.success("Plan duplicado"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo duplicar el plan"); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!user || !deleting || busy) return;
    setBusy(true);
    const { error } = await supabase.from("planes_menu").delete().eq("id", deleting.id).eq("user_id", user.id).eq("paciente_id", patientId);
    if (error) toast.error("No se pudo eliminar el plan");
    else { setDeleting(null); await query.refetch(); toast.success("Plan eliminado"); }
    setBusy(false);
  };
  const date = (value: string) => new Date(value).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil" });
  return <Card className="rounded-2xl">
    <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 px-4 py-3">
      <CardTitle className="text-lg">Planes de menú</CardTitle>
      <Button variant="outline" size="sm" onClick={onCreate}><Plus className="mr-1 h-4 w-4" />Crear plan de menú</Button>
    </CardHeader>
    <CardContent className="px-4 pb-4">
      {query.isLoading ? <p className="text-sm text-muted-foreground">Cargando planes…</p> : query.isError ? <div className="flex items-center gap-2"><p className="text-sm text-destructive">No se pudieron cargar los planes.</p><Button variant="outline" size="sm" onClick={() => void query.refetch()}>Reintentar</Button></div> : !query.data?.length ? <p className="text-sm text-muted-foreground">Sin planes de menú.</p> :
        <div className="flex flex-wrap gap-2">{query.data.map((plan) => <Card key={plan.id} className="w-52 max-w-full rounded-xl shadow-none">
          <CardContent className="space-y-2 p-3">
            <h3 className="break-words text-sm font-semibold">{plan.nombre_paciente}</h3>
            <div className="space-y-0.5 text-xs text-muted-foreground"><p>Creado: {date(plan.created_at)}</p><p>{plan.dias} días</p><p>Editado: {date(plan.updated_at)}</p></div>
            <div className="flex items-center gap-1">
              <Button asChild variant="outline" size="sm"><Link to={`/plan/${plan.id}`}><FileText className="mr-1 h-3.5 w-3.5" />Abrir</Link></Button>
              <Button variant="ghost" size="icon" title="Duplicar" aria-label={`Duplicar ${plan.nombre_paciente}`} disabled={busy} onClick={() => void duplicate(plan)}><Copy className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Eliminar" aria-label={`Eliminar ${plan.nombre_paciente}`} disabled={busy} onClick={() => setDeleting(plan)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>)}</div>}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !busy) setDeleting(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar plan de menú?</AlertDialogTitle><AlertDialogDescription>Se eliminará «{deleting?.nombre_paciente}» y todos sus alimentos y recetas. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><Button variant="destructive" disabled={busy} onClick={() => void remove()}>{busy ? "Eliminando…" : "Eliminar"}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CardContent>
  </Card>;
}