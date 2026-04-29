import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { PlanMenu } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Trash2, Copy, Pencil, BookmarkCheck, FileSymlink, Download, Upload } from "lucide-react";
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
  const [plantillas, setPlantillas] = useState<PlanMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const importInputRef = useRef<HTMLInputElement>(null);

  const fetchPlanes = async () => {
    const { data, error } = await supabase
      .from("planes_menu")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Error al cargar planes");
    } else {
      const all = data ?? [];
      setPlanes(all.filter((p) => !(p as any).es_plantilla));
      setPlantillas(all.filter((p) => (p as any).es_plantilla));
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

  const createFromTemplate = async (template: PlanMenu) => {
    const { data: newPlan, error } = await supabase
      .from("planes_menu")
      .insert({
        user_id: user!.id,
        nombre_paciente: "Nuevo Paciente",
        dias: template.dias,
        tiempos_comida: template.tiempos_comida,
        pautas_extra: template.pautas_extra,
        generalidades: (template as any).generalidades,
        snacks_colaciones: (template as any).snacks_colaciones,
        recomendaciones: (template as any).recomendaciones,
        mensaje_agradecimiento: (template as any).mensaje_agradecimiento,
        estilo_pdf: (template as any).estilo_pdf,
      } as any)
      .select()
      .single();

    if (error || !newPlan) {
      toast.error("Error al crear plan desde plantilla");
      return;
    }

    const { data: items } = await supabase
      .from("plan_items")
      .select("*")
      .eq("plan_id", template.id);

    if (items && items.length > 0) {
      await supabase.from("plan_items").insert(
        items.map(({ id, created_at, ...item }) => ({
          ...item,
          plan_id: newPlan.id,
        }))
      );
    }

    toast.success("Plan creado desde plantilla");
    navigate(`/plan/${newPlan.id}`);
  };

  const deletePlan = async (id: string) => {
    const { error } = await supabase.from("planes_menu").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar");
    } else {
      toast.success("Eliminado");
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

  const exportTemplate = async (plan: PlanMenu) => {
    const { data: items, error } = await supabase
      .from("plan_items")
      .select("*")
      .eq("plan_id", plan.id);

    if (error) {
      toast.error("Error al exportar plantilla");
      return;
    }

    const allItems = items ?? [];

    // Resolve display names so the importer can remap by name on another account
    const alimentoIds = allItems.filter((i: any) => i.tipo === "alimento").map((i: any) => i.item_id);
    const recetaIds = allItems.filter((i: any) => i.tipo === "receta").map((i: any) => i.item_id);

    const [{ data: alimentos }, { data: recetas }] = await Promise.all([
      alimentoIds.length
        ? supabase.from("alimentos_smae").select("id,nombre").in("id", alimentoIds)
        : Promise.resolve({ data: [] as any[] }),
      recetaIds.length
        ? supabase.from("recetas").select("id,nombre").in("id", recetaIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const aNames = new Map<string, string>((alimentos ?? []).map((a: any) => [a.id, a.nombre]));
    const rNames = new Map<string, string>((recetas ?? []).map((r: any) => [r.id, r.nombre]));

    const payload = {
      version: 1,
      tipo: "plantilla_menu",
      plantilla: {
        nombre_paciente: plan.nombre_paciente,
        dias: plan.dias,
        tiempos_comida: plan.tiempos_comida,
        pautas_extra: plan.pautas_extra,
        generalidades: (plan as any).generalidades,
        snacks_colaciones: (plan as any).snacks_colaciones,
        recomendaciones: (plan as any).recomendaciones,
        mensaje_agradecimiento: (plan as any).mensaje_agradecimiento,
        estilo_pdf: (plan as any).estilo_pdf,
      },
      items: allItems.map(({ id, created_at, plan_id, ...rest }: any) => {
        // Embed original name as nombre_override fallback so importer can remap by name
        let nombre_override = rest.nombre_override;
        if (!nombre_override) {
          if (rest.tipo === "alimento") nombre_override = aNames.get(rest.item_id) ?? null;
          else if (rest.tipo === "receta") nombre_override = rNames.get(rest.item_id) ?? null;
        }
        return { ...rest, nombre_override };
      }),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = plan.nombre_paciente
      .replace(/\[Plantilla\]\s*/i, "")
      .replace(/[^a-z0-9-_\s]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase() || "plantilla";
    a.href = url;
    a.download = `plantilla-${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Plantilla exportada");
  };

  const handleImportTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    let payload: any;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      toast.error("Archivo JSON inválido");
      if (importInputRef.current) importInputRef.current.value = "";
      return;
    }

    if (payload?.tipo !== "plantilla_menu" || !payload?.plantilla) {
      toast.error("El archivo no es una plantilla de menú válida");
      if (importInputRef.current) importInputRef.current.value = "";
      return;
    }

    const t = payload.plantilla;
    const baseName: string = t.nombre_paciente || "Plantilla importada";
    const finalName = /^\[Plantilla\]/i.test(baseName)
      ? baseName
      : `[Plantilla] ${baseName.replace(/^\[Importada\]\s*/i, "")}`;

    const { data: newTemplate, error: insertErr } = await supabase
      .from("planes_menu")
      .insert({
        user_id: user.id,
        nombre_paciente: finalName,
        dias: t.dias ?? 14,
        tiempos_comida: t.tiempos_comida ?? ["Desayuno", "Comida", "Cena"],
        pautas_extra: t.pautas_extra ?? "",
        generalidades: t.generalidades ?? null,
        snacks_colaciones: t.snacks_colaciones ?? null,
        recomendaciones: t.recomendaciones ?? null,
        mensaje_agradecimiento: t.mensaje_agradecimiento ?? null,
        estilo_pdf: t.estilo_pdf ?? "lista",
        es_plantilla: true,
      } as any)
      .select()
      .single();

    if (insertErr || !newTemplate) {
      toast.error("Error al crear la plantilla");
      if (importInputRef.current) importInputRef.current.value = "";
      return;
    }

    const rawItems: any[] = Array.isArray(payload.items) ? payload.items : [];

    if (rawItems.length > 0) {
      // Build a name -> id map for alimentos and recetas of this user (or shared alimentos)
      const [{ data: alimentos }, { data: recetas }] = await Promise.all([
        supabase.from("alimentos_smae").select("id,nombre"),
        supabase.from("recetas").select("id,nombre").eq("user_id", user.id),
      ]);
      const aMap = new Map<string, string>();
      (alimentos ?? []).forEach((a: any) => aMap.set(a.nombre.trim().toLowerCase(), a.id));
      const rMap = new Map<string, string>();
      (recetas ?? []).forEach((r: any) => rMap.set(r.nombre.trim().toLowerCase(), r.id));

      let convertidos = 0;
      const itemsToInsert = rawItems.map((it) => {
        const tipo = it.tipo;
        let item_id = it.item_id;
        let nuevoTipo = tipo;
        let nombre_override = it.nombre_override ?? null;

        if (tipo === "alimento") {
          const found = nombre_override
            ? aMap.get(String(nombre_override).trim().toLowerCase())
            : undefined;
          if (!found) {
            // Si no se encuentra, convertir a personalizado para no romper FK lógica
            nuevoTipo = "personalizado";
            item_id = crypto.randomUUID();
            nombre_override = nombre_override || "Alimento";
            convertidos++;
          } else {
            item_id = found;
          }
        } else if (tipo === "receta") {
          const found = nombre_override
            ? rMap.get(String(nombre_override).trim().toLowerCase())
            : undefined;
          if (!found) {
            nuevoTipo = "personalizado";
            item_id = crypto.randomUUID();
            nombre_override = nombre_override || "Receta";
            convertidos++;
          } else {
            item_id = found;
          }
        } else if (tipo === "personalizado") {
          item_id = crypto.randomUUID();
        }

        return {
          plan_id: newTemplate.id,
          dia: it.dia ?? 1,
          tiempo_comida: it.tiempo_comida ?? "Desayuno",
          tipo: nuevoTipo,
          item_id,
          porcion: it.porcion ?? "",
          nota_menu: it.nota_menu ?? "",
          nombre_override,
          orden: it.orden ?? 0,
          incluir_detalle_pdf: it.incluir_detalle_pdf ?? true,
        };
      });

      // For alimento items we need a name-based lookup; but original items only stored item_id (not name).
      // Re-map: if original item_id exists in current alimentos table by id, keep it.
      const ids = itemsToInsert
        .filter((i) => i.tipo === "alimento" || i.tipo === "receta")
        .map((i) => i.item_id);
      if (ids.length > 0) {
        const [{ data: aById }, { data: rById }] = await Promise.all([
          supabase.from("alimentos_smae").select("id").in("id", ids),
          supabase.from("recetas").select("id").in("id", ids),
        ]);
        const validA = new Set((aById ?? []).map((x: any) => x.id));
        const validR = new Set((rById ?? []).map((x: any) => x.id));
        for (const it of itemsToInsert) {
          if (it.tipo === "alimento" && !validA.has(it.item_id)) {
            it.tipo = "personalizado";
            it.nombre_override = it.nombre_override || "Alimento";
            it.item_id = crypto.randomUUID();
            convertidos++;
          } else if (it.tipo === "receta" && !validR.has(it.item_id)) {
            it.tipo = "personalizado";
            it.nombre_override = it.nombre_override || "Receta";
            it.item_id = crypto.randomUUID();
            convertidos++;
          }
        }
      }

      const { error: itemsErr } = await supabase
        .from("plan_items")
        .insert(itemsToInsert);

      if (itemsErr) {
        await supabase.from("planes_menu").delete().eq("id", newTemplate.id);
        toast.error("Error al importar items: " + itemsErr.message);
        if (importInputRef.current) importInputRef.current.value = "";
        return;
      }

      toast.success(
        convertidos > 0
          ? `Plantilla importada (${itemsToInsert.length} items, ${convertidos} convertidos a personalizado)`
          : `Plantilla importada (${itemsToInsert.length} items)`
      );
    } else {
      toast.success("Plantilla importada (sin items)");
    }

    if (importInputRef.current) importInputRef.current.value = "";
    fetchPlanes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const PlanCard = ({ plan, isTemplate = false }: { plan: PlanMenu; isTemplate?: boolean }) => (
    <Card className={`group rounded-2xl transition-all hover:shadow-lg ${isTemplate ? "border-lavender bg-lavender/20" : "shadow-sm"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base font-semibold">{plan.nombre_paciente}</CardTitle>
            <CardDescription className="mt-1">
              {plan.dias} días · {(plan.tiempos_comida as string[]).length} tiempos
            </CardDescription>
          </div>
          {isTemplate && <BookmarkCheck className="h-4 w-4 text-lavender-foreground shrink-0" />}
        </div>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        {isTemplate ? (
          <Button size="sm" className="flex-1 gap-1" onClick={() => createFromTemplate(plan)}>
            <FileSymlink className="h-3.5 w-3.5" />
            Usar Plantilla
          </Button>
        ) : (
          <Button asChild variant="default" size="sm" className="flex-1">
            <Link to={`/plan/${plan.id}`}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Editar
            </Link>
          </Button>
        )}
        {!isTemplate && (
          <Button variant="outline" size="sm" onClick={() => duplicatePlan(plan)} title="Duplicar">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
        {isTemplate && (
          <Button variant="outline" size="sm" onClick={() => exportTemplate(plan)} title="Exportar plantilla">
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" title="Eliminar">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará permanentemente "{plan.nombre_paciente}" y todos sus items.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deletePlan(plan.id)}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-10">
      {/* Plans Section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Planes de Menú</h1>
            <p className="text-muted-foreground mt-1">Gestiona los planes nutricionales de tus pacientes</p>
          </div>
          <Button onClick={createPlan} className="gap-2 rounded-xl shadow-sm">
            <Plus className="h-4 w-4" />
            Nuevo Plan
          </Button>
        </div>

        {planes.length === 0 ? (
          <Card className="border-dashed rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="mb-1 text-lg font-medium">Sin planes todavía</p>
              <p className="mb-5 text-sm text-muted-foreground">
                Crea tu primer plan de menú para comenzar
              </p>
              <Button onClick={createPlan} variant="outline" className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                Crear primer plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {planes.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>

      {/* Templates Section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <BookmarkCheck className="h-5 w-5 text-lavender-foreground" />
              Mis Plantillas
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Reutiliza estructuras de menú guardadas</p>
          </div>
          <div>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportTemplate}
            />
            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => importInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Importar plantilla
            </Button>
          </div>
        </div>
        {plantillas.length === 0 ? (
          <Card className="border-dashed rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <BookmarkCheck className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="mb-1 text-sm font-medium">Sin plantillas todavía</p>
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                Guarda un plan como plantilla desde el editor, o importa un archivo <code>.json</code> de plantilla.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {plantillas.map((t) => (
              <PlanCard key={t.id} plan={t} isTemplate />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
