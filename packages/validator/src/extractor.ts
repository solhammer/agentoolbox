import type { ImportEntry, Language } from "./types.js";

// Python: import foo, from foo import bar, from foo.bar import baz
const PYTHON_PATTERNS = [
  /^import\s+([\w.]+)/gm,
  /^from\s+([\w.]+)\s+import/gm,
];

// JS/TS: import ... from 'foo', require('foo'), import('foo')
const JS_PATTERNS = [
  /(?:^|\s)import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"./][^'"]*)['"]/gm,
  /require\s*\(\s*['"]([^'"./][^'"]*)['"]\s*\)/gm,
  /import\s*\(\s*['"]([^'"./][^'"]*)['"]\s*\)/gm,
];

// Rust: use foo::bar, extern crate foo
const RUST_PATTERNS = [
  /^use\s+([\w]+)(?:::|;)/gm,
  /^extern\s+crate\s+([\w]+)/gm,
];

// Go: import "foo/bar", import ( "foo/bar" )
const GO_PATTERNS = [
  /import\s+"([^"]+)"/gm,
  /^\s+"([^"]+)"/gm, // inside import block
];

function extractMatches(code: string, patterns: RegExp[]): ImportEntry[] {
  const seen = new Set<string>();
  const entries: ImportEntry[] = [];

  for (const pattern of patterns) {
    // Reset lastIndex since we reuse regex across calls
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(code)) !== null) {
      const raw = match[0]!.trim();
      const name = match[1]!.trim();
      // Get top-level package name
      const pkg = topLevel(name);
      if (pkg && !seen.has(pkg) && !isStdlib(pkg)) {
        seen.add(pkg);
        entries.push({ name: pkg, raw });
      }
    }
  }

  return entries;
}

/** Get the top-level package name from a dotted/slashed path */
function topLevel(name: string): string {
  // Python: foo.bar.baz -> foo
  // Go: github.com/foo/bar -> skip standard paths with only one segment
  const parts = name.split(/[./]/);
  return parts[0] ?? name;
}

/**
 * Very minimal stdlib filter — avoids checking obviously built-in names.
 * Registry checks act as the real source of truth; this is just noise reduction.
 */
const STDLIB_PYTHON = new Set([
  "os", "sys", "re", "io", "abc", "ast", "copy", "csv", "enum", "math",
  "json", "time", "uuid", "typing", "pathlib", "logging", "hashlib",
  "datetime", "functools", "itertools", "collections", "contextlib",
  "threading", "subprocess", "urllib", "http", "email", "html", "xml",
  "socket", "struct", "base64", "binascii", "codecs", "string", "textwrap",
  "random", "secrets", "statistics", "decimal", "fractions", "numbers",
  "traceback", "warnings", "unittest", "dataclasses", "inspect",
  "__future__", "builtins", "gc", "weakref", "array", "queue",
]);

const STDLIB_GO = new Set([
  "fmt", "os", "io", "net", "log", "math", "sync", "time", "sort",
  "strings", "strconv", "bytes", "errors", "context", "runtime",
  "encoding", "unicode", "reflect", "bufio", "path", "flag",
]);

const STDLIB_RUST = new Set([
  "std", "core", "alloc", "proc_macro", "test",
]);

const STDLIB_JS = new Set([
  "fs", "path", "os", "http", "https", "url", "util", "events",
  "stream", "buffer", "crypto", "child_process", "net", "dns",
  "readline", "querystring", "zlib", "assert", "cluster", "dgram",
  "domain", "module", "perf_hooks", "process", "timers", "tty",
  "vm", "worker_threads", "v8", "inspector",
  // Node built-in prefix
  "node:fs", "node:path", "node:os", "node:http", "node:https",
  "node:url", "node:util", "node:events", "node:stream",
  "node:buffer", "node:crypto", "node:child_process",
]);

function isStdlib(name: string): boolean {
  if (STDLIB_PYTHON.has(name)) return true;
  if (STDLIB_GO.has(name)) return true;
  if (STDLIB_RUST.has(name)) return true;
  if (STDLIB_JS.has(name)) return true;
  if (name.startsWith("node:")) return true;
  return false;
}

export function extractImports(code: string, language: Language): ImportEntry[] {
  switch (language) {
    case "python":
      return extractMatches(code, PYTHON_PATTERNS);
    case "javascript":
    case "typescript":
      return extractMatches(code, JS_PATTERNS);
    case "rust":
      return extractMatches(code, RUST_PATTERNS);
    case "go":
      return extractMatches(code, GO_PATTERNS);
    default: {
      const _exhaustive: never = language;
      return _exhaustive;
    }
  }
}
