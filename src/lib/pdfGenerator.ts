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

// Trims the transparent padding around the mark and resamples it larger, so the
// logo can be printed at a legible size without blocky pixels.
async function cropLogoToInk(logoData: LoadedImage): Promise<LoadedImage> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = logoData.dataUrl;
  });

  const src = document.createElement("canvas");
  src.width = img.naturalWidth;
  src.height = img.naturalHeight;
  const sctx = src.getContext("2d")!;
  sctx.drawImage(img, 0, 0);

  const { data, width, height } = sctx.getImageData(0, 0, src.width, src.height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0 || maxY < 0) return logoData;

  const inkW = maxX - minX + 1;
  const inkH = maxY - minY + 1;
  const scale = Math.max(1, Math.min(8, Math.round(800 / inkH)));

  const out = document.createElement("canvas");
  out.width = inkW * scale;
  out.height = inkH * scale;
  const octx = out.getContext("2d")!;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(img, minX, minY, inkW, inkH, 0, 0, out.width, out.height);

  return {
    dataUrl: out.toDataURL("image/png"),
    naturalWidth: out.width,
    naturalHeight: out.height,
  };
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

function gridItemLabel(item: PlanItem, data: PdfData): string {
  const anyItem = item as any;
  let name = "";
  if (anyItem.nombre_override) name = anyItem.nombre_override;
  else if (item.tipo === "personalizado") name = "Personalizado";
  else if (item.tipo === "alimento") {
    const al = data.alimentos.find((a) => a.id === item.item_id);
    name = al?.nombre ?? "Alimento";
    if (item.porcion) {
      const baseUnit = al?.porcion ? al.porcion.replace(/^[\d.,/\s]+/, "").trim() : "";
      return `${name} — ${item.porcion}${baseUnit ? " " + baseUnit : ""}`;
    }
    return name;
  } else {
    const rec = data.recetas.find((r) => r.id === item.item_id);
    name = rec?.nombre ?? "Receta";
  }
  if (item.porcion && item.tipo !== "alimento") name += ` — ${item.porcion}`;
  return name;
}

function renderMenuGrid(doc: jsPDF, data: PdfData, config: PdfConfig, logoData: LoadedImage | null) {
  const tiempos = (data.plan.tiempos_comida as string[]) ?? [];
  const totalWeeks = Math.ceil(data.plan.dias / 7);
  const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const M = 11;
  const FONT = 8;
  const LINE_H = 3.4;
  const PAD = 1.6;
  const TIEMPO_W = 26;
  const HEAD_H = 8.5;

  for (let week = 0; week < totalWeeks; week++) {
    const weekStart = week * 7 + 1;
    const weekEnd = Math.min(weekStart + 6, data.plan.dias);
    const numDays = weekEnd - weekStart + 1;
    const weekItems = data.items.filter((i) => i.dia >= weekStart && i.dia <= weekEnd);
    if (weekItems.length === 0) continue;
    const rowTiempos = tiempos.filter((t) => weekItems.some((i) => i.tiempo_comida === t));
    if (rowTiempos.length === 0) continue;

    doc.addPage("a4", "landscape");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const usableW = pageW - M * 2;
    const colW = (usableW - TIEMPO_W) / 7;
    const footerLineY = pageH - 8;
    const bottomLimit = footerLineY - 2;

    // Header row: title on the left, logo on the right, golden lines below.
    const LOGO_TOP = 2.5;
    const LOGO_H = 14; // mm — reduced from 19 mm per request; keeps the source 200x200 px sharp (~364 dpi)
    const drawPageHeader = (): number => {
      let rowBottom = LOGO_TOP + 8;
      if (logoData) {
        try {
          const logoW = LOGO_H * (logoData.naturalWidth / logoData.naturalHeight);
          doc.addImage(logoData.dataUrl, "PNG", pageW - M - logoW, LOGO_TOP, logoW, LOGO_H);
          rowBottom = LOGO_TOP + LOGO_H;
        } catch { /* logo failed */ }
      }
      const lineY = rowBottom + 0.6;
      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...COLORS.darkGold);
      doc.text(`Semana ${week + 1}`, M, LOGO_TOP + (rowBottom - LOGO_TOP) / 2 + 2.6);
      doc.setDrawColor(...COLORS.gold);
      doc.setLineWidth(0.8);
      doc.line(M, lineY, pageW - M, lineY);
      doc.setLineWidth(0.3);
      doc.line(M, lineY + 1.5, pageW - M, lineY + 1.5);
      return lineY + 2.5;
    };
    const drawPageFooter = () => {
      doc.setDrawColor(...COLORS.gold);
      doc.setLineWidth(0.3);
      doc.line(M, footerLineY, pageW - M, footerLineY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.gray);
      const line = doc.splitTextToSize(config.contacto || "", usableW)[0] ?? "";
      doc.text(line, pageW / 2, footerLineY + 4, { align: "center" });
    };
    const drawTableHeader = (y: number): number => {
      doc.setFillColor(...COLORS.gold);
      doc.rect(M, y, usableW, HEAD_H, "F");
      doc.setTextColor(...COLORS.white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Tiempo", M + PAD, y + HEAD_H / 2 + 1.2);
      for (let i = 0; i < 7; i++) {
        const x = M + TIEMPO_W + i * colW;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(dayNames[i], x + colW / 2, y + 3.4, { align: "center" });
        if (i < numDays) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.text(`Día ${weekStart + i}`, x + colW / 2, y + 7, { align: "center" });
        }
      }
      doc.setDrawColor(...COLORS.gold);
      doc.setLineWidth(0.2);
      doc.rect(M, y, usableW, HEAD_H);
      return y + HEAD_H;
    };

    let y = drawTableHeader(drawPageHeader());

    rowTiempos.forEach((tiempo, t) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(FONT);
      const tiempoLines: string[] = doc.splitTextToSize(tiempo, TIEMPO_W - PAD * 2);
      doc.setFont("helvetica", "normal");
      const cells: string[][] = [];
      for (let i = 0; i < 7; i++) {
        const lines: string[] = [];
        if (i < numDays) {
          const items = data.items.filter((it) => it.dia === weekStart + i && it.tiempo_comida === tiempo);
          for (const it of items) {
            lines.push(...(doc.splitTextToSize(`• ${gridItemLabel(it, data)}`, colW - PAD * 2) as string[]));
          }
        }
        cells.push(lines);
      }
      const maxLines = Math.max(tiempoLines.length, ...cells.map((c) => c.length), 1);
      const rowH = maxLines * LINE_H + PAD * 2;

      if (y + rowH > bottomLimit) {
        drawPageFooter();
        doc.addPage("a4", "landscape");
        y = drawTableHeader(drawPageHeader());
      }

      doc.setFillColor(...(t % 2 === 0 ? COLORS.white : COLORS.creamSoft));
      doc.rect(M, y, usableW, rowH, "F");
      doc.setFillColor(...COLORS.creamSoft);
      doc.rect(M, y, TIEMPO_W, rowH, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(FONT);
      doc.setTextColor(...COLORS.darkGold);
      tiempoLines.forEach((l, k) => doc.text(l, M + PAD, y + PAD + 2.6 + k * LINE_H));

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.black);
      cells.forEach((lines, i) => {
        const x = M + TIEMPO_W + i * colW;
        lines.forEach((l, k) => doc.text(l, x + PAD, y + PAD + 2.6 + k * LINE_H));
      });

      doc.setDrawColor(...COLORS.gold);
      doc.setLineWidth(0.2);
      doc.rect(M, y, usableW, rowH);
      for (let i = 0; i < 7; i++) {
        const x = M + TIEMPO_W + i * colW;
        doc.line(x, y, x, y + rowH);
      }
      y += rowH;
    });

    drawPageFooter();
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

  // The horizontal menu sheets print the mark larger, so they use a version
  // trimmed to its own outline and resampled; the rest of the PDF keeps the
  // original file untouched.
  let gridLogoData: LoadedImage | null = logoData;
  if (logoData) {
    try {
      gridLogoData = await cropLogoToInk(logoData);
    } catch { gridLogoData = logoData; }
  }

  // 1. Portada
  renderPortada(doc, data.plan, logoData);

  // 2. Generalidades
  if (config.generalidades.trim()) {
    renderGeneralidades(doc, config, logoData);
  }

  // 3. Menú diario
  if (config.estilo === "grid") {
    renderMenuGrid(doc, data, config, gridLogoData);
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
