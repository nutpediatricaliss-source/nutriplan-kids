import { z } from "zod";
import { uniqueTags } from "./diagnosisTags";

export const clinicalTagFields = ["alergias", "intolerancias"] as const;
export type ClinicalTagField = typeof clinicalTagFields[number];
export const initialClinicalSuggestions: Record<ClinicalTagField, string[]> = {
  alergias: ["Leche de vaca", "Huevo", "Maní", "Frutos secos", "Soya", "Trigo", "Pescado", "Mariscos", "Sésamo"],
  intolerancias: ["Lactosa", "Gluten", "Fructosa"],
};
export function clinicalSuggestions(rows: Partial<Record<ClinicalTagField, string[] | null>>[]) {
  return Object.fromEntries(clinicalTagFields.map((field) => [field,
    uniqueTags([...initialClinicalSuggestions[field], ...rows.flatMap((row) => row[field] ?? [])])
      .sort((a, b) => a.localeCompare(b)),
  ])) as Record<ClinicalTagField, string[]>;
}
export function whatsappUrl(value: string | null) {
  let digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) digits = `593${digits.slice(1)}`;
  return digits ? `https://wa.me/${digits}` : null;
}
export const validContactEmail = (value: string) => !value.trim() || z.string().email().safeParse(value.trim()).success;
// Read legacy values only when the new field has never been populated.
export const foodPreferenceText = (text: string | null, legacy: string[] | null) =>
  text ?? legacy?.join(", ") ?? "";
