import { describe, expect, it } from "vitest";
import { itemMarkPrintColors, normalizeItemMark, toggleItemMark } from "./itemMarks";

describe("menu item marks", () => {
  it("allows only alergeno or blw and treats absent/empty marks as unmarked", () => {
    expect(normalizeItemMark("alergeno")).toBe("alergeno");
    expect(normalizeItemMark("blw")).toBe("blw");
    for (const value of [null, undefined, "", "other"]) expect(normalizeItemMark(value)).toBeNull();
  });
  it("toggles each mark off and replaces the other mark", () => {
    expect(toggleItemMark(null, "alergeno")).toBe("alergeno");
    expect(toggleItemMark("alergeno", "alergeno")).toBeNull();
    expect(toggleItemMark("alergeno", "blw")).toBe("blw");
    expect(toggleItemMark("blw", "blw")).toBeNull();
    expect(toggleItemMark("blw", "alergeno")).toBe("alergeno");
  });
  it("prints the exact orange D9480F and purple 6D28D9", () => {
    expect(itemMarkPrintColors.alergeno).toEqual([217, 72, 15]);
    expect(itemMarkPrintColors.blw).toEqual([109, 40, 217]);
  });
});