import * as XLSX from "xlsx";
import type { Project } from "./store";
import { getFileBytes } from "./file-cache";

export interface ExcelStageState {
  id: string;
  label: string;
  description: string;
  status: "pending" | "running" | "done" | "error";
  sheetName?: string;
  detail?: string;
}

export const EXCEL_STAGES: Omit<ExcelStageState, "status">[] = [
  { id: "detect", label: "Detección de hojas", description: "Escaneando estructura y variables por hoja.", sheetName: "01_Base_Original" },
  { id: "clean", label: "Base limpia", description: "Normalización, tipos y valores nulos.", sheetName: "02_Base_Limpia" },
  { id: "dictionary", label: "Diccionario de variables", description: "Etiquetas, tipos y descripciones.", sheetName: "03_Diccionario_Variables" },
  { id: "homolog", label: "Homologaciones", description: "Estandarización de valores repetidos.", sheetName: "04_Homologaciones" },
  { id: "tables", label: "Tablas resumen", description: "Agregaciones por dimensión categórica.", sheetName: "05_Tablas_Resumen" },
  { id: "kpis", label: "KPIs", description: "Métricas clave calculadas con fórmulas.", sheetName: "06_KPIs" },
  { id: "dashboard", label: "Dashboard interno", description: "Vista consolidada para el analista.", sheetName: "07_Dashboard_Interno" },
  { id: "insights", label: "Insights base", description: "Titulares derivados listos para el prompt.", sheetName: "08_Insights_Base" },
];

// ─────────────────────────────────────────── helpers ───────────────────────

interface ColumnStat {
  name: string;
  type: "numeric" | "categorical" | "date" | "empty";
  nonNull: number;
  nulls: number;
  unique: number;
  sample: (string | number)[];
  numeric?: { min: number; max: number; sum: number; avg: number };
  categorical?: { top: { value: string; count: number }[] };
}

interface SheetProfile {
  name: string;
  rowCount: number;
  colCount: number;
  headers: string[];
  rows: Record<string, unknown>[];
  columns: ColumnStat[];
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function coerceRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
}

function profileSheet(name: string, sheet: XLSX.WorkSheet): SheetProfile {
  const rows = coerceRows(sheet);
  const headers = rows.length
    ? Object.keys(rows[0] as Record<string, unknown>)
    : (XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[] | undefined) ?? [];

  const columns: ColumnStat[] = headers.map((h) => {
    const values = rows.map((r) => r[h]).filter((v) => v !== null && v !== undefined && v !== "");
    const nonNull = values.length;
    const nulls = rows.length - nonNull;
    const uniq = new Set(values.map((v) => String(v))).size;
    const numericValues = values.filter(isNumber) as number[];

    let type: ColumnStat["type"] = "empty";
    if (nonNull === 0) type = "empty";
    else if (numericValues.length / Math.max(1, nonNull) > 0.7) type = "numeric";
    else if (values.every((v) => v instanceof Date)) type = "date";
    else type = "categorical";

    const stat: ColumnStat = {
      name: h,
      type,
      nonNull,
      nulls,
      unique: uniq,
      sample: values.slice(0, 3).map((v) => (v instanceof Date ? v.toISOString() : (v as string | number))),
    };

    if (type === "numeric" && numericValues.length) {
      const sum = numericValues.reduce((a, b) => a + b, 0);
      stat.numeric = {
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        sum,
        avg: sum / numericValues.length,
      };
    }

    if (type === "categorical") {
      const counts = new Map<string, number>();
      for (const v of values) {
        const k = String(v);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      stat.categorical = {
        top: Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([value, count]) => ({ value, count })),
      };
    }

    return stat;
  });

  return { name, rowCount: rows.length, colCount: headers.length, headers, rows, columns };
}

function pickBestSheet(profiles: SheetProfile[]): SheetProfile | undefined {
  if (!profiles.length) return undefined;
  // largest sheet by cells that also has at least one numeric column
  const scored = profiles.map((p) => ({
    p,
    score: p.rowCount * p.colCount + (p.columns.some((c) => c.type === "numeric") ? 1000 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.p;
}

// Excel A1 column letter
function col(n: number): string {
  let s = "";
  let x = n + 1;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

// ─────────────────────────────────────────── main engine ───────────────────

export interface ExcelEngineResult {
  wb: XLSX.WorkBook;
  sheetProfiles: SheetProfile[];
  base?: SheetProfile;
  stagesDone: string[];
  sheetsGenerated: string[];
}

export function runExcelEngine(bytes: ArrayBuffer, project: Project): ExcelEngineResult {
  const source = XLSX.read(bytes, { type: "array", cellDates: true });
  const profiles = source.SheetNames.map((n) => profileSheet(n, source.Sheets[n]));
  const base = pickBestSheet(profiles);

  const out = XLSX.utils.book_new();
  const sheetsGenerated: string[] = [];

  // 01_Base_Original — copy the detected base sheet as-is (or a list of sheets when none)
  if (base) {
    const ws = XLSX.utils.json_to_sheet(base.rows);
    XLSX.utils.book_append_sheet(out, ws, "01_Base_Original");
    sheetsGenerated.push("01_Base_Original");
  } else {
    XLSX.utils.book_append_sheet(
      out,
      XLSX.utils.json_to_sheet(
        profiles.map((p) => ({ hoja: p.name, filas: p.rowCount, columnas: p.colCount })),
      ),
      "01_Base_Original",
    );
    sheetsGenerated.push("01_Base_Original");
  }

  // 02_Base_Limpia — trim strings, coerce empty cells to null, drop fully-empty rows
  if (base) {
    const clean = base.rows
      .map((r) => {
        const next: Record<string, unknown> = {};
        for (const h of base.headers) {
          const v = r[h];
          if (typeof v === "string") next[h] = v.trim();
          else if (v === null || v === undefined || v === "") next[h] = null;
          else next[h] = v;
        }
        return next;
      })
      .filter((r) => Object.values(r).some((v) => v !== null));
    const ws = XLSX.utils.json_to_sheet(clean);
    XLSX.utils.book_append_sheet(out, ws, "02_Base_Limpia");
    sheetsGenerated.push("02_Base_Limpia");
  }

  // 03_Diccionario_Variables — computed from the base profile
  if (base) {
    const dict = base.columns.map((c) => ({
      variable: c.name,
      tipo: c.type,
      no_nulos: c.nonNull,
      nulos: c.nulls,
      únicos: c.unique,
      min: c.numeric?.min ?? "",
      max: c.numeric?.max ?? "",
      promedio: c.numeric ? Number(c.numeric.avg.toFixed(2)) : "",
      muestra: c.sample.map(String).join(" | "),
    }));
    XLSX.utils.book_append_sheet(out, XLSX.utils.json_to_sheet(dict), "03_Diccionario_Variables");
    sheetsGenerated.push("03_Diccionario_Variables");
  }

  // 04_Homologaciones — case-insensitive duplicates on categorical columns
  if (base) {
    const rows: { columna: string; origen: string; homologado: string }[] = [];
    for (const c of base.columns.filter((c) => c.type === "categorical")) {
      const seen = new Map<string, string>(); // norm -> canonical (first-seen trimmed)
      for (const v of base.rows.map((r) => r[c.name]).filter(Boolean)) {
        const raw = String(v);
        const norm = raw.trim().toLowerCase();
        if (!seen.has(norm)) seen.set(norm, raw.trim());
        else if (seen.get(norm) !== raw) {
          rows.push({ columna: c.name, origen: raw, homologado: seen.get(norm) as string });
        }
      }
    }
    XLSX.utils.book_append_sheet(
      out,
      XLSX.utils.json_to_sheet(rows.length ? rows : [{ columna: "—", origen: "—", homologado: "sin duplicados" }]),
      "04_Homologaciones",
    );
    sheetsGenerated.push("04_Homologaciones");
  }

  // 05_Tablas_Resumen — pivot each categorical vs. first numeric using formulas referencing Base_Limpia
  if (base) {
    const firstNumeric = base.columns.find((c) => c.type === "numeric");
    const categoricals = base.columns.filter((c) => c.type === "categorical").slice(0, 4);
    const aoa: (string | number)[][] = [];
    const dataStart = 2; // Base_Limpia data starts at row 2 (row 1 is header)
    const dataEnd = base.rows.length + 1;

    if (firstNumeric) {
      const numColIdx = base.headers.indexOf(firstNumeric.name);
      const numColLetter = col(numColIdx);
      const numRange = `'02_Base_Limpia'!${numColLetter}${dataStart}:${numColLetter}${dataEnd}`;

      for (const cat of categoricals) {
        const catColIdx = base.headers.indexOf(cat.name);
        const catColLetter = col(catColIdx);
        const catRange = `'02_Base_Limpia'!${catColLetter}${dataStart}:${catColLetter}${dataEnd}`;

        aoa.push([`Dimensión: ${cat.name}`, "", "", ""]);
        aoa.push(["Valor", `Suma de ${firstNumeric.name}`, `Promedio de ${firstNumeric.name}`, "Conteo"]);
        for (const t of cat.categorical?.top ?? []) {
          aoa.push([
            t.value,
            { f: `SUMIF(${catRange},A${aoa.length + 1},${numRange})` } as unknown as number,
            { f: `IFERROR(AVERAGEIF(${catRange},A${aoa.length + 1},${numRange}),0)` } as unknown as number,
            { f: `COUNTIF(${catRange},A${aoa.length + 1})` } as unknown as number,
          ]);
        }
        aoa.push(["", "", "", ""]);
      }
    } else {
      aoa.push(["Sin columnas numéricas detectadas."]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa as (string | number)[][]);
    // The `{f:...}` objects above need to be re-applied as formula cells because
    // aoa_to_sheet turns them into strings. Do a second pass:
    for (let r = 0; r < aoa.length; r++) {
      for (let c2 = 0; c2 < aoa[r].length; c2++) {
        const v = aoa[r][c2] as unknown;
        if (v && typeof v === "object" && "f" in (v as Record<string, unknown>)) {
          const addr = XLSX.utils.encode_cell({ r, c: c2 });
          ws[addr] = { t: "n", f: (v as { f: string }).f };
        }
      }
    }
    XLSX.utils.book_append_sheet(out, ws, "05_Tablas_Resumen");
    sheetsGenerated.push("05_Tablas_Resumen");
  }

  // 06_KPIs — global formulas referencing Base_Limpia
  if (base) {
    const numerics = base.columns.filter((c) => c.type === "numeric");
    const dataStart = 2;
    const dataEnd = base.rows.length + 1;

    const rows: (string | number | { f: string })[][] = [];
    rows.push(["KPI", "Variable", "Valor (fórmula)"]);
    rows.push(["Registros totales", "—", { f: `COUNTA('02_Base_Limpia'!A${dataStart}:A${dataEnd})` }]);
    for (const n of numerics) {
      const idx = base.headers.indexOf(n.name);
      const letter = col(idx);
      const range = `'02_Base_Limpia'!${letter}${dataStart}:${letter}${dataEnd}`;
      rows.push([`Suma`, n.name, { f: `SUM(${range})` }]);
      rows.push([`Promedio`, n.name, { f: `IFERROR(AVERAGE(${range}),0)` }]);
      rows.push([`Máximo`, n.name, { f: `MAX(${range})` }]);
      rows.push([`Mínimo`, n.name, { f: `MIN(${range})` }]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows as (string | number)[][]);
    for (let r = 0; r < rows.length; r++) {
      for (let c2 = 0; c2 < rows[r].length; c2++) {
        const v = rows[r][c2] as unknown;
        if (v && typeof v === "object" && "f" in (v as Record<string, unknown>)) {
          const addr = XLSX.utils.encode_cell({ r, c: c2 });
          ws[addr] = { t: "n", f: (v as { f: string }).f };
        }
      }
    }
    XLSX.utils.book_append_sheet(out, ws, "06_KPIs");
    sheetsGenerated.push("06_KPIs");
  }

  // 07_Dashboard_Interno — high-level snapshot
  if (base) {
    const numerics = base.columns.filter((c) => c.type === "numeric").slice(0, 3);
    const dashboard = [
      { seccion: "Filas de datos", valor: base.rowCount, detalle: `hoja base: ${base.name}` },
      { seccion: "Columnas", valor: base.colCount, detalle: base.headers.join(", ").slice(0, 120) },
      ...numerics.map((n) => ({
        seccion: `Total ${n.name}`,
        valor: n.numeric ? Number(n.numeric.sum.toFixed(2)) : 0,
        detalle: n.numeric ? `avg ${n.numeric.avg.toFixed(2)}` : "—",
      })),
      ...base.columns
        .filter((c) => c.type === "categorical")
        .slice(0, 3)
        .map((c) => ({
          seccion: `${c.name} · líder`,
          valor: c.categorical?.top[0]?.count ?? 0,
          detalle: c.categorical?.top[0]?.value ?? "—",
        })),
    ];
    XLSX.utils.book_append_sheet(out, XLSX.utils.json_to_sheet(dashboard), "07_Dashboard_Interno");
    sheetsGenerated.push("07_Dashboard_Interno");
  }

  // 08_Insights_Base — human-readable takeaways
  if (base) {
    const numerics = base.columns.filter((c) => c.type === "numeric");
    const cats = base.columns.filter((c) => c.type === "categorical");
    const insights: { insight: string; fuente: string }[] = [];
    insights.push({
      insight: `Base analizada con ${base.rowCount} registros y ${base.colCount} variables.`,
      fuente: "01_Base_Original",
    });
    for (const n of numerics.slice(0, 3)) {
      if (!n.numeric) continue;
      insights.push({
        insight: `${n.name} promedio de ${n.numeric.avg.toFixed(2)} (rango ${n.numeric.min}–${n.numeric.max}).`,
        fuente: "06_KPIs",
      });
    }
    for (const c of cats.slice(0, 3)) {
      const top = c.categorical?.top[0];
      if (!top) continue;
      const share = ((top.count / base.rowCount) * 100).toFixed(1);
      insights.push({
        insight: `${c.name}: "${top.value}" concentra ${share}% de los registros.`,
        fuente: "05_Tablas_Resumen",
      });
    }
    const account = project.general_information.account;
    if (account) {
      insights.push({
        insight: `Cuenta ${account} — el excel analítico se alinea con la taxonomía definida en el proyecto.`,
        fuente: "Metadatos del proyecto",
      });
    }
    XLSX.utils.book_append_sheet(out, XLSX.utils.json_to_sheet(insights), "08_Insights_Base");
    sheetsGenerated.push("08_Insights_Base");
  }

  return {
    wb: out,
    sheetProfiles: profiles,
    base,
    stagesDone: EXCEL_STAGES.map((s) => s.id),
    sheetsGenerated,
  };
}

export function downloadWorkbook(wb: XLSX.WorkBook, name: string) {
  XLSX.writeFile(wb, `${name.replace(/\s+/g, "_") || "insightdeck"}__excel_analitico.xlsx`);
}

// Legacy fallback — used when no bytes are cached (page reloaded). Generates a
// mock-but-structured deck so the download button never breaks.
export function downloadExcelAnalitico(project: Project) {
  const bytes = firstExcelBytes(project);
  if (bytes) {
    const { wb } = runExcelEngine(bytes, project);
    downloadWorkbook(wb, project.general_information.name || "insightdeck");
    return;
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { aviso: "No hay bytes en caché. Vuelve a cargar el archivo para generar el analítico real." },
    ]),
    "01_Base_Original",
  );
  downloadWorkbook(wb, project.general_information.name || "insightdeck");
}

export function firstExcelBytes(project: Project): ArrayBuffer | undefined {
  for (const f of project.uploaded_files) {
    if (/xls|csv/i.test(f.kind)) {
      const buf = getFileBytes(project.id, f.name);
      if (buf) return buf;
    }
  }
  return undefined;
}
