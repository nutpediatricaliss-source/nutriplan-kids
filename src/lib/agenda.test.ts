import { describe, expect, it } from "vitest";
import { agendaEvents, calendarDays, ecuadorToday, formatAgendaDay, upcomingAgenda } from "./agenda";
import type { Appointment } from "./appointments";
const appt = (id: string, fecha: string, estado = "programada", hora: string | null = null) => ({ id, fecha, estado, hora, paciente_id: "patient", tipo: "seguimiento", lugar: "Consultorio" } as Appointment);
describe("agenda rules", () => {
  it("uses Ecuador date even when UTC is already the next day", () => {
    expect(ecuadorToday(new Date("2026-11-27T03:14:00Z"))).toBe("2026-11-26");
  });
  it("never shifts date-only values when formatting", () => expect(formatAgendaDay("2026-11-27", { day: "numeric" })).toBe("27"));
  it("starts both calendar views on Monday", () => {
    expect(calendarDays("2026-11-27", "week")).toEqual(["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"]);
    expect(calendarDays("2026-11-27", "month")[0]).toBe("2026-10-26");
    expect(calendarDays("2026-11-27", "month").at(-1)).toBe("2026-12-06");
  });
  it("shows a completed appointment and its same-day patient consultation only once", () => {
    const events = agendaEvents([appt("a", "2026-11-27", "realizada", "10:00:00"), appt("cancel", "2026-11-27", "cancelada")], [{ id: "visit", paciente_id: "patient", fecha: "2026-11-27" }], [{ id: "patient", nombre: "Sofía" }]);
    expect(events.map((e) => e.id)).toEqual(["consultation-visit", "cancel"]);
    expect(events[0]?.time).toBe("10:00:00");
  });
  it("includes today and the following seven days, only scheduled appointments", () => {
    const events = agendaEvents([appt("today", "2026-11-27"), appt("seven", "2026-12-04"), appt("eight", "2026-12-05"), appt("old", "2026-11-26"), appt("cancel", "2026-11-28", "cancelada")], [], []);
    expect(upcomingAgenda(events, "2026-11-27").map((e) => e.id)).toEqual(["today", "seven"]);
  });
  it("filters by place and sorts appointments by time", () => {
    const events = agendaEvents([appt("late", "2026-11-27", "programada", "15:00:00"), appt("early", "2026-11-27", "programada", "09:00:00")], [], [], "Consultorio");
    expect(events.map((e) => e.id)).toEqual(["early", "late"]);
    expect(agendaEvents([appt("a", "2026-11-27")], [], [], "Otro lugar")).toEqual([]);
  });
});