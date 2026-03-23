import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Receta } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, UtensilsCrossed, Upload, Image } from "lucide-react";
import { toast } from "sonner";

export default function Recetas() {
  const { user } = useAuth();
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Receta | null>(null);
  const [uploading, setUploading] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nombre: "",
    ingredientes: "",
    preparacion: "",
    imagen_url: "",
    nota_predeterminada: "",
    incluir_detalle_pdf: true,
  });

  const fetchRecetas = async () => {
    const { data, error } = await supabase
      .from("recetas")
      .select("*")
      .order("nombre");
    if (!error) setRecetas(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecetas();
  }, []);

  const resetForm = () => {
    setForm({
      nombre: "",
      ingredientes: "",
      preparacion: "",
      imagen_url: "",
      nota_predeterminada: "",
      incluir_detalle_pdf: true,
    });
    setEditing(null);
  };

  const openEdit = (r: Receta) => {
    setEditing(r);
    setForm({
      nombre: r.nombre,
      ingredientes: r.ingredientes ?? "",
      preparacion: r.preparacion ?? "",
      imagen_url: r.imagen_url ?? "",
      nota_predeterminada: r.nota_predeterminada ?? "",
      incluir_detalle_pdf: r.incluir_detalle_pdf ?? true,
    });
    setDialogOpen(true);
  };

  // ─── Image upload ───────────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("receta-imagenes")
      .upload(path, file);

    if (error) {
      toast.error("Error al subir imagen");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("receta-imagenes")
      .getPublicUrl(path);

    setForm({ ...form, imagen_url: urlData.publicUrl });
    setUploading(false);
    toast.success("Imagen subida");
    if (imageRef.current) imageRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;

    if (editing) {
      const { error } = await supabase
        .from("recetas")
        .update(form)
        .eq("id", editing.id);
      if (error) toast.error("Error al actualizar");
      else toast.success("Receta actualizada");
    } else {
      const { error } = await supabase
        .from("recetas")
        .insert({ ...form, user_id: user!.id });
      if (error) toast.error("Error al crear");
      else toast.success("Receta creada");
    }

    setDialogOpen(false);
    resetForm();
    fetchRecetas();
  };

  const deleteReceta = async (id: string) => {
    const { error } = await supabase.from("recetas").delete().eq("id", id);
    if (error) toast.error("Error al eliminar");
    else {
      toast.success("Receta eliminada");
      fetchRecetas();
    }
  };

  // ─── Bulk import CSV/JSON ──────────────────────────────────────────────
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((ch === "," || ch === ";") && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const text = await file.text();
    let rows: Record<string, any>[] = [];

    if (file.name.endsWith(".json")) {
      try {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        toast.error("JSON inválido");
        return;
      }
    } else {
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("El archivo está vacío o no tiene encabezados");
        return;
      }
      const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-záéíóúñü0-9_]/gi, "_").replace(/_+/g, "_").replace(/^_|_$/g, ""));
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i]);
        const obj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          obj[h] = vals[idx] ?? "";
        });
        rows.push(obj);
      }
    }

    const fieldMap: Record<string, string> = {
      nombre: "nombre",
      name: "nombre",
      ingredientes: "ingredientes",
      ingredients: "ingredientes",
      preparacion: "preparacion",
      preparación: "preparacion",
      preparation: "preparacion",
      instrucciones: "preparacion",
      imagen_url: "imagen_url",
      imagen: "imagen_url",
      image: "imagen_url",
      image_url: "imagen_url",
      nota_predeterminada: "nota_predeterminada",
      nota: "nota_predeterminada",
      note: "nota_predeterminada",
      incluir_detalle_pdf: "incluir_detalle_pdf",
      incluir_detalle: "incluir_detalle_pdf",
      detalle_pdf: "incluir_detalle_pdf",
    };

    const mapped = rows
      .map((row) => {
        const item: Record<string, any> = { user_id: user.id };
        for (const [key, val] of Object.entries(row)) {
          const mapped_key = fieldMap[key.toLowerCase()] || fieldMap[key.toLowerCase().replace(/[^a-záéíóúñü0-9_]/gi, "_")];
          if (mapped_key) {
            if (mapped_key === "incluir_detalle_pdf") {
              const v = String(val).toLowerCase();
              item[mapped_key] = v === "true" || v === "sí" || v === "si" || v === "1" || v === "yes";
            } else {
              item[mapped_key] = val;
            }
          }
        }
        return item;
      })
      .filter((r) => r.nombre && String(r.nombre).trim());

    if (mapped.length === 0) {
      toast.error("No se encontraron recetas válidas en el archivo");
      return;
    }

    let inserted = 0;
    for (let i = 0; i < mapped.length; i += 500) {
      const batch = mapped.slice(i, i + 500);
      const { error } = await supabase.from("recetas").insert(batch);
      if (!error) inserted += batch.length;
    }

    toast.success(`${inserted} recetas importadas`);
    fetchRecetas();
    if (importRef.current) importRef.current.value = "";
  };

  const filtered = recetas.filter((r) =>
    r.nombre.toLowerCase().includes(search.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold tracking-tight">Mis Recetas</h1>
        <div className="flex gap-2">
          <input
            ref={importRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={handleImport}
          />
          <Button variant="outline" className="gap-2" onClick={() => importRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Importar CSV/JSON
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Receta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Receta" : "Nueva Receta"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej. Sopa de Pollo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ingredientes</Label>
                  <Textarea
                    value={form.ingredientes}
                    onChange={(e) => setForm({ ...form, ingredientes: e.target.value })}
                    placeholder="Lista de ingredientes..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preparación</Label>
                  <Textarea
                    value={form.preparacion}
                    onChange={(e) => setForm({ ...form, preparacion: e.target.value })}
                    placeholder="Pasos de preparación..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imagen</Label>
                  {form.imagen_url && (
                    <div className="mb-2 aspect-video overflow-hidden rounded-md bg-muted">
                      <img src={form.imagen_url} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={imageRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => imageRef.current?.click()}
                      disabled={uploading}
                    >
                      <Image className="h-3.5 w-3.5" />
                      {uploading ? "Subiendo..." : "Subir foto"}
                    </Button>
                    <span className="text-xs text-muted-foreground self-center">o</span>
                    <Input
                      value={form.imagen_url}
                      onChange={(e) => setForm({ ...form, imagen_url: e.target.value })}
                      placeholder="Pegar URL de imagen..."
                      className="flex-1 text-xs h-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nota predeterminada para menú</Label>
                  <Input
                    value={form.nota_predeterminada}
                    onChange={(e) => setForm({ ...form, nota_predeterminada: e.target.value })}
                    placeholder="Ej. con 50g de pollo"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Incluir detalle en PDF</Label>
                  <Switch
                    checked={form.incluir_detalle_pdf}
                    onCheckedChange={(c) => setForm({ ...form, incluir_detalle_pdf: c })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editing ? "Guardar Cambios" : "Crear Receta"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar recetas..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UtensilsCrossed className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">Sin recetas</p>
            <p className="text-sm text-muted-foreground">Agrega tu primera receta para comenzar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.id} className="group overflow-hidden transition-shadow hover:shadow-md">
              {r.imagen_url && (
                <div className="aspect-video overflow-hidden bg-muted">
                  <img
                    src={r.imagen_url}
                    alt={r.nombre}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{r.nombre}</CardTitle>
                {r.nota_predeterminada && (
                  <p className="text-xs text-muted-foreground italic">{r.nota_predeterminada}</p>
                )}
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => deleteReceta(r.id)}>
                  <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" />
                  Eliminar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
