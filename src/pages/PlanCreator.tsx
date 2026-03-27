import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { PlanMenu, PlanItem, Alimento, Receta } from "@/lib/types";
import PdfConfigDialog from "@/components/PdfConfigDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  GripVertical,
  X,
  Settings,
  ChevronDown,
  Activity,
  FileText,
  Save,
  BookmarkPlus,
} from "lucide-react";
import { toast } from "sonner";

// ─── Debounced Input ────────────────────────────────────────────────────────
function DebouncedInput({
  value: externalValue,
  onChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "onChange"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(externalValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocalValue(externalValue);
  }, [externalValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalValue(v);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onChange(v), 500);
  };

  const handleBlur = () => {
    clearTimeout(timeoutRef.current);
    if (localValue !== externalValue) onChange(localValue);
  };

  return <Input {...props} value={localValue} onChange={handleChange} onBlur={handleBlur} />;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function parsePorcionMultiplier(porcion: string | null | undefined): number {
  if (!porcion?.trim()) return 1;
  const trimmed = porcion.trim();
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").map(Number);
    if (parts.length === 2 && parts[0] && parts[1]) return parts[0] / parts[1];
  }
  const n = parseFloat(trimmed);
  return isNaN(n) ? 1 : n;
}

function formatMacroValue(value: number): string {
  const fixed = value.toFixed(1);
  return fixed.replace(/\.0$/, "");
}

function formatMacrosLine(cal: number, prot: number, grasas: number, carbs: number, mult: number = 1): string {
  return `${Math.round(cal * mult)} Cal · ${formatMacroValue(prot * mult)} P · ${formatMacroValue(grasas * mult)} G · ${formatMacroValue(carbs * mult)} C`;
}

// ─── Draggable search item ──────────────────────────────────────────────────
function DraggableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-lg border border-border/60 bg-card px-3 py-2 text-sm transition-shadow hover:shadow-sm active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
    >
      {children}
    </div>
  );
}

// ─── Droppable meal slot ────────────────────────────────────────────────────
function DroppableSlot({ id, children }: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[4rem] rounded-lg border-2 border-dashed p-3 transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-border/40"
      }`}
    >
      {children}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function PlanCreator() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [plan, setPlan] = useState<PlanMenu | null>(null);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentDay, setCurrentDay] = useState(1);
  const [searchTab, setSearchTab] = useState<"alimentos" | "recetas">("alimentos");
  const [searchQuery, setSearchQuery] = useState("");
  const [modoPorciones, setModoPorciones] = useState(false);
  const [modoMacros, setModoMacros] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState(0);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Meal times management
  const [mealTimesDialogOpen, setMealTimesDialogOpen] = useState(false);
  const [newMealTime, setNewMealTime] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ─── Fetch data ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!id) return;
    const fetchAllAlimentos = async () => {
      let all: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("alimentos_smae")
          .select("*")
          .order("nombre")
          .range(from, from + PAGE - 1);
        if (error) break;
        all = all.concat(data ?? []);
        if (!data || data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    };
    const [planRes, itemsRes, allAlimentos, recetasRes] = await Promise.all([
      supabase.from("planes_menu").select("*").eq("id", id).single(),
      supabase.from("plan_items").select("*").eq("plan_id", id).order("orden"),
      fetchAllAlimentos(),
      supabase.from("recetas").select("*").order("nombre"),
    ]);

    if (planRes.error || !planRes.data) {
      toast.error("Plan no encontrado");
      navigate("/");
      return;
    }

    setPlan(planRes.data);
    setItems(itemsRes.data ?? []);
    setAlimentos(allAlimentos);
    setRecetas(recetasRes.data ?? []);
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    setExpandedWeek(Math.floor((currentDay - 1) / 7));
  }, [currentDay]);

  // ─── Plan updates ──────────────────────────────────────────────────────
  const updatePlan = async (updates: Partial<PlanMenu>) => {
    if (!plan) return;
    const { error } = await supabase
      .from("planes_menu")
      .update(updates)
      .eq("id", plan.id);
    if (error) toast.error("Error al guardar");
    else setPlan({ ...plan, ...updates } as PlanMenu);
  };

  const savePlan = async () => {
    if (!plan) return;
    setSaving(true);
    const { error } = await supabase
      .from("planes_menu")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", plan.id);
    setSaving(false);
    if (error) toast.error("Error al guardar");
    else toast.success("Plan guardado correctamente");
  };

  const saveAsTemplate = async () => {
    if (!plan || !user) return;
    const { data: newTemplate, error } = await supabase
      .from("planes_menu")
      .insert({
        user_id: user.id,
        nombre_paciente: `[Plantilla] ${plan.nombre_paciente}`,
        dias: plan.dias,
        tiempos_comida: plan.tiempos_comida,
        pautas_extra: plan.pautas_extra,
        generalidades: (plan as any).generalidades,
        snacks_colaciones: (plan as any).snacks_colaciones,
        recomendaciones: (plan as any).recomendaciones,
        mensaje_agradecimiento: (plan as any).mensaje_agradecimiento,
        estilo_pdf: (plan as any).estilo_pdf,
        es_plantilla: true,
      } as any)
      .select("id")
      .single();

    if (error || !newTemplate) {
      toast.error("Error al guardar plantilla");
      return;
    }

    // Copy items to the template
    const { data: currentItems } = await supabase
      .from("plan_items")
      .select("*")
      .eq("plan_id", plan.id);

    if (currentItems && currentItems.length > 0) {
      await supabase.from("plan_items").insert(
        currentItems.map(({ id: _, created_at: __, ...item }) => ({
          ...item,
          plan_id: newTemplate.id,
        }))
      );
    }

    toast.success("Plantilla guardada correctamente");
  };

  const tiemposComida = (plan?.tiempos_comida as string[]) ?? [];

  const addMealTime = () => {
    if (!newMealTime.trim()) return;
    const updated = [...tiemposComida, newMealTime.trim()];
    updatePlan({ tiempos_comida: updated });
    setNewMealTime("");
  };

  const removeMealTime = (index: number) => {
    const updated = tiemposComida.filter((_, i) => i !== index);
    updatePlan({ tiempos_comida: updated });
  };

  // ─── Search filtering (including tags for recipes) ─────────────────────
  const q = searchQuery.toLowerCase();
  const filteredAlimentos = alimentos.filter((a) => a.nombre.toLowerCase().includes(q));
  const filteredRecetas = recetas.filter((r) => {
    if (r.nombre.toLowerCase().includes(q)) return true;
    const tags = (r as any).etiquetas as string[] | null;
    if (tags && tags.some((t: string) => t.toLowerCase().includes(q))) return true;
    return false;
  });

  // ─── Drag and drop ─────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !plan) return;

    const dropId = over.id as string;
    if (!dropId.startsWith("slot-")) return;

    const tiempoComida = dropId.replace("slot-", "");
    const dragId = active.id as string;
    const [tipo, itemId] = [
      dragId.startsWith("alimento-") ? "alimento" : "receta",
      dragId.replace(/^(alimento|receta)-/, ""),
    ];

    const dayItems = items.filter(
      (i) => i.dia === currentDay && i.tiempo_comida === tiempoComida
    );

    const newItem: any = {
      plan_id: plan.id,
      dia: currentDay,
      tiempo_comida: tiempoComida,
      tipo,
      item_id: itemId,
      orden: dayItems.length,
      nota_menu: tipo === "receta"
        ? recetas.find((r) => r.id === itemId)?.nota_predeterminada ?? ""
        : "",
      incluir_detalle_pdf: tipo === "receta"
        ? recetas.find((r) => r.id === itemId)?.incluir_detalle_pdf ?? true
        : true,
    };

    const { data, error } = await supabase
      .from("plan_items")
      .insert(newItem)
      .select()
      .single();

    if (error) {
      toast.error("Error al agregar item");
    } else if (data) {
      setItems([...items, data]);
    }
  };

  // ─── Item management ───────────────────────────────────────────────────
  const removeItem = async (itemId: string) => {
    await supabase.from("plan_items").delete().eq("id", itemId);
    setItems(items.filter((i) => i.id !== itemId));
  };

  const updateItem = async (itemId: string, updates: Partial<PlanItem>) => {
    await supabase.from("plan_items").update(updates).eq("id", itemId);
    setItems(items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)));
  };

  const getItemName = (item: PlanItem) => {
    if (item.tipo === "alimento") {
      return alimentos.find((a) => a.id === item.item_id)?.nombre ?? "Alimento";
    }
    return recetas.find((r) => r.id === item.item_id)?.nombre ?? "Receta";
  };

  const getAlimentoMacros = (itemId: string) => {
    const a = alimentos.find((al) => al.id === itemId);
    if (!a) return null;
    return {
      cal: a.calorias ?? 0,
      prot: a.proteinas ?? 0,
      grasas: a.grasas ?? 0,
      carbs: a.carbohidratos ?? 0,
    };
  };

  const getActiveName = () => {
    if (!activeId) return "";
    if (activeId.startsWith("alimento-")) {
      const aid = activeId.replace("alimento-", "");
      return alimentos.find((a) => a.id === aid)?.nombre ?? "";
    }
    const rid = activeId.replace("receta-", "");
    return recetas.find((r) => r.id === rid)?.nombre ?? "";
  };

  if (loading || !plan) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalWeeks = Math.ceil(plan.dias / 7);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* ─── Top bar ───────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sage/40 px-4 py-3 border border-sage">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Button>
          <DebouncedInput
            value={plan.nombre_paciente}
            onChange={(v) => updatePlan({ nombre_paciente: v })}
            className="w-56 font-semibold bg-background"
          />
          <Select
            value={String(plan.dias)}
            onValueChange={(v) => updatePlan({ dias: parseInt(v) })}
          >
            <SelectTrigger className="w-36 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="14">14 días (2 sem)</SelectItem>
              <SelectItem value="28">1 mes (4 sem)</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={mealTimesDialogOpen} onOpenChange={setMealTimesDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Settings className="h-4 w-4" />
                Tiempos
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tiempos de Comida</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {tiemposComida.map((tc, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <DebouncedInput
                      value={tc}
                      onChange={(v) => {
                        const updated = [...tiemposComida];
                        updated[i] = v;
                        updatePlan({ tiempos_comida: updated });
                      }}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeMealTime(i)}>
                      <Minus className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newMealTime}
                    onChange={(e) => setNewMealTime(e.target.value)}
                    placeholder="Nuevo tiempo..."
                    onKeyDown={(e) => e.key === "Enter" && addMealTime()}
                  />
                  <Button size="sm" onClick={addMealTime}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={savePlan}
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={saveAsTemplate}
            >
              <BookmarkPlus className="h-4 w-4" />
              Plantilla
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setPdfDialogOpen(true)}
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        {/* PDF Config Dialog */}
        <PdfConfigDialog
          open={pdfDialogOpen}
          onOpenChange={setPdfDialogOpen}
          data={{ plan, items, alimentos, recetas }}
          savedConfig={{
            generalidades: (plan as any).generalidades ?? "",
            snacksColaciones: (plan as any).snacks_colaciones ?? "",
            recomendaciones: (plan as any).recomendaciones ?? "",
            mensajeAgradecimiento: (plan as any).mensaje_agradecimiento ?? "",
            estiloPdf: (plan as any).estilo_pdf ?? "lista",
          }}
          onSaveConfig={(cfg) => updatePlan(cfg as any)}
        />

        {/* ─── Day navigation: collapsible weeks ──────────────────────────── */}
        <div className="space-y-1 rounded-xl border border-lavender bg-lavender/30 p-3">
          <p className="text-xs font-semibold text-lavender-foreground mb-2">Navegación por Días</p>
          {Array.from({ length: totalWeeks }, (_, weekIdx) => {
            const weekStart = weekIdx * 7 + 1;
            const weekEnd = Math.min(weekStart + 6, plan.dias);
            const isOpen = expandedWeek === weekIdx;
            return (
              <Collapsible
                key={weekIdx}
                open={isOpen}
                onOpenChange={(open) => {
                  if (open) setExpandedWeek(weekIdx);
                }}
              >
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-lavender-foreground hover:bg-lavender transition-colors">
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
                  />
                  Semana {weekIdx + 1}
                  <span className="text-xs font-normal">
                    (Días {weekStart}–{weekEnd})
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex gap-1 px-3 py-1">
                    {Array.from({ length: weekEnd - weekStart + 1 }, (_, i) => {
                      const day = weekStart + i;
                      return (
                        <button
                          key={day}
                          onClick={() => setCurrentDay(day)}
                          className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                            currentDay === day
                              ? "bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          Día {day}
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {/* ─── Main layout: Sticky Sidebar (1/3) + Canvas (2/3) ──────────── */}
        <div className="flex gap-4">
          {/* Search Sidebar - sticky, 1/3 width */}
          <div className="w-1/3 max-w-sm shrink-0">
            <div className="sticky top-4 space-y-3">
              <Card className="border-sage bg-sage/30">
                <CardHeader className="pb-3 space-y-3">
                  <CardTitle className="text-sm font-semibold text-sage-foreground">Buscador</CardTitle>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSearchTab("alimentos")}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        searchTab === "alimentos"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      Alimentos
                    </button>
                    <button
                      onClick={() => setSearchTab("recetas")}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        searchTab === "recetas"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      Recetas
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={searchTab === "recetas" ? "Buscar por nombre o etiqueta..." : "Buscar..."}
                      className="h-8 pl-8 text-sm bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    {searchTab === "alimentos" && (
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Modo Porciones</Label>
                        <Switch checked={modoPorciones} onCheckedChange={setModoPorciones} />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Mostrar Macros
                      </Label>
                      <Switch checked={modoMacros} onCheckedChange={setModoMacros} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                  {searchTab === "alimentos"
                    ? filteredAlimentos.slice(0, 8).map((a) => (
                        <DraggableItem key={a.id} id={`alimento-${a.id}`}>
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm">{a.nombre}</span>
                          </div>
                          {modoPorciones && a.porcion && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{a.porcion}</p>
                          )}
                          {modoMacros && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatMacrosLine(a.calorias ?? 0, a.proteinas ?? 0, a.grasas ?? 0, a.carbohidratos ?? 0)}
                            </p>
                          )}
                        </DraggableItem>
                      ))
                    : filteredRecetas.slice(0, 8).map((r) => (
                        <DraggableItem key={r.id} id={`receta-${r.id}`}>
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground" />
                            {r.imagen_url && (
                              <img
                                src={r.imagen_url}
                                alt={r.nombre}
                                className="h-8 w-8 rounded object-cover shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-sm">{r.nombre}</span>
                              {(r as any).etiquetas && ((r as any).etiquetas as string[]).length > 0 && (
                                <div className="flex flex-wrap gap-0.5 mt-0.5">
                                  {((r as any).etiquetas as string[]).slice(0, 3).map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-lavender text-lavender-foreground">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </DraggableItem>
                      ))}
                  {searchTab === "alimentos" && filteredAlimentos.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">Sin resultados</p>
                  )}
                  {searchTab === "recetas" && filteredRecetas.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">Sin resultados</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Canvas - 2/3 width */}
          <div className="flex-1 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground">
              Día {currentDay} — Semana {Math.ceil(currentDay / 7)}
            </p>
            {tiemposComida.map((tiempo) => {
              const dayItems = items.filter(
                (i) => i.dia === currentDay && i.tiempo_comida === tiempo
              );
              return (
                <Card key={tiempo} className="border-peach/60 bg-peach/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-peach-foreground">{tiempo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DroppableSlot id={`slot-${tiempo}`}>
                      {dayItems.length === 0 ? (
                        <p className="py-2 text-center text-xs text-muted-foreground">
                          Arrastra alimentos o recetas aquí
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {dayItems.map((item) => {
                            const macros = item.tipo === "alimento" ? getAlimentoMacros(item.item_id) : null;
                            return (
                              <div
                                key={item.id}
                                className="flex items-start gap-2 rounded-lg border bg-background p-2.5"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium">{getItemName(item)}</p>

                                  {item.tipo === "alimento" && modoPorciones && (() => {
                                    const baseAlimento = alimentos.find((a) => a.id === item.item_id);
                                    return (
                                      <div className="mt-1 space-y-1">
                                        {baseAlimento?.porcion && (
                                          <p className="text-[10px] text-muted-foreground">
                                            Porción base: {baseAlimento.porcion}
                                          </p>
                                        )}
                                        <DebouncedInput
                                          value={item.porcion ?? ""}
                                          onChange={(v) =>
                                            updateItem(item.id, { porcion: v })
                                          }
                                          placeholder="Cantidad (ej. 2, 1/2)"
                                          className="h-7 text-xs"
                                        />
                                      </div>
                                    );
                                  })()}

                                  {item.tipo === "alimento" && modoMacros && macros && (() => {
                                    const mult = modoPorciones ? parsePorcionMultiplier(item.porcion) : 1;
                                    return (
                                      <p className="mt-0.5 text-xs text-muted-foreground">
                                        {formatMacrosLine(macros.cal, macros.prot, macros.grasas, macros.carbs, mult)}
                                      </p>
                                    );
                                  })()}

                                  {item.tipo === "receta" && (
                                    <div className="mt-1 space-y-1.5">
                                      <DebouncedInput
                                        value={item.nota_menu ?? ""}
                                        onChange={(v) =>
                                          updateItem(item.id, { nota_menu: v })
                                        }
                                        placeholder="Nota para el menú..."
                                        className="h-7 text-xs"
                                      />
                                      <div className="flex items-center gap-2">
                                        <Switch
                                          checked={item.incluir_detalle_pdf ?? true}
                                          onCheckedChange={(c) =>
                                            updateItem(item.id, { incluir_detalle_pdf: c })
                                          }
                                        />
                                        <span className="text-xs text-muted-foreground">
                                          Incluir en PDF
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </DroppableSlot>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-lg">
            {getActiveName()}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
