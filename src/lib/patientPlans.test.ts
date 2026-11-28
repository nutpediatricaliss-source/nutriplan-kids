import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { copiedItems, patientAssignment, planCopy } from "./patientPlans";
import type { PlanMenu, PlanItem } from "./types";

const plan: PlanMenu = {
  id: "original", user_id: "owner", paciente_id: "patient", nombre_paciente: "Ana",
  dias: 28, tiempos_comida: ["Cena", "Desayuno"], pautas_extra: "Pautas",
  generalidades: "Generalidades", recomendaciones: "Recomendaciones", snacks_colaciones: "Snacks",
  mensaje_agradecimiento: "Gracias", estilo_pdf: "tabla", es_plantilla: false,
  created_at: "2026-01-01", updated_at: "2026-01-02",
};

describe("patient menu plans", () => {
  it("stores the registered patient's id and name for PDF compatibility", () => {
    expect(patientAssignment({ id: "patient", nombre: "Ana" }, "Old name")).toEqual({ paciente_id: "patient", nombre_paciente: "Ana" });
  });
  it("keeps old and free names without an assigned patient", () => {
    expect(patientAssignment(null, "Nombre antiguo")).toEqual({ paciente_id: null, nombre_paciente: "Nombre antiguo" });
  });
  it("copies every setting for the same patient and appends (copia) without reusing identity", () => {
    const copy = planCopy(plan, "owner");
    expect(copy).toEqual({ user_id: "owner", paciente_id: "patient", nombre_paciente: "Ana (copia)", dias: 28,
      tiempos_comida: ["Cena", "Desayuno"], pautas_extra: "Pautas", generalidades: "Generalidades",
      recomendaciones: "Recomendaciones", snacks_colaciones: "Snacks", mensaje_agradecimiento: "Gracias", estilo_pdf: "tabla", es_plantilla: false });
    expect(plan.nombre_paciente).toBe("Ana");
  });
  it("preserves item day, meal, order, portion, notes and override in independent items", () => {
    const item: PlanItem = { id: "item", created_at: "2026-01-01", plan_id: "original", dia: 14,
      tiempo_comida: "Cena", tipo: "receta", item_id: "recipe", orden: 3, porcion: "2",
      nota_menu: "Sin sal", nombre_override: "Cena especial", incluir_detalle_pdf: false };
    expect(copiedItems([item], "copy")).toEqual([{ plan_id: "copy", dia: 14, tiempo_comida: "Cena", tipo: "receta",
      item_id: "recipe", orden: 3, porcion: "2", nota_menu: "Sin sal", nombre_override: "Cena especial", incluir_detalle_pdf: false }]);
    expect(item.plan_id).toBe("original");
  });
});