import type { Database } from "@/integrations/supabase/types";

export type Alimento = Database["public"]["Tables"]["alimentos_smae"]["Row"];
export type AlimentoInsert = Database["public"]["Tables"]["alimentos_smae"]["Insert"];
export type Receta = Database["public"]["Tables"]["recetas"]["Row"];
export type RecetaInsert = Database["public"]["Tables"]["recetas"]["Insert"];
export type PlanMenu = Database["public"]["Tables"]["planes_menu"]["Row"];
export type PlanMenuInsert = Database["public"]["Tables"]["planes_menu"]["Insert"];
export type PlanItem = Database["public"]["Tables"]["plan_items"]["Row"];
export type PlanItemInsert = Database["public"]["Tables"]["plan_items"]["Insert"];

export interface PlanItemWithDetails extends PlanItem {
  alimento?: Alimento;
  receta?: Receta;
}
