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
  {
    id: "detect",
    label: "Detección de hojas",
    description: "Escaneando estructura y variables por hoja.",
    sheetName: "01_Base_Original",
  },
  {
    id: "clean",
    label: "Base limpia",
    description: "Normalización, tipos y valores nulos.",
    sheetName: "02_Base_Limpia",
  },
  {
    id: "dictionary",
    label: "Diccionario de variables",
    description: "Etiquetas, tipos y descripciones.",
    sheetName: "03_Diccionario_Variables",
  },
  {
    id: "homolog",
    label: "Homologaciones",
    description: "Estandarización de valores repetidos.",
    sheetName: "04_Homologaciones",
  },
  {
    id: "tables",
    label: "Tablas resumen",
    description: "Agregaciones por dimensión categórica.",
    sheetName: "05_Tablas_Resumen",
  },
  {
    id: "kpis",
    label: "KPIs",
    description: "Métricas clave calculadas con fórmulas.",
    sheetName: "06_KPIs",
  },
  {
    id: "dashboard",
    label: "Dashboard interno",
    description: "Vista consolidada para el analista.",
    sheetName: "07_Dashboard_Interno",
  },
  {
    id: "insights",
    label: "Insights base",
    description: "Titulares derivados listos para el prompt.",
    sheetName: "08_Insights_Base",
  },
  {
    id: "crosstabs",
    label: "Cruces categóricos",
    description:
      "Tablas cruzadas variable × variable, rankeadas por qué tan lejos están del promedio general.",
    sheetName: "09_Cruces_Categoricos",
  },
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
    : ((XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[] | undefined) ?? []);

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
      sample: values
        .slice(0, 3)
        .map((v) => (v instanceof Date ? v.toISOString() : (v as string | number))),
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

// ─────────────────────────────────── real cross-tabs (categorical × categorical) ─

export interface CrossTabResult {
  variable_a: string;
  variable_b: string;
  categories_a: string[];
  categories_b: string[];
  // counts[a][b] = number of respondents
  counts: Record<string, Record<string, number>>;
  // row-percentage version, easier for an LLM (or a human) to spot a skew at a glance
  row_pct: Record<string, Record<string, number>>;
  // crude "interestingness" score: how much row distributions deviate from the overall
  // distribution of variable B (higher = more likely to be a meaningful cruce, not noise)
  skew_score: number;
}

function crossTab(rows: Record<string, unknown>[], colA: string, colB: string): CrossTabResult {
  const countsA = new Map<string, number>();
  const countsB = new Map<string, number>();
  const joint = new Map<string, Map<string, number>>();

  for (const r of rows) {
    const a =
      r[colA] === null || r[colA] === undefined || r[colA] === "" ? "(Sin dato)" : String(r[colA]);
    const b =
      r[colB] === null || r[colB] === undefined || r[colB] === "" ? "(Sin dato)" : String(r[colB]);
    countsA.set(a, (countsA.get(a) ?? 0) + 1);
    countsB.set(b, (countsB.get(b) ?? 0) + 1);
    if (!joint.has(a)) joint.set(a, new Map());
    const inner = joint.get(a)!;
    inner.set(b, (inner.get(b) ?? 0) + 1);
  }

  const categoriesA = Array.from(countsA.entries())
    .sort((x, y) => y[1] - x[1])
    .slice(0, 8)
    .map(([k]) => k);
  const categoriesB = Array.from(countsB.entries())
    .sort((x, y) => y[1] - x[1])
    .slice(0, 6)
    .map(([k]) => k);
  const totalB = rows.length || 1;
  const overallShareB = new Map(categoriesB.map((b) => [b, (countsB.get(b) ?? 0) / totalB]));

  const counts: Record<string, Record<string, number>> = {};
  const rowPct: Record<string, Record<string, number>> = {};
  let deviationSum = 0;
  let deviationN = 0;

  for (const a of categoriesA) {
    counts[a] = {};
    rowPct[a] = {};
    const inner = joint.get(a) ?? new Map();
    const rowTotal = countsA.get(a) ?? 0;
    for (const b of categoriesB) {
      const c = inner.get(b) ?? 0;
      counts[a][b] = c;
      const pct = rowTotal ? c / rowTotal : 0;
      rowPct[a][b] = Number((pct * 100).toFixed(1));
      const expected = overallShareB.get(b) ?? 0;
      deviationSum += Math.abs(pct - expected);
      deviationN += 1;
    }
  }

  return {
    variable_a: colA,
    variable_b: colB,
    categories_a: categoriesA,
    categories_b: categoriesB,
    counts,
    row_pct: rowPct,
    skew_score: deviationN ? Number((deviationSum / deviationN).toFixed(3)) : 0,
  };
}

// ─────────────────────────────────── analysis summary (for the AI prompt, not the xlsx) ─

export interface VariableSummary {
  name: string;
  type: ColumnStat["type"];
  non_null: number;
  unique: number;
  top_values?: { value: string; count: number; pct: number }[];
  numeric_stats?: { min: number; max: number; avg: number };
}

export interface AnalysisSummary {
  sheet_name: string;
  row_count: number;
  col_count: number;
  variables: VariableSummary[];
  cross_tabs: CrossTabResult[];
}

/**
 * Builds a compact, serializable summary of the real data — meant to be embedded
 * directly inside the prompt sent to Claude, so the model reasons over actual
 * distributions and cross-tabs instead of just a filename.
 */
export function buildAnalysisSummary(base: SheetProfile): AnalysisSummary {
  const variables: VariableSummary[] = base.columns.map((c) => ({
    name: c.name,
    type: c.type,
    non_null: c.nonNull,
    unique: c.unique,
    top_values: c.categorical?.top.map((t) => ({
      value: t.value,
      count: t.count,
      pct: Number(((t.count / Math.max(1, base.rowCount)) * 100).toFixed(1)),
    })),
    numeric_stats: c.numeric
      ? { min: c.numeric.min, max: c.numeric.max, avg: Number(c.numeric.avg.toFixed(2)) }
      : undefined,
  }));

  // Build real cruces for every pair of categorical variables (capped to keep the
  // prompt a reasonable size), ranked by skew_score so the most "interesting" ones
  // (biggest deviation from the overall distribution) come first.
  const categoricals = base.columns.filter(
    (c) => c.type === "categorical" && c.unique >= 2 && c.unique <= 12,
  );
  const pairs: CrossTabResult[] = [];
  for (let i = 0; i < categoricals.length; i++) {
    for (let j = 0; j < categoricals.length; j++) {
      if (i === j) continue;
      pairs.push(crossTab(base.rows, categoricals[i].name, categoricals[j].name));
    }
  }
  pairs.sort((a, b) => b.skew_score - a.skew_score);

  // de-dupe symmetric pairs (a,b) vs (b,a) — keep whichever came first (already sorted)
  const seen = new Set<string>();
  const topPairs: CrossTabResult[] = [];
  for (const p of pairs) {
    const key = [p.variable_a, p.variable_b].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    topPairs.push(p);
    if (topPairs.length >= 8) break;
  }

  return {
    sheet_name: base.name,
    row_count: base.rowCount,
    col_count: base.colCount,
    variables,
    cross_tabs: topPairs,
  };
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
  summary?: AnalysisSummary;
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
      XLSX.utils.json_to_sheet(
        rows.length ? rows : [{ columna: "—", origen: "—", homologado: "sin duplicados" }],
      ),
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
        aoa.push([
          "Valor",
          `Suma de ${firstNumeric.name}`,
          `Promedio de ${firstNumeric.name}`,
          "Conteo",
        ]);
        for (const t of cat.categorical?.top ?? []) {
          aoa.push([
            t.value,
            { f: `SUMIF(${catRange},A${aoa.length + 1},${numRange})` } as unknown as number,
            {
              f: `IFERROR(AVERAGEIF(${catRange},A${aoa.length + 1},${numRange}),0)`,
            } as unknown as number,
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
    rows.push([
      "Registros totales",
      "—",
      { f: `COUNTA('02_Base_Limpia'!A${dataStart}:A${dataEnd})` },
    ]);
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

  // 09_Cruces_Categoricos — real categorical × categorical cross-tabs, ranked by
  // how much they deviate from the overall distribution (the "interesting" ones)
  const summary = base ? buildAnalysisSummary(base) : undefined;
  if (summary && summary.cross_tabs.length) {
    const aoa: (string | number)[][] = [];
    for (const ct of summary.cross_tabs) {
      aoa.push([`${ct.variable_a}  ×  ${ct.variable_b}`, "", "", ""]);
      aoa.push(["", ...ct.categories_b]);
      for (const a of ct.categories_a) {
        aoa.push([a, ...ct.categories_b.map((b) => ct.row_pct[a][b])]);
      }
      aoa.push([]);
    }
    XLSX.utils.book_append_sheet(out, XLSX.utils.aoa_to_sheet(aoa), "09_Cruces_Categoricos");
    sheetsGenerated.push("09_Cruces_Categoricos");
  }

  return {
    wb: out,
    sheetProfiles: profiles,
    base,
    stagesDone: EXCEL_STAGES.map((s) => s.id),
    sheetsGenerated,
    summary,
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
      {
        aviso: "No hay bytes en caché. Vuelve a cargar el archivo para generar el analítico real.",
      },
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
