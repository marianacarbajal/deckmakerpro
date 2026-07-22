export const ACCOUNTS = ["ALICORP", "RINTISA", "LAIVE", "SAMSUNG"] as const;
export type Account = (typeof ACCOUNTS)[number];

export const CHANNELS_BY_ACCOUNT: Record<Account, string[]> = {
  ALICORP: ["Moderno", "Minorista", "Mayorista"],
  RINTISA: ["Moderno", "Minorista", "Mayorista"],
  LAIVE: ["Moderno", "Minorista", "Mayorista"],
  SAMSUNG: ["Moderno", "Tradicional"],
};

// Keyed by `${account === "SAMSUNG" ? "SAMSUNG" : "MASS"}::${channel}`
const SUBS: Record<string, string[]> = {
  "MASS::Moderno": [
    "Supermercados",
    "Cash & Carry",
    "Hipermercados",
    "Discounter",
    "Conveniencias",
    "Cadenas especializadas",
  ],
  "MASS::Minorista": ["Bodegas", "Minimarkets", "Puestos de mercado", "Mercados especializados"],
  "MASS::Mayorista": ["Mercados mayoristas", "Distribuidores", "Mayoristas especializados"],
  "SAMSUNG::Moderno": [
    "Hipermercados",
    "Cadenas retail",
    "Tiendas especializadas",
    "Operadores / carriers",
    "Open market",
  ],
  "SAMSUNG::Tradicional": [
    "Galerías tecnológicas",
    "Tiendas independientes",
    "Centros comerciales tecnológicos",
  ],
};

export function subcategoriesFor(account: Account | "" | undefined, channel: string): string[] {
  if (!account) return [];
  const bucket = account === "SAMSUNG" ? "SAMSUNG" : "MASS";
  return SUBS[`${bucket}::${channel}`] ?? [];
}

export function allSubcategoriesFor(
  account: Account | "" | undefined,
  channels: string[],
): string[] {
  if (!account) return [];
  const set = new Set<string>();
  for (const c of channels) subcategoriesFor(account, c).forEach((s) => set.add(s));
  return Array.from(set);
}

export function isAccount(v: string): v is Account {
  return (ACCOUNTS as readonly string[]).includes(v);
}
