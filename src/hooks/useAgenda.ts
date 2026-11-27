import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Appointment } from "@/lib/appointments";
import type { AgendaPatient, AgendaConsultation } from "@/lib/agenda";

export function useAgenda(start: string, end: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["agenda", user?.id, start, end], enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return { patients: [], appointments: [], consultations: [], places: [] };
      const loadPatients = async () => {
        const rows: AgendaPatient[] = [];
        for (let n = 0; ; n += 1000) {
          const { data, error } = await supabase.from("pacientes").select("id,nombre").eq("user_id", user.id).order("id").range(n, n + 999);
          if (error) throw error;
          rows.push(...data); if (data.length < 1000) return rows;
        }
      };
      const loadAppointments = async () => {
        const rows: Appointment[] = [];
        for (let n = 0; ; n += 1000) {
          const { data, error } = await supabase.from("citas").select("*").eq("user_id", user.id).gte("fecha", start).lte("fecha", end).order("id").range(n, n + 999);
          if (error) throw error;
          rows.push(...data); if (data.length < 1000) return rows;
        }
      };
      const loadConsultations = async () => {
        const rows: AgendaConsultation[] = [];
        for (let n = 0; ; n += 1000) {
          const { data, error } = await supabase.from("consultas").select("id,paciente_id,fecha,pacientes!inner(user_id)").eq("pacientes.user_id", user.id).gte("fecha", start).lte("fecha", end).order("id").range(n, n + 999);
          if (error) throw error;
          rows.push(...data); if (data.length < 1000) return rows;
        }
      };
      const loadPlaces = async () => {
        const places = new Set<string>();
        for (let n = 0; ; n += 1000) {
          const { data, error } = await supabase.from("citas").select("lugar").eq("user_id", user.id).not("lugar", "is", null).order("id").range(n, n + 999);
          if (error) throw error;
          data.forEach((c) => { if (c.lugar) places.add(c.lugar); });
          if (data.length < 1000) return [...places].sort((a, b) => a.localeCompare(b));
        }
      };
      const [patients, appointments, consultations, places] = await Promise.all([loadPatients(), loadAppointments(), loadConsultations(), loadPlaces()]);
      return { patients, appointments, consultations, places };
    },
    refetchInterval: 60000,
  });
}