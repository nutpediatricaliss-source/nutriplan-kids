import { supabase } from "@/integrations/supabase/client";
import type { PlanMenu, PlanItem } from "@/lib/types";

export function patientAssignment(patient: { id: string; nombre: string } | null, freeName: string) {
  return { paciente_id: patient?.id ?? null, nombre_paciente: patient?.nombre ?? freeName };
}

export function planCopy(plan: PlanMenu, userId: string) {
  const { id, created_at, updated_at, ...fields } = plan;
  return { ...fields, user_id: userId, es_plantilla: false, nombre_paciente: `${plan.nombre_paciente} (copia)` };
}

export function copiedItems(items: PlanItem[], planId: string) {
  return items.map(({ id, created_at, ...fields }) => ({ ...fields, plan_id: planId }));
}

// Paginate both lists and copied items; the Data API caps each response at 1000.
export async function duplicatePatientPlan(plan: PlanMenu, userId: string) {
  const items: PlanItem[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("plan_items").select("*").eq("plan_id", plan.id)
      .order("orden").order("id").range(offset, offset + 999);
    if (error) throw error;
    items.push(...data);
    if (data.length < 1000) break;
  }
  const { data: copy, error } = await supabase.from("planes_menu").insert(planCopy(plan, userId)).select().single();
  if (error) throw error;
  try {
    for (let offset = 0; offset < items.length; offset += 500) {
      const { error: itemError } = await supabase.from("plan_items").insert(copiedItems(items.slice(offset, offset + 500), copy.id));
      if (itemError) throw itemError;
    }
  } catch (cause) {
    const { error: cleanupError } = await supabase.from("planes_menu").delete().eq("id", copy.id).eq("user_id", userId);
    if (cleanupError) throw new Error("No se completó la copia; elimina el plan incompleto desde la ficha.");
    throw cause;
  }
  return copy;
}