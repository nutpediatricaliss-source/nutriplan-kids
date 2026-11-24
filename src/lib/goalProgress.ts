export type Macros4 = { kcal: number; prot: number; grasa: number; carbs: number };

/** Meta diaria a partir del requerimiento total (ya incluye factor de actividad) y % de macros. */
export function metaDesdeConsulta(
  reeTotal: number,
  pct: { proteina?: number; grasa?: number; carbohidrato?: number } | null | undefined
): Macros4 {
  const p = pct ?? {};
  return {
    kcal: Math.round(reeTotal),
    prot: Math.round(((reeTotal * (Number(p.proteina) || 0)) / 100 / 4) * 10) / 10,
    grasa: Math.round(((reeTotal * (Number(p.grasa) || 0)) / 100 / 9) * 10) / 10,
    carbs: Math.round(((reeTotal * (Number(p.carbohidrato) || 0)) / 100 / 4) * 10) / 10,
  };
}

export type ProgressTone = "bajo" | "ok" | "alto";
export function progressTone(llevo: number, meta: number): ProgressTone {
  if (!meta) return "bajo";
  const r = llevo / meta;
  if (r < 0.9) return "bajo";
  if (r <= 1.1) return "ok";
  return "alto";
}
