import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { type Appointment } from "@/lib/appointments";

export function usePatientAppointments(patientId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["patient-appointments", user?.id, patientId],
    enabled: Boolean(user && patientId),
    queryFn: async () => {
      if (!user || !patientId) return [];
      const appointments: Appointment[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from("citas").select("*").eq("user_id", user.id)
          .eq("paciente_id", patientId).order("fecha").order("hora").order("id").range(offset, offset + 999);
        if (error) throw error;
        appointments.push(...data);
        if (data.length < 1000) break;
      }
      return appointments;
    },
    refetchInterval: 60000,
  });
}