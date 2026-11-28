import { describe, expect, it } from "vitest";
import { containsPatientPhrase, patientPlanAlerts, type SafetyPatient } from "./patientSafety";
import type { PlanItem, Receta } from "./types";

const patient: SafetyPatient = { id: "patient", nombre: "Ana", fecha_nacimiento: "2020-01-01", diagnosticos: [],
  alergias: ["Huevo"], intolerancias: ["Lactosa"], alimentos_gustan_texto: "Pera", alimentos_no_gustan_texto: "Brócoli, papaya\nArroz con pollo",
  alimentos_gustan: null, alimentos_no_gustan: null };
const item: PlanItem = { id: "item", plan_id: "plan", item_id: "recipe", dia: 8, tiempo_comida: "Cena", tipo: "personalizado",
  nombre_override: "Claras con queso", nota_menu: "", orden: 0, porcion: "1", incluir_detalle_pdf: false, created_at: "2026-01-01" };

describe("patient safety matching", () => {
  it("matches whole words across case, accents and singular/plural including nueces and panes", () => {
    for (const [text, label] of [["ATUNES", "atún"], ["Nueces", "nuez"], ["PANES", "pan"], ["Leches", "leche"], ["huevo", "huevos"], ["camarones", "camarón"]]) expect(containsPatientPhrase(text, label)).toBe(true);
    expect(containsPatientPhrase("empanada y papaya", "pan")).toBe(false);
    expect(containsPatientPhrase("cremación", "crema")).toBe(false);
  });
  it.each([
    { label: "Leche de vaca", aliases: ["leche", "queso", "yogur", "yogurt", "crema", "mantequilla", "requesón", "lácteo"] },
    { label: "Huevo", aliases: ["huevo", "clara", "yema"] },
    { label: "Maní", aliases: ["maní", "cacahuate", "cacahuete"] },
    { label: "Frutos secos", aliases: ["almendra", "nuez", "avellana", "pistacho", "pistache", "marañón", "anacardo", "castaña"] },
    { label: "Soya", aliases: ["soya", "soja", "tofu"] },
    { label: "Trigo", aliases: ["trigo", "harina de trigo", "pan", "pasta", "galleta"] },
    { label: "Pescado", aliases: ["pescado", "atún", "salmón", "tilapia", "sardina"] },
    { label: "Mariscos", aliases: ["camarón", "cangrejo", "langosta", "concha", "calamar", "marisco"] },
    { label: "Sésamo", aliases: ["sésamo", "ajonjolí", "tahini"] },
    { label: "Lactosa", aliases: ["leche", "queso", "yogur", "yogurt", "crema", "helado"] },
    { label: "Gluten", aliases: ["trigo", "cebada", "centeno", "avena", "pan", "pasta"] },
    { label: "Fructosa", aliases: ["miel", "jarabe de maíz"] },
  ])("checks every requested alias for $label", ({ label, aliases }) => {
    for (const word of [...aliases, label]) {
      const alerts = patientPlanAlerts({ ...patient, alergias: [label], intolerancias: [], alimentos_no_gustan_texto: "" }, [{ ...item, nombre_override: word }], [], []);
      expect(alerts.map((alert) => alert.label)).toEqual([label]);
    }
  });
  it("also resolves dictionary labels written in plural", () => {
    expect(patientPlanAlerts({ ...patient, alergias: ["Huevos"], intolerancias: [] }, [{ ...item, nombre_override: "Clara" }], [], []).map((alert) => alert.label)).toEqual(["Huevos"]);
  });
  it("checks custom labels literally and recipe ingredients and item notes", () => {
    const recipe = { id: "recipe", nombre: "Sopa", ingredientes: "Yemas, queso", } as Receta;
    const alerts = patientPlanAlerts(patient, [{ ...item, tipo: "receta", nombre_override: "Cena" }], [], [recipe]);
    expect(alerts.map((alert) => alert.kind)).toEqual(["allergy", "intolerance"]);
    expect(patientPlanAlerts({ ...patient, alergias: ["Kiwi"], intolerancias: [] }, [{ ...item, nombre_override: "Arroz", nota_menu: "Agregar KIWIS" }], [], []).map((alert) => alert.label)).toEqual(["Kiwi"]);
  });
  it("splits dislikes by commas and newlines and matches only names, not notes or ingredients", () => {
    const recipe = { id: "recipe", nombre: "Sopa", ingredientes: "Papaya" } as Receta;
    expect(patientPlanAlerts(patient, [{ ...item, tipo: "receta", nombre_override: "Sopa", nota_menu: "Brócoli" }], [], [recipe])).toEqual([]);
    expect(patientPlanAlerts(patient, [{ ...item, nombre_override: "Papayas" }], [], []).map((alert) => alert.kind)).toEqual(["dislike"]);
    expect(patientPlanAlerts(patient, [{ ...item, nombre_override: "Arroz con pollo" }], [], []).map((alert) => alert.label)).toEqual(["Arroz con pollo"]);
  });
  it("checks the whole plan and recomputes after deletion or patient change, doing nothing without a patient", () => {
    expect(patientPlanAlerts(patient, [item, { ...item, id: "other", dia: 14 }], [], []).map((alert) => alert.day)).toEqual([8, 8, 14, 14]);
    expect(patientPlanAlerts(patient, [], [], [])).toEqual([]);
    expect(patientPlanAlerts({ ...patient, alergias: [], intolerancias: [] }, [item], [], [])).toEqual([]);
    expect(patientPlanAlerts(null, [item], [], [])).toEqual([]);
  });
  it("requires contiguous phrases and does not bridge a name and note", () => {
    expect(containsPatientPhrase("jarabe de maíz", "jarabe de maiz")).toBe(true);
    expect(containsPatientPhrase("jarabe con miel y maíz", "jarabe de maíz")).toBe(false);
    expect(patientPlanAlerts({ ...patient, alergias: ["harina de arroz"], intolerancias: [] }, [{ ...item, nombre_override: "harina", nota_menu: "de arroz" }], [], [])).toEqual([]);
  });
});