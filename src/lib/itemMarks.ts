export type ItemMark = "alergeno" | "blw";
export const normalizeItemMark = (value: unknown): ItemMark | null => value === "alergeno" || value === "blw" ? value : null;
export const toggleItemMark = (current: unknown, selected: ItemMark): ItemMark | null => normalizeItemMark(current) === selected ? null : selected;
// Exact semantic print colors, matching --mark-allergen and --mark-blw in global CSS.
export const itemMarkPrintColors: Record<ItemMark, [number, number, number]> = { alergeno: [217, 72, 15], blw: [109, 40, 217] };
export const itemMarkClass = (value: unknown) => normalizeItemMark(value) === "alergeno" ? "mark-allergen-name" : normalizeItemMark(value) === "blw" ? "mark-blw-name" : "";