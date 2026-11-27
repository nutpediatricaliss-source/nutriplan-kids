import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { clinicalSuggestions, type ClinicalTagField } from "@/lib/patientHistory";

export function useClinicalSuggestions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clinical-suggestions", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return clinicalSuggestions([]);
      const rows: Record<ClinicalTagField, string[] | null>[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from("pacientes")
          .select("alergias,intolerancias")
          .eq("user_id", user.id).order("id").range(offset, offset + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return clinicalSuggestions(rows);
    },
  });
}