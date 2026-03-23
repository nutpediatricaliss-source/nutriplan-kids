import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Alimento } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Upload, Search, Apple, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

export default function Alimentos() {
  const { user } = useAuth();
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [search, setSearch] = useState("");
  const [grupoFilter, setGrupoFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingItem, setEditingItem] = useState<Alimento | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editGrupo, setEditGrupo] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAlimentos = async () => {
    const { data, error } = await supabase
      .from("alimentos_smae")
      .select("*")
      .order("nombre");
    if (!error) setAlimentos(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAlimentos();
  }, []);

  const grupos = [...new Set(alimentos.map((a) => a.grupo))].sort();

  const filtered = alimentos.filter((a) => {
    const matchSearch = a.nombre.toLowerCase().includes(search.toLowerCase());
    const matchGrupo = grupoFilter === "all" || a.grupo === grupoFilter;
    return matchSearch && matchGrupo;
  });

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    let records: any[] = [];

    if (file.name.endsWith(".json")) {
      records = JSON.parse(text);
    } else if (file.name.endsWith(".csv")) {
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      const firstLine = lines[0].replace(/^\uFEFF/, '');
      // Auto-detect delimiter: semicolon or comma
      const delimiter = firstLine.includes(";") ? ";" : ",";
      const splitLine = (line: string) => {
        if (delimiter === ",") return parseCSVLine(line);
        return line.split(delimiter).map((v) => v.trim());
      };
      const headers = splitLine(firstLine).map((h) => h.trim());
      records = lines.slice(1).map((line) => {
        const values = splitLine(line);
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h] = values[i] ?? "";
        });
        return obj;
      });
    }

    if (records.length === 0) {
      toast.error("No se encontraron registros");
      return;
    }

    // Map CSV columns to database columns
    const toInsert = records
      .filter((r) => (r["Alimento"] || r["nombre"] || "").trim().length > 0)
      .map((r) => ({
        nombre: (r["Alimento"] || r["nombre"] || r["name"] || "").trim(),
        grupo: (r["Grupo"] || r["grupo"] || r["group"] || "General").trim(),
        porcion: r["Cantidad"] && r["Unidad"]
          ? `${r["Cantidad"]} ${r["Unidad"]}`
          : r["porcion"] || r["portion"] || null,
        calorias: parseFloat(r["Energia"] || r["Energía"] || r["calorias"] || r["calories"] || 0) || 0,
        proteinas: parseFloat(r["Proteina"] || r["Proteína"] || r["proteinas"] || r["protein"] || 0) || 0,
        grasas: parseFloat(r["Lipidos"] || r["Lípidos"] || r["grasas"] || r["fat"] || 0) || 0,
        carbohidratos: parseFloat(r["HidratosCarbono"] || r["Hidratos_de_carbono"] || r["carbohidratos"] || r["carbs"] || 0) || 0,
        fibra: parseFloat(r["Fibra"] || r["fibra"] || r["fiber"] || 0) || 0,
        user_id: user!.id,
      }));

    if (toInsert.length === 0) {
      toast.error("No se encontraron alimentos válidos en el archivo");
      return;
    }

    // Insert in batches of 500
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 500) {
      const batch = toInsert.slice(i, i + 500);
      const { error } = await supabase.from("alimentos_smae").insert(batch);
      if (error) {
        toast.error("Error al importar: " + error.message);
        break;
      }
      inserted += batch.length;
    }

    if (inserted > 0) {
      toast.success(`${inserted} alimentos importados`);
      fetchAlimentos();
    }

    if (fileRef.current) fileRef.current.value = "";
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Alimentos SMAE</h1>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json"
            onChange={handleImport}
            className="hidden"
          />
          <Button variant="outline" className="gap-2" onClick={() => {
            if (fileRef.current) fileRef.current.value = "";
            fileRef.current?.click();
          }}>
            <Upload className="h-4 w-4" />
            Importar CSV/JSON
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alimentos..."
            className="pl-9"
          />
        </div>
        <Select value={grupoFilter} onValueChange={setGrupoFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los grupos</SelectItem>
            {grupos.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Apple className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">Sin alimentos</p>
            <p className="text-sm text-muted-foreground">Importa tu base de datos SMAE en formato CSV o JSON</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Porción</TableHead>
                <TableHead className="text-right">Kcal</TableHead>
                <TableHead className="text-right">Prot</TableHead>
                <TableHead className="text-right">Grasas</TableHead>
                <TableHead className="text-right">Carb</TableHead>
                <TableHead className="text-right">Fibra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nombre}</TableCell>
                  <TableCell>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs">{a.grupo}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.porcion}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.calorias}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.proteinas}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.grasas}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.carbohidratos}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.fibra}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length > 100 && (
            <p className="p-3 text-center text-sm text-muted-foreground">
              Mostrando 100 de {filtered.length} resultados
            </p>
          )}
        </div>
      )}
    </div>
  );
}
