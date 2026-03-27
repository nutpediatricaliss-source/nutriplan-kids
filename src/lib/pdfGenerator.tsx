import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Font,
  StyleSheet,
  Svg,
  Path,
  pdf,
} from "@react-pdf/renderer";
import type { PlanMenu, PlanItem, Alimento, Receta } from "./types";

// ─── Types ─────────────────────────────────────────────────────────────────
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

// ─── Brand palette ─────────────────────────────────────────────────────────
const C = {
  peach: "#FDEBDA",
  gold: "#e7c688",
  darkGold: "#ad8a48",
  lightGold: "#ffe0a7",
  cream: "#fff5e0",
  white: "#FFFFFF",
  black: "#282828",
  gray: "#888888",
  footerBg: "#e7c688",
};

// ─── Register fonts ────────────────────────────────────────────────────────
Font.register({
  family: "Playfair",
  fonts: [
    { src: "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKd3unDXbtM.ttf", fontWeight: 700 },
  ],
});

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.ttf", fontWeight: 700 },
  ],
});

// Prevent hyphenation crashes
Font.registerHyphenationCallback((word) => [word]);

// ─── Shared styles ─────────────────────────────────────────────────────────
const s = StyleSheet.create({
  pagePortrait: {
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 35,
    fontFamily: "Inter",
    fontSize: 9,
    color: C.black,
    backgroundColor: C.white,
  },
  pageLandscape: {
    paddingTop: 35,
    paddingBottom: 45,
    paddingHorizontal: 25,
    fontFamily: "Inter",
    fontSize: 8,
    color: C.black,
    backgroundColor: C.white,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: C.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  footerText: {
    fontSize: 7,
    color: C.white,
    fontFamily: "Inter",
    fontWeight: 600,
  },
  // Section title
  sectionTitle: {
    fontFamily: "Playfair",
    fontWeight: 700,
    fontSize: 20,
    color: C.darkGold,
    marginBottom: 4,
  },
  titleUnderline: {
    width: 80,
    height: 2,
    backgroundColor: C.gold,
    marginBottom: 16,
    borderRadius: 1,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 5,
    paddingRight: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.darkGold,
    marginTop: 3,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.5,
    color: C.black,
  },
});

// ─── Smart split helpers ───────────────────────────────────────────────────
function splitIngredientes(text: string): string[] {
  if (text.includes(";")) return text.split(";").map((s) => s.trim()).filter(Boolean);
  return text.split("\n").filter(Boolean);
}

function splitPreparacion(text: string): string[] {
  if (text.includes(". ")) return text.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
  return text.split("\n").filter(Boolean);
}

// ─── Wavy Line SVG ─────────────────────────────────────────────────────────
function WavyLine({ width = 700 }: { width?: number }) {
  // Generate a smooth wave path
  const h = 8;
  const waveLen = 20;
  const points: string[] = [`M 0 ${h / 2}`];
  for (let x = 0; x < width; x += waveLen) {
    points.push(
      `C ${x + waveLen / 4} 0, ${x + (waveLen * 3) / 4} ${h}, ${x + waveLen} ${h / 2}`
    );
  }
  return (
    <Svg width={width} height={h} style={{ marginVertical: 4 }}>
      <Path d={points.join(" ")} stroke={C.gold} strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

// ─── Footer Component ──────────────────────────────────────────────────────
function Footer({ contacto }: { contacto: string }) {
  const parts = contacto.split("|").map((p) => p.trim());
  return (
    <View style={s.footer} fixed>
      {parts.map((part, i) => (
        <Text key={i} style={s.footerText}>
          {part}
        </Text>
      ))}
    </View>
  );
}

// ─── Header with logo ──────────────────────────────────────────────────────
function Header({ title, logoSrc }: { title?: string; logoSrc: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
      {title ? (
        <Text style={{ fontFamily: "Playfair", fontWeight: 700, fontSize: 22, color: C.darkGold }}>
          {title}
        </Text>
      ) : (
        <View />
      )}
      <Image src={logoSrc} style={{ width: 80, height: 40, objectFit: "contain" }} />
    </View>
  );
}

// ─── Portada ───────────────────────────────────────────────────────────────
function Portada({ plan, logoSrc }: { plan: PlanMenu; logoSrc: string }) {
  return (
    <Page size="A4" style={{ ...s.pagePortrait, justifyContent: "center", alignItems: "center" }}>
      {/* Decorative corner blobs */}
      <View style={{ position: "absolute", top: -30, left: -30, width: 160, height: 120, borderRadius: 80, backgroundColor: C.lightGold, opacity: 0.5 }} />
      <View style={{ position: "absolute", top: -20, right: -40, width: 140, height: 100, borderRadius: 70, backgroundColor: C.gold, opacity: 0.3 }} />
      <View style={{ position: "absolute", bottom: -30, left: -40, width: 180, height: 130, borderRadius: 90, backgroundColor: C.gold, opacity: 0.3 }} />
      <View style={{ position: "absolute", bottom: -20, right: -30, width: 150, height: 110, borderRadius: 75, backgroundColor: C.lightGold, opacity: 0.4 }} />

      {/* Decorative border */}
      <View style={{ position: "absolute", top: 30, left: 30, right: 30, bottom: 30, borderWidth: 0.5, borderColor: C.darkGold, borderRadius: 4 }} />

      <Text style={{ fontFamily: "Playfair", fontWeight: 700, fontSize: 34, color: C.darkGold, marginBottom: 12, textAlign: "center" }}>
        Plan Nutricional
      </Text>
      <Text style={{ fontFamily: "Inter", fontSize: 18, color: C.black, marginBottom: 8, textAlign: "center" }}>
        {plan.nombre_paciente}
      </Text>
      <Text style={{ fontFamily: "Inter", fontSize: 11, color: C.gray, marginBottom: 4, textAlign: "center" }}>
        Consulta de Nutrición Pediátrica
      </Text>
      <Text style={{ fontFamily: "Inter", fontSize: 10, color: C.gray, textAlign: "center" }}>
        {plan.dias} días
      </Text>

      <Image src={logoSrc} style={{ width: 100, height: 50, objectFit: "contain", marginTop: 40 }} />
    </Page>
  );
}

// ─── Bullet list page ──────────────────────────────────────────────────────
function BulletListPage({
  title,
  items,
  logoSrc,
  contacto,
}: {
  title: string;
  items: string[];
  logoSrc: string;
  contacto: string;
}) {
  return (
    <Page size="A4" style={s.pagePortrait}>
      <Header logoSrc={logoSrc} />
      <WavyLine width={525} />
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.titleUnderline} />

      {items.map((item, i) => (
        <View key={i} style={s.bulletRow}>
          <View style={s.bulletDot} />
          <Text style={s.bulletText}>{item.trim()}</Text>
        </View>
      ))}

      <Footer contacto={contacto} />
    </Page>
  );
}

// ─── Menu Grid (Landscape) ─────────────────────────────────────────────────
function MenuGrid({
  data,
  config,
  logoSrc,
  weekNum,
  weekStart,
  weekEnd,
}: {
  data: PdfData;
  config: PdfConfig;
  logoSrc: string;
  weekNum: number;
  weekStart: number;
  weekEnd: number;
}) {
  const tiempos = (data.plan.tiempos_comida as string[]) ?? [];
  const numDays = weekEnd - weekStart + 1;
  const dayNumbers = Array.from({ length: numDays }, (_, i) => weekStart + i);

  // Calculate widths: tiempo col ~15%, rest divided equally
  const tiempoColWidth = "14%";
  const dayColWidth = `${(86 / numDays).toFixed(1)}%`;

  return (
    <Page size={{ width: 841.89, height: 595.28 }} style={s.pageLandscape}>
      <Header title={`Semana ${weekNum}`} logoSrc={logoSrc} />
      <WavyLine width={790} />

      {/* Grid table */}
      <View style={{ flexDirection: "column", flex: 1, marginTop: 4 }}>
        {/* Header row with day names */}
        <View style={{ flexDirection: "row", gap: 5, marginBottom: 5 }}>
          <View style={{ width: tiempoColWidth, backgroundColor: C.peach, borderRadius: 6, padding: 5, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontWeight: 700, fontSize: 8, color: C.darkGold }}>Tiempo</Text>
          </View>
          {dayNumbers.map((day) => (
            <View key={day} style={{ width: dayColWidth, backgroundColor: C.peach, borderRadius: 6, padding: 5, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontWeight: 700, fontSize: 8, color: C.darkGold }}>Día {day}</Text>
            </View>
          ))}
        </View>

        {/* Data rows */}
        {tiempos.map((tiempo, tIdx) => (
          <View key={tIdx} style={{ flexDirection: "row", gap: 5, marginBottom: 5, flex: 1 }}>
            {/* Tiempo label */}
            <View style={{ width: tiempoColWidth, backgroundColor: C.peach, borderRadius: 6, padding: 5, justifyContent: "center" }}>
              <Text style={{ fontWeight: 700, fontSize: 8, color: C.darkGold }}>{tiempo}</Text>
            </View>

            {/* Day cells */}
            {dayNumbers.map((day) => {
              const dayItems = data.items.filter(
                (item) => item.dia === day && item.tiempo_comida === tiempo
              );
              return (
                <View
                  key={day}
                  style={{
                    width: dayColWidth,
                    backgroundColor: C.peach,
                    borderRadius: 8,
                    padding: 5,
                    flexWrap: "wrap",
                  }}
                >
                  {dayItems.map((item, idx) => {
                    let name = "";
                    if (item.tipo === "alimento") {
                      const al = data.alimentos.find((a) => a.id === item.item_id);
                      name = al?.nombre ?? "Alimento";
                    } else {
                      const rec = data.recetas.find((r) => r.id === item.item_id);
                      name = rec?.nombre ?? "Receta";
                    }
                    return (
                      <React.Fragment key={idx}>
                        {idx > 0 && (
                          <Text style={{ fontSize: 7, color: C.darkGold, textAlign: "center", marginVertical: 2 }}>+</Text>
                        )}
                        <Text style={{ fontSize: 8, color: C.black, lineHeight: 1.4 }}>{name}</Text>
                      </React.Fragment>
                    );
                  })}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <Footer contacto={config.contacto} />
    </Page>
  );
}

// ─── Menu Lista (Portrait) ─────────────────────────────────────────────────
function MenuLista({
  data,
  config,
  logoSrc,
  weekNum,
  weekStart,
  weekEnd,
}: {
  data: PdfData;
  config: PdfConfig;
  logoSrc: string;
  weekNum: number;
  weekStart: number;
  weekEnd: number;
}) {
  const tiempos = (data.plan.tiempos_comida as string[]) ?? [];
  const dayNumbers = Array.from({ length: weekEnd - weekStart + 1 }, (_, i) => weekStart + i);

  return (
    <Page size="A4" style={s.pagePortrait} wrap>
      <Header title={`Semana ${weekNum}`} logoSrc={logoSrc} />
      <WavyLine width={525} />

      {dayNumbers.map((day) => (
        <View key={day} style={{ marginBottom: 10 }} wrap={false}>
          {/* Day header */}
          <View style={{ backgroundColor: C.peach, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10, marginBottom: 6 }}>
            <Text style={{ fontFamily: "Playfair", fontWeight: 700, fontSize: 12, color: C.darkGold }}>
              Día {day}
            </Text>
          </View>

          {tiempos.map((tiempo) => {
            const dayItems = data.items.filter(
              (item) => item.dia === day && item.tiempo_comida === tiempo
            );
            if (dayItems.length === 0) return null;
            return (
              <View key={tiempo} style={{ marginBottom: 4, marginLeft: 8 }}>
                <Text style={{ fontWeight: 700, fontSize: 9, color: C.darkGold, marginBottom: 2 }}>
                  {tiempo}
                </Text>
                {dayItems.map((item, idx) => {
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
                  return (
                    <Text key={idx} style={{ fontSize: 8.5, marginBottom: 2, marginLeft: 6, color: C.black }}>
                      • {name}
                    </Text>
                  );
                })}
              </View>
            );
          })}
        </View>
      ))}

      <Footer contacto={config.contacto} />
    </Page>
  );
}

// ─── Recetas pages ─────────────────────────────────────────────────────────
function RecetaPage({ receta, logoSrc, contacto }: { receta: Receta; logoSrc: string; contacto: string }) {
  const ingredientes = receta.ingredientes ? splitIngredientes(receta.ingredientes) : [];
  const pasos = receta.preparacion ? splitPreparacion(receta.preparacion) : [];

  return (
    <Page size="A4" style={s.pagePortrait}>
      <Header logoSrc={logoSrc} />
      <WavyLine width={525} />

      <View style={{ flexDirection: "row", gap: 16, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Playfair", fontWeight: 700, fontSize: 18, color: C.darkGold, marginBottom: 4 }}>
            {receta.nombre}
          </Text>
          <View style={{ width: 50, height: 2, backgroundColor: C.gold, borderRadius: 1, marginBottom: 10 }} />
        </View>
        {receta.imagen_url && (
          <Image
            src={receta.imagen_url}
            style={{ width: 100, height: 100, borderRadius: 8, objectFit: "cover" }}
          />
        )}
      </View>

      {/* Ingredientes */}
      {ingredientes.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: 700, fontSize: 11, color: C.darkGold, marginBottom: 6 }}>Ingredientes</Text>
          {ingredientes.map((ing, i) => (
            <View key={i} style={s.bulletRow}>
              <View style={{ ...s.bulletDot, width: 5, height: 5, marginTop: 4 }} />
              <Text style={{ ...s.bulletText, fontSize: 9 }}>{ing}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Preparación */}
      {pasos.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: 700, fontSize: 11, color: C.darkGold, marginBottom: 6 }}>Preparación</Text>
          {pasos.map((paso, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 5, paddingRight: 10 }}>
              <Text style={{ fontSize: 9, color: C.darkGold, fontWeight: 700, width: 18 }}>
                {i + 1}.
              </Text>
              <Text style={{ flex: 1, fontSize: 9, lineHeight: 1.5, color: C.black }}>{paso}</Text>
            </View>
          ))}
        </View>
      )}

      <Footer contacto={contacto} />
    </Page>
  );
}

// ─── Agradecimiento ────────────────────────────────────────────────────────
function Agradecimiento({ config, logoSrc }: { config: PdfConfig; logoSrc: string }) {
  return (
    <Page size="A4" style={{ ...s.pagePortrait, justifyContent: "center", alignItems: "center" }}>
      {/* Decorative blobs */}
      <View style={{ position: "absolute", top: -30, left: -30, width: 160, height: 120, borderRadius: 80, backgroundColor: C.lightGold, opacity: 0.5 }} />
      <View style={{ position: "absolute", top: -20, right: -40, width: 140, height: 100, borderRadius: 70, backgroundColor: C.gold, opacity: 0.3 }} />
      <View style={{ position: "absolute", bottom: -30, left: -40, width: 180, height: 130, borderRadius: 90, backgroundColor: C.gold, opacity: 0.3 }} />
      <View style={{ position: "absolute", bottom: -20, right: -30, width: 150, height: 110, borderRadius: 75, backgroundColor: C.lightGold, opacity: 0.4 }} />

      <View style={{ position: "absolute", top: 30, left: 30, right: 30, bottom: 30, borderWidth: 0.5, borderColor: C.darkGold, borderRadius: 4 }} />

      <Text style={{ fontFamily: "Playfair", fontWeight: 700, fontSize: 28, color: C.darkGold, marginBottom: 16, textAlign: "center" }}>
        ¡Gracias!
      </Text>

      <Text style={{ fontFamily: "Inter", fontSize: 12, color: C.black, textAlign: "center", lineHeight: 1.6, maxWidth: 400, marginBottom: 30 }}>
        {config.mensajeAgradecimiento}
      </Text>

      <Image src={logoSrc} style={{ width: 100, height: 50, objectFit: "contain" }} />
    </Page>
  );
}

// ─── Main Document ─────────────────────────────────────────────────────────
function PlanDocument({ data, config, logoSrc }: { data: PdfData; config: PdfConfig; logoSrc: string }) {
  const totalWeeks = Math.ceil(data.plan.dias / 7);

  // Recipes to include
  const includedRecipeIds = new Set(
    data.items.filter((i) => i.tipo === "receta" && i.incluir_detalle_pdf).map((i) => i.item_id)
  );
  const recipesToShow = data.recetas.filter((r) => includedRecipeIds.has(r.id));

  return (
    <Document>
      {/* 1. Portada */}
      <Portada plan={data.plan} logoSrc={logoSrc} />

      {/* 2. Generalidades */}
      {config.generalidades.trim() && (
        <BulletListPage
          title="Generalidades del Menú"
          items={config.generalidades.split("\n").filter(Boolean)}
          logoSrc={logoSrc}
          contacto={config.contacto}
        />
      )}

      {/* 3. Menú (Grid or Lista) per week */}
      {Array.from({ length: totalWeeks }, (_, week) => {
        const weekStart = week * 7 + 1;
        const weekEnd = Math.min(weekStart + 6, data.plan.dias);
        const props = { data, config, logoSrc, weekNum: week + 1, weekStart, weekEnd };
        return config.estilo === "grid" ? (
          <MenuGrid key={`w${week}`} {...props} />
        ) : (
          <MenuLista key={`w${week}`} {...props} />
        );
      })}

      {/* 4. Snacks */}
      {config.snacksColaciones.trim() && (
        <BulletListPage
          title="Snacks y Colaciones"
          items={config.snacksColaciones.split("\n").filter(Boolean)}
          logoSrc={logoSrc}
          contacto={config.contacto}
        />
      )}

      {/* 5. Recomendaciones */}
      {config.recomendaciones.trim() && (
        <BulletListPage
          title="Recomendaciones"
          items={config.recomendaciones.split("\n").filter(Boolean)}
          logoSrc={logoSrc}
          contacto={config.contacto}
        />
      )}

      {/* 6. Recetas */}
      {recipesToShow.map((receta) => (
        <RecetaPage key={receta.id} receta={receta} logoSrc={logoSrc} contacto={config.contacto} />
      ))}

      {/* 7. Agradecimiento */}
      <Agradecimiento config={config} logoSrc={logoSrc} />
    </Document>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────
export async function generatePdf(data: PdfData, config: PdfConfig) {
  // Convert logo to data URL so @react-pdf/renderer can use it
  let logoSrc = "/images/logo.png";
  try {
    const response = await fetch("/images/logo.png");
    const blob = await response.blob();
    logoSrc = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Could not load logo, using fallback path", e);
  }

  const pdfBlob = await pdf(<PlanDocument data={data} config={config} logoSrc={logoSrc} />).toBlob();
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Plan_Nutricional_${data.plan.nombre_paciente.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
