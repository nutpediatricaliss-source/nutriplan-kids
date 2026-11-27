import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/integrations/supabase/types";

// Run explicitly with APPOINTMENTS_TEST_SESSION_FILE pointing to an authorized test session.
const sessionFile = process.env.APPOINTMENTS_TEST_SESSION_FILE;
describe.skipIf(!sessionFile)("appointment database rules", () => {
  it("completes only same-patient same-date scheduled appointments on consultation save and preserves owner isolation", async () => {
    if (!sessionFile) return;
    const { session } = JSON.parse(readFileSync(sessionFile, "utf8"));
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const client = createClient<Database>(url, key, { global: { headers: { Authorization: `Bearer ${session.access_token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const anonymous = createClient<Database>(url, key, { auth: { persistSession: false } });
    const { data: identity, error: authError } = await client.auth.getUser(session.access_token);
    if (authError || !identity.user) throw new Error("Authorized test session required");
    const patientIds: string[] = [];
    try {
      const { data: patients, error } = await client.from("pacientes").insert([1, 2].map((n) => ({ user_id: identity.user.id, nombre: `Prueba citas temporal ${Date.now()} ${n}`, fecha_nacimiento: "2020-01-01" }))).select("id");
      if (error || !patients || patients.length !== 2) throw new Error("Could not create temporary patients");
      patientIds.push(...patients.map((p) => p.id));
      const [patient, other] = patients;
      if (!patient || !other) throw new Error("Temporary patients missing");
      const { data: appointments, error: createError } = await client.from("citas").insert([
        { user_id: identity.user.id, paciente_id: patient.id, fecha: "2026-12-01", estado: "programada" },
        { user_id: identity.user.id, paciente_id: patient.id, fecha: "2026-12-02", estado: "programada" },
        { user_id: identity.user.id, paciente_id: patient.id, fecha: "2026-12-01", estado: "cancelada" },
        { user_id: identity.user.id, paciente_id: other.id, fecha: "2026-12-01", estado: "programada" },
      ]).select("id, duracion_min, estado");
      if (createError || !appointments) throw new Error("Could not create temporary appointments");
      expect(appointments.map((c) => c.duracion_min)).toEqual([45, 45, 45, 45]);
      const { error: denied } = await client.from("citas").insert({ user_id: crypto.randomUUID(), paciente_id: patient.id, fecha: "2026-12-01" });
      expect(Boolean(denied)).toBe(true);
      const { data: publicRows } = await anonymous.from("citas").select("id").in("paciente_id", patientIds);
      expect(publicRows ?? []).toEqual([]);
      const { data: consultation, error: saveError } = await client.from("consultas").insert({ paciente_id: patient.id, fecha: "2026-12-01", peso: 20 }).select("id").single();
      if (saveError || !consultation) throw new Error("Could not save temporary consultation");
      const states = async () => {
        const { data, error } = await client.from("citas").select("id, estado").in("paciente_id", patientIds);
        if (error || !data) throw new Error("Could not read appointment states");
        return appointments.map((c) => data.find((row) => row.id === c.id)?.estado);
      };
      expect(await states()).toEqual(["realizada", "programada", "cancelada", "programada"]);
      const { error: updateError } = await client.from("consultas").update({ fecha: "2026-12-02" }).eq("id", consultation.id);
      if (updateError) throw new Error("Could not update temporary consultation");
      expect(await states()).toEqual(["realizada", "realizada", "cancelada", "programada"]);
    } finally {
      if (patientIds.length) {
        const { error } = await client.from("pacientes").delete().in("id", patientIds);
        if (error) throw new Error("Could not clean up temporary patients");
        const { data } = await client.from("citas").select("id").in("paciente_id", patientIds);
        expect(data).toEqual([]);
      }
    }
  }, 30000);
});