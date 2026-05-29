import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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


type Sexo = "M" | "F";

// ---- Fórmulas (kcal/día, gasto energético basal) ----
function schofieldWH(sexo: Sexo, edad: number, peso: number, talla: number) {
  // talla en cm
  if (sexo === "M") {
    if (edad < 3) return 0.167 * peso + 15.174 * (talla / 100) - 617.6;
    if (edad < 10) return 19.59 * peso + 1.303 * talla + 414.9;
    if (edad < 18) return 16.25 * peso + 1.372 * talla + 515.5;
    return 15.057 * peso + 1.004 * talla + 705.8;
  } else {
    if (edad < 3) return 16.252 * peso + 10.232 * (talla / 100) - 413.5;
    if (edad < 10) return 16.969 * peso + 1.618 * talla + 371.2;
    if (edad < 18) return 8.365 * peso + 4.65 * talla + 200;
    return 13.623 * peso + 23.8 * (talla / 100) + 98.2;
  }
}

function schofieldW(sexo: Sexo, edad: number, peso: number) {
  if (sexo === "M") {
    if (edad < 3) return 59.512 * peso - 30.4;
    if (edad < 10) return 22.706 * peso + 504.3;
    if (edad < 18) return 17.686 * peso + 658.2;
    return 15.057 * peso + 692.2;
  } else {
    if (edad < 3) return 58.317 * peso - 31.1;
    if (edad < 10) return 20.315 * peso + 485.9;
    if (edad < 18) return 13.384 * peso + 692.6;
    return 14.818 * peso + 486.6;
  }
}

function faoOms(sexo: Sexo, edad: number, peso: number) {
  if (sexo === "M") {
    if (edad < 3) return 60.9 * peso - 54;
    if (edad < 10) return 22.7 * peso + 495;
    if (edad < 18) return 17.5 * peso + 651;
    return 15.3 * peso + 679;
  } else {
    if (edad < 3) return 61.0 * peso - 51;
    if (edad < 10) return 22.5 * peso + 499;
    if (edad < 18) return 12.2 * peso + 746;
    return 14.7 * peso + 496;
  }
}

const actividades = [
  { value: "1.2", label: "Reposo / sedentario (1.2)" },
  { value: "1.3", label: "Muy ligera (1.3)" },
  { value: "1.55", label: "Ligera (1.55)" },
  { value: "1.75", label: "Moderada (1.75)" },
  { value: "2.0", label: "Intensa (2.0)" },
];

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
  const [formula, setFormula] = useState<"schofield-wh" | "schofield-w" | "fao">(
    "schofield-wh"
  );

  // Sliders: carbohidratos y proteínas controlables, grasas = 100 - hco - prot
  const [pctHco, setPctHco] = useState<number>(55);
  const [pctProt, setPctProt] = useState<number>(15);
  const pctGra = Math.max(0, 100 - pctHco - pctProt);

  const tmb = useMemo(() => {
    if (!peso || !edad) return 0;
    if (formula === "schofield-wh") return schofieldWH(sexo, edad, peso, talla || 0);
    if (formula === "schofield-w") return schofieldW(sexo, edad, peso);
    return faoOms(sexo, edad, peso);
  }, [formula, sexo, edad, peso, talla]);

  const get = Math.round(tmb * parseFloat(factor || "1"));

  const macros = useMemo(() => {
    const calc = (pct: number, kcalPorG: number) => {
      const kcal = (get * pct) / 100;
      const g = kcal / kcalPorG;
      const gxkg = peso ? g / peso : 0;
      return { kcal: Math.round(kcal), g: Math.round(g * 10) / 10, gxkg: Math.round(gxkg * 100) / 100 };
    };
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
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Grupo</th>
                  <th className="py-2 px-3 text-center font-medium">Porciones</th>
                  <th className="py-2 px-3 text-right font-medium">kcal</th>
                  <th className="py-2 px-3 text-right font-medium">HCO (g)</th>
                  <th className="py-2 px-3 text-right font-medium">Prot (g)</th>
                  <th className="py-2 pl-3 text-right font-medium">Gra (g)</th>
                </tr>
              </thead>
              <tbody>
                {intercambios.map((e: any) => (
                  <tr key={e.nombre} className="border-b last:border-0">
                    <td className="py-2 pr-3">{e.nombre}</td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant="secondary" className="rounded-full">{e.porciones}</Badge>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{e.kcal * e.porciones}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{e.hco * e.porciones}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{e.prot * e.porciones}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{e.gra * e.porciones}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-3 pr-3">Total estimado</td>
                  <td />
                  <td className="py-3 px-3 text-right tabular-nums">{totalDesdeInt.kcal}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{totalDesdeInt.hco}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{totalDesdeInt.prot}</td>
                  <td className="py-3 pl-3 text-right tabular-nums">{totalDesdeInt.gra}</td>
                </tr>
                <tr className="text-muted-foreground">
                  <td className="py-1 pr-3 text-xs">Objetivo</td>
                  <td />
                  <td className="py-1 px-3 text-right text-xs tabular-nums">{get}</td>
                  <td className="py-1 px-3 text-right text-xs tabular-nums">{macros.hco.g}</td>
                  <td className="py-1 px-3 text-right text-xs tabular-nums">{macros.prot.g}</td>
                  <td className="py-1 pl-3 text-right text-xs tabular-nums">{macros.gra.g}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MacroSlider({
  label,
  color,
  pct,
  onChange,
  kcal,
  g,
  gxkg,
  disabled,
}: {
  label: string;
  color: string;
  pct: number;
  onChange?: (v: number) => void;
  kcal: number;
  g: number;
  gxkg: number;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${color}`} />
          <Label className="text-sm">{label}</Label>
        </div>
        <span className="text-sm font-semibold tabular-nums">{pct}%</span>
      </div>
      <Slider
        value={[pct]}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        onValueChange={(v) => onChange?.(v[0])}
      />
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <p className="text-muted-foreground">kcal</p>
          <p className="font-semibold tabular-nums">{kcal}</p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <p className="text-muted-foreground">gramos</p>
          <p className="font-semibold tabular-nums">{g}</p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <p className="text-muted-foreground">g/kg/día</p>
          <p className="font-semibold tabular-nums">{gxkg}</p>
        </div>
      </div>
    </div>
  );
}
