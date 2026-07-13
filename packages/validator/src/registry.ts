import type { CheckedImport, ImportEntry, Language } from "./types.js";

const DEFAULT_TIMEOUT_MS = 5000;

type RegistryChecker = (
  pkg: string,
  timeoutMs: number
) => Promise<{ exists: boolean; url: string; registry: string }>;

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

const checkPyPI: RegistryChecker = async (pkg, timeoutMs) => {
  const url = `https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`;
  try {
    const res = await fetchWithTimeout(url, timeoutMs);
    return { exists: res.status === 200, url, registry: "pypi" };
  } catch {
    return { exists: false, url, registry: "pypi" };
  }
};

const checkNpm: RegistryChecker = async (pkg, timeoutMs) => {
  // Scoped packages: @org/pkg -> encode the slash
  const encoded = pkg.startsWith("@")
    ? pkg.replace("/", "%2F")
    : pkg;
  const url = `https://registry.npmjs.org/${encoded}`;
  try {
    const res = await fetchWithTimeout(url, timeoutMs);
    return { exists: res.status === 200, url, registry: "npm" };
  } catch {
    return { exists: false, url, registry: "npm" };
  }
};

const checkCratesIo: RegistryChecker = async (pkg, timeoutMs) => {
  const url = `https://crates.io/api/v1/crates/${encodeURIComponent(pkg)}`;
  try {
    const res = await fetchWithTimeout(url, timeoutMs);
    return { exists: res.status === 200, url, registry: "crates.io" };
  } catch {
    return { exists: false, url, registry: "crates.io" };
  }
};

const checkGo: RegistryChecker = async (pkg, timeoutMs) => {
  // pkg.go.dev/search?q=<pkg> — we use the module proxy for accuracy
  const url = `https://pkg.go.dev/${encodeURIComponent(pkg)}`;
  try {
    const res = await fetchWithTimeout(url, timeoutMs);
    // 200 = found, 404 = not found, other = unknown
    return { exists: res.status === 200, url, registry: "pkg.go.dev" };
  } catch {
    return { exists: false, url, registry: "pkg.go.dev" };
  }
};

function getChecker(language: Language): RegistryChecker {
  switch (language) {
    case "python":
      return checkPyPI;
    case "javascript":
    case "typescript":
      return checkNpm;
    case "rust":
      return checkCratesIo;
    case "go":
      return checkGo;
    default: {
      const _exhaustive: never = language;
      return _exhaustive;
    }
  }
}

export async function checkRegistries(
  imports: ImportEntry[],
  language: Language,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CheckedImport[]> {
  if (imports.length === 0) return [];

  const checker = getChecker(language);

  const results = await Promise.allSettled(
    imports.map(async (imp) => {
      try {
        const { exists, url, registry } = await checker(imp.name, timeoutMs);
        return {
          name: imp.name,
          raw: imp.raw,
          status: exists ? ("valid" as const) : ("hallucinated" as const),
          registry,
          registryUrl: url,
        } satisfies CheckedImport;
      } catch (err) {
        return {
          name: imp.name,
          raw: imp.raw,
          status: "unknown" as const,
          error: err instanceof Error ? err.message : String(err),
        } satisfies CheckedImport;
      }
    })
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      name: imports[i]!.name,
      raw: imports[i]!.raw,
      status: "unknown" as const,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });
}
