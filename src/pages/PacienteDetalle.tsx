import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Flame,
  CalendarDays,
  Trash2,
  FileText,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import MacroSlider from "@/components/MacroSlider";
import {
  actividades,
  calcMacros,
  calcTMB,
  edadDesdeFecha,
  edadLegible,
  formulaLabels,
  type FormulaREE,
  type Sexo,
} from "@/lib/nutritionCalc";

type Paciente = {
  id: string;
  nombre: string;
  fecha_nacimiento: string;
  sexo: string;
  diagnostico: string | null;
  notas_generales: string | null;
};

type Consulta = {
  id: string;
  fecha: string;
  peso: number | null;
  talla: number | null;
  perimetro_cefalico: number | null;
  motivo_consulta: string | null;
  notas: string | null;
  formula_ree: string | null;
  factor_actividad: number | null;
  ree_kcal: number | null;
  macros_porcentaje: any;
};

const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function PacienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPaciente, setSavingPaciente] = useState(false);
  const [open, setOpen] = useState(false);
  const [savingConsulta, setSavingConsulta] = useState(false);

  // Formulario de nueva consulta
  const [fecha, setFecha] = useState(hoyISO());
  const [peso, setPeso] = useState<string>("");
  const [talla, setTalla] = useState<string>("");
  const [pc, setPc] = useState<string>("");
  const [motivo, setMotivo] = useState("");
  const [notas, setNotas] = useState("");
  const [formula, setFormula] = useState<FormulaREE>("schofield-wh");
  const [factor, setFactor] = useState("1.55");
  const [pctHco, setPctHco] = useState(55);
  const [pctProt, setPctProt] = useState(15);
  const pctGra = Math.max(0, 100 - pctHco - pctProt);

  const fetchAll = async () => {
    const [{ data: p, error: e1 }, { data: c }] = await Promise.all([
      supabase.from("pacientes").select("*").eq("id", id!).maybeSingle(),
      supabase
        .from("consultas")
        .select("*")
        .eq("paciente_id", id!)
        .order("fecha", { ascending: false }),
    ]);
    if (e1 || !p) toast.error("No se encontró el paciente");
    else setPaciente(p as Paciente);
    setConsultas((c ?? []) as Consulta[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const edad = paciente ? edadDesdeFecha(paciente.fecha_nacimiento) : 0;
  const pesoNum = parseFloat(peso) || 0;
  const tallaNum = parseFloat(talla) || 0;

  const ree = useMemo(() => {
    if (!paciente) return 0;
    const tmb = calcTMB(formula, (paciente.sexo as Sexo) || "M", edad, pesoNum, tallaNum);
    return Math.round(tmb * parseFloat(factor || "1"));
  }, [paciente, formula, edad, pesoNum, tallaNum, factor]);

  const macros = {
    hco: calcMacros(ree, pctHco, 4, pesoNum),
    prot: calcMacros(ree, pctProt, 4, pesoNum),
    gra: calcMacros(ree, pctGra, 9, pesoNum),
  };

  const guardarPaciente = async () => {
    if (!paciente) return;
    setSavingPaciente(true);
    const { error } = await supabase
      .from("pacientes")
      .update({
        nombre: paciente.nombre,
        fecha_nacimiento: paciente.fecha_nacimiento,
        sexo: paciente.sexo,
        diagnostico: paciente.diagnostico,
        notas_generales: paciente.notas_generales,
      })
      .eq("id", paciente.id);
    setSavingPaciente(false);
    if (error) toast.error("No se pudieron guardar los cambios");
    else toast.success("Datos actualizados");
  };

  const guardarConsulta = async () => {
    if (!pesoNum) {
      toast.error("Ingresa el peso");
      return;
    }
    setSavingConsulta(true);
    const { error } = await supabase.from("consultas").insert({
      paciente_id: id!,
      fecha,
      peso: pesoNum,
      talla: tallaNum || null,
      perimetro_cefalico: parseFloat(pc) || null,
      motivo_consulta: motivo || null,
      notas: notas || null,
      formula_ree: formula,
      factor_actividad: parseFloat(factor),
      ree_kcal: ree,
      macros_porcentaje: {
        proteina: pctProt,
        grasa: pctGra,
        carbohidrato: pctHco,
      },
    });
    setSavingConsulta(false);
    if (error) {
      toast.error("No se pudo guardar la consulta");
      return;
    }
    toast.success("Consulta registrada");
    setOpen(false);
    setPeso("");
    setTalla("");
    setPc("");
    setMotivo("");
    setNotas("");
    fetchAll();
  };

  const eliminarConsulta = async (cid: string) => {
    const { error } = await supabase.from("consultas").delete().eq("id", cid);
    if (error) toast.error("No se pudo eliminar");
    else {
      setConsultas((prev) => prev.filter((c) => c.id !== cid));
      toast.success("Consulta eliminada");
    }
  };

  const crearPlan = async () => {
    if (!paciente) return;
    const { data, error } = await supabase
      .from("planes_menu")
      .insert({
        user_id: user!.id,
        nombre_paciente: paciente.nombre,
        paciente_id: paciente.id,
        dias: 14,
        tiempos_comida: ["Desayuno", "Colación AM", "Comida", "Colación PM", "Cena"],
      } as any)
      .select()
      .single();
    if (error) toast.error("No se pudo crear el plan");
    else navigate(`/plan/${data.id}`);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (!paciente) return <p className="text-sm text-muted-foreground">Paciente no encontrado.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate("/pacientes")} className="rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Pacientes
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={crearPlan} className="rounded-xl">
            <FileText className="mr-2 h-4 w-4" />
            Crear plan de menú
          </Button>
          <Button onClick={() => setOpen(true)} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Nueva consulta
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{paciente.nombre}</h1>
        <p className="text-sm text-muted-foreground">
          {edadLegible(paciente.fecha_nacimiento)} ·{" "}
          {paciente.sexo === "F" ? "Femenino" : "Masculino"}
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={paciente.nombre}
                onChange={(e) => setPaciente({ ...paciente, nombre: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de nacimiento</Label>
              <Input
                type="date"
                value={paciente.fecha_nacimiento}
                onChange={(e) =>
                  setPaciente({ ...paciente, fecha_nacimiento: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select
                value={paciente.sexo}
                onValueChange={(v) => setPaciente({ ...paciente, sexo: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Diagnóstico</Label>
              <Textarea
                value={paciente.diagnostico ?? ""}
                onChange={(e) => setPaciente({ ...paciente, diagnostico: e.target.value })}
                className="rounded-xl"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas generales</Label>
              <Textarea
                value={paciente.notas_generales ?? ""}
                onChange={(e) =>
                  setPaciente({ ...paciente, notas_generales: e.target.value })
                }
                className="rounded-xl"
                rows={3}
              />
            </div>
          </div>
          <Button onClick={guardarPaciente} disabled={savingPaciente} className="rounded-xl">
            <Save className="mr-2 h-4 w-4" />
            Guardar cambios
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Historial de consultas</CardTitle>
        </CardHeader>
        <CardContent>
          {consultas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin consultas registradas.
            </p>
          ) : (
            <div className="space-y-3">
              {consultas.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-muted/30 p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      {c.fecha}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {c.peso != null && (
                        <Badge variant="secondary" className="rounded-lg font-normal">
                          Peso {c.peso} kg
                        </Badge>
                      )}
                      {c.talla != null && (
                        <Badge variant="secondary" className="rounded-lg font-normal">
                          Talla {c.talla} cm
                        </Badge>
                      )}
                      {c.perimetro_cefalico != null && (
                        <Badge variant="secondary" className="rounded-lg font-normal">
                          PC {c.perimetro_cefalico} cm
                        </Badge>
                      )}
                      {c.ree_kcal != null && (
                        <Badge className="rounded-lg font-normal">
                          <Flame className="mr-1 h-3 w-3" />
                          {Math.round(c.ree_kcal)} kcal
                        </Badge>
                      )}
                      {c.formula_ree && (
                        <Badge variant="outline" className="rounded-lg font-normal">
                          {formulaLabels[c.formula_ree as FormulaREE] ?? c.formula_ree}
                          {c.factor_actividad ? ` × ${c.factor_actividad}` : ""}
                        </Badge>
                      )}
                      {c.macros_porcentaje && (
                        <Badge variant="outline" className="rounded-lg font-normal">
                          HC {c.macros_porcentaje.carbohidrato}% / P{" "}
                          {c.macros_porcentaje.proteina}% / G {c.macros_porcentaje.grasa}%
                        </Badge>
                      )}
                    </div>
                    {c.motivo_consulta && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Motivo: </span>
                        {c.motivo_consulta}
                      </p>
                    )}
                    {c.notas && (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {c.notas}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => eliminarConsulta(c.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nueva consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Talla (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={talla}
                  onChange={(e) => setTalla(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              {edad < 2 && (
                <div className="space-y-2">
                  <Label>P. cefálico (cm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={pc}
                    onChange={(e) => setPc(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fórmula</Label>
                <Select value={formula} onValueChange={(v) => setFormula(v as FormulaREE)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="schofield-wh">Schofield (peso y talla)</SelectItem>
                    <SelectItem value="schofield-w">Schofield (solo peso)</SelectItem>
                    <SelectItem value="fao">FAO/OMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Factor de actividad</Label>
                <Select value={factor} onValueChange={setFactor}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actividades.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-2xl bg-primary/10 p-4">
              <p className="text-xs text-muted-foreground">
                Requerimiento estimado ({edadLegible(paciente.fecha_nacimiento)})
              </p>
              <p className="text-2xl font-bold tabular-nums text-primary">
                {ree} kcal/día
              </p>
            </div>

            <div className="space-y-4">
              <MacroSlider
                label="Carbohidratos"
                color="bg-amber-500"
                pct={pctHco}
                onChange={(v) => setPctHco(Math.min(v, 100 - pctProt))}
                {...macros.hco}
              />
              <MacroSlider
                label="Proteínas"
                color="bg-rose-500"
                pct={pctProt}
                onChange={(v) => setPctProt(Math.min(v, 100 - pctHco))}
                {...macros.prot}
              />
              <MacroSlider
                label="Grasas (automático)"
                color="bg-sky-500"
                pct={pctGra}
                disabled
                {...macros.gra}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Motivo de consulta</Label>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="rounded-xl"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="rounded-xl"
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={guardarConsulta} disabled={savingConsulta} className="rounded-xl">
              Guardar consulta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
