import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Calculator, Flame, Activity, Search, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import MacroSlider from "@/components/MacroSlider";
import {
  actividades,
  calcTMB,
  calcMacros,
  type FormulaREE,
  type Sexo,
} from "@/lib/nutritionCalc";

// Mapeo de equivalentes a grupos en alimentos_smae
const grupoSmaeMap: Record<string, string[]> = {
  "Verduras": ["Verduras"],
  "Frutas": ["Frutas"],
  "Cereales sin grasa": ["Cereal"],
  "Leguminosas": ["Leguminosas"],
  "AOA muy bajo en grasa": ["Alimentos de Origen Animal"],
  "AOA bajo en grasa": ["Alimentos de Origen Animal"],
  "Leche semidescremada": ["Leche"],
  "Grasas sin proteína": ["Grasas", "grasas"],
  "Azúcares sin grasa": ["Azúcares"],
};

// Escala "1.5 pieza" × 3 → "4.5 pieza"
function escalarPorcion(porcion: string | null, factor: number): string {
  if (!porcion) return `${factor}`;
  const m = porcion.trim().match(/^([\d.,]+)\s*(.*)$/);
  if (!m) return `${factor} × ${porcion}`;
  const num = parseFloat(m[1].replace(",", "."));
  if (isNaN(num)) return `${factor} × ${porcion}`;
  const escalado = Math.round(num * factor * 100) / 100;
  return `${escalado}${m[2] ? " " + m[2] : ""}`;
}




// ---- Equivalentes SMAE (aprox por porción) ----
const equivalentes = [
  { nombre: "Verduras", kcal: 25, hco: 4, prot: 2, gra: 0 },
  { nombre: "Frutas", kcal: 60, hco: 15, prot: 0, gra: 0 },
  { nombre: "Cereales sin grasa", kcal: 70, hco: 15, prot: 2, gra: 0 },
  { nombre: "Leguminosas", kcal: 120, hco: 20, prot: 8, gra: 1 },
  { nombre: "AOA muy bajo en grasa", kcal: 40, hco: 0, prot: 7, gra: 1 },
  { nombre: "AOA bajo en grasa", kcal: 55, hco: 0, prot: 7, gra: 3 },
  { nombre: "Leche semidescremada", kcal: 110, hco: 12, prot: 9, gra: 4 },
  { nombre: "Grasas sin proteína", kcal: 45, hco: 0, prot: 0, gra: 5 },
  { nombre: "Azúcares sin grasa", kcal: 40, hco: 10, prot: 0, gra: 0 },
];

export default function Calculadora() {
  const [sexo, setSexo] = useState<Sexo>("M");
  const [edad, setEdad] = useState<number>(6);
  const [peso, setPeso] = useState<number>(20);
  const [talla, setTalla] = useState<number>(115);
  const [factor, setFactor] = useState<string>("1.55");
  const [formula, setFormula] = useState<FormulaREE>("schofield-wh");

  // Sliders: carbohidratos y proteínas controlables, grasas = 100 - hco - prot
  const [pctHco, setPctHco] = useState<number>(55);
  const [pctProt, setPctProt] = useState<number>(15);
  const pctGra = Math.max(0, 100 - pctHco - pctProt);

  // Alimentos del catálogo SMAE para búsqueda por grupo
  const [alimentos, setAlimentos] = useState<Array<{ id: string; nombre: string; grupo: string; porcion: string | null }>>([]);
  useEffect(() => {
    (async () => {
      const all: any[] = [];
      let from = 0;
      const size = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("alimentos_smae")
          .select("id,nombre,grupo,porcion")
          .order("nombre")
          .range(from, from + size - 1);
        if (error || !data || data.length === 0) break;
        all.push(...data);
        if (data.length < size) break;
        from += size;
      }
      setAlimentos(all);
    })();
  }, []);


  const tmb = useMemo(
    () => calcTMB(formula, sexo, edad, peso, talla),
    [formula, sexo, edad, peso, talla]
  );

  const get = Math.round(tmb * parseFloat(factor || "1"));

  const macros = useMemo(() => {
    const calc = (pct: number, kcalPorG: number) => calcMacros(get, pct, kcalPorG, peso);
    return {
      hco: calc(pctHco, 4),
      prot: calc(pctProt, 4),
      gra: calc(pctGra, 9),
    };
  }, [get, pctHco, pctProt, pctGra, peso]);

  // Distribución de equivalentes (estimación tipo SMAE)
  const intercambios = useMemo(() => {
    if (!get) return [] as { nombre: string; porciones: number }[];
    // Asignación heurística común en pediatría
    const targets: Record<string, number> = {
      Verduras: 3,
      Frutas: 3,
      "Cereales sin grasa": Math.max(2, Math.round(macros.hco.g / 25)),
      Leguminosas: 1,
      "AOA bajo en grasa": Math.max(2, Math.round(macros.prot.g / 12)),
      "Leche semidescremada": 2,
      "Grasas sin proteína": Math.max(2, Math.round(macros.gra.g / 6)),
      "Azúcares sin grasa": 1,
    };
    return equivalentes
      .map((e) => ({ nombre: e.nombre, porciones: targets[e.nombre] ?? 0, ...e }))
      .filter((e) => e.porciones > 0);
  }, [get, macros]);

  // Verificación de macros desde intercambios
  const totalDesdeInt = useMemo(() => {
    return intercambios.reduce(
      (acc, e: any) => {
        acc.kcal += e.kcal * e.porciones;
        acc.hco += e.hco * e.porciones;
        acc.prot += e.prot * e.porciones;
        acc.gra += e.gra * e.porciones;
        return acc;
      },
      { kcal: 0, hco: 0, prot: 0, gra: 0 }
    );
  }, [intercambios]);

  const sumPct = pctHco + pctProt;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <Calculator className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cálculo de calorías</h1>
          <p className="text-sm text-muted-foreground">
            Estima el requerimiento energético y la distribución de macronutrientes
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Datos del paciente */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Datos del paciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sexo</Label>
                <Select value={sexo} onValueChange={(v) => setSexo(v as Sexo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Edad (años)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={edad}
                  onChange={(e) => setEdad(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Peso (kg)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={peso}
                  onChange={(e) => setPeso(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Talla (cm)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={talla}
                  onChange={(e) => setTalla(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Factor de actividad</Label>
              <Select value={factor} onValueChange={setFactor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {actividades.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Fórmula</Label>
              <Tabs value={formula} onValueChange={(v) => setFormula(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="schofield-wh">Schofield P+T</TabsTrigger>
                  <TabsTrigger value="schofield-w">Schofield P</TabsTrigger>
                  <TabsTrigger value="fao">FAO/OMS</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground pt-1">
                Recomendado: Schofield P+T en menores de 18 años con talla conocida.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Resultado energético */}
        <Card className="rounded-2xl lg:col-span-2 bg-gradient-to-br from-primary/5 to-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-primary" /> Requerimiento energético
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">TMB / GEB</p>
                <p className="text-2xl font-bold">{Math.round(tmb)} <span className="text-sm font-normal text-muted-foreground">kcal</span></p>
              </div>
              <div className="rounded-xl bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">Factor actividad</p>
                <p className="text-2xl font-bold">×{factor}</p>
              </div>
              <div className="rounded-xl bg-primary p-4 text-primary-foreground shadow-md">
                <p className="text-xs opacity-90">GET total</p>
                <p className="text-2xl font-bold">{get} <span className="text-sm font-normal opacity-90">kcal/día</span></p>
                {peso > 0 && (
                  <p className="text-xs opacity-90 mt-1">
                    ≈ {Math.round((get / peso) * 10) / 10} kcal/kg/día
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Macronutrientes */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" /> Distribución de macronutrientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {sumPct > 100 && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Hidratos + Proteínas no pueden superar 100%
            </div>
          )}

          <MacroSlider
            label="Hidratos de carbono"
            color="bg-[hsl(var(--peach))]"
            pct={pctHco}
            onChange={(v) => setPctHco(Math.min(v, 100 - pctProt))}
            kcal={macros.hco.kcal}
            g={macros.hco.g}
            gxkg={macros.hco.gxkg}
          />
          <MacroSlider
            label="Proteínas"
            color="bg-[hsl(var(--sage))]"
            pct={pctProt}
            onChange={(v) => setPctProt(Math.min(v, 100 - pctHco))}
            kcal={macros.prot.kcal}
            g={macros.prot.g}
            gxkg={macros.prot.gxkg}
          />
          <MacroSlider
            label="Grasas (automático)"
            color="bg-[hsl(var(--lavender))]"
            pct={pctGra}
            disabled
            kcal={macros.gra.kcal}
            g={macros.gra.g}
            gxkg={macros.gra.gxkg}
          />
        </CardContent>
      </Card>

      {/* Intercambios */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Equivalentes / intercambios sugeridos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Estimación basada en SMAE para cubrir el requerimiento calculado.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {intercambios.map((e: any) => (
            <GrupoIntercambioCard
              key={e.nombre}
              equiv={e}
              alimentos={alimentos.filter((a) =>
                (grupoSmaeMap[e.nombre] ?? []).includes(a.grupo)
              )}
            />
          ))}

          <div className="mt-2 grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-5">
            <div>
              <p className="text-xs text-muted-foreground">Total estimado</p>
              <p className="text-sm font-semibold">{totalDesdeInt.kcal} kcal</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">HCO</p>
              <p className="text-sm font-semibold">{totalDesdeInt.hco} g</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proteína</p>
              <p className="text-sm font-semibold">{totalDesdeInt.prot} g</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Grasa</p>
              <p className="text-sm font-semibold">{totalDesdeInt.gra} g</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Objetivo</p>
              <p className="text-sm font-semibold">{get} kcal</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GrupoIntercambioCard({
  equiv,
  alimentos,
}: {
  equiv: { nombre: string; porciones: number; kcal: number; hco: number; prot: number; gra: number };
  alimentos: Array<{ id: string; nombre: string; grupo: string; porcion: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ nombre: string; porcion: string | null } | null>(null);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full text-base px-3 py-1 tabular-nums">
            {equiv.porciones}
          </Badge>
          <div>
            <p className="font-semibold">{equiv.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {equiv.kcal * equiv.porciones} kcal · HCO {equiv.hco * equiv.porciones}g · Prot {equiv.prot * equiv.porciones}g · Gra {equiv.gra * equiv.porciones}g
            </p>
          </div>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-full">
              <Search className="mr-2 h-3.5 w-3.5" />
              {selected ? "Cambiar alimento" : "Buscar alimento"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="end">
            <Command>
              <CommandInput placeholder={`Buscar en ${equiv.nombre}...`} />
              <CommandList>
                <CommandEmpty>
                  {alimentos.length === 0 ? "Cargando catálogo..." : "Sin resultados"}
                </CommandEmpty>
                <CommandGroup>
                  {alimentos.slice(0, 200).map((a) => (
                    <CommandItem
                      key={a.id}
                      value={a.nombre}
                      onSelect={() => {
                        setSelected({ nombre: a.nombre, porcion: a.porcion });
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selected?.nombre === a.nombre ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-1 items-center justify-between gap-2">
                        <span className="truncate">{a.nombre}</span>
                        {a.porcion && (
                          <span className="shrink-0 text-xs text-muted-foreground">{a.porcion}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selected && (
        <div className="mt-3 grid gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Alimento</p>
            <p className="text-sm font-medium">{selected.nombre}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Porción base (1 equiv.)</p>
            <p className="text-sm font-medium">{selected.porcion ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Para {equiv.porciones} porciones</p>
            <p className="text-sm font-semibold text-primary">
              {escalarPorcion(selected.porcion, equiv.porciones)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
