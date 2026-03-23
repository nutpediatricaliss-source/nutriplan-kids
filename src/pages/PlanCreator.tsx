import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { PlanMenu, PlanItem, Alimento, Receta } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText,
} from "lucide-react";
import { toast } from "sonner";

// ─── Draggable search item ──────────────────────────────────────────────────
function DraggableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-md border bg-card px-3 py-2 text-sm transition-shadow hover:shadow-sm active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
    >
      {children}
    </div>
  );
}

// ─── Droppable meal slot ────────────────────────────────────────────────────
function DroppableSlot({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[4rem] rounded-lg border-2 border-dashed p-3 transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-border"
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
  const [activeId, setActiveId] = useState<string | null>(null);

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

  // ─── Search filtering ──────────────────────────────────────────────────
  const q = searchQuery.toLowerCase();
  const filteredAlimentos = alimentos.filter((a) => a.nombre.toLowerCase().includes(q));
  const filteredRecetas = recetas.filter((r) => r.nombre.toLowerCase().includes(q));

  // ─── Drag and drop ─────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !plan) return;

    const dropId = over.id as string; // format: "slot-{tiempoComida}"
    if (!dropId.startsWith("slot-")) return;

    const tiempoComida = dropId.replace("slot-", "");
    const dragId = active.id as string; // format: "alimento-{id}" or "receta-{id}"
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

  // ─── Get item display name ────────────────────────────────────────────
  const getItemName = (item: PlanItem) => {
    if (item.tipo === "alimento") {
      return alimentos.find((a) => a.id === item.item_id)?.nombre ?? "Alimento";
    }
    return recetas.find((r) => r.id === item.item_id)?.nombre ?? "Receta";
  };

  // ─── Active drag overlay ──────────────────────────────────────────────
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* ─── Top bar ───────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Button>
          <Input
            value={plan.nombre_paciente}
            onChange={(e) => updatePlan({ nombre_paciente: e.target.value })}
            className="w-56 font-semibold"
          />
          <Select
            value={String(plan.dias)}
            onValueChange={(v) => updatePlan({ dias: parseInt(v) })}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 17 }, (_, i) => i + 14).map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} días
                </SelectItem>
              ))}
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
                    <Input
                      value={tc}
                      onChange={(e) => {
                        const updated = [...tiemposComida];
                        updated[i] = e.target.value;
                        updatePlan({ tiempos_comida: updated });
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMealTime(i)}
                    >
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
        </div>

        {/* ─── Day navigation by weeks ─────────────────────────────────────── */}
        <div className="space-y-2">
          {Array.from({ length: Math.ceil(plan.dias / 7) }, (_, weekIdx) => {
            const weekStart = weekIdx * 7 + 1;
            const weekEnd = Math.min(weekStart + 6, plan.dias);
            return (
              <div key={weekIdx}>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  Semana {weekIdx + 1}
                </p>
                <div className="flex gap-1">
                  {Array.from({ length: weekEnd - weekStart + 1 }, (_, i) => {
                    const day = weekStart + i;
                    return (
                      <button
                        key={day}
                        onClick={() => setCurrentDay(day)}
                        className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          currentDay === day
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        Día {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Main layout: Search panel + Canvas ────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          {/* Search Panel */}
          <Card className="h-fit lg:sticky lg:top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Buscador</CardTitle>
              <div className="flex gap-1">
                <button
                  onClick={() => setSearchTab("alimentos")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    searchTab === "alimentos"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  Alimentos
                </button>
                <button
                  onClick={() => setSearchTab("recetas")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    searchTab === "recetas"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
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
                  placeholder="Buscar..."
                  className="h-8 pl-8 text-sm"
                />
              </div>
              {searchTab === "alimentos" && (
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Modo Porciones</Label>
                  <Switch
                    checked={modoPorciones}
                    onCheckedChange={setModoPorciones}
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-1.5 overflow-y-auto">
              {searchTab === "alimentos"
                ? filteredAlimentos.slice(0, 3).map((a) => (
                    <DraggableItem key={a.id} id={`alimento-${a.id}`}>
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{a.nombre}</span>
                      </div>
                      {modoPorciones && a.porcion && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{a.porcion}</p>
                      )}
                    </DraggableItem>
                  ))
                : filteredRecetas.slice(0, 3).map((r) => (
                    <DraggableItem key={r.id} id={`receta-${r.id}`}>
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{r.nombre}</span>
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

          {/* Canvas */}
          <div className="space-y-4">
            {tiemposComida.map((tiempo) => {
              const dayItems = items.filter(
                (i) => i.dia === currentDay && i.tiempo_comida === tiempo
              );
              return (
                <Card key={tiempo}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">{tiempo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DroppableSlot id={`slot-${tiempo}`}>
                      {dayItems.length === 0 ? (
                        <p className="py-2 text-center text-xs text-muted-foreground">
                          Arrastra alimentos o recetas aquí
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {dayItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start gap-2 rounded-md border bg-card p-2.5"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{getItemName(item)}</p>

                                {/* Alimento: show portions if mode is on */}
                                {item.tipo === "alimento" && modoPorciones && (
                                  <Input
                                    value={item.porcion ?? ""}
                                    onChange={(e) =>
                                      updateItem(item.id, { porcion: e.target.value })
                                    }
                                    placeholder="Ej. 100g, 1 pieza"
                                    className="mt-1 h-7 text-xs"
                                  />
                                )}

                                {/* Receta: note + toggle */}
                                {item.tipo === "receta" && (
                                  <div className="mt-1 space-y-1.5">
                                    <Input
                                      value={item.nota_menu ?? ""}
                                      onChange={(e) =>
                                        updateItem(item.id, { nota_menu: e.target.value })
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
                          ))}
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
