import type { Database } from "@/integrations/supabase/types";

export type Appointment = Database["public"]["Tables"]["citas"]["Row"];
export const appointmentTypes = {
  consulta_inicial: "Consulta inicial", seguimiento: "Seguimiento", control: "Control", otra: "Otra",
};
export const appointmentStates = {
  programada: "Programada", realizada: "Realizada", cancelada: "Cancelada", no_asistio: "No asistió",
};
export const DEFAULT_DURATION_MIN = 45;
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function appointmentIsFuture(cita: Pick<Appointment, "fecha" | "hora">, now = new Date()) {
  const today = localDate(now);
  if (cita.fecha !== today) return cita.fecha > today;
  if (!cita.hora) return true;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  return cita.hora >= time;
}

export function groupAppointments(citas: Appointment[], now = new Date()) {
  const ordered = [...citas].sort((a, b) => `${a.fecha} ${a.hora ?? ""}`.localeCompare(`${b.fecha} ${b.hora ?? ""}`));
  return {
    upcoming: ordered.filter((c) => c.estado === "programada" && appointmentIsFuture(c, now)),
    past: ordered.filter((c) => !appointmentIsFuture(c, now)).reverse(),
    other: ordered.filter((c) => c.estado !== "programada" && appointmentIsFuture(c, now)),
  };
}

export function appointmentLabel(cita: Pick<Appointment, "fecha" | "hora">) {
  const date = new Date(`${cita.fecha}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
  return `${date}${cita.hora ? ` · ${cita.hora.slice(0, 5)}` : ""}`;
}