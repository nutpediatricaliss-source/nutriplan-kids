import type { Appointment } from "@/lib/appointments";

export const AGENDA_TIME_ZONE = "America/Guayaquil";
export function ecuadorToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: AGENDA_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
const asDate = (day: string) => new Date(`${day}T12:00:00Z`);
export const shiftDay = (day: string, amount: number) => {
  const date = asDate(day); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10);
};
export function shiftMonth(day: string, amount: number) {
  const date = asDate(day); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + amount); return date.toISOString().slice(0, 10);
}
export const monday = (day: string) => shiftDay(day, -((asDate(day).getUTCDay() + 6) % 7));
export function calendarDays(day: string, mode: "month" | "week") {
  const start = mode === "week" ? monday(day) : monday(`${day.slice(0, 7)}-01`);
  if (mode === "week") return Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
  const last = shiftDay(shiftMonth(day, 1), -1);
  const end = shiftDay(monday(last), 6);
  const days: string[] = [];
  for (let current = start; current <= end; current = shiftDay(current, 1)) days.push(current);
  return days;
}
export const formatAgendaDay = (day: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  new Intl.DateTimeFormat("es-EC", { ...options, timeZone: "UTC" }).format(asDate(day));

export type AgendaPatient = { id: string; nombre: string };
export type AgendaConsultation = { id: string; paciente_id: string; fecha: string };
export type AgendaEvent = {
  id: string; patientId: string; name: string; date: string; time: string | null;
  kind: "appointment" | "consultation"; state: string; type: string; place: string | null;
};
export function agendaEvents(appointments: Appointment[], consultations: AgendaConsultation[], patients: AgendaPatient[], place = "") {
  const names = new Map(patients.map((p) => [p.id, p.nombre]));
  const visitKeys = new Set(consultations.map((c) => `${c.paciente_id}/${c.fecha}`));
  const seen = new Set<string>();
  const visits: AgendaEvent[] = [];
  for (const c of consultations) {
    const key = `${c.paciente_id}/${c.fecha}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (place && !appointments.some((a) => a.paciente_id === c.paciente_id && a.fecha === c.fecha && a.estado === "realizada" && a.lugar === place)) continue;
    const matched = appointments.find((a) => a.paciente_id === c.paciente_id && a.fecha === c.fecha && a.estado === "realizada" && (!place || a.lugar === place));
    visits.push({ id: `consultation-${c.id}`, patientId: c.paciente_id, name: names.get(c.paciente_id) ?? "Paciente", date: c.fecha, time: matched?.hora ?? null, kind: "consultation", state: "realizada", type: "consulta", place: matched?.lugar ?? null });
  }
  const events: AgendaEvent[] = appointments.filter((a) => (!place || a.lugar === place) && !(a.estado === "realizada" && visitKeys.has(`${a.paciente_id}/${a.fecha}`)))
    .map((a) => ({ id: a.id, patientId: a.paciente_id, name: names.get(a.paciente_id) ?? "Paciente", date: a.fecha, time: a.hora, kind: "appointment", state: a.estado, type: a.tipo, place: a.lugar }));
  return [...events, ...visits].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.name.localeCompare(b.name));
}
export function upcomingAgenda(events: AgendaEvent[], today: string) {
  return events.filter((e) => e.kind === "appointment" && e.state === "programada" && e.date >= today && e.date <= shiftDay(today, 7));
}