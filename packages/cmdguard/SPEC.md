# @agentoolbox/cmdguard — Specification

## Overview

`scanCommand` is a deterministic, offline function that analyses a shell command string for dangerous patterns and returns a signed verdict. It does NOT execute the command, make network calls, or mutate global state.

## Public API

```ts
function scanCommand(input: CommandScanInput): CommandScanResult
```

### Input

```ts
interface CommandScanInput {
  command: string;
  shell?: "bash" | "sh" | "zsh" | "powershell" | "generic";
  policy?: CommandScanPolicy;
}

interface CommandScanPolicy {
  blockSeverityAtOrAbove?: "low"|"medium"|"high"|"critical"; // default "high"
  allow?: string[];           // rule IDs to suppress
  protectedRefs?: string[];   // default ["main", "master"]
  maxSegments?: number;       // default 50
}
```

### Output

```ts
interface CommandScanResult {
  verdict: "PASS" | "FLAG" | "BLOCK";
  segments: number;           // number of top-level segments parsed
  findings: CommandFinding[];
  counts: Record<"low"|"medium"|"high"|"critical", number>;
  certificate: string;        // "sha256:<64-char hex>"
  latencyMs: number;
}

interface CommandFinding {
  ruleId: string;
  severity: "low" | "medium" | "high" | "critical";
  segmentIndex: number;       // 0-based index into the segment list
  message: string;
  snippet: string;            // first ≤120 chars of the offending segment (never echoes secrets)
}
```

## Parser

The parser is quote- and substitution-aware. It splits the command string into **segments** on these top-level separators: `;`, `&&`, `||`, `|`, and `\n`.

The following constructs are kept opaque — their content does not trigger rules and does not count as a split point:

- `'...'` — single-quoted strings (no escaping inside)
- `"..."` — double-quoted strings (backslash escaping honoured)
- `\<char>` — backslash escape outside quotes
- `$(...)` — command substitution (balanced parentheses)
- `` `...` `` — backtick substitution
- `$VAR` / `${VAR}` — variable references (emitted as `dollar-var` tokens)

Separators inside any of the above constructs are NOT treated as segment boundaries.

Each segment produces:
- `raw`: the verbatim text of the segment
- `argv`: a structured token list of `word`, `quoted`, `redirect`, `subst`, and `dollar-var` tokens

Rules operate ONLY on `word` and `dollar-var` tokens. `quoted` and `subst` tokens are structurally visible but their content is never inspected by rules.

## Rules

### CMD-RM-RECURSIVE-ROOT · critical

Fires when:
1. Command is `rm`
2. Has a recursive flag (`-r`, `-R`, `--recursive`, or combined short flags like `-rf`)
3. OR has a force flag (`-f`, `--force`, combined)
4. AND at least one argument is `/`, `/*`, `~`, `~/`, or a `$HOME`/`$PWD` variable

### CMD-REMOTE-EXEC-PIPE · critical

Fires when two consecutive segments form a download→shell chain:
- Segment N: first word is `curl`, `wget`, `fetch`, or `ftp`
- Segment N+1: first word is a shell interpreter (`sh`, `bash`, `zsh`, `dash`, `ksh`, `fish`, `ash`) or `sudo <shell>`

### CMD-DISK-WRITE-RAW · critical

Fires when:
- `dd` with an `of=/dev/…` argument, OR
- Command starts with `mkfs` (any variant), OR
- `mkswap`, OR
- A `>` redirect targeting `/dev/sd*`, `/dev/disk*`, `/dev/nvme*`

### CMD-FORK-BOMB · critical

Fires when the raw segment text matches a fork bomb pattern:
- `:(){ … }` (canonical bash fork bomb function definition)
- Any `(){ … | … & }` pattern in the raw text

### CMD-CHMOD-WORLD-WRITABLE · high

Fires when command is `chmod` and any argument is:
- A numeric mode with world-write bits: `777`, `0777`, `666`, or any mode matching `0?7xx`
- A symbolic mode containing `a+w`, `o+w`, `ugo+w`, or `a+rwx`

### CMD-CHOWN-ROOT · high

Fires when:
- Command is `chown`
- Ownership argument is `root`, `root:root`, `0`, or `0:0`, OR
- Has `-r`/`--recursive` and targets a system path (`/etc/`, `/usr/`, `/bin/`, etc.)

### CMD-PRIVILEGE-ESCALATION · high

Fires when command is `sudo`, `doas`, or `su` with escalation flags (`-`, `-l`, `--login`, `root`).

### CMD-GIT-FORCE-PUSH-PROTECTED · high

Fires when:
1. Command is `git push`
2. Has `--force`, `-f`, `--force-with-lease`, or `--force-if-includes`
3. Any non-flag argument matches a ref in `policy.protectedRefs` (default: `["main", "master"]`)

Ref matching handles `origin/main` and `HEAD:refs/heads/main` patterns.

### CMD-K8S-DESTROY · high

Fires for destructive infrastructure operations:
- `kubectl delete …`
- `helm uninstall` / `helm delete` / `helm destroy`
- `docker system prune` / `docker volume rm`
- `terraform destroy` / `tofu destroy`

### CMD-SECURITY-DISABLE · high

Fires for security configuration disable operations:
- `iptables -F` / `iptables --flush` / `ip6tables -F`
- `ufw disable` / `ufw reset`
- `setenforce 0` / `setenforce permissive`
- `csrutil disable`
- `systemctl stop|disable|mask <firewall-service>` (firewalld, ufw, iptables, nftables, apparmor, auditd)
- `aa-disable`

### CMD-EXFIL · high

Fires for network exfiltration patterns:
- Any segment receiving a pipe (i > 0) whose first command is `nc`, `ncat`, or `netcat`
- `base64` or `openssl` piped to `curl`, `wget`, `nc`, or `ncat`
- `curl -d @<file> <https-url>` or `curl --form @<file> <https-url>`

### CMD-TOO-MANY-SEGMENTS · high

Fires once when the total number of parsed segments exceeds `policy.maxSegments` (default 50). The `segmentIndex` is the 0-based index of the first extra segment.

### CMD-HISTORY-WIPE · medium

Fires for shell history erasure:
- `history -c`
- `rm <historyfile>` (matching `.bash_history`, `.zsh_history`, `.fish_history`, etc.)
- `unset HISTFILE` / `unset HISTSIZE` / `unset SAVEHIST`
- `export HISTFILE=…`
- `>` redirect targeting a history file

### CMD-SHUTDOWN-REBOOT · medium

Fires when command is `shutdown`, `reboot`, `halt`, `poweroff`, or `init 0`/`init 6`.

### CMD-KILL-ALL · medium

Fires for broad process kill operations:
- `kill -9 -1` (kill all processes)
- `killall -9 <name>`
- `pkill -9 <pattern>`

### CMD-CURL-INSECURE · medium

Fires when:
- `curl -k` or `curl --insecure`
- `wget --no-check-certificate`

### CMD-CRONTAB-OVERWRITE · medium

Fires when:
- `crontab -r` (removes crontab)
- `crontab <file>` (overwrites crontab with a file)
- `>` redirect targeting `/etc/cron*`

### CMD-ENV-SECRET-ECHO · low

Fires when:
1. Command is `echo`, `printf`, or `print`
2. Any `$VAR` or `${VAR}` token has a name matching `KEY`, `TOKEN`, `SECRET`, `PASSWORD`, `PASSWD`, `PASS`, `APIKEY` (case-insensitive, anywhere in the name)

The snippet masks the variable reference to avoid leaking secret values.

## Verdict logic

```
severity_order = { low:0, medium:1, high:2, critical:3 }
block_level    = severity_order[policy.blockSeverityAtOrAbove]  // default high=2

if any finding where severity_order[finding.severity] >= block_level → BLOCK
else if any findings                                                  → FLAG
else                                                                  → PASS
```

## Policy: allow

Rule IDs listed in `policy.allow` are suppressed: their findings are filtered out before verdict computation and do not appear in the result.

## Certificate

```ts
certificate = "sha256:" + sha256Hex(
  sha256Hex(command) + ":" + verdict + ":" + findings.length + ":" + Date.now()
)
```

The timestamp ensures uniqueness across repeated calls; the hash binds the verdict to the exact command and finding count.
