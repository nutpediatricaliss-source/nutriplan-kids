import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export function usePlanSafetyPatient(patientId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan-safety-patient", user?.id, patientId],
    enabled: Boolean(user && patientId),
    queryFn: async () => {
      if (!user || !patientId) return null;
      const { data, error } = await supabase.from("pacientes")
        .select("id,nombre,fecha_nacimiento,diagnosticos,alergias,intolerancias,alimentos_gustan_texto,alimentos_no_gustan_texto,alimentos_gustan,alimentos_no_gustan")
        .eq("user_id", user.id).eq("id", patientId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}