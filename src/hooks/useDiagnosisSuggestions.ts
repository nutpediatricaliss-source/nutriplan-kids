import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uniqueTags } from "@/lib/diagnosisTags";

export function useDiagnosisSuggestions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["diagnosis-suggestions", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return [];
      const tags: string[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from("pacientes")
          .select("diagnosticos").eq("user_id", user.id).order("id").range(offset, offset + 999);
        if (error) throw error;
        tags.push(...(data ?? []).flatMap((row) => row.diagnosticos));
        if (!data || data.length < 1000) break;
      }
      return uniqueTags(tags).sort((a, b) => a.localeCompare(b));
    },
  });
}