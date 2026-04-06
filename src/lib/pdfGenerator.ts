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
interface LoadedImage {
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
}

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

function loadImageWithDimensions(url: string): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      resolve({
        dataUrl: canvas.toDataURL("image/png"),
        naturalWidth: img.width,
        naturalHeight: img.height,
      });
    };
    img.onerror = reject;
    img.src = url;
  });
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

function addHeaderWithLogo(doc: jsPDF, logoData: LoadedImage | null) {
  const w = doc.internal.pageSize.getWidth();

  let logoBottom = 12;
  if (logoData) {
    try {
      const logoH = 25;
      const aspectRatio = logoData.naturalWidth / logoData.naturalHeight;
      const logoW = logoH * aspectRatio;
      doc.addImage(logoData.dataUrl, "PNG", w - MARGIN - logoW, 0.5, logoW, logoH);
      logoBottom = 0.5 + logoH + 0.2;
    } catch { /* logo failed */ }
  }

  // Clean double golden line just below the logo
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, logoBottom, w - MARGIN, logoBottom);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, logoBottom + 2, w - MARGIN, logoBottom + 2);
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

  doc.setFillColor(...COLORS.cream);
  doc.ellipse(0, 0, 70, 50, "F");

  doc.setFillColor(...COLORS.gold);
  doc.ellipse(w, 0, 60, 45, "F");

  doc.setFillColor(...COLORS.gold);
  doc.ellipse(0, h, 80, 55, "F");

  doc.setFillColor(...COLORS.cream);
  doc.ellipse(w, h, 65, 50, "F");

  doc.setFillColor(255, 240, 210);
  doc.ellipse(w * 0.7, h * 0.3, 30, 25, "F");
}

// ─── Section renderers ────────────────────────────────────────────────────
function renderPortada(doc: jsPDF, plan: PlanMenu, logoData: LoadedImage | null) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  drawDecorativeBlobs(doc);

  doc.setDrawColor(...COLORS.darkGold);
  doc.setLineWidth(0.3);
  doc.rect(25, 25, w - 50, h - 50);

  doc.setFontSize(32);
  doc.setFont("times", "bold");
  doc.setTextColor(...COLORS.darkGold);
  doc.text("Plan Nutricional", w / 2, h * 0.35, { align: "center" });

  doc.setFontSize(18);
  doc.setFont("times", "normal");
  doc.setTextColor(...COLORS.black);
  doc.text(plan.nombre_paciente, w / 2, h * 0.43, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(...COLORS.gray);
  doc.text("Consulta de Nutrición Pediátrica", w / 2, h * 0.50, { align: "center" });

  doc.setFontSize(10);
  doc.text(`${plan.dias} días`, w / 2, h * 0.55, { align: "center" });

  if (logoData) {
    try {
      const logoH = 25;
      const aspectRatio = logoData.naturalWidth / logoData.naturalHeight;
      const logoW = logoH * aspectRatio;
      doc.addImage(logoData.dataUrl, "PNG", w / 2 - logoW / 2, h * 0.72, logoW, logoH);
    } catch { /* */ }
  }
}

function renderGeneralidades(doc: jsPDF, config: PdfConfig, logoData: LoadedImage | null) {
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

async function renderMenuLista(doc: jsPDF, data: PdfData, config: PdfConfig, logoData: LoadedImage | null) {
  const tiempos = (data.plan.tiempos_comida as string[]) ?? [];
  const totalWeeks = Math.ceil(data.plan.dias / 7);
  const pageW = doc.internal.pageSize.getWidth();
  const IMG_SIZE = 38;
  const IMG_MARGIN = 6;

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

      // Find first recipe image for this day
      const dayRecipeItems = data.items.filter(
        (i) => i.dia === day && i.tipo === "receta"
      );
      let dayImageData: string | null = null;
      for (const ri of dayRecipeItems) {
        const rec = data.recetas.find((r) => r.id === ri.item_id);
        if (rec?.imagen_url) {
          try {
            dayImageData = await loadImage(rec.imagen_url);
            break;
          } catch { /* skip */ }
        }
      }

      const hasImage = !!dayImageData;
      const textMaxW = hasImage
        ? pageW - MARGIN * 2 - IMG_SIZE - IMG_MARGIN
        : pageW - MARGIN * 2;

      const dayStartY = y;

      // Day header
      doc.setFillColor(...COLORS.cream);
      doc.roundedRect(MARGIN, y - 4, textMaxW, 8, 2, 2, "F");
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
          if ((item as any).nombre_override) {
            name = (item as any).nombre_override;
          } else if (item.tipo === "personalizado") {
            name = "Alimento personalizado";
          } else if (item.tipo === "alimento") {
            const al = data.alimentos.find((a) => a.id === item.item_id);
            name = al?.nombre ?? "Alimento";
            if (item.porcion) {
              const baseUnit = al?.porcion
                ? al.porcion.replace(/^[\d.,/\s]+/, "").trim()
                : "";
              name += ` — ${item.porcion}${baseUnit ? " " + baseUnit : ""}`;
            }
          } else {
            const rec = data.recetas.find((r) => r.id === item.item_id);
            name = rec?.nombre ?? "Receta";
          }
          if (item.nota_menu) name += ` (${item.nota_menu})`;

          const lines = splitTextToLines(doc, `• ${name}`, textMaxW - 10);
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

      // Draw the day image on the right side
      if (hasImage && dayImageData) {
        const imgY = dayStartY - 2;
        const imgX = pageW - MARGIN - IMG_SIZE;
        try {
          // Draw a soft rounded border
          doc.setDrawColor(...COLORS.gold);
          doc.setLineWidth(0.4);
          doc.roundedRect(imgX - 1, imgY - 1, IMG_SIZE + 2, IMG_SIZE + 2, 3, 3, "S");
          doc.addImage(dayImageData, "JPEG", imgX, imgY, IMG_SIZE, IMG_SIZE);
        } catch { /* image failed */ }
        // Ensure y is at least past the image
        if (y < imgY + IMG_SIZE + 4) {
          y = imgY + IMG_SIZE + 4;
        }
      }

      y += 4;
    }

    drawFooter(doc, config.contacto);
  }
}

function renderMenuGrid(doc: jsPDF, data: PdfData, config: PdfConfig, logoData: LoadedImage | null) {
  const tiempos = (data.plan.tiempos_comida as string[]) ?? [];
  const totalWeeks = Math.ceil(data.plan.dias / 7);

  for (let week = 0; week < totalWeeks; week++) {
    doc.addPage("landscape");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Header
    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(0.8);
    doc.line(15, 10, pageW - 15, 10);
    doc.setLineWidth(0.3);
    doc.line(15, 12, pageW - 15, 12);

    if (logoData) {
      try {
        const logoH = 10;
        const aspectRatio = logoData.naturalWidth / logoData.naturalHeight;
        const logoW = logoH * aspectRatio;
        doc.addImage(logoData.dataUrl, "PNG", pageW - 15 - logoW, 1, logoW, logoH);
      } catch {}
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
    const colW = (pageW - 30 - 50) / numDays;
    const tiempoColW = 50;
    const rowH = Math.min((pageH - tableY - 20) / (tiempos.length + 1), 22);

    const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

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
      const dayLabel = `${dayNames[i % 7]} (Día ${weekStart + i})`;
      doc.text(dayLabel, x + 3, tableY + rowH / 2 + 1);
    }

    // Data rows
    for (let t = 0; t < tiempos.length; t++) {
      const rowY = tableY + (t + 1) * rowH;

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

function renderSnacks(doc: jsPDF, config: PdfConfig, logoData: LoadedImage | null) {
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

function renderRecomendaciones(doc: jsPDF, config: PdfConfig, logoData: LoadedImage | null) {
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

async function renderRecetas(doc: jsPDF, data: PdfData, config: PdfConfig, logoData: LoadedImage | null) {
  const includedRecipeIds = new Set(
    data.items
      .filter((i) => i.tipo === "receta" && i.incluir_detalle_pdf)
      .map((i) => i.item_id)
  );

  const recipesToShow = data.recetas.filter((r) => includedRecipeIds.has(r.id));
  if (recipesToShow.length === 0) return;

  const pageW = 210;

  doc.addPage("portrait");
  addHeaderWithLogo(doc, logoData);

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

    if (y > FOOTER_Y - 60) {
      drawFooter(doc, config.contacto);
      doc.addPage("portrait");
      addHeaderWithLogo(doc, logoData);
      y = 30;
    }

    if (ri > 0) {
      doc.setDrawColor(...COLORS.gold);
      doc.setLineWidth(0.4);
      doc.line(MARGIN + 10, y, pageW - MARGIN - 10, y);
      y += 6;
    }

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

    if (receta.imagen_url) {
      try {
        const imgData = await loadImage(receta.imagen_url);
        doc.addImage(imgData, "JPEG", imgX, y - 8, 50, 50);
      } catch { /* image failed to load */ }
    }

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
            addHeaderWithLogo(doc, logoData);
            y = 30;
          }
          doc.text(l, MARGIN + 4, y);
          y += 5.5;
        }
      }
      y += 3;
    }

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

function renderAgradecimiento(doc: jsPDF, config: PdfConfig, logoData: LoadedImage | null) {
  doc.addPage("portrait");
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  drawDecorativeBlobs(doc);

  doc.setDrawColor(...COLORS.darkGold);
  doc.setLineWidth(0.3);
  doc.rect(25, 25, w - 50, h - 50);

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

  if (logoData) {
    try {
      const logoH = 25;
      const aspectRatio = logoData.naturalWidth / logoData.naturalHeight;
      const logoW = logoH * aspectRatio;
      doc.addImage(logoData.dataUrl, "PNG", w / 2 - logoW / 2, h * 0.72, logoW, logoH);
    } catch { /* */ }
  }
}

// ─── Main generator ───────────────────────────────────────────────────────
export async function generatePdf(data: PdfData, config: PdfConfig) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Load logo with dimensions
  let logoData: LoadedImage | null = null;
  try {
    logoData = await loadImageWithDimensions("/images/logo.png");
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
    await renderMenuLista(doc, data, config, logoData);
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
