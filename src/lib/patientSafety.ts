import type { Alimento, PlanItem, Receta } from "./types";
import type { Tables } from "@/integrations/supabase/types";
import { normalizeTag, uniqueTags } from "./diagnosisTags";
import { foodPreferenceText } from "./patientHistory";

export type SafetyPatient = Pick<Tables<"pacientes">, "id" | "nombre" | "fecha_nacimiento" | "diagnosticos" | "alergias" | "intolerancias" | "alimentos_gustan_texto" | "alimentos_no_gustan_texto" | "alimentos_gustan" | "alimentos_no_gustan">;
export type PatientAlert = { itemId: string; day: number; meal: string; name: string; kind: "allergy" | "intolerance" | "dislike"; label: string };

export const patientSafetyDictionary: Record<string, string[]> = {
  "leche de vaca": ["leche", "queso", "yogur", "yogurt", "crema", "mantequilla", "requesón", "lácteo"],
  huevo: ["huevo", "clara", "yema"],
  mani: ["maní", "cacahuate", "cacahuete"],
  "frutos secos": ["almendra", "nuez", "avellana", "pistacho", "pistache", "marañón", "anacardo", "castaña"],
  soya: ["soya", "soja", "tofu"],
  trigo: ["trigo", "harina de trigo", "pan", "pasta", "galleta"],
  pescado: ["pescado", "atún", "salmón", "tilapia", "sardina"],
  mariscos: ["camarón", "cangrejo", "langosta", "concha", "calamar", "marisco"],
  sesamo: ["sésamo", "ajonjolí", "tahini"],
  lactosa: ["leche", "queso", "yogur", "yogurt", "crema", "helado"],
  gluten: ["trigo", "cebada", "centeno", "avena", "pan", "pasta"],
  fructosa: ["miel", "jarabe de maíz"],
};

const words = (text: string) => normalizeTag(text).match(/[a-z0-9]+/g) ?? [];
function wordForms(word: string) {
  const forms = new Set([word]);
  if (word.length > 3 && word.endsWith("s")) forms.add(word.slice(0, -1));
  if (word.length > 4 && word.endsWith("es")) forms.add(word.slice(0, -2));
  if (word.length > 4 && word.endsWith("ces")) forms.add(`${word.slice(0, -3)}z`);
  return forms;
}
const sameWord = (a: string, b: string) => {
  const right = wordForms(b);
  return [...wordForms(a)].some((form) => right.has(form));
};
function dictionaryAliases(label: string) {
  const target = words(label);
  const entry = Object.entries(patientSafetyDictionary).find(([key]) => {
    const candidate = words(key);
    return candidate.length === target.length && candidate.every((word, index) => sameWord(word, target[index]));
  });
  return entry?.[1] ?? [];
}

export function containsPatientPhrase(text: string, phrase: string) {
  const source = words(text), target = words(phrase);
  if (!target.length) return false;
  return source.some((_, start) => target.every((word, offset) => {
    const value = source[start + offset];
    return value !== undefined && sameWord(value, word);
  }));
}

export function patientPlanAlerts(patient: SafetyPatient | null, items: PlanItem[], foods: Alimento[], recipes: Receta[]): PatientAlert[] {
  if (!patient) return [];
  const foodMap = new Map(foods.map((food) => [food.id, food]));
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const dislikes = uniqueTags(foodPreferenceText(patient.alimentos_no_gustan_texto, patient.alimentos_no_gustan).split(/[,\n\r]+/));
  const checks = [
    ...uniqueTags(patient.alergias ?? []).map((label) => ({ kind: "allergy" as const, label })),
    ...uniqueTags(patient.intolerancias ?? []).map((label) => ({ kind: "intolerance" as const, label })),
    ...dislikes.map((label) => ({ kind: "dislike" as const, label })),
  ];
  return items.flatMap((item) => {
    const recipe = item.tipo === "receta" ? recipeMap.get(item.item_id) : undefined;
    const baseName = item.tipo === "alimento" ? foodMap.get(item.item_id)?.nombre : recipe?.nombre;
    const name = item.nombre_override || baseName || (item.tipo === "personalizado" ? "Alimento personalizado" : "Ítem");
    return checks.flatMap(({ kind, label }) => {
      const texts = kind === "dislike" ? [name, baseName ?? ""] : [name, baseName ?? "", item.nota_menu ?? "", recipe?.ingredientes ?? ""];
      const aliases = kind === "dislike" ? [label] : [label, ...dictionaryAliases(label)];
      return texts.some((text) => aliases.some((alias) => containsPatientPhrase(text, alias)))
        ? [{ itemId: item.id, day: item.dia, meal: item.tiempo_comida, name, kind, label }] : [];
    });
  });
}

export const patientAlertText = (alert: PatientAlert) => alert.kind === "allergy" ? `Alergia: ${alert.label}` : alert.kind === "intolerance" ? `Intolerancia: ${alert.label}` : "No le gusta";