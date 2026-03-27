import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Loader2, Save, Trash2 } from "lucide-react";
import { generatePdf, type PdfConfig, type PdfData } from "@/lib/pdfGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PlantillaTexto {
  id: string;
  nombre: string;
  tipo: string;
  contenido: string;
}

interface PdfConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PdfData;
  savedConfig: {
    generalidades: string;
    snacksColaciones: string;
    recomendaciones: string;
    mensajeAgradecimiento: string;
    estiloPdf: string;
  };
  onSaveConfig: (config: {
    generalidades: string;
    snacks_colaciones: string;
    recomendaciones: string;
    mensaje_agradecimiento: string;
    estilo_pdf: string;
  }) => void;
}

export default function PdfConfigDialog({
  open,
  onOpenChange,
  data,
  savedConfig,
  onSaveConfig,
}: PdfConfigDialogProps) {
  const { user } = useAuth();
  const [estilo, setEstilo] = useState<"lista" | "grid">(
    (savedConfig.estiloPdf as "lista" | "grid") || "lista"
  );
  const [generalidades, setGeneralidades] = useState(savedConfig.generalidades || "");
  const [snacks, setSnacks] = useState(savedConfig.snacksColaciones || "");
  const [recomendaciones, setRecomendaciones] = useState(savedConfig.recomendaciones || "");
  const [agradecimiento, setAgradecimiento] = useState(
    savedConfig.mensajeAgradecimiento ||
      "Gracias por confiar en mí para la alimentación de tu pequeño(a). ¡Juntas lograremos grandes cambios!"
  );
  const [contacto, setContacto] = useState(
    "ND. Lissette Gutiérrez | www.lissnutricion.com | @nut.pediatrica.liss"
  );
  const [generating, setGenerating] = useState(false);

  // Template state
  const [plantillas, setPlantillas] = useState<PlantillaTexto[]>([]);
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");

  useEffect(() => {
    if (open && user) {
      fetchPlantillas();
    }
  }, [open, user]);

  const fetchPlantillas = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("plantillas_texto")
      .select("*")
      .eq("user_id", user.id)
      .order("nombre");
    if (data) setPlantillas(data as PlantillaTexto[]);
  };

  const loadTemplate = (tipo: string, id: string) => {
    const t = plantillas.find((p) => p.id === id);
    if (!t) return;
    if (tipo === "generalidades") setGeneralidades(t.contenido);
    if (tipo === "snacks") setSnacks(t.contenido);
    if (tipo === "recomendaciones") setRecomendaciones(t.contenido);
  };

  const saveTemplate = async (tipo: string) => {
    if (!user || !newTemplateName.trim()) return;
    const contenido =
      tipo === "generalidades" ? generalidades : tipo === "snacks" ? snacks : recomendaciones;

    const { error } = await supabase.from("plantillas_texto").insert({
      user_id: user.id,
      nombre: newTemplateName.trim(),
      tipo,
      contenido,
    });

    if (error) {
      toast.error("Error al guardar plantilla");
    } else {
      toast.success("Plantilla guardada");
      setNewTemplateName("");
      setSavingTemplate(null);
      fetchPlantillas();
    }
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("plantillas_texto").delete().eq("id", id);
    toast.success("Plantilla eliminada");
    fetchPlantillas();
  };

  const handleGenerate = async () => {
    setGenerating(true);

    onSaveConfig({
      generalidades,
      snacks_colaciones: snacks,
      recomendaciones,
      mensaje_agradecimiento: agradecimiento,
      estilo_pdf: estilo,
    });

    const config: PdfConfig = {
      estilo,
      generalidades,
      snacksColaciones: snacks,
      recomendaciones,
      mensajeAgradecimiento: agradecimiento,
      contacto,
    };

    try {
      await generatePdf(data, config);
      toast.success("PDF generado exitosamente");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el PDF");
    } finally {
      setGenerating(false);
    }
  };

  const templatesByType = (tipo: string) => plantillas.filter((p) => p.tipo === tipo);

  const renderTemplateSelector = (tipo: string) => {
    const templates = templatesByType(tipo);
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {templates.length > 0 && (
            <Select onValueChange={(v) => loadTemplate(tipo, v)}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="📂 Cargar plantilla..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between pr-1">
                    <SelectItem value={t.id} className="flex-1 text-xs">
                      {t.nombre}
                    </SelectItem>
                  </div>
                ))}
              </SelectContent>
            </Select>
          )}
          {savingTemplate === tipo ? (
            <div className="flex items-center gap-1">
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Nombre..."
                className="h-8 w-36 text-xs"
                onKeyDown={(e) => e.key === "Enter" && saveTemplate(tipo)}
              />
              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => saveTemplate(tipo)}>
                <Save className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setSavingTemplate(null)}>
                ✕
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              onClick={() => setSavingTemplate(tipo)}
            >
              <Save className="h-3 w-3" />
              Guardar
            </Button>
          )}
        </div>
        {/* Delete buttons for templates */}
        {templates.length > 0 && savingTemplate !== tipo && (
          <div className="flex flex-wrap gap-1">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => deleteTemplate(t.id)}
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                title={`Eliminar "${t.nombre}"`}
              >
                <Trash2 className="h-2.5 w-2.5" />
                {t.nombre}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Configurar PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Estilo */}
          <div className="space-y-2">
            <Label className="font-semibold">Estilo del menú</Label>
            <Select value={estilo} onValueChange={(v) => setEstilo(v as "lista" | "grid")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lista">📋 Lista — Vertical, detallado</SelectItem>
                <SelectItem value="grid">📊 Grid — Horizontal, tabla semanal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Editable sections */}
          <Tabs defaultValue="generalidades" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="generalidades" className="text-xs">Generalidades</TabsTrigger>
              <TabsTrigger value="snacks" className="text-xs">Snacks</TabsTrigger>
              <TabsTrigger value="recomendaciones" className="text-xs">Recomendaciones</TabsTrigger>
              <TabsTrigger value="agradecimiento" className="text-xs">Agradecimiento</TabsTrigger>
            </TabsList>

            <TabsContent value="generalidades" className="space-y-3">
              {renderTemplateSelector("generalidades")}
              <Label className="text-xs text-muted-foreground">
                Cada línea será un bullet en el PDF. Deja vacío para omitir esta sección.
              </Label>
              <Textarea
                value={generalidades}
                onChange={(e) => setGeneralidades(e.target.value)}
                placeholder="Usar aceite de oliva para cocinar&#10;Preferir frutas de temporada&#10;Tomar 6-8 vasos de agua al día"
                rows={6}
              />
            </TabsContent>

            <TabsContent value="snacks" className="space-y-3">
              {renderTemplateSelector("snacks")}
              <Label className="text-xs text-muted-foreground">
                Lista de opciones de snacks y colaciones. Cada línea = un bullet.
              </Label>
              <Textarea
                value={snacks}
                onChange={(e) => setSnacks(e.target.value)}
                placeholder="Manzana con crema de cacahuate&#10;Yogur natural con granola&#10;Palitos de zanahoria con hummus"
                rows={6}
              />
            </TabsContent>

            <TabsContent value="recomendaciones" className="space-y-3">
              {renderTemplateSelector("recomendaciones")}
              <Label className="text-xs text-muted-foreground">
                Recomendaciones generales para el paciente. Cada línea = un bullet.
              </Label>
              <Textarea
                value={recomendaciones}
                onChange={(e) => setRecomendaciones(e.target.value)}
                placeholder="Evitar bebidas azucaradas&#10;Cenar al menos 2 horas antes de dormir&#10;Incluir vegetales en cada comida"
                rows={6}
              />
            </TabsContent>

            <TabsContent value="agradecimiento" className="space-y-3">
              <Label className="text-xs text-muted-foreground">
                Mensaje que aparece en la última página del PDF.
              </Label>
              <Textarea
                value={agradecimiento}
                onChange={(e) => setAgradecimiento(e.target.value)}
                rows={4}
              />
            </TabsContent>
          </Tabs>

          {/* Contacto */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Pie de página (contacto)</Label>
            <Textarea
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2 rounded-xl">
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {generating ? "Generando..." : "Descargar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
