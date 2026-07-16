/**
 * cmdguard rule engine.
 *
 * Implements all CMD-* rules. Rules operate ONLY on structural tokens (word
 * and dollar-var kinds) extracted by the parser — quoted content is always
 * opaque and never triggers a rule.
 *
 * Cross-segment rules (e.g. remote-exec-pipe, exfil) receive the full segment
 * list; per-segment rules receive a single segment and its index.
 */

import { type Segment, type ArgvToken, firstWord, makeSnippet, rawWords } from "./parser.js";
import type { CommandFinding, CommandScanPolicy, Severity } from "./types.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function finding(
  ruleId: string,
  severity: Severity,
  segmentIndex: number,
  message: string,
  snippet: string,
): CommandFinding {
  return { ruleId, severity, segmentIndex, message, snippet };
}

/**
 * All raw word values (lower-case, dashes preserved), excluding quoted content.
 */
function allRawWords(argv: ArgvToken[]): string[] {
  return argv.filter((t) => t.kind === "word").map((t) => t.value.toLowerCase());
}

/**
 * Dollar-var token names (e.g. "$HOME" → "HOME", "${API_KEY}" → "API_KEY").
 */
function dollarVarNames(argv: ArgvToken[]): string[] {
  return argv
    .filter((t) => t.kind === "dollar-var")
    .map((t) => {
      const v = t.value.replace(/^\$\{?/, "").replace(/\}$/, "");
      return v.toUpperCase();
    });
}

/**
 * Return true if the segment has a redirect token followed by a word matching re.
 */
function redirectsTo(argv: ArgvToken[], re: RegExp): boolean {
  let sawRedirect = false;
  for (const tok of argv) {
    if (tok.kind === "redirect" && tok.value === ">") {
      sawRedirect = true;
      continue;
    }
    if (sawRedirect) {
      if (tok.kind === "word" && re.test(tok.value)) return true;
      sawRedirect = false;
    }
  }
  return false;
}

/** Common shell interpreters used in remote-exec pipe chains. */
const SHELL_NAMES = new Set(["sh", "bash", "zsh", "dash", "ksh", "fish", "ash"]);

/** Common download tools. */
const DOWNLOAD_CMDS = new Set(["curl", "wget", "fetch", "ftp"]);

// ---------------------------------------------------------------------------
// Per-segment rules
// ---------------------------------------------------------------------------

/** CMD-RM-RECURSIVE-ROOT (critical): rm -rf / or equivalent. */
function checkRmRecursiveRoot(seg: Segment, idx: number): CommandFinding | null {
  const fw = firstWord(seg.argv);
  if (fw !== "rm") return null;

  const rw = allRawWords(seg.argv);

  // Check for recursive flag: -r, -R, --recursive, or combined short flags like -rf, -fr
  const hasRecursive =
    rw.some((w) => w === "--recursive") ||
    rw.some((w) => /^-[a-z]*r[a-z]*/i.test(w));

  // Check for force flag: -f, --force, or combined
  const hasForce =
    rw.some((w) => w === "--force") ||
    rw.some((w) => /^-[a-z]*f[a-z]*/i.test(w));

  if (!hasRecursive && !hasForce) return null;

  // Check for root targets — words that are / or /* or ~ or $HOME-ish vars
  const hasRootTarget =
    rw.some((w) => w === "/" || w === "/*" || w === "~" || w === "~/" || w === ".") ||
    seg.argv.some(
      (t) =>
        t.kind === "dollar-var" &&
        /^\$\{?(HOME|PWD)\}?$/i.test(t.value),
    );

  if (!hasRootTarget) return null;

  return finding(
    "CMD-RM-RECURSIVE-ROOT",
    "critical",
    idx,
    "rm with recursive/force flags targeting a root or home directory",
    makeSnippet(seg.raw),
  );
}

/** CMD-DISK-WRITE-RAW (critical): dd of=/dev/..., mkfs, redirect > /dev/sd*|/dev/disk*. */
function checkDiskWriteRaw(seg: Segment, idx: number): CommandFinding | null {
  const fw = firstWord(seg.argv);
  const snippet = makeSnippet(seg.raw);

  // dd of=/dev/...
  if (fw === "dd") {
    const rw = allRawWords(seg.argv);
    if (rw.some((w) => /^of=\/dev\//i.test(w))) {
      return finding("CMD-DISK-WRITE-RAW", "critical", idx, "dd writing directly to a device node", snippet);
    }
  }

  // mkfs and variants (mkfs.ext4, mkswap, etc.)
  if (fw !== undefined && /^mkfs/.test(fw)) {
    return finding("CMD-DISK-WRITE-RAW", "critical", idx, "filesystem format command detected", snippet);
  }
  if (fw === "mkswap") {
    return finding("CMD-DISK-WRITE-RAW", "critical", idx, "mkswap writes directly to a block device", snippet);
  }

  // redirect > to /dev/sd* or /dev/disk*
  if (redirectsTo(seg.argv, /^\/dev\/(sd[a-z]|disk|nvme|vd[a-z]|hd[a-z])/i)) {
    return finding(
      "CMD-DISK-WRITE-RAW",
      "critical",
      idx,
      "stdout redirected directly to a block device",
      snippet,
    );
  }

  return null;
}

/** CMD-FORK-BOMB (critical): :(){ :|:& };: and equivalents. */
function checkForkBombWithIdx(seg: Segment, idx: number): CommandFinding | null {
  const raw = seg.raw;
  if (/:\(\)\s*\{/.test(raw) || /:\s*\(\s*\)\s*\{/.test(raw) || /\(\)\s*\{[^}]*\|[^}]*&/.test(raw)) {
    return finding("CMD-FORK-BOMB", "critical", idx, "Fork bomb pattern detected", makeSnippet(raw));
  }
  return null;
}

/** CMD-CHMOD-WORLD-WRITABLE (high): chmod 777, 777, a+rwx, o+w. */
function checkChmodWorldWritable(seg: Segment, idx: number): CommandFinding | null {
  const fw = firstWord(seg.argv);
  if (fw !== "chmod") return null;

  const rw = allRawWords(seg.argv);

  // Numeric octal modes: world-writable means the last digit has bit 2 set → [2367]
  // Pattern: optional leading 0, then three octal digits, last in {2,3,6,7}
  const hasWorldWritable = rw.some((w) => /^0?[0-7][0-7][2367]$/.test(w));
  // Symbolic modes with world-writable bits
  const hasSymbolic = rw.some((w) => /^(a\+.*w|o\+.*w|ugo\+.*w|a\+rwx)/.test(w));

  if (hasWorldWritable || hasSymbolic) {
    return finding(
      "CMD-CHMOD-WORLD-WRITABLE",
      "high",
      idx,
      "chmod setting world-writable permissions",
      makeSnippet(seg.raw),
    );
  }

  return null;
}

/** CMD-CHOWN-ROOT (high): chown root or recursive chown of system paths. */
function checkChownRoot(seg: Segment, idx: number): CommandFinding | null {
  const fw = firstWord(seg.argv);
  if (fw !== "chown") return null;

  const rw = allRawWords(seg.argv);
  const hasRecursive = rw.some((w) => w === "-r" || w === "--recursive" || /^-[a-z]*r[a-z]*/i.test(w));

  // Check if ownership arg is root or root:root
  const hasRoot = rw.some((w) => /^root([:.]root)?$/.test(w) || /^0([:.]0)?$/.test(w));

  // Check for system paths
  const hasSystemPath = rw.some((w) =>
    /^\/(etc|usr|bin|sbin|lib|lib64|boot|sys|proc)(\/|$)/.test(w),
  );

  if (hasRoot || (hasRecursive && hasSystemPath)) {
    return finding(
      "CMD-CHOWN-ROOT",
      "high",
      idx,
      hasRoot
        ? "chown to root detected"
        : "recursive chown on system path",
      makeSnippet(seg.raw),
    );
  }

  return null;
}

/** CMD-PRIVILEGE-ESCALATION (high): sudo or su -. */
function checkPrivilegeEscalation(seg: Segment, idx: number): CommandFinding | null {
  const fw = firstWord(seg.argv);
  if (fw === "sudo") {
    return finding(
      "CMD-PRIVILEGE-ESCALATION",
      "high",
      idx,
      "sudo (privilege escalation) detected",
      makeSnippet(seg.raw),
    );
  }
  if (fw === "su") {
    const rw = allRawWords(seg.argv);
    // su with -, -l, --login, or targeting root
    if (rw.some((w) => w === "-" || w === "-l" || w === "--login" || w === "root" || w === "-s")) {
      return finding(
        "CMD-PRIVILEGE-ESCALATION",
        "high",
        idx,
        "su (switch user / privilege escalation) detected",
        makeSnippet(seg.raw),
      );
    }
  }
  if (fw === "doas") {
    return finding(
      "CMD-PRIVILEGE-ESCALATION",
      "high",
      idx,
      "doas (privilege escalation) detected",
      makeSnippet(seg.raw),
    );
  }
  return null;
}

/** CMD-GIT-FORCE-PUSH-PROTECTED (high): git push --force/-f to protected ref. */
function checkGitForcePushProtected(
  seg: Segment,
  idx: number,
  policy: CommandScanPolicy,
): CommandFinding | null {
  const fw = firstWord(seg.argv);
  if (fw !== "git") return null;

  const rw = allRawWords(seg.argv);
  // Second positional word must be "push"
  const wordIdx = seg.argv.findIndex((t) => t.kind === "word");
  const pushIdx = seg.argv.findIndex(
    (t, i) => i > wordIdx && t.kind === "word" && t.value.toLowerCase() === "push",
  );
  if (pushIdx === -1) return null;

  const hasForcePush =
    rw.some((w) => w === "--force" || w === "-f" || w === "--force-with-lease" || w === "--force-if-includes");

  if (!hasForcePush) return null;

  const protectedRefs = policy.protectedRefs ?? ["main", "master"];
  const refSet = new Set(protectedRefs.map((r) => r.toLowerCase()));

  // Check if any non-flag word after "push" matches a protected ref or HEAD:ref pattern
  const hasProtectedRef = rw.some((w) => {
    if (w.startsWith("-")) return false;
    // strip remote prefix like "origin/main"
    const parts = w.split("/");
    const branch = parts[parts.length - 1] ?? w;
    // handle HEAD:refs/heads/main → last segment
    const colonParts = branch.split(":");
    const finalBranch = colonParts[colonParts.length - 1] ?? branch;
    return refSet.has(finalBranch) || refSet.has(branch);
  });

  if (!hasProtectedRef) return null;

  return finding(
    "CMD-GIT-FORCE-PUSH-PROTECTED",
    "high",
    idx,
    `git force-push to protected ref (${protectedRefs.join(", ")})`,
    makeSnippet(seg.raw),
  );
}

/** CMD-K8S-DESTROY (high): kubectl delete, helm uninstall, docker system prune -f, docker volume rm. */
function checkK8sDestroy(seg: Segment, idx: number): CommandFinding | null {
  const fw = firstWord(seg.argv);
  const rw = allRawWords(seg.argv);
  const snippet = makeSnippet(seg.raw);

  if (fw === "kubectl") {
    if (rw.includes("delete")) {
      return finding("CMD-K8S-DESTROY", "high", idx, "kubectl delete detected", snippet);
    }
  }

  if (fw === "helm") {
    if (rw.includes("uninstall") || rw.includes("delete") || rw.includes("destroy")) {
      return finding("CMD-K8S-DESTROY", "high", idx, "helm release uninstall/delete detected", snippet);
    }
  }

  if (fw === "docker") {
    if (rw.includes("system") && rw.includes("prune")) {
      // require -f/--force to be a BLOCK-level finding; without force it's still high
      return finding("CMD-K8S-DESTROY", "high", idx, "docker system prune detected", snippet);
    }
    if (rw.includes("volume") && rw.includes("rm")) {
      return finding("CMD-K8S-DESTROY", "high", idx, "docker volume rm detected", snippet);
    }
  }

  if (fw === "terraform" || fw === "tofu") {
    if (rw.includes("destroy")) {
      return finding("CMD-K8S-DESTROY", "high", idx, "terraform/tofu destroy detected", snippet);
    }
  }

  return null;
}

/** CMD-SECURITY-DISABLE (high): iptables -F, ufw disable, setenforce 0, csrutil disable, systemctl stop firewalld. */
function checkSecurityDisable(seg: Segment, idx: number): CommandFinding | null {
  const fw = firstWord(seg.argv);
  const rw = allRawWords(seg.argv);
  const snippet = makeSnippet(seg.raw);

  if (fw === "iptables" || fw === "ip6tables") {
    if (rw.includes("-f") || rw.includes("--flush") || rw.includes("-x") || rw.includes("-z")) {
      return finding("CMD-SECURITY-DISABLE", "high", idx, `${fw} flush/clear rules detected`, snippet);
    }
  }

  if (fw === "ufw") {
    if (rw.includes("disable")) {
      return finding("CMD-SECURITY-DISABLE", "high", idx, "ufw firewall disabled", snippet);
    }
    if (rw.includes("reset")) {
      return finding("CMD-SECURITY-DISABLE", "high", idx, "ufw firewall reset detected", snippet);
    }
  }

  if (fw === "setenforce") {
    // setenforce 0 disables SELinux enforcement
    if (rw.includes("0") || rw.includes("permissive")) {
      return finding("CMD-SECURITY-DISABLE", "high", idx, "SELinux enforcement disabled (setenforce 0)", snippet);
    }
  }

  if (fw === "csrutil") {
    if (rw.includes("disable")) {
      return finding("CMD-SECURITY-DISABLE", "high", idx, "SIP (System Integrity Protection) disabled", snippet);
    }
  }

  if (fw === "systemctl") {
    const isStop = rw.includes("stop") || rw.includes("disable") || rw.includes("mask");
    const isFirewall =
      rw.some((w) => /^(firewalld|ufw|iptables|nftables|apparmor|auditd)$/.test(w));
    if (isStop && isFirewall) {
      return finding(
        "CMD-SECURITY-DISABLE",
        "high",
        idx,
        "systemctl stopping/disabling a security service",
        snippet,
      );
    }
  }

  if (fw === "apparmor_parser") {
    if (rw.includes("-r") || rw.includes("--remove")) {
      return finding("CMD-SECURITY-DISABLE", "high", idx, "AppArmor profile removal detected", snippet);
    }
  }

  if (fw === "aa-disable") {
    return finding("CMD-SECURITY-DISABLE", "high", idx, "AppArmor profile disabled", snippet);
  }

  return null;
}

/** CMD-HISTORY-WIPE (medium): history -c, rm ~/.bash_history, > ~/.zsh_history, unset HISTFILE. */
function checkHistoryWipe(seg: Segment, idx: number): CommandFinding | null {
  const fw = firstWord(seg.argv);
  const rw = allRawWords(seg.argv);
  const snippet = makeSnippet(seg.raw);

  if (fw === "history" && (rw.includes("-c") || rw.includes("-w") && rw.includes("/dev/null"))) {
    return finding("CMD-HISTORY-WIPE", "medium", idx, "history cleared (history -c)", snippet);
  }

  if (fw === "rm") {
    const hasHistFile = rw.some((w) => /\.(ba|z|fi|k)?sh_history$/.test(w) || w === "~/.bash_history" || w === "~/.zsh_history");
    if (hasHistFile) {
      return finding("CMD-HISTORY-WIPE", "medium", idx, "shell history file deleted", snippet);
    }
  }

  if (fw === "unset") {
    if (rw.includes("histfile") || rw.includes("histsize") || rw.includes("savehist")) {
      return finding("CMD-HISTORY-WIPE", "medium", idx, "HISTFILE/HISTSIZE unset (history wiped)", snippet);
    }
    // Check dollar-var names
    const varNames = dollarVarNames(seg.argv);
    if (varNames.some((n) => /^(HISTFILE|HISTSIZE|SAVEHIST)$/.test(n))) {
      return finding("CMD-HISTORY-WIPE", "medium", idx, "HISTFILE/HISTSIZE unset (history wiped)", snippet);
    }
  }

  // Redirect to history files: > ~/.bash_history
  if (
    redirectsTo(
      seg.argv,
      /\.(ba|z|fi|k|c)?sh_history$/,
    )
  ) {
    return finding("CMD-HISTORY-WIPE", "medium", idx, "stdout redirected to shell history file (wiping it)", snippet);
  }

  // export HISTFILE=/dev/null
  if (fw === "export") {
    if (rw.some((w) => /^histfile=/.test(w))) {
      return finding("CMD-HISTORY-WIPE", "medium", idx, "HISTFILE redirected (history suppressed)", snippet);
    }
  }

  return null;
}

/** CMD-SHUTDOWN-REBOOT (medium): shutdown, reboot, halt, poweroff. */
function checkShutdownReboot(seg: Segment, idx: number): CommandFinding | null {
  const fw = firstWord(seg.argv);
  if (fw === undefined) return null;

  if (["shutdown", "reboot", "halt", "poweroff", "init"].includes(fw)) {
    // "init 0" or "init 6" — power off or reboot
    if (fw === "init") {
      const rw = allRawWords(seg.argv);
      if (!rw.some((w) => w === "0" || w === "6")) return null;
    }
    return finding(
      "CMD-SHUTDOWN-REBOOT",
      "medium",
      idx,
      `${fw} command detected (system power state change)`,
      makeSnippet(seg.raw),
    );
  }

  return null;
}

/** CMD-KILL-ALL (medium): kill -9 -1, killall -9, pkill -9 with broad patterns. */
function checkKillAll(seg: Segment, idx: number): CommandFinding | null {
  const fw = firstWord(seg.argv);
  const rw = allRawWords(seg.argv);
  const snippet = makeSnippet(seg.raw);

  if (fw === "kill") {
    // kill -9 -1 (kill all processes)
    if (
      (rw.includes("-9") || rw.includes("-sigkill") || rw.includes("sigkill")) &&
      rw.includes("-1")
    ) {
      return finding("CMD-KILL-ALL", "medium", idx, "kill -9 -1 (kill all processes) detected", snippet);
    }
    // kill -KILL -1 variant
    if (rw.includes("-kill") && rw.includes("-1")) {
      return finding("CMD-KILL-ALL", "medium", idx, "kill -KILL -1 (kill all processes) detected", snippet);
    }
  }

  if (fw === "killall") {
    if (rw.includes("-9") || rw.includes("-sigkill")) {
      return finding("CMD-KILL-ALL", "medium", idx, "killall -9 detected", snippet);
    }
  }

  if (fw === "pkill") {
    if (rw.includes("-9") || rw.includes("-sigkill")) {
      return finding("CMD-KILL-ALL", "medium", idx, "pkill -9 with potentially broad pattern", snippet);
    }
  }

  return null;
}

/** CMD-CURL-INSECURE (medium): curl -k/--insecure, wget --no-check-certificate. */
function checkCurlInsecure(seg: Segment, idx: number): CommandFinding | null {
  const fw = firstWord(seg.argv);
  const rw = allRawWords(seg.argv);
  const snippet = makeSnippet(seg.raw);

  if ((fw === "curl" || fw === "curl.exe") && (rw.includes("-k") || rw.includes("--insecure"))) {
    return finding("CMD-CURL-INSECURE", "medium", idx, "curl --insecure bypasses TLS certificate validation", snippet);
  }

  if ((fw === "wget" || fw === "wget2") && rw.includes("--no-check-certificate")) {
    return finding("CMD-CURL-INSECURE", "medium", idx, "wget --no-check-certificate bypasses TLS certificate validation", snippet);
  }

  return null;
}

/** CMD-CRONTAB-OVERWRITE (medium): crontab -r or crontab overwrite. */
function checkCrontabOverwrite(seg: Segment, idx: number): CommandFinding | null {
  const fw = firstWord(seg.argv);
  const rw = allRawWords(seg.argv);
  const snippet = makeSnippet(seg.raw);

  if (fw === "crontab") {
    if (rw.includes("-r")) {
      return finding("CMD-CRONTAB-OVERWRITE", "medium", idx, "crontab -r removes the crontab", snippet);
    }
    // crontab /some/file or crontab - (read from stdin) are writes
    const hasFileArg = seg.argv.some(
      (t) => t.kind === "word" && !t.value.startsWith("-") && t.value.toLowerCase() !== "crontab",
    );
    if (hasFileArg) {
      return finding(
        "CMD-CRONTAB-OVERWRITE",
        "medium",
        idx,
        "crontab being overwritten with a new file",
        snippet,
      );
    }
  }

  // Redirect to crontab files
  if (redirectsTo(seg.argv, /\/etc\/(cron|crontab)/i)) {
    return finding("CMD-CRONTAB-OVERWRITE", "medium", idx, "stdout redirected to system crontab", snippet);
  }

  return null;
}

/** CMD-ENV-SECRET-ECHO (low): echo of likely-secret env var names. */
function checkEnvSecretEcho(seg: Segment, idx: number): CommandFinding | null {
  const fw = firstWord(seg.argv);
  if (fw !== "echo" && fw !== "printf" && fw !== "print") return null;

  const secretPattern = /^(.*_)?(KEY|TOKEN|SECRET|PASSWORD|PASSWD|PASS|APIKEY|API_KEY)(_.*)?$/i;

  // Check dollar-var tokens: $API_KEY, ${MY_SECRET}, etc.
  const secretVars = seg.argv
    .filter((t) => t.kind === "dollar-var")
    .map((t) => t.value.replace(/^\$\{?/, "").replace(/\}$/, ""))
    .filter((name) => secretPattern.test(name));

  if (secretVars.length === 0) return null;

  // Build snippet masking the values (we show the var names, not runtime values)
  const maskedSnippet = makeSnippet(
    seg.raw.replace(/\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/g, (m) => {
      const name = m.replace(/^\$\{?/, "").replace(/\}$/, "");
      return secretPattern.test(name) ? `$***${name.slice(-4)}***` : m;
    }),
  );

  return finding(
    "CMD-ENV-SECRET-ECHO",
    "low",
    idx,
    `echo of likely-secret variable(s): ${secretVars.join(", ")}`,
    maskedSnippet,
  );
}

// ---------------------------------------------------------------------------
// Cross-segment rules
// ---------------------------------------------------------------------------

/**
 * CMD-REMOTE-EXEC-PIPE (critical): download tool piped to shell interpreter.
 * Checks consecutive segment pairs where N is a downloader and N+1 is a shell.
 */
function checkRemoteExecPipe(segments: Segment[]): CommandFinding[] {
  const findings: CommandFinding[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const cur = segments[i];
    const next = segments[i + 1];
    if (cur === undefined || next === undefined) continue;

    const curFw = firstWord(cur.argv);
    if (curFw === undefined || !DOWNLOAD_CMDS.has(curFw)) continue;

    const nextFw = firstWord(next.argv);
    if (nextFw === undefined) continue;

    // next segment starts with optional sudo, then a shell name
    const nextWords = rawWords(next.argv);
    const shellWord = nextWords.find((w) => SHELL_NAMES.has(w.replace(/^sudo$/, "")) || SHELL_NAMES.has(w));
    const hasSudo = nextWords.includes("sudo");
    const effectiveShell = hasSudo
      ? nextWords.find((w) => w !== "sudo" && SHELL_NAMES.has(w))
      : SHELL_NAMES.has(nextFw) ? nextFw : undefined;

    if (effectiveShell === undefined && !SHELL_NAMES.has(nextFw)) continue;
    if (!SHELL_NAMES.has(nextFw) && !hasSudo) continue;

    const snippet = makeSnippet(`${cur.raw} | ${next.raw}`);
    findings.push(
      finding(
        "CMD-REMOTE-EXEC-PIPE",
        "critical",
        i,
        `Remote content from ${curFw} piped to shell interpreter`,
        snippet,
      ),
    );
  }
  return findings;
}

/**
 * CMD-EXFIL (high): piping to nc/ncat, base64|curl chain, curl posting a file.
 */
function checkExfil(segments: Segment[]): CommandFinding[] {
  const findings: CommandFinding[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg === undefined) continue;

    const fw = firstWord(seg.argv);
    const rw = allRawWords(seg.argv);
    const snippet = makeSnippet(seg.raw);

    // nc/ncat/netcat as a destination in a pipe
    if (fw !== undefined && /^n(c|cat|etcat)$/.test(fw)) {
      // If it is the last segment or receives from a pipe (i > 0), it's receiving data
      if (i > 0) {
        findings.push(
          finding("CMD-EXFIL", "high", i, `Data piped to ${fw} (potential network exfiltration)`, snippet),
        );
      }
    }

    // curl posting a local file: curl -d @filename or -F @filename or --data @filename
    if (fw === "curl" || fw === "curl.exe") {
      const hasPostFile = rw.some((w) => /^@./.test(w)); // @file argument
      const hasDataFlag = rw.some((w) => ["-d", "--data", "--data-binary", "-f", "--form"].includes(w));
      // Must have a URL (http/https argument)
      const hasUrl = seg.argv.some((t) => t.kind === "word" && /^https?:\/\//.test(t.value));
      if (hasPostFile && hasDataFlag && hasUrl) {
        findings.push(
          finding("CMD-EXFIL", "high", i, "curl posting a local file to a remote endpoint", snippet),
        );
      }
    }
  }

  // base64 | curl chain: detect base64 encode followed by curl as next segment
  for (let i = 0; i < segments.length - 1; i++) {
    const cur = segments[i];
    const next = segments[i + 1];
    if (cur === undefined || next === undefined) continue;

    const curFw = firstWord(cur.argv);
    const nextFw = firstWord(next.argv);

    if (
      (curFw === "base64" || curFw === "openssl") &&
      (nextFw === "curl" || nextFw === "wget" || nextFw === "nc" || nextFw === "ncat")
    ) {
      findings.push(
        finding(
          "CMD-EXFIL",
          "high",
          i,
          `Encoded data (${curFw}) piped to network tool (${nextFw})`,
          makeSnippet(`${cur.raw} | ${next.raw}`),
        ),
      );
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all rules against a segment list.
 *
 * Returns ALL findings; the caller (scanner) handles `policy.allow` suppression.
 */
export function checkSegments(
  segments: Segment[],
  policy: CommandScanPolicy,
): CommandFinding[] {
  const findings: CommandFinding[] = [];

  // Cross-segment rules
  for (const f of checkRemoteExecPipe(segments)) findings.push(f);
  for (const f of checkExfil(segments)) findings.push(f);

  // Per-segment rules
  for (let idx = 0; idx < segments.length; idx++) {
    const seg = segments[idx];
    if (seg === undefined) continue;

    const perSegmentChecks: Array<(s: Segment, i: number) => CommandFinding | null> = [
      checkRmRecursiveRoot,
      checkDiskWriteRaw,
      checkForkBombWithIdx,
      checkChmodWorldWritable,
      checkChownRoot,
      checkPrivilegeEscalation,
      (s, i) => checkGitForcePushProtected(s, i, policy),
      checkK8sDestroy,
      checkSecurityDisable,
      checkHistoryWipe,
      checkShutdownReboot,
      checkKillAll,
      checkCurlInsecure,
      checkCrontabOverwrite,
      checkEnvSecretEcho,
    ];

    for (const check of perSegmentChecks) {
      const f = check(seg, idx);
      if (f !== null) findings.push(f);
    }
  }

  return findings;
}
