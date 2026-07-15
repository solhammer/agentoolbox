/**
 * refresh-sanctions.ts
 *
 * Maintenance script (NOT part of the build/CI). Fetches the official OFAC
 * SDN + Consolidated lists and rewrites
 * `packages/compliance/src/data/ofac.ts` with a normalized snapshot.
 *
 * Usage:
 *   npx tsx scripts/refresh-sanctions.ts
 *
 * Requires network access to treasury.gov. If run in a restricted environment
 * it will fail fast; the committed curated snapshot remains the offline
 * fallback used by tests.
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type EntityType = "individual" | "entity" | "vessel" | "aircraft" | "unknown";

interface Record {
  id: string;
  name: string;
  aliases: string[];
  program?: string;
  entityType: EntityType;
  list: string;
  jurisdiction?: string;
}

const SOURCES = {
  sdnPrim: "https://www.treasury.gov/ofac/downloads/sdn.csv",
  sdnAlt: "https://www.treasury.gov/ofac/downloads/alt.csv",
  consPrim: "https://www.treasury.gov/ofac/downloads/consolidated/cons_prim.csv",
  consAlt: "https://www.treasury.gov/ofac/downloads/consolidated/cons_alt.csv",
};

/** Minimal CSV line splitter handling double-quoted fields. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^-0-$/, ""));
}

function mapType(sdnType: string): EntityType {
  const t = sdnType.toLowerCase();
  if (t === "individual") return "individual";
  if (t === "vessel") return "vessel";
  if (t === "aircraft") return "aircraft";
  if (t === "") return "entity";
  return "unknown";
}

async function fetchCsv(url: string): Promise<string[][]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  const text = await res.text();
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map(parseCsvLine);
}

async function buildList(primUrl: string, altUrl: string, list: string): Promise<Record[]> {
  const prim = await fetchCsv(primUrl);
  const alt = await fetchCsv(altUrl);

  const byId = new Map<string, Record>();
  for (const row of prim) {
    const [entNum, name, sdnType, program] = row;
    if (!entNum || !name) continue;
    byId.set(entNum, {
      id: `${list}-${entNum}`,
      name,
      aliases: [],
      ...(program ? { program } : {}),
      entityType: mapType(sdnType ?? ""),
      list,
    });
  }
  for (const row of alt) {
    const entNum = row[0];
    const altName = row[3];
    if (!entNum || !altName) continue;
    const rec = byId.get(entNum);
    if (rec && !rec.aliases.includes(altName)) rec.aliases.push(altName);
  }
  return [...byId.values()];
}

function serialize(records: Record[], date: string): string {
  const header =
    `import type { SanctionRecord } from "../types.js";\n\n` +
    `export const OFAC_SNAPSHOT_DATE = ${JSON.stringify(date)};\n\n` +
    `export const OFAC_RECORDS: SanctionRecord[] = [\n`;
  const body = records
    .map((r) => `  ${JSON.stringify(r)},`)
    .join("\n");
  return `${header}${body}\n];\n`;
}

async function main(): Promise<void> {
  const sdn = await buildList(SOURCES.sdnPrim, SOURCES.sdnAlt, "OFAC-SDN");
  const cons = await buildList(SOURCES.consPrim, SOURCES.consAlt, "OFAC-CONSOLIDATED");
  const all = [...sdn, ...cons];
  const date = new Date().toISOString().slice(0, 10);
  const outPath = resolve(process.cwd(), "packages/compliance/src/data/ofac.ts");
  await writeFile(outPath, serialize(all, date), "utf8");
  console.log(`Wrote ${all.length} records to ${outPath} (snapshot ${date}).`);
}

main().catch((err) => {
  console.error("refresh-sanctions failed:", err);
  process.exit(1);
});
