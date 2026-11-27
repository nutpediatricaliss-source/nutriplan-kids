import { describe, expect, it } from "vitest";
import { clinicalSuggestions, foodPreferenceText, initialClinicalSuggestions, validContactEmail, whatsappUrl } from "./patientHistory";
import { patientMatches } from "./diagnosisTags";

describe("patient contact and history", () => {
  it("converts a 10 digit local number starting with 0 to Ecuador's 593 prefix", () => {
    expect(whatsappUrl("0991234567")).toBe("https://wa.me/593991234567");
  });
  it("preserves an existing Ecuador country code with or without +", () => {
    expect(whatsappUrl("+593 99 123 4567")).toBe("https://wa.me/593991234567");
    expect(whatsappUrl("593991234567")).toBe("https://wa.me/593991234567");
    expect(whatsappUrl(null)).toBeNull();
  });
  it("accepts an optional valid email and rejects malformed email", () => {
    expect(validContactEmail("")).toBe(true);
    expect(validContactEmail(" representante@example.com ")).toBe(true);
    expect(validContactEmail("representante@correo")).toBe(false);
    expect(validContactEmail("not-an-email")).toBe(false);
  });
  it("includes the nine initial allergens", () => {
    expect(initialClinicalSuggestions.alergias).toEqual(["Leche de vaca", "Huevo", "Maní", "Frutos secos", "Soya", "Trigo", "Pescado", "Mariscos", "Sésamo"]);
  });
  it("includes the three initial intolerances", () => {
    expect(initialClinicalSuggestions.intolerancias).toEqual(["Lactosa", "Gluten", "Fructosa"]);
  });
  it("keeps tag suggestions separate by field and deduplicates case and accents", () => {
    const tags = clinicalSuggestions([{ alergias: ["MANI", "Kiwi"], intolerancias: ["Sorbitol"] }]);
    expect(tags.alergias.filter((tag) => /man[ií]/i.test(tag))).toEqual(["Maní"]);
    expect(tags.alergias).toContain("Kiwi");
    expect(tags.alergias).not.toContain("Sorbitol");
    expect(tags.intolerancias).toContain("Sorbitol");
  });
  it("finds either representative without distinguishing case or accents", () => {
    const patient = { nombre: "Paciente", diagnosticos: [], representante1_nombre: "María Pérez", representante2_nombre: "José López" };
    expect(patientMatches(patient, "MARIA")).toBe(true);
    expect(patientMatches(patient, "jose lopez")).toBe(true);
    expect(patientMatches(patient, "Ana")).toBe(false);
  });
});
describe("free text food preferences", () => {
  it("preserves all legacy preferences as comma separated text", () => {
    expect(foodPreferenceText(null, ["Pera", "Arroz con pollo", "Brócoli"])).toBe("Pera, Arroz con pollo, Brócoli");
  });
  it("keeps edited free text including newlines instead of stale legacy tags", () => {
    expect(foodPreferenceText("Pera\nPrefiere frutas", ["Arroz"])).toBe("Pera\nPrefiere frutas");
    expect(foodPreferenceText("", ["Arroz"])).toBe("");
  });
});
