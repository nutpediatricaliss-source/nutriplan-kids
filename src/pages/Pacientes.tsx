import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Search, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { edadLegible } from "@/lib/nutritionCalc";

type Paciente = {
  id: string;
  nombre: string;
  fecha_nacimiento: string;
  sexo: string;
  diagnostico: string | null;
  notas_generales: string | null;
};

export default function Pacientes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    fecha_nacimiento: "",
    sexo: "M",
    diagnostico: "",
  });

  const fetchPacientes = async () => {
    const { data, error } = await supabase
      .from("pacientes")
      .select("*")
      .order("nombre");
    if (error) toast.error("Error al cargar pacientes");
    else setPacientes((data ?? []) as Paciente[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPacientes();
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [pacientes, busqueda]);

  const crearPaciente = async () => {
    if (!form.nombre.trim() || !form.fecha_nacimiento) {
      toast.error("Nombre y fecha de nacimiento son obligatorios");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("pacientes")
      .insert({
        user_id: user!.id,
        nombre: form.nombre.trim(),
        fecha_nacimiento: form.fecha_nacimiento,
        sexo: form.sexo,
        diagnostico: form.diagnostico || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast.error("No se pudo crear el paciente");
      return;
    }
    setOpen(false);
    setForm({ nombre: "", fecha_nacimiento: "", sexo: "M", diagnostico: "" });
    toast.success("Paciente creado");
    navigate(`/pacientes/${data.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            Expedientes y seguimiento de consultas
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo paciente
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="rounded-xl pl-9"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : filtrados.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {pacientes.length === 0
                ? "Aún no tienes pacientes registrados."
                : "Sin resultados para tu búsqueda."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((p) => (
            <Card
              key={p.id}
              onClick={() => navigate(`/pacientes/${p.id}`)}
              className="cursor-pointer rounded-2xl transition-shadow hover:shadow-md"
            >
              <CardContent className="flex items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {edadLegible(p.fecha_nacimiento)}
                  </p>
                  {p.diagnostico && (
                    <Badge variant="secondary" className="mt-2 rounded-lg font-normal">
                      {p.diagnostico}
                    </Badge>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo paciente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha de nacimiento</Label>
                <Input
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={(e) =>
                    setForm({ ...form, fecha_nacimiento: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select
                  value={form.sexo}
                  onValueChange={(v) => setForm({ ...form, sexo: v })}
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
            <div className="space-y-2">
              <Label>Diagnóstico (opcional)</Label>
              <Textarea
                value={form.diagnostico}
                onChange={(e) => setForm({ ...form, diagnostico: e.target.value })}
                className="rounded-xl"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={crearPaciente} disabled={saving} className="rounded-xl">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
