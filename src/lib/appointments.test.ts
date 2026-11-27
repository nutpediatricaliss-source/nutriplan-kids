import { describe, expect, it } from "vitest";
import { appointmentIsFuture, DEFAULT_DURATION_MIN, groupAppointments, type Appointment } from "./appointments";
const now = new Date(2026, 10, 27, 12, 0, 0);
const cita = (id: string, fecha: string, estado = "programada", hora: string | null = null) =>
  ({ id, fecha, estado, hora } as Appointment);

describe("patient appointments", () => {
  it("defaults to 45 minutes", () => expect(DEFAULT_DURATION_MIN).toBe(45));
  it("lists only future scheduled appointments in date/time order", () => {
    const result = groupAppointments([cita("late", "2026-11-28", "programada", "15:00:00"), cita("early", "2026-11-28", "programada", "09:00:00"), cita("cancelled", "2026-11-28", "cancelada"), cita("done", "2026-11-28", "realizada")], now);
    expect(result.upcoming.map((c) => c.id)).toEqual(["early", "late"]);
    expect(result.other.map((c) => c.id)).toEqual(["cancelled", "done"]);
  });
  it("shows past appointments most recent first regardless of state", () => {
    const result = groupAppointments([cita("old", "2026-11-20"), cita("recent", "2026-11-26", "no_asistio")], now);
    expect(result.past.map((c) => c.id)).toEqual(["recent", "old"]);
  });
  it("uses optional time to distinguish appointments today", () => {
    expect(appointmentIsFuture(cita("a", "2026-11-27", "programada", "11:00:00"), now)).toBe(false);
    expect(appointmentIsFuture(cita("b", "2026-11-27", "programada", "13:00:00"), now)).toBe(true);
    expect(appointmentIsFuture(cita("c", "2026-11-27"), now)).toBe(true);
  });
});