export const normalizeTag = (text: string) =>
  text.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags.map((tag) => tag.trim()).filter((tag) => {
    const key = normalizeTag(tag);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const addTags = (tags: string[], text: string) => uniqueTags([...tags, ...text.split(/[,;]/)]);

export function matchingTags(suggestions: string[], selected: string[], query: string) {
  const keys = new Set(selected.map(normalizeTag));
  return uniqueTags(suggestions).filter((tag) =>
    !keys.has(normalizeTag(tag)) && normalizeTag(tag).includes(normalizeTag(query)));
}

export function patientMatches(patient: { nombre: string; diagnosticos: string[]; representante1_nombre?: string | null; representante2_nombre?: string | null }, query: string) {
  const key = normalizeTag(query);
  return [patient.nombre, ...patient.diagnosticos, patient.representante1_nombre ?? "", patient.representante2_nombre ?? ""].some((text) => normalizeTag(text).includes(key));
}