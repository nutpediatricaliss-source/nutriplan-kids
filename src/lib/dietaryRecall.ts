export const dietaryRecallFormat = [
  "Desayuno: ",
  "Colación AM: ",
  "Comida: ",
  "Colación PM: ",
  "Cena: ",
  "Otros (líquidos, snacks): ",
].join("\n");

export function insertDietaryRecallFormat(current: string) {
  return current.trim() ? current : dietaryRecallFormat;
}