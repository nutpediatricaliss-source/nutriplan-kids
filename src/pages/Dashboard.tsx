import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { PlanMenu } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Trash2, Copy, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [planes, setPlanes] = useState<PlanMenu[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlanes = async () => {
    const { data, error } = await supabase
      .from("planes_menu")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Error al cargar planes");
    } else {
      setPlanes(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlanes();
  }, []);

  const createPlan = async () => {
    const { data, error } = await supabase
      .from("planes_menu")
      .insert({
        user_id: user!.id,
        nombre_paciente: "Nuevo Paciente",
        dias: 14,
        tiempos_comida: ["Desayuno", "Colación AM", "Comida", "Colación PM", "Cena"],
      })
      .select()
      .single();

    if (error) {
      toast.error("Error al crear plan");
    } else {
      navigate(`/plan/${data.id}`);
    }
  };

  const deletePlan = async (id: string) => {
    const { error } = await supabase.from("planes_menu").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar");
    } else {
      toast.success("Plan eliminado");
      fetchPlanes();
    }
  };

  const duplicatePlan = async (plan: PlanMenu) => {
    const { data: newPlan, error } = await supabase
      .from("planes_menu")
      .insert({
        user_id: user!.id,
        nombre_paciente: `${plan.nombre_paciente} (copia)`,
        dias: plan.dias,
        tiempos_comida: plan.tiempos_comida,
        pautas_extra: plan.pautas_extra,
      })
      .select()
      .single();

    if (error || !newPlan) {
      toast.error("Error al duplicar");
      return;
    }

    // Copy plan items
    const { data: items } = await supabase
      .from("plan_items")
      .select("*")
      .eq("plan_id", plan.id);

    if (items && items.length > 0) {
      await supabase.from("plan_items").insert(
        items.map(({ id, created_at, ...item }) => ({
          ...item,
          plan_id: newPlan.id,
        }))
      );
    }

    toast.success("Plan duplicado");
    fetchPlanes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planes de Menú</h1>
          <p className="text-muted-foreground">Gestiona los planes nutricionales de tus pacientes</p>
        </div>
        <Button onClick={createPlan} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Plan
        </Button>
      </div>

      {planes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="mb-1 text-lg font-medium">Sin planes todavía</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Crea tu primer plan de menú para comenzar
            </p>
            <Button onClick={createPlan} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Crear primer plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {planes.map((plan) => (
            <Card key={plan.id} className="group transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{plan.nombre_paciente}</CardTitle>
                    <CardDescription>
                      {plan.dias} días · {(plan.tiempos_comida as string[]).length} tiempos
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Button asChild variant="default" size="sm" className="flex-1">
                  <Link to={`/plan/${plan.id}`}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Editar
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => duplicatePlan(plan)}
                  title="Duplicar"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" title="Eliminar">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar este plan?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se eliminará permanentemente el plan de "{plan.nombre_paciente}" y todos sus items.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deletePlan(plan.id)}>
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
