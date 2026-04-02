import jsPDF from "jspdf";
import type { PlanMenu, PlanItem, Alimento, Receta } from "./types";

// ─── Brand colors ──────────────────────────────────────────────────────────
const COLORS = {
  gold: [231, 198, 136] as [number, number, number],       // #e7c688
  darkGold: [173, 138, 72] as [number, number, number],    // #ad8a48
  cream: [255, 224, 167] as [number, number, number],      // #ffe0a7
  creamSoft: [255, 245, 224] as [number, number, number],  // #fff5e0
  white: [255, 255, 255] as [number, number, number],
  black: [40, 40, 40] as [number, number, number],
  gray: [120, 120, 120] as [number, number, number],
};

const MARGIN = 20;
const FOOTER_Y = 280;

export interface PdfConfig {
  estilo: "lista" | "grid";
  generalidades: string;
  snacksColaciones: string;
  recomendaciones: string;
  mensajeAgradecimiento: string;
  contacto: string;
}

export interface PdfData {
  plan: PlanMenu;
  items: PlanItem[];
  alimentos: Alimento[];
  recetas: Receta[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function drawWavyLine(doc: jsPDF, y: number, width: number) {
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(1.5);
  const step = 4;
  const amp = 3;
  for (let x = MARGIN; x < width - MARGIN; x += step) {
    const y1 = y + Math.sin((x / step) * Math.PI) * amp;
    const y2 = y + Math.sin(((x + step) / step) * Math.PI) * amp;
    doc.line(x, y1, x + step, y2);
  }
}

function drawFooter(doc: jsPDF, contacto: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, FOOTER_Y, w - MARGIN, FOOTER_Y);
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.gray);
  doc.text(contacto, w / 2, FOOTER_Y + 4, { align: "center" });
}

async function addHeaderWithLogo(doc: jsPDF, logoData: string | null) {
  const w = doc.internal.pageSize.getWidth();
  drawWavyLine(doc, 12, w);
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", w - 45, 5, 30, 15);
    } catch { /* logo failed */ }
  }
}

function splitTextToLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

function drawBulletList(doc: jsPDF, lines: string[], startY: number, maxWidth: number): number {
  let y = startY;
  for (const line of lines) {
    if (!line.trim()) continue;
    const wrapped = splitTextToLines(doc, line.trim(), maxWidth - 8);
    doc.setFillColor(...COLORS.darkGold);
    doc.circle(MARGIN + 3, y - 1, 1.2, "F");
    for (const wl of wrapped) {
      doc.text(wl, MARGIN + 8, y);
      y += 5.5;
    }
    y += 1;
    if (y > FOOTER_Y - 10) break;
  }
  return y;
}

// ─── Decorative organic blobs for cover/thanks ─────────────────────────────
function drawDecorativeBlobs(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Top-left blob
  doc.setFillColor(...COLORS.cream);
  doc.ellipse(0, 0, 70, 50, "F");

  // Top-right blob
  doc.setFillColor(...COLORS.gold);
  doc.ellipse(w, 0, 60, 45, "F");

  // Bottom-left blob
  doc.setFillColor(...COLORS.gold);
  doc.ellipse(0, h, 80, 55, "F");

  // Bottom-right blob
  doc.setFillColor(...COLORS.cream);
  doc.ellipse(w, h, 65, 50, "F");

  // Middle accent
  doc.setFillColor(255, 240, 210);
  doc.ellipse(w * 0.7, h * 0.3, 30, 25, "F");
}

// ─── Section renderers ────────────────────────────────────────────────────
function renderPortada(doc: jsPDF, plan: PlanMenu, logoData: string | null) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  drawDecorativeBlobs(doc);

  // Thin decorative lines
  doc.setDrawColor(...COLORS.darkGold);
  doc.setLineWidth(0.3);
  doc.rect(25, 25, w - 50, h - 50);

  // Title
  doc.setFontSize(32);
  doc.setFont("times", "bold");
  doc.setTextColor(...COLORS.darkGold);
  doc.text("Plan Nutricional", w / 2, h * 0.35, { align: "center" });

  // Patient name
  doc.setFontSize(18);
  doc.setFont("times", "normal");
  doc.setTextColor(...COLORS.black);
  doc.text(plan.nombre_paciente, w / 2, h * 0.43, { align: "center" });

  // Subtitle
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.gray);
  doc.text("Consulta de Nutrición Pediátrica", w / 2, h * 0.50, { align: "center" });

  // Duration
  doc.setFontSize(10);
  doc.text(`${plan.dias} días`, w / 2, h * 0.55, { align: "center" });

  // Logo at bottom center
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", w / 2 - 25, h * 0.72, 50, 25);
    } catch { /* */ }
  }
}

function renderGeneralidades(doc: jsPDF, config: PdfConfig, logoData: string | null) {
  doc.addPage();
  addHeaderWithLogo(doc, logoData);

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.darkGold);
  doc.text("Generalidades del Menú", MARGIN, 35);

  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 38, MARGIN + 60, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.black);

  const bullets = config.generalidades.split("\n").filter(Boolean);
  drawBulletList(doc, bullets, 50, doc.internal.pageSize.getWidth() - MARGIN * 2);

  drawFooter(doc, config.contacto);
}

function renderMenuLista(doc: jsPDF, data: PdfData, config: PdfConfig, logoData: string | null) {
  const tiempos = (data.plan.tiempos_comida as string[]) ?? [];
  const totalWeeks = Math.ceil(data.plan.dias / 7);
  const pageW = doc.internal.pageSize.getWidth();

  for (let week = 0; week < totalWeeks; week++) {
    doc.addPage();
    addHeaderWithLogo(doc, logoData);

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...COLORS.darkGold);
    doc.text(`Semana ${week + 1}`, MARGIN, 35);

    const weekStart = week * 7 + 1;
    const weekEnd = Math.min(weekStart + 6, data.plan.dias);
    let y = 45;

    for (let day = weekStart; day <= weekEnd; day++) {
      if (y > 250) {
        drawFooter(doc, config.contacto);
        doc.addPage();
        addHeaderWithLogo(doc, logoData);
        y = 30;
      }

      // Day header
      doc.setFillColor(...COLORS.cream);
      doc.roundedRect(MARGIN, y - 4, pageW - MARGIN * 2, 8, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.darkGold);
      doc.text(`Día ${day}`, MARGIN + 4, y + 1.5);
      y += 10;

      for (const tiempo of tiempos) {
        const dayItems = data.items.filter(
          (i) => i.dia === day && i.tiempo_comida === tiempo
        );
        if (dayItems.length === 0) continue;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.darkGold);
        doc.text(tiempo, MARGIN + 4, y);
        y += 4;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.black);

        for (const item of dayItems) {
          let name = "";
          if (item.tipo === "alimento") {
            const al = data.alimentos.find((a) => a.id === item.item_id);
            name = al?.nombre ?? "Alimento";
            if (item.porcion) name += ` — ${item.porcion}`;
          } else {
            const rec = data.recetas.find((r) => r.id === item.item_id);
            name = rec?.nombre ?? "Receta";
            if (item.nota_menu) name += ` (${item.nota_menu})`;
          }

          const lines = splitTextToLines(doc, `• ${name}`, pageW - MARGIN * 2 - 10);
          for (const l of lines) {
            if (y > FOOTER_Y - 10) {
              drawFooter(doc, config.contacto);
              doc.addPage();
              addHeaderWithLogo(doc, logoData);
              y = 30;
            }
            doc.text(l, MARGIN + 8, y);
            y += 4;
          }
        }
        y += 2;
      }
      y += 4;
    }

    drawFooter(doc, config.contacto);
  }
}

function renderMenuGrid(doc: jsPDF, data: PdfData, config: PdfConfig, logoData: string | null) {
  const tiempos = (data.plan.tiempos_comida as string[]) ?? [];
  const totalWeeks = Math.ceil(data.plan.dias / 7);

  for (let week = 0; week < totalWeeks; week++) {
    doc.addPage("landscape");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Header
    drawWavyLine(doc, 8, pageW);
    if (logoData) {
      try { doc.addImage(logoData, "PNG", pageW - 40, 3, 25, 12); } catch {}
    }

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.darkGold);
    doc.text(`Semana ${week + 1}`, 15, 22);

    const weekStart = week * 7 + 1;
    const weekEnd = Math.min(weekStart + 6, data.plan.dias);
    const numDays = weekEnd - weekStart + 1;

    const tableX = 15;
    const tableY = 28;
    const colW = (pageW - 30 - 50) / numDays; // 50 for tiempo col
    const tiempoColW = 50;
    const rowH = Math.min((pageH - tableY - 20) / (tiempos.length + 1), 22);

    // Header row
    doc.setFillColor(...COLORS.gold);
    doc.rect(tableX, tableY, tiempoColW, rowH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.white);
    doc.text("Tiempo", tableX + 3, tableY + rowH / 2 + 1);

    for (let i = 0; i < numDays; i++) {
      const x = tableX + tiempoColW + i * colW;
      doc.setFillColor(...COLORS.gold);
      doc.rect(x, tableY, colW, rowH, "F");
      doc.setTextColor(...COLORS.white);
      doc.text(`Día ${weekStart + i}`, x + 3, tableY + rowH / 2 + 1);
    }

    // Data rows
    for (let t = 0; t < tiempos.length; t++) {
      const rowY = tableY + (t + 1) * rowH;

      // Tiempo label
      doc.setFillColor(...COLORS.creamSoft);
      doc.rect(tableX, rowY, tiempoColW, rowH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...COLORS.darkGold);
      doc.text(tiempos[t], tableX + 3, rowY + 4);

      for (let i = 0; i < numDays; i++) {
        const day = weekStart + i;
        const x = tableX + tiempoColW + i * colW;

        if (t % 2 === 0) { doc.setFillColor(...COLORS.white); } else { doc.setFillColor(...COLORS.creamSoft); }
        doc.rect(x, rowY, colW, rowH, "F");

        const dayItems = data.items.filter(
          (item) => item.dia === day && item.tiempo_comida === tiempos[t]
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(...COLORS.black);

        let itemY = rowY + 4;
        for (const item of dayItems) {
          if (itemY > rowY + rowH - 2) break;
          let name = "";
          if (item.tipo === "alimento") {
            const al = data.alimentos.find((a) => a.id === item.item_id);
            name = al?.nombre ?? "Alimento";
          } else {
            const rec = data.recetas.find((r) => r.id === item.item_id);
            name = rec?.nombre ?? "Receta";
          }
          const truncated = name.length > 25 ? name.substring(0, 22) + "..." : name;
          doc.text(truncated, x + 2, itemY);
          itemY += 3.5;
        }
      }
    }

    // Grid lines
    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(0.2);
    const totalW = tiempoColW + numDays * colW;
    const totalH = (tiempos.length + 1) * rowH;
    doc.rect(tableX, tableY, totalW, totalH);
    for (let i = 0; i <= tiempos.length; i++) {
      doc.line(tableX, tableY + i * rowH, tableX + totalW, tableY + i * rowH);
    }
    doc.line(tableX + tiempoColW, tableY, tableX + tiempoColW, tableY + totalH);
    for (let i = 1; i < numDays; i++) {
      const x = tableX + tiempoColW + i * colW;
      doc.line(x, tableY, x, tableY + totalH);
    }

    // Footer
    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(0.3);
    doc.line(15, pageH - 10, pageW - 15, pageH - 10);
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.gray);
    doc.text(config.contacto, pageW / 2, pageH - 6, { align: "center" });
  }
}

function renderSnacks(doc: jsPDF, config: PdfConfig, logoData: string | null) {
  doc.addPage("portrait");
  addHeaderWithLogo(doc, logoData);

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.darkGold);
  doc.text("Snacks y Colaciones", MARGIN, 35);

  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 38, MARGIN + 55, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.black);

  const bullets = config.snacksColaciones.split("\n").filter(Boolean);
  drawBulletList(doc, bullets, 50, doc.internal.pageSize.getWidth() - MARGIN * 2);

  drawFooter(doc, config.contacto);
}

function renderRecomendaciones(doc: jsPDF, config: PdfConfig, logoData: string | null) {
  doc.addPage("portrait");
  addHeaderWithLogo(doc, logoData);

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.darkGold);
  doc.text("Recomendaciones", MARGIN, 35);

  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 38, MARGIN + 48, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.black);

  const bullets = config.recomendaciones.split("\n").filter(Boolean);
  drawBulletList(doc, bullets, 50, doc.internal.pageSize.getWidth() - MARGIN * 2);

  drawFooter(doc, config.contacto);
}

async function renderRecetas(doc: jsPDF, data: PdfData, config: PdfConfig, logoData: string | null) {
  const includedRecipeIds = new Set(
    data.items
      .filter((i) => i.tipo === "receta" && i.incluir_detalle_pdf)
      .map((i) => i.item_id)
  );

  const recipesToShow = data.recetas.filter((r) => includedRecipeIds.has(r.id));
  if (recipesToShow.length === 0) return;

  const pageW = 210;

  // Start first recipes page
  doc.addPage("portrait");
  await addHeaderWithLogo(doc, logoData);

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.darkGold);
  doc.text("Recetas", MARGIN, 35);
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 38, MARGIN + 30, 38);

  let y = 48;

  for (let ri = 0; ri < recipesToShow.length; ri++) {
    const receta = recipesToShow[ri];

    // Estimate space needed: at least 60mm for a recipe
    if (y > FOOTER_Y - 60) {
      drawFooter(doc, config.contacto);
      doc.addPage("portrait");
      await addHeaderWithLogo(doc, logoData);
      y = 30;
    }

    // Separator between recipes (not before the first one)
    if (ri > 0) {
      doc.setDrawColor(...COLORS.gold);
      doc.setLineWidth(0.4);
      doc.line(MARGIN + 10, y, pageW - MARGIN - 10, y);
      y += 6;
    }

    // Recipe name
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.darkGold);
    doc.text(receta.nombre, MARGIN, y);
    y += 4;

    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, MARGIN + 30, y);
    y += 6;

    const textMaxW = receta.imagen_url ? pageW - MARGIN * 2 - 60 : pageW - MARGIN * 2;
    const imgX = pageW - MARGIN - 50;

    // Try to add recipe image
    if (receta.imagen_url) {
      try {
        const imgData = await loadImage(receta.imagen_url);
        doc.addImage(imgData, "JPEG", imgX, y - 8, 50, 50);
      } catch { /* image failed to load */ }
    }

    // Ingredientes
    if (receta.ingredientes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.darkGold);
      doc.text("Ingredientes", MARGIN, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.black);

      const ingredients = receta.ingredientes.includes(";")
        ? receta.ingredientes.split(";").map(s => s.trim()).filter(Boolean)
        : receta.ingredientes.split("\n").filter(Boolean);
      for (const ing of ingredients) {
        const lines = splitTextToLines(doc, `• ${ing.trim()}`, textMaxW);
        for (const l of lines) {
          if (y > FOOTER_Y - 10) {
            drawFooter(doc, config.contacto);
            doc.addPage("portrait");
            await addHeaderWithLogo(doc, logoData);
            y = 30;
          }
          doc.text(l, MARGIN + 4, y);
          y += 5.5;
        }
      }
      y += 3;
    }

    // Preparación
    if (receta.preparacion) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.darkGold);
      doc.text("Preparación", MARGIN, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.black);

      const steps = receta.preparacion.includes(". ")
        ? receta.preparacion.split(/\.\s+/).map(s => s.trim()).filter(Boolean)
        : receta.preparacion.split("\n").filter(Boolean);
      steps.forEach((step, idx) => {
        const lines = splitTextToLines(doc, `${idx + 1}. ${step.trim()}`, pageW - MARGIN * 2);
        for (const l of lines) {
          if (y > FOOTER_Y - 10) {
            drawFooter(doc, config.contacto);
            doc.addPage("portrait");
            addHeaderWithLogo(doc, logoData);
            y = 30;
          }
          doc.text(l, MARGIN + 4, y);
          y += 5.5;
        }
        y += 1.5;
      });
    }

    y += 6;
  }

  drawFooter(doc, config.contacto);
}

function renderAgradecimiento(doc: jsPDF, config: PdfConfig, logoData: string | null) {
  doc.addPage("portrait");
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  drawDecorativeBlobs(doc);

  // Decorative border
  doc.setDrawColor(...COLORS.darkGold);
  doc.setLineWidth(0.3);
  doc.rect(25, 25, w - 50, h - 50);

  // Message
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.darkGold);
  doc.text("¡Gracias!", w / 2, h * 0.35, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.black);

  const lines = splitTextToLines(doc, config.mensajeAgradecimiento, w - 80);
  let y = h * 0.43;
  for (const line of lines) {
    doc.text(line, w / 2, y, { align: "center" });
    y += 6;
  }

  // Logo at bottom
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", w / 2 - 25, h * 0.72, 50, 25);
    } catch { /* */ }
  }
}

// ─── Main generator ───────────────────────────────────────────────────────
export async function generatePdf(data: PdfData, config: PdfConfig) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Load logo
  let logoData: string | null = null;
  try {
    logoData = await loadImage("/images/logo.png");
  } catch { /* */ }

  // 1. Portada
  renderPortada(doc, data.plan, logoData);

  // 2. Generalidades
  if (config.generalidades.trim()) {
    renderGeneralidades(doc, config, logoData);
  }

  // 3. Menú diario
  if (config.estilo === "grid") {
    renderMenuGrid(doc, data, config, logoData);
  } else {
    renderMenuLista(doc, data, config, logoData);
  }

  // 4. Snacks y Colaciones
  if (config.snacksColaciones.trim()) {
    renderSnacks(doc, config, logoData);
  }

  // 5. Recomendaciones
  if (config.recomendaciones.trim()) {
    renderRecomendaciones(doc, config, logoData);
  }

  // 6. Recetas
  await renderRecetas(doc, data, config, logoData);

  // 7. Agradecimiento
  renderAgradecimiento(doc, config, logoData);

  // Download
  const filename = `Plan_Nutricional_${data.plan.nombre_paciente.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
