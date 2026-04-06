import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  AlertTriangle,
  CheckCircle,
  Copy,
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

// ─── Copy Meal Popover ──────────────────────────────────────────────
function CopyMealPopover({
  sourceDia,
  sourceTiempo,
  totalDias,
  tiemposComida,
  onDuplicate,
}: {
  sourceDia: number;
  sourceTiempo: string;
  totalDias: number;
  tiemposComida: string[];
  onDuplicate: (dia: number, tiempo: string, targets: { dia: number; tiempo: string }[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDuplicate = async () => {
    const targets = Array.from(selected).map((k) => {
      const [d, ...rest] = k.split("-");
      return { dia: parseInt(d), tiempo: rest.join("-") };
    });
    if (targets.length === 0) return;
    setDuplicating(true);
    await onDuplicate(sourceDia, sourceTiempo, targets);
    setDuplicating(false);
    setSelected(new Set());
    setOpen(false);
  };

  const totalWeeks = Math.ceil(totalDias / 7);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(new Set());

  const toggleWeek = (w: number) => {
    setCollapsedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setSelected(new Set()); setCollapsedWeeks(new Set()); } }}>
      <PopoverTrigger asChild>
        <button className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Copiar a otros tiempos">
          <Copy className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="px-3 py-2 border-b">
          <p className="text-xs font-semibold">Duplicar a:</p>
          <p className="text-[10px] text-muted-foreground">Selecciona los destinos</p>
        </div>
        <ScrollArea className="h-64">
          <div className="p-2 space-y-1">
            {Array.from({ length: totalWeeks }, (_, w) => {
              const ws = w * 7 + 1;
              const we = Math.min(ws + 6, totalDias);
              const isCollapsed = collapsedWeeks.has(w);
              return (
                <div key={w}>
                  <button
                    type="button"
                    onClick={() => toggleWeek(w)}
                    className="flex items-center gap-1 w-full text-[10px] font-semibold text-muted-foreground px-1 py-1 hover:bg-accent/50 rounded transition-colors"
                  >
                    <ChevronRight className={`h-3 w-3 transition-transform ${isCollapsed ? "" : "rotate-90"}`} />
                    Semana {w + 1} (Días {ws}–{we})
                  </button>
                  {!isCollapsed && Array.from({ length: we - ws + 1 }, (_, di) => {
                    const day = ws + di;
                    return tiemposComida.map((tc) => {
                      if (day === sourceDia && tc === sourceTiempo) return null;
                      const key = `${day}-${tc}`;
                      return (
                        <label key={key} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent/50 cursor-pointer ml-2">
                          <Checkbox
                            checked={selected.has(key)}
                            onCheckedChange={() => toggle(key)}
                          />
                          <span>Día {day} — {tc}</span>
                        </label>
                      );
                    });
                  })}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="border-t px-3 py-2">
          <Button
            size="sm"
            className="w-full text-xs"
            disabled={selected.size === 0 || duplicating}
            onClick={handleDuplicate}
          >
            {duplicating ? "Duplicando..." : `Duplicar a ${selected.size} destino(s)`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
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

  // ─── Alarmas del menú ───────────────────────────────────────────────
  type Alarma = { tipo: "vacio" | "repetida" | "variedad"; mensaje: string; dia?: number; color: string };

  const alarmas = useMemo<Alarma[]>(() => {
    if (!plan) return [];
    const alerts: Alarma[] = [];

    // 1. Tiempos vacíos
    for (let d = 1; d <= plan.dias; d++) {
      for (const tc of tiemposComida) {
        const has = items.some((i) => i.dia === d && i.tiempo_comida === tc);
        if (!has) {
          alerts.push({ tipo: "vacio", mensaje: `Día ${d}: ${tc} está vacío`, dia: d, color: "text-yellow-600" });
        }
      }
    }

    // 2. Recetas repetidas >5 en todo el plan
    const recetaCounts: Record<string, number> = {};
    items.filter((i) => i.tipo === "receta").forEach((i) => {
      recetaCounts[i.item_id] = (recetaCounts[i.item_id] || 0) + 1;
    });
    for (const [rid, count] of Object.entries(recetaCounts)) {
      if (count > 5) {
        const name = recetas.find((r) => r.id === rid)?.nombre ?? "Receta";
        alerts.push({ tipo: "repetida", mensaje: `"${name}" se repite ${count} veces en el plan`, color: "text-orange-600" });
      }
    }

    // 3. Recetas repetidas >3 por semana
    const totalWeeksCalc = Math.ceil(plan.dias / 7);
    for (let w = 0; w < totalWeeksCalc; w++) {
      const weekStart = w * 7 + 1;
      const weekEnd = Math.min(weekStart + 6, plan.dias);
      const weekCounts: Record<string, number> = {};
      items.filter((i) => i.tipo === "receta" && i.dia >= weekStart && i.dia <= weekEnd).forEach((i) => {
        weekCounts[i.item_id] = (weekCounts[i.item_id] || 0) + 1;
      });
      for (const [rid, count] of Object.entries(weekCounts)) {
        if (count > 3) {
          const name = recetas.find((r) => r.id === rid)?.nombre ?? "Receta";
          alerts.push({ tipo: "repetida", mensaje: `"${name}" se repite ${count} veces en semana ${w + 1}`, dia: weekStart, color: "text-orange-600" });
        }
      }
    }

    // 4. Poca variedad por grupo
    const alimentoItems = items.filter((i) => i.tipo === "alimento");
    if (alimentoItems.length >= 5) {
      const grupoCounts: Record<string, number> = {};
      alimentoItems.forEach((i) => {
        const al = alimentos.find((a) => a.id === i.item_id);
        if (al) grupoCounts[al.grupo] = (grupoCounts[al.grupo] || 0) + 1;
      });
      const total = alimentoItems.length;
      for (const [grupo, count] of Object.entries(grupoCounts)) {
        if (count / total > 0.6) {
          alerts.push({ tipo: "variedad", mensaje: `El grupo "${grupo}" tiene ${Math.round((count / total) * 100)}% del plan — poca variedad`, color: "text-red-600" });
        }
      }
    }

    return alerts;
  }, [plan, items, tiemposComida, alimentos, recetas]);

  const [alarmasOpen, setAlarmasOpen] = useState(false);

  // ─── Copiar/Pegar tiempos de comida ────────────────────────────────
  const handleDuplicateMeal = async (sourceDia: number, sourceTiempo: string, targets: { dia: number; tiempo: string }[]) => {
    if (!plan) return;
    const sourceItems = items.filter((i) => i.dia === sourceDia && i.tiempo_comida === sourceTiempo);
    if (sourceItems.length === 0) {
      toast.error("No hay items para copiar");
      return;
    }

    const allNew: any[] = [];
    for (const target of targets) {
      const existingCount = items.filter((i) => i.dia === target.dia && i.tiempo_comida === target.tiempo).length;
      sourceItems.forEach((item, idx) => {
        allNew.push({
          plan_id: plan.id,
          dia: target.dia,
          tiempo_comida: target.tiempo,
          tipo: item.tipo,
          item_id: item.item_id,
          porcion: item.porcion,
          nota_menu: item.nota_menu,
          incluir_detalle_pdf: item.incluir_detalle_pdf,
          orden: existingCount + idx,
        });
      });
    }

    const { data, error } = await supabase.from("plan_items").insert(allNew).select();
    if (error) {
      toast.error("Error al duplicar");
    } else {
      setItems([...items, ...(data ?? [])]);
      toast.success(`Copiado a ${targets.length} destino(s)`);
    }
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

        {/* ─── Alarmas del menú ──────────────────────────────────────────── */}
        <Collapsible open={alarmasOpen} onOpenChange={setAlarmasOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent/50"
            style={{ borderColor: alarmas.length > 0 ? "hsl(var(--gold-dark))" : "hsl(var(--sage))", backgroundColor: alarmas.length > 0 ? "hsl(var(--gold-light) / 0.3)" : "hsl(var(--sage) / 0.2)" }}>
            {alarmas.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            Alarmas del Menú
            {alarmas.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-orange-100 text-orange-700 text-xs">
                {alarmas.length}
              </Badge>
            )}
            {alarmas.length === 0 && (
              <span className="text-xs font-normal text-green-600">— Todo bien</span>
            )}
            <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${alarmasOpen ? "rotate-0" : "-rotate-90"}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            {alarmas.length > 0 && (
              <div className="mt-1 space-y-1 rounded-lg border border-border/40 bg-background p-3 max-h-48 overflow-y-auto">
                {alarmas.map((a, idx) => (
                  <button
                    key={idx}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-left hover:bg-accent/50 transition-colors ${a.color}`}
                    onClick={() => { if (a.dia) setCurrentDay(a.dia); }}
                  >
                    {a.tipo === "vacio" && <AlertTriangle className="h-3 w-3 shrink-0 text-yellow-500" />}
                    {a.tipo === "repetida" && <AlertTriangle className="h-3 w-3 shrink-0 text-orange-500" />}
                    {a.tipo === "variedad" && <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />}
                    {a.mensaje}
                  </button>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
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
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-peach-foreground">{tiempo}</CardTitle>
                      <CopyMealPopover
                        sourceDia={currentDay}
                        sourceTiempo={tiempo}
                        totalDias={plan.dias}
                        tiemposComida={tiemposComida}
                        onDuplicate={handleDuplicateMeal}
                      />
                    </div>
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
