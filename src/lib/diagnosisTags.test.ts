import { describe, expect, it } from "vitest";
import { addTags, matchingTags, patientMatches, uniqueTags } from "./diagnosisTags";

describe("diagnosis tags", () => {
  it("prevents duplicates including case and accent variants", () => {
    expect(uniqueTags(["Anémia", "anemia", "ANEMIA", " ", "Alergia"])).toEqual(["Anémia", "Alergia"]);
  });
  it("adds comma and semicolon separated diagnoses without losing any", () => {
    expect(addTags([], "Anemia, Alergia; Bajo peso")).toEqual(["Anemia", "Alergia", "Bajo peso"]);
  });
  it("suggests matches without case or accents and excludes selected tags", () => {
    expect(matchingTags(["Anémia", "Alergia", "ALERGIA"], ["anemia"], "ALER")).toEqual(["Alergia"]);
  });
  it("searches patient names and diagnosis tags", () => {
    const patient = { nombre: "Sofía", diagnosticos: ["Anémia"] };
    expect(patientMatches(patient, "ANEMIA")).toBe(true);
    expect(patientMatches(patient, "sofia")).toBe(true);
    expect(patientMatches(patient, "Alergia")).toBe(false);
  });
});