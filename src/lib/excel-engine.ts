import * as XLSX from "xlsx";
import type { Project } from "./store";

export interface ExcelStageState {
  id: string;
  label: string;
  description: string;
  status: "pending" | "running" | "done";
  sheetName?: string;
}

export const EXCEL_STAGES: Omit<ExcelStageState, "status">[] = [
  { id: "detect", label: "Detección de hojas", description: "Escaneando estructura y variables por hoja.", sheetName: "01_Base_Original" },
  { id: "clean", label: "Base limpia", description: "Normalización, tipos y valores nulos.", sheetName: "02_Base_Limpia" },
  { id: "dictionary", label: "Diccionario de variables", description: "Etiquetas, tipos y descripciones.", sheetName: "03_Diccionario_Variables" },
  { id: "homolog", label: "Homologaciones", description: "Estandarización de marcas, canales y regiones.", sheetName: "04_Homologaciones" },
  { id: "tables", label: "Tablas resumen", description: "Pivot de KPIs por dimensión.", sheetName: "05_Tablas_Resumen" },
  { id: "kpis", label: "KPIs", description: "Métricas clave calculadas.", sheetName: "06_KPIs" },
  { id: "dashboard", label: "Dashboard interno", description: "Vista consolidada para el analista.", sheetName: "07_Dashboard_Interno" },
  { id: "insights", label: "Insights base", description: "Titulares derivados listos para el prompt.", sheetName: "08_Insights_Base" },
];

/** Builds a mock but real .xlsx analítico derivative and downloads it. */
export function downloadExcelAnalitico(project: Project) {
  const gi = project.general_information;
  const wb = XLSX.utils.book_new();

  const originals = project.uploaded_files.filter((f) => /xls|csv/i.test(f.kind));
  const originalRows = originals.length
    ? originals.map((f, i) => ({ archivo: f.name, tamaño_kb: Math.round(f.size / 1024), orden: i + 1 }))
    : [{ archivo: "(sin archivos cargados)", tamaño_kb: 0, orden: 1 }];

  const add = (name: string, rows: Record<string, unknown>[]) => {
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, name);
  };

  add("01_Base_Original", originalRows);

  add("02_Base_Limpia", [
    { variable: "marca", tipo: "categórica", nulos: 0, únicos: 8 },
    { variable: "canal", tipo: "categórica", nulos: 2, únicos: gi.channels.length || 3 },
    { variable: "subcategoria", tipo: "categórica", nulos: 0, únicos: gi.subcategories.length || 5 },
    { variable: "venta_valor", tipo: "numérica", nulos: 4, únicos: 1284 },
    { variable: "share", tipo: "numérica", nulos: 0, únicos: 96 },
  ]);

  add("03_Diccionario_Variables", [
    { variable: "marca", etiqueta: "Marca reportada", tipo: "string", descripcion: "Marca del SKU vendido." },
    { variable: "canal", etiqueta: "Canal de distribución", tipo: "string", descripcion: "Canal comercial." },
    { variable: "subcategoria", etiqueta: "Subcategoría", tipo: "string", descripcion: "Segmento dentro del canal." },
    { variable: "venta_valor", etiqueta: "Venta (S/.)", tipo: "number", descripcion: "Venta en moneda local." },
    { variable: "share", etiqueta: "Participación", tipo: "percent", descripcion: "Share dentro de la categoría." },
  ]);

  add("04_Homologaciones", [
    { origen: "COCA COLA", homologado: "Coca-Cola" },
    { origen: "coca-cola", homologado: "Coca-Cola" },
    { origen: "Bodegas ", homologado: "Bodegas" },
    { origen: "SUPERMERCADO", homologado: "Supermercados" },
  ]);

  const channels = gi.channels.length ? gi.channels : ["Moderno", "Minorista", "Mayorista"];
  add(
    "05_Tablas_Resumen",
    channels.flatMap((c) => [
      { canal: c, kpi: "Share", valor: (10 + Math.random() * 25).toFixed(1) + "%" },
      { canal: c, kpi: "Distribución numérica", valor: (30 + Math.random() * 55).toFixed(1) + "%" },
      { canal: c, kpi: "Ticket promedio", valor: "S/. " + (5 + Math.random() * 25).toFixed(2) },
    ]),
  );

  add("06_KPIs", [
    { kpi: "Awareness Top of Mind", valor: "68%", delta_vs_periodo_anterior: "+4pp" },
    { kpi: "Preferencia declarada", valor: "31%", delta_vs_periodo_anterior: "-2pp" },
    { kpi: "Share of Voice", valor: "22%", delta_vs_periodo_anterior: "-8pp" },
    { kpi: "Distribución ponderada", valor: "74%", delta_vs_periodo_anterior: "+3pp" },
    { kpi: "Ticket promedio", valor: "S/. 18.40", delta_vs_periodo_anterior: "+2.1%" },
  ]);

  add("07_Dashboard_Interno", [
    { seccion: "Awareness", estado: "Estable", tendencia: "↗" },
    { seccion: "Preferencia", estado: "Alerta", tendencia: "↘" },
    { seccion: "Distribución", estado: "Positivo", tendencia: "↗" },
    { seccion: "Share of Voice", estado: "Crítico", tendencia: "↘" },
  ]);

  add("08_Insights_Base", [
    { insight: "Awareness lidera la categoría con 68% pero preferencia cae al 4° lugar.", fuente: "06_KPIs" },
    { insight: `Canal ${channels[0]} concentra el 41% del volumen total.`, fuente: "05_Tablas_Resumen" },
    { insight: "Share of Voice cayó 8pp tras campaña de la competencia en abril.", fuente: "06_KPIs" },
    { insight: "Distribución ponderada mejora 3pp pero numérica se mantiene plana.", fuente: "05_Tablas_Resumen" },
  ]);

  const filename = `${gi.name || "insightdeck"}__excel_analitico.xlsx`.replace(/\s+/g, "_");
  XLSX.writeFile(wb, filename);
}
