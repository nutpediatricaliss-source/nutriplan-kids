import { describe, expect, it } from "vitest";
import { dietaryRecallFormat, insertDietaryRecallFormat } from "./dietaryRecall";

describe("24-hour recall format insertion", () => {
  it("initializes an empty recall", () => {
    expect(insertDietaryRecallFormat("")).toBe(dietaryRecallFormat);
    expect(insertDietaryRecallFormat(" \n ")).toBe(dietaryRecallFormat);
  });
  it("never replaces existing entries or their line breaks", () => {
    const recorded = "Desayuno: avena\nComida: arroz\nCena: sopa\n";
    expect(insertDietaryRecallFormat(recorded)).toBe(recorded);
  });
  it("does not append another format when pressed again", () => {
    expect(insertDietaryRecallFormat(insertDietaryRecallFormat(""))).toBe(dietaryRecallFormat);
  });
});