import PptxGenJS from "pptxgenjs";
import type { Project, SlideData } from "./store";

// Palette (mutable — reassigned per generatePptx call from the project's Visual Identity).
let PRIMARY = "2563EB";
let DARK = "0F172A";
let MUTED = "64748B";
let LIGHT = "F1F5F9";

function hex(v: string | undefined, fallback: string) {
  if (!v) return fallback;
  return v.replace(/^#/, "").toUpperCase().padEnd(6, "0").slice(0, 6);
}

function applyPalette(colors?: string[]) {
  if (!colors || colors.length === 0) {
    PRIMARY = "2563EB"; DARK = "0F172A"; MUTED = "64748B"; LIGHT = "F1F5F9";
    return;
  }
  PRIMARY = hex(colors[0], "2563EB");
  DARK = hex(colors[1] ?? colors[0], "0F172A");
  MUTED = hex(colors[2] ?? colors[1], "64748B");
  LIGHT = hex(colors[3] ?? "F1F5F9", "F1F5F9");
}

export async function generatePptx(project: Project, options: { paletteColors?: string[] } = {}): Promise<void> {
  applyPalette(options.paletteColors);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = project.general_information.name || "InsightDeck Pro";
  pptx.company = project.general_information.client || "";

  addCover(pptx, project);

  for (const slide of project.generated_slides) {
    addContentSlide(pptx, slide, project);
  }

  const safe = (project.general_information.name || "insightdeck")
    .replace(/[^a-z0-9]+/gi, "_")
    .toLowerCase();
  await pptx.writeFile({ fileName: `${safe}.pptx` });
}

function addCover(pptx: PptxGenJS, project: Project) {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.15, fill: { color: PRIMARY } });

  slide.addText(project.general_information.client || "Cliente", {
    x: 0.6, y: 0.7, w: 12, h: 0.4,
    fontSize: 12, color: MUTED, fontFace: "Calibri", bold: true,
  });
  slide.addText(project.general_information.name || "Investigación", {
    x: 0.6, y: 1.6, w: 12, h: 2,
    fontSize: 40, color: DARK, fontFace: "Calibri", bold: true,
  });
  slide.addText(
    [
      { text: `${project.general_information.brand || ""}   ·   `, options: { color: MUTED } },
      { text: `${project.general_information.category || ""}   ·   `, options: { color: MUTED } },
      { text: `${project.general_information.researchType || ""}`, options: { color: PRIMARY, bold: true } },
    ],
    { x: 0.6, y: 4.2, w: 12, h: 0.5, fontSize: 14, fontFace: "Calibri" }
  );

  slide.addText(project.study_context.objective || "", {
    x: 0.6, y: 5, w: 8, h: 1.5,
    fontSize: 13, color: DARK, fontFace: "Calibri", italic: true,
  });

  slide.addText(`InsightDeck Pro · ${new Date().toLocaleDateString()}`, {
    x: 0.6, y: 7, w: 12, h: 0.3,
    fontSize: 9, color: MUTED, fontFace: "Calibri",
  });
}

function addContentSlide(pptx: PptxGenJS, s: SlideData, project: Project) {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };

  // header strip
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: PRIMARY } });
  slide.addText(
    `${(s.slide_type || "").toUpperCase()}  ·  ${s.recommended_layout || ""}`,
    { x: 0.5, y: 0.25, w: 8, h: 0.3, fontSize: 9, color: MUTED, bold: true, fontFace: "Calibri" }
  );
  slide.addText(project.general_information.client || "", {
    x: 8.5, y: 0.25, w: 4.3, h: 0.3, fontSize: 9, color: MUTED, align: "right", fontFace: "Calibri",
  });

  // Title
  slide.addText(s.title || "", {
    x: 0.5, y: 0.65, w: 12.3, h: 1.1,
    fontSize: 24, bold: true, color: DARK, fontFace: "Calibri",
  });

  if (s.subtitle) {
    slide.addText(s.subtitle, {
      x: 0.5, y: 1.75, w: 12.3, h: 0.4,
      fontSize: 12, color: MUTED, fontFace: "Calibri",
    });
  }

  // Layout-specific body
  const layout = (s.recommended_layout || "").toUpperCase();
  const type = (s.slide_type || "").toLowerCase();

  const bodyY = s.subtitle ? 2.3 : 2;

  if (layout.startsWith("KPI") || type === "kpi") {
    renderKpis(slide, s, bodyY);
  } else if (layout.startsWith("FUNNEL") || type === "funnel") {
    renderFunnel(slide, s, bodyY);
  } else if (layout.startsWith("RANKING") || layout.startsWith("BENCHMARK") || type === "ranking" || type === "benchmark") {
    renderBars(slide, s, bodyY);
  } else if (layout.startsWith("TIMELINE") || type === "timeline") {
    renderTimeline(slide, s, bodyY);
  } else if (layout.startsWith("MATRIX") || type === "matrix") {
    renderMatrix(slide, s, bodyY);
  } else if (layout.startsWith("HEATMAP") || type === "heatmap") {
    renderHeatmap(slide, s, bodyY);
  } else if (layout.startsWith("CARDS") || type === "cards") {
    renderCards(slide, s, bodyY);
  } else {
    renderCards(slide, s, bodyY);
  }

  // Insight & implication on right column
  slide.addShape("rect", { x: 8.2, y: bodyY, w: 4.6, h: 4.5, fill: { color: LIGHT }, line: { color: LIGHT } });
  slide.addText("INSIGHT", {
    x: 8.4, y: bodyY + 0.15, w: 4.2, h: 0.3,
    fontSize: 9, bold: true, color: PRIMARY, fontFace: "Calibri",
  });
  slide.addText(s.main_insight || "", {
    x: 8.4, y: bodyY + 0.5, w: 4.2, h: 2,
    fontSize: 11, color: DARK, fontFace: "Calibri", valign: "top",
  });
  if (s.business_implication) {
    slide.addText("IMPLICANCIA DE NEGOCIO", {
      x: 8.4, y: bodyY + 2.6, w: 4.2, h: 0.3,
      fontSize: 9, bold: true, color: PRIMARY, fontFace: "Calibri",
    });
    slide.addText(s.business_implication, {
      x: 8.4, y: bodyY + 2.95, w: 4.2, h: 1.4,
      fontSize: 10, color: DARK, fontFace: "Calibri", valign: "top",
    });
  }

  // Notes area (speaker notes)
  if (s.notes) slide.addNotes(s.notes);

  // Footer
  slide.addText(project.general_information.name || "", {
    x: 0.5, y: 7.15, w: 8, h: 0.3, fontSize: 8, color: MUTED, fontFace: "Calibri",
  });
}

function renderKpis(slide: PptxGenJS.Slide, s: SlideData, y: number) {
  const metrics = (s.metrics ?? []).slice(0, 4);
  const cols = metrics.length || 1;
  const totalW = 7.5;
  const cellW = totalW / cols;
  metrics.forEach((m, i) => {
    const x = 0.5 + i * cellW;
    slide.addShape("rect", {
      x, y, w: cellW - 0.15, h: 2.2, fill: { color: "FFFFFF" }, line: { color: "E2E8F0", width: 1 },
    });
    slide.addText(String(m.label ?? ""), {
      x: x + 0.15, y: y + 0.15, w: cellW - 0.4, h: 0.4,
      fontSize: 9, bold: true, color: MUTED, fontFace: "Calibri",
    });
    slide.addText(String(m.value ?? ""), {
      x: x + 0.15, y: y + 0.6, w: cellW - 0.4, h: 1,
      fontSize: 28, bold: true, color: PRIMARY, fontFace: "Calibri",
    });
    if (m.delta) {
      slide.addText(m.delta, {
        x: x + 0.15, y: y + 1.55, w: cellW - 0.4, h: 0.4,
        fontSize: 10, color: "10B981", fontFace: "Calibri",
      });
    }
  });
  renderSupporting(slide, s, y + 2.4);
}

function renderFunnel(slide: PptxGenJS.Slide, s: SlideData, y: number) {
  const metrics = (s.metrics ?? []).slice(0, 6);
  const items = metrics.length ? metrics : [
    { label: "Awareness", value: "100" },
    { label: "Consideración", value: "58" },
    { label: "Compra", value: "24" },
  ];
  const startW = 7;
  const step = 0.9;
  items.forEach((m, i) => {
    const w = Math.max(1.5, startW - i * (startW / items.length));
    const x = 0.5 + (startW - w) / 2;
    slide.addShape("rect", {
      x, y: y + i * step, w, h: 0.7, fill: { color: PRIMARY }, line: { color: PRIMARY },
    });
    slide.addText(`${m.label}   ${m.value}`, {
      x, y: y + i * step, w, h: 0.7,
      fontSize: 12, color: "FFFFFF", bold: true, align: "center", valign: "middle", fontFace: "Calibri",
    });
  });
}

function renderBars(slide: PptxGenJS.Slide, s: SlideData, y: number) {
  const metrics = (s.metrics ?? []).slice(0, 6);
  const data = metrics.length
    ? metrics.map((m) => ({ label: String(m.label), value: Number(String(m.value).replace(/[^\d.-]/g, "")) || 0 }))
    : [
        { label: "A", value: 68 },
        { label: "B", value: 54 },
        { label: "C", value: 41 },
      ];
  const max = Math.max(...data.map((d) => d.value), 1);
  const rowH = Math.min(0.6, 4 / data.length);
  data.forEach((d, i) => {
    const y0 = y + i * (rowH + 0.15);
    slide.addText(d.label, {
      x: 0.5, y: y0, w: 2, h: rowH, fontSize: 11, color: DARK, valign: "middle", fontFace: "Calibri",
    });
    const barW = (d.value / max) * 4.5;
    slide.addShape("rect", {
      x: 2.6, y: y0 + rowH * 0.2, w: barW, h: rowH * 0.6,
      fill: { color: PRIMARY }, line: { color: PRIMARY },
    });
    slide.addText(String(d.value), {
      x: 2.6 + barW + 0.1, y: y0, w: 1, h: rowH,
      fontSize: 11, bold: true, color: DARK, valign: "middle", fontFace: "Calibri",
    });
  });
}

function renderTimeline(slide: PptxGenJS.Slide, s: SlideData, y: number) {
  const metrics = (s.metrics ?? []).slice(0, 8);
  const data = metrics.length
    ? metrics.map((m) => ({
        label: String(m.label),
        value: Number(String(m.value).replace(/[^\d.-]/g, "")) || 0,
      }))
    : [
        { label: "Ene", value: 30 },
        { label: "Feb", value: 45 },
        { label: "Mar", value: 40 },
        { label: "Abr", value: 65 },
        { label: "May", value: 55 },
        { label: "Jun", value: 70 },
      ];
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 7 / data.length;
  data.forEach((d, i) => {
    const h = (d.value / max) * 3.5;
    const x = 0.5 + i * w;
    slide.addShape("rect", {
      x: x + 0.1, y: y + 3.8 - h, w: w - 0.2, h, fill: { color: PRIMARY }, line: { color: PRIMARY },
    });
    slide.addText(d.label, {
      x, y: y + 3.85, w, h: 0.3, fontSize: 9, color: MUTED, align: "center", fontFace: "Calibri",
    });
  });
}

function renderMatrix(slide: PptxGenJS.Slide, s: SlideData, y: number) {
  const w = 7;
  const h = 4;
  slide.addShape("rect", { x: 0.5, y, w, h, fill: { color: "FFFFFF" }, line: { color: "E2E8F0" } });
  // Axis
  slide.addShape("line", { x: 0.5 + w / 2, y, w: 0, h, line: { color: "E2E8F0", width: 1 } });
  slide.addShape("line", { x: 0.5, y: y + h / 2, w, h: 0, line: { color: "E2E8F0", width: 1 } });
  slide.addText("Alto impacto / Bajo esfuerzo", { x: 0.5 + w / 2 + 0.1, y: y + 0.1, w: w / 2 - 0.2, h: 0.3, fontSize: 9, bold: true, color: PRIMARY, fontFace: "Calibri" });
  slide.addText("Alto impacto / Alto esfuerzo", { x: 0.5 + 0.1, y: y + 0.1, w: w / 2 - 0.2, h: 0.3, fontSize: 9, color: MUTED, fontFace: "Calibri" });
  slide.addText("Bajo impacto / Bajo esfuerzo", { x: 0.5 + w / 2 + 0.1, y: y + h - 0.4, w: w / 2 - 0.2, h: 0.3, fontSize: 9, color: MUTED, fontFace: "Calibri" });
  slide.addText("Bajo impacto / Alto esfuerzo", { x: 0.5 + 0.1, y: y + h - 0.4, w: w / 2 - 0.2, h: 0.3, fontSize: 9, color: MUTED, fontFace: "Calibri" });

  (s.metrics ?? []).slice(0, 6).forEach((m, i) => {
    const px = 0.5 + ((i * 137) % 100) / 100 * (w - 0.6) + 0.3;
    const py = y + ((i * 89) % 100) / 100 * (h - 0.6) + 0.3;
    slide.addShape("ellipse", { x: px - 0.15, y: py - 0.15, w: 0.3, h: 0.3, fill: { color: PRIMARY } });
    slide.addText(String(m.label ?? ""), { x: px + 0.2, y: py - 0.1, w: 2, h: 0.3, fontSize: 9, color: DARK, fontFace: "Calibri" });
  });
}

function renderHeatmap(slide: PptxGenJS.Slide, s: SlideData, y: number) {
  const rows = 5, cols = 8;
  const cellW = 7 / cols;
  const cellH = 4 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const intensity = ((r * 13 + c * 7) % 100) / 100;
      const shade = Math.round(255 - intensity * 200)
        .toString(16)
        .padStart(2, "0");
      const color = `${shade}${shade}FF`;
      slide.addShape("rect", {
        x: 0.5 + c * cellW, y: y + r * cellH, w: cellW - 0.05, h: cellH - 0.05,
        fill: { color }, line: { color: "FFFFFF", width: 1 },
      });
    }
  }
  renderSupporting(slide, s, y + 4.2);
}

function renderCards(slide: PptxGenJS.Slide, s: SlideData, y: number) {
  const items = (s.supporting_insights ?? []).slice(0, 4);
  if (items.length === 0) {
    slide.addText(s.main_insight || "", {
      x: 0.5, y, w: 7.5, h: 4, fontSize: 14, color: DARK, fontFace: "Calibri", valign: "top",
    });
    return;
  }
  const cols = Math.min(items.length, 2);
  const rows = Math.ceil(items.length / cols);
  const cellW = 7.5 / cols;
  const cellH = 4 / rows;
  items.forEach((it, i) => {
    const cx = i % cols;
    const cy = Math.floor(i / cols);
    const x = 0.5 + cx * cellW;
    const y0 = y + cy * cellH;
    slide.addShape("rect", {
      x, y: y0, w: cellW - 0.15, h: cellH - 0.15,
      fill: { color: "FFFFFF" }, line: { color: "E2E8F0" },
    });
    slide.addText(`${i + 1}`, {
      x: x + 0.15, y: y0 + 0.15, w: 0.5, h: 0.5,
      fontSize: 18, bold: true, color: PRIMARY, fontFace: "Calibri",
    });
    slide.addText(it, {
      x: x + 0.15, y: y0 + 0.7, w: cellW - 0.45, h: cellH - 0.9,
      fontSize: 11, color: DARK, fontFace: "Calibri", valign: "top",
    });
  });
}

function renderSupporting(slide: PptxGenJS.Slide, s: SlideData, y: number) {
  const items = (s.supporting_insights ?? []).slice(0, 3);
  if (!items.length) return;
  slide.addText(items.map((t) => ({ text: `• ${t}`, options: { breakLine: true } })), {
    x: 0.5, y, w: 7.5, h: 1.5, fontSize: 10, color: DARK, fontFace: "Calibri",
  });
}
