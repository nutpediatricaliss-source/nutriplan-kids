import { describe, it, expect } from "vitest";
import { metaDesdeConsulta, progressTone } from "./goalProgress";

describe("meta del paciente", () => {
  it("usa el requerimiento total sin volver a multiplicar el factor", () => {
    const m = metaDesdeConsulta(1800, { proteina: 15, grasa: 30, carbohidrato: 55 });
    expect(m).toEqual({ kcal: 1800, prot: 67.5, grasa: 60, carbs: 247.5 });
  });
  it("colores: <90% gris, 90-110% verde, >110% naranja", () => {
    expect(progressTone(89, 100)).toBe("bajo");
    expect(progressTone(90, 100)).toBe("ok");
    expect(progressTone(110, 100)).toBe("ok");
    expect(progressTone(111, 100)).toBe("alto");
  });
});
