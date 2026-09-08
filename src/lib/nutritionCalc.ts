export type Sexo = "M" | "F";
export type FormulaREE = "schofield-wh" | "schofield-w" | "fao";

// ---- Fórmulas (kcal/día, gasto energético basal) ----
export function schofieldWH(sexo: Sexo, edad: number, peso: number, talla: number) {
  // talla en cm
  if (sexo === "M") {
    if (edad < 3) return 0.167 * peso + 15.174 * (talla / 100) - 617.6;
    if (edad < 10) return 19.59 * peso + 1.303 * talla + 414.9;
    if (edad < 18) return 16.25 * peso + 1.372 * talla + 515.5;
    return 15.057 * peso + 1.004 * talla + 705.8;
  } else {
    if (edad < 3) return 16.252 * peso + 10.232 * (talla / 100) - 413.5;
    if (edad < 10) return 16.969 * peso + 1.618 * talla + 371.2;
    if (edad < 18) return 8.365 * peso + 4.65 * talla + 200;
    return 13.623 * peso + 23.8 * (talla / 100) + 98.2;
  }
}

export function schofieldW(sexo: Sexo, edad: number, peso: number) {
  if (sexo === "M") {
    if (edad < 3) return 59.512 * peso - 30.4;
    if (edad < 10) return 22.706 * peso + 504.3;
    if (edad < 18) return 17.686 * peso + 658.2;
    return 15.057 * peso + 692.2;
  } else {
    if (edad < 3) return 58.317 * peso - 31.1;
    if (edad < 10) return 20.315 * peso + 485.9;
    if (edad < 18) return 13.384 * peso + 692.6;
    return 14.818 * peso + 486.6;
  }
}

export function faoOms(sexo: Sexo, edad: number, peso: number) {
  if (sexo === "M") {
    if (edad < 3) return 60.9 * peso - 54;
    if (edad < 10) return 22.7 * peso + 495;
    if (edad < 18) return 17.5 * peso + 651;
    return 15.3 * peso + 679;
  } else {
    if (edad < 3) return 61.0 * peso - 51;
    if (edad < 10) return 22.5 * peso + 499;
    if (edad < 18) return 12.2 * peso + 746;
    return 14.7 * peso + 496;
  }
}

export const actividades = [
  { value: "1.2", label: "Reposo / sedentario (1.2)" },
  { value: "1.3", label: "Muy ligera (1.3)" },
  { value: "1.55", label: "Ligera (1.55)" },
  { value: "1.75", label: "Moderada (1.75)" },
  { value: "2.0", label: "Intensa (2.0)" },
];

export const formulaLabels: Record<FormulaREE, string> = {
  "schofield-wh": "Schofield P+T",
  "schofield-w": "Schofield P",
  fao: "FAO/OMS",
};

export function calcTMB(
  formula: FormulaREE,
  sexo: Sexo,
  edad: number,
  peso: number,
  talla: number
) {
  if (!peso || !edad) return 0;
  if (formula === "schofield-wh") return schofieldWH(sexo, edad, peso, talla || 0);
  if (formula === "schofield-w") return schofieldW(sexo, edad, peso);
  return faoOms(sexo, edad, peso);
}

export function calcMacros(get: number, pct: number, kcalPorG: number, peso: number) {
  const kcal = (get * pct) / 100;
  const g = kcal / kcalPorG;
  const gxkg = peso ? g / peso : 0;
  return {
    kcal: Math.round(kcal),
    g: Math.round(g * 10) / 10,
    gxkg: Math.round(gxkg * 100) / 100,
  };
}

/** Edad decimal en años a partir de una fecha de nacimiento (YYYY-MM-DD). */
export function edadDesdeFecha(fechaNacimiento: string): number {
  const nac = new Date(fechaNacimiento + "T00:00:00");
  if (isNaN(nac.getTime())) return 0;
  const ms = Date.now() - nac.getTime();
  return Math.max(0, Math.round((ms / (365.25 * 24 * 3600 * 1000)) * 10) / 10);
}

/** Edad legible: "3 años 4 meses" o "8 meses". */
export function edadLegible(fechaNacimiento: string): string {
  const nac = new Date(fechaNacimiento + "T00:00:00");
  if (isNaN(nac.getTime())) return "—";
  const hoy = new Date();
  let meses =
    (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth());
  if (hoy.getDate() < nac.getDate()) meses -= 1;
  meses = Math.max(0, meses);
  const anios = Math.floor(meses / 12);
  const rest = meses % 12;
  if (anios === 0) return `${rest} ${rest === 1 ? "mes" : "meses"}`;
  if (rest === 0) return `${anios} ${anios === 1 ? "año" : "años"}`;
  return `${anios} ${anios === 1 ? "año" : "años"} ${rest} ${rest === 1 ? "mes" : "meses"}`;
}
