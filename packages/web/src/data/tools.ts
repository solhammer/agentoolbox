// ── Tool catalog — single source of truth ────────────────────────────────────
// Imported by index.astro, docs.astro, and tools/[slug].astro.

export type Suite = 'core' | 'security' | 'finance' | 'compliance' | 'health' | 'agent' | 'infra' | 'legal' | 'data';

export interface Tool {
  slug: string;
  suite: Suite;
  title: string;
  body: string;
  endpoint: string;
  icon: string;
  credits: string;
  latency: string;
  featured?: boolean;
  detail: string;
  capabilities: string[];
  useCases: string[];
}

// ── Icon set (rendered via set:html in cards and modals) ─────────────────────
const svg = (inner: string) =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const icons: Record<string, string> = {
  'shield-check': svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" />'),
  'fire-shield': svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M12 7c1 1.5 1.5 2.5 1.5 3.5A1.5 1.5 0 0 1 12 12a1.5 1.5 0 0 1-1.5-1.5C10.5 9.5 11 8.5 12 7z" />'),
  'compress': svg('<polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />'),
  'key': svg('<circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" />'),
  'shield-x': svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9.5 9.5 5 5" /><path d="m14.5 9.5-5 5" />'),
  'hash': svg('<line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />'),
  'bug': svg('<path d="m8 2 1.88 1.88" /><path d="M14.12 3.88 16 2" /><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z" /><path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" /><path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" /><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" /><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />'),
  'lock': svg('<rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />'),
  'calculator': svg('<rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="8" x2="8" y1="14" y2="14" /><line x1="12" x2="12" y1="14" y2="14" /><line x1="16" x2="16" y1="14" y2="14" /><line x1="8" x2="8" y1="18" y2="18" /><line x1="12" x2="12" y1="18" y2="18" /><line x1="16" x2="16" y1="18" y2="18" />'),
  'trending-up': svg('<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />'),
  'search': svg('<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />'),
  'triangle-alert': svg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />'),
  'coins': svg('<circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" />'),
  'chart-line': svg('<path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />'),
  'shield-dollar': svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M12 8v8" /><path d="M14.5 10.5a2 2 0 0 0-2-1.5h-1a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-1a2 2 0 0 1-2-1.5" />'),
  'scale': svg('<path d="M12 3v18" /><path d="M7 21h10" /><path d="M5 7h14l-3 6a3 3 0 0 1-4 0z" transform="translate(1 0)" /><path d="m5 7-3 6a3 3 0 0 0 6 0z" /><path d="m19 7 3 6a3 3 0 0 1-6 0z" /><path d="M5 7h14" />'),
  'pill': svg('<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" />'),
  'sliders': svg('<line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />'),
  'server': svg('<rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />'),
  'gavel': svg('<path d="m14 13-7.5 7.5a2.12 2.12 0 0 1-3-3L11 10" /><path d="m16 16 6-6" /><path d="m8 8 6-6" /><path d="m9 7 8 8" /><path d="m21 11-8-8" />'),
  'fingerprint': svg('<path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" /><path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2" /><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" /><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" /><path d="M8.65 22c.21-.66.45-1.32.57-2" /><path d="M14 13.12c0 2.38 0 6.38-1 8.88" /><path d="M2 16h.01" /><path d="M21.8 16c.2-2 .131-5.354 0-6" /><path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />'),
  'braces': svg('<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" /><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />'),
  'database': svg('<ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14a9 3 0 0 0 18 0V5" /><path d="M3 12a9 3 0 0 0 18 0" />'),
  'terminal': svg('<polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />'),
  'globe': svg('<circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />'),
};

// ── Core suite ────────────────────────────────────────────────────────────────
export const features: Tool[] = [
  {
    slug: 'validate-imports',
    suite: 'core',
    title: 'Package Validator',
    body: "19.7% of AI-generated imports don't exist. We check every one against PyPI, npm, crates.io, and Go — in under 200ms.",
    endpoint: 'POST /v1/validate/imports',
    icon: 'shield-check',
    credits: '1 credit · ~$0.015',
    latency: '<200ms',
    detail:
      'Every import in AI-generated code is checked against the live package registry for its language, in parallel. Catches slopsquatting — hallucinated package names that do not exist (or worse, were registered by an attacker) before your agent runs pip or npm install.',
    capabilities: [
      'Live registry checks: PyPI, npm, crates.io, Go',
      'Parallel lookups, typically under 200ms',
      'Classifies each import valid / hallucinated / unknown',
      'Returns a hallucination rate for the whole snippet',
    ],
    useCases: [
      'Gate AI-generated code before install or execution',
      'Coding agents and autonomous dev pipelines',
      'PR bots reviewing generated dependencies',
    ],
  },
  {
    slug: 'verify',
    suite: 'core',
    title: 'Hallucination Firewall',
    body: 'Returns PASS, FLAG, or BLOCK for any LLM output. Catches bad packages, dead URLs, malformed citations, and numeric contradictions. Every verdict is SHA-256 certified.',
    endpoint: 'POST /v1/verify',
    icon: 'fire-shield',
    credits: '2 credits · ~$0.030',
    latency: '<500ms',
    detail:
      'The hallucination firewall runs every applicable check in parallel and returns a single PASS/FLAG/BLOCK verdict with a tamper-evident certificate. For code it validates packages; for prose it checks URLs, DOI/arXiv citations, numeric contradictions, and can ground claims against supplied source docs.',
    capabilities: [
      'Package, URL, DOI/arXiv, and numeric-contradiction checks',
      'Optional NLI grounding against supplied source texts',
      'PASS / FLAG / BLOCK with per-claim evidence',
      'SHA-256 certificate for audit',
    ],
    useCases: [
      'Final gate before accepting any LLM output',
      'RAG answers grounded in documents',
      'Research and report generation',
    ],
  },
  {
    slug: 'distill',
    suite: 'core',
    title: 'Context Distiller',
    body: 'Trim bloated agent context windows to a token budget. Keep the system prompt, deduplicate, and slice from newest to oldest. Up to 80% compression.',
    endpoint: 'POST /v1/distill',
    icon: 'compress',
    credits: '1 credit · ~$0.015',
    latency: '<50ms',
    detail:
      'Compresses a bloated conversation to a token budget using TF-IDF importance scoring. Always keeps the system prompt and the most recent turns, then fills the remaining budget with the highest-signal messages — up to about 80% smaller.',
    capabilities: [
      'TF-IDF importance scoring',
      'Preserves system prompt and recency',
      'Deterministic, under 50ms',
      'Optional LLMLingua-2 backend',
    ],
    useCases: [
      'Long-running agents hitting context limits',
      'Cutting token spend on repeated loops',
      'Summarizing history before a model call',
    ],
  },
];

// ── Security suite ────────────────────────────────────────────────────────────
export const securityTools: Tool[] = [
  {
    slug: 'scan-secrets',
    suite: 'security',
    title: 'Secret Scanner',
    body: 'Detects hardcoded API keys, passwords, private keys, and connection strings in AI-generated code before they reach git. 10 pattern detectors. Redacted output.',
    endpoint: 'POST /v1/scan/secrets',
    icon: 'key',
    credits: '1 credit · ~$0.015',
    latency: '<10ms',
    detail:
      'Detects hardcoded credentials in AI-generated code before they reach git or production. Every match is redacted — only the type, severity, and line number are returned.',
    capabilities: [
      '10 detectors: AWS, GitHub, OpenAI, Anthropic, private keys, DB URLs, passwords, high-entropy strings',
      'Severity: critical / high / medium',
      'Redacted output with line numbers',
      'Under 10ms, no network calls',
    ],
    useCases: [
      'Pre-commit and pre-deploy scanning of generated code',
      'Coding agents writing config files',
      'CI secret gates',
    ],
  },
  {
    slug: 'scan-injection',
    suite: 'security',
    title: 'Injection Detector',
    body: 'Identifies prompt injection attacks in user input — role hijacking, jailbreaks, data exfiltration attempts, and encoding tricks — before passing to an LLM.',
    endpoint: 'POST /v1/scan/injection',
    icon: 'shield-x',
    credits: '1 credit · ~$0.015',
    latency: '<10ms',
    detail:
      'Screens untrusted user input for prompt-injection before it reaches your LLM — instruction overrides, role hijacking, jailbreaks, data-exfiltration attempts, and encoding tricks — returning a risk band and the matched patterns.',
    capabilities: [
      '20+ weighted attack patterns',
      'Risk bands: safe / suspicious / injection',
      'Unicode direction-override and base64 trick detection',
      'Under 10ms',
    ],
    useCases: [
      'Chatbots and customer-support agents',
      'Any app forwarding user text to an LLM',
      'RAG over user-supplied content',
    ],
  },
  {
    slug: 'tokens-count',
    suite: 'security',
    title: 'Token Counter',
    body: 'BPE-approximate token counting for GPT-4, Claude, and Gemini with per-model cost estimates. Know your spend before you call the LLM.',
    endpoint: 'POST /v1/tokens/count',
    icon: 'hash',
    credits: '1 credit · ~$0.015',
    latency: '<10ms',
    detail:
      'BPE-approximate token counting with per-model cost estimates. Know your spend and check context-window fit before you make the call.',
    capabilities: [
      'Text or chat-messages input',
      'GPT-4, GPT-3.5, Claude, Gemini, generic',
      'Per-message breakdown plus context-window remaining',
      'USD cost estimate',
    ],
    useCases: [
      'Budget and guard token spend',
      'Decide when to distill',
      'Cost dashboards and quotas',
    ],
  },
  {
    slug: 'scan-vulnerabilities',
    suite: 'security',
    title: 'Vulnerability Scanner',
    body: 'Checks every package in AI-generated code against the OSV (Open Source Vulnerabilities) database. Surfaces CVEs and GHSAs before dependencies are installed.',
    endpoint: 'POST /v1/scan/vulnerabilities',
    icon: 'bug',
    credits: '2 credits · ~$0.030',
    latency: '<500ms',
    detail:
      'Checks package names against the OSV (Open Source Vulnerabilities) database and returns the CVEs and GHSAs affecting them — before dependencies are installed.',
    capabilities: [
      'OSV / CVE / GHSA lookup',
      'PyPI, npm, crates.io, Go',
      'Severity and aliases per finding',
      'Batch queries',
    ],
    useCases: [
      'Post-validation dependency safety',
      'Supply-chain gates',
      'Agent-written build and lock files',
    ],
  },
  {
    slug: 'scan-pii',
    suite: 'security',
    title: 'PII / PHI / PCI Firewall',
    body: 'Detects and redacts SSNs, credit cards (Luhn), IBANs (ISO-7064), and health identifiers before an agent logs, sends, or persists them. Deterministic, checksum-validated, with a signed certificate.',
    endpoint: 'POST /v1/scan/pii',
    icon: 'lock',
    credits: '1 credit · ~$0.015',
    latency: '<20ms',
    featured: true,
    detail:
      'The deterministic gate an agent calls before text crosses a trust boundary — a log line, a ticket, a third-party API, or a persisted transcript. It detects regulated personal data, redacts it, and returns a signed PASS/FLAG/BLOCK verdict. No network calls, nothing leaves the box, and raw values are never echoed back.',
    capabilities: [
      'Checksum-validated: credit cards (Luhn), IBANs (ISO-7064 mod-97), UK NHS (mod-11), Canadian SIN (Luhn)',
      'Structural: US SSN (SSA rules), email, phone, IPv4 — with overlap resolution',
      'PII / PHI / PCI categories and severity scoring',
      'Format-preserving masking plus a fully redacted copy of the input',
      'Enforcement modes: block / flag / audit',
      'Policy: severity threshold, allowTypes, jurisdictions, redact on/off',
      'Tamper-evident SHA-256 certificate bound to the input hash',
    ],
    useCases: [
      'Support agents: strip SSNs and cards before writing tickets or transcripts',
      'Healthcare and telehealth copilots: keep PHI out of prompts and non-BAA vendors',
      'Fintech and PCI: block raw card numbers from leaving the boundary',
      'HR and recruiting agents: guard employee records and offer letters',
      'GDPR / HIPAA / CCPA: a pre-flight gate plus an audit certificate for every egress',
    ],
  },
  {
    slug: 'scan-command',
    suite: 'security',
    title: 'Command Safety Gate',
    body: 'Flags destructive shell commands before an agent runs them — rm -rf /, curl|sh, dd/mkfs, fork bombs, chmod 777, force-push to protected branches, kubectl/docker destroys. Quote- and substitution-aware.',
    endpoint: 'POST /v1/scan/command',
    icon: 'terminal',
    credits: '1 credit · ~$0.015',
    latency: '<5ms',
    featured: true,
    detail:
      'The gate an agent calls before it executes a shell command. A quote-, comment-, and substitution-aware parser splits the command into segments and matches each against a bundled catalog of dangerous patterns — recursive root deletes, piping a remote download into a shell, raw disk writes, fork bombs, world-writable chmod, privilege escalation, force-pushes to protected refs, cluster/volume destroys, security disables, and data exfiltration — without ever executing it. Keywords inside quoted strings never false-positive.',
    capabilities: [
      '18 rules across critical / high / medium / low severity',
      'Quote-, comment- and substitution-aware segment parser',
      'Detects rm -rf, curl|sh, dd, fork bombs, chmod 777, force-push, kubectl delete',
      'Policy: allow-list rule IDs, protected git refs, max segments',
      'Deterministic and offline (never executes), with a SHA-256 certificate',
    ],
    useCases: [
      'Gate shell commands from coding and computer-use agents',
      'Sandbox and CI command allow-listing',
      'Block accidental destructive operations before they run',
      'A safety net in front of any exec/tool that shells out',
    ],
  },
  {
    slug: 'scan-url',
    suite: 'security',
    title: 'URL / SSRF Gate',
    body: 'Blocks SSRF and egress-policy violations before an outbound request — cloud metadata (169.254.169.254), private/loopback targets, obfuscated IPs, denied schemes, credentials-in-URL, and punycode hosts.',
    endpoint: 'POST /v1/scan/url',
    icon: 'globe',
    credits: '1 credit · ~$0.015',
    latency: '<5ms',
    featured: true,
    detail:
      'The gate an agent calls before it fetches a URL or navigates a browser. It parses the URL, normalizes IP obfuscations (decimal, octal, hex, IPv6), and classifies the host against bundled reserved-range tables — flagging cloud instance-metadata endpoints, RFC-1918 private / loopback / link-local targets, denied schemes (file:, gopher:), credentials embedded in the URL, and punycode/homograph hosts. Fully offline by default; an optional DNS check catches rebinding to internal addresses.',
    capabilities: [
      'Blocks cloud metadata endpoints (169.254.169.254) — the classic SSRF exfiltration',
      'Classifies private / loopback / link-local / reserved targets',
      'Decodes decimal / octal / hex / IPv6 IP obfuscation',
      'Scheme, allow/deny-host, port, and credentials-in-URL policy',
      'Deterministic and offline by default (opt-in DNS-rebinding check), with a certificate',
    ],
    useCases: [
      'Gate outbound requests from tool-calling and browser agents',
      'Prevent SSRF to cloud metadata and internal services',
      'Egress allow-listing for autonomous agents',
      'Catch obfuscated-IP and DNS-rebinding tricks pre-fetch',
    ],
  },
];

// ── Finance suite ─────────────────────────────────────────────────────────────
export const financeTools: Tool[] = [
  {
    slug: 'finance-units',
    suite: 'finance',
    title: 'Units Sanity Check',
    body: 'Prevents the $440k Lobstar-class decimal error. Validates raw on-chain amounts against authoritative token decimals from DexScreener and Solana RPC.',
    endpoint: 'POST /v1/finance/units',
    icon: 'calculator',
    credits: '1 credit · ~$0.015',
    latency: '<10ms',
    detail:
      'Validates a raw on-chain amount against the intended UI amount using the token authoritative decimals. Catches the catastrophic decimal-scaling error — sending 1000x too many tokens.',
    capabilities: [
      'Authoritative decimals from DexScreener and Solana RPC',
      'Blocks over 1% deviation',
      'Works across Solana and EVM chains',
      'Under 10ms once decimals are known',
    ],
    useCases: [
      'Any agent building a transfer transaction',
      'Treasury and payout bots',
      'The Lobstar $440k check',
    ],
  },
  {
    slug: 'finance-price',
    suite: 'finance',
    title: 'Cross-Source Price Validator',
    body: 'Fetches the same asset from two independent live sources (CoinGecko + DexScreener for crypto). Blocks if they diverge >2% or if data is stale.',
    endpoint: 'POST /v1/finance/price',
    icon: 'trending-up',
    credits: '2 credits · ~$0.030',
    latency: '~300ms',
    detail:
      'Cross-validates an asset price against two independent live sources and blocks stale or divergent data. Flags a proposed price that deviates from consensus.',
    capabilities: [
      'CoinGecko + DexScreener (crypto), yahoo-finance2 (stocks)',
      'Staleness and divergence checks',
      'Consensus price plus per-source breakdown',
      'Proposed-price deviation flag',
    ],
    useCases: [
      'Pre-trade price sanity',
      'Guard against hallucinated prices',
      'Portfolio valuation',
    ],
  },
  {
    slug: 'finance-symbol',
    suite: 'finance',
    title: 'Symbol / Token Resolver',
    body: 'Resolves tickers and token addresses to confirmed identities. Flags ambiguous symbols — USDC has 200+ imposters on Solana alone.',
    endpoint: 'POST /v1/finance/symbol',
    icon: 'search',
    credits: '1 credit · ~$0.015',
    latency: '~200ms',
    detail:
      'Resolves a ticker or token to a confirmed identity and flags ambiguity — because symbols collide. USDC has 200+ imposters on Solana. Always resolve by address for crypto.',
    capabilities: [
      'Address and symbol resolution',
      'Liquidity-ranked matches',
      'Ambiguity detection',
      'Expected-name confirmation',
    ],
    useCases: [
      'Confirm the right token before trading',
      'Avoid imposter tokens',
      'Symbol to address mapping',
    ],
  },
  {
    slug: 'finance-token-risk',
    suite: 'finance',
    title: 'Rug Pull Scanner',
    body: 'One call to RugCheck.xyz + on-chain authority verification. Blocks tokens with active mint authority, no LP lock, or rug score above threshold.',
    endpoint: 'POST /v1/finance/token/risk',
    icon: 'triangle-alert',
    credits: '3 credits · ~$0.045',
    latency: '~500ms',
    detail:
      'Rug-pull scanner: a RugCheck.xyz score plus on-chain mint and freeze authority verification. Blocks tokens with active mint authority, unlocked LP, or a rug score above threshold.',
    capabilities: [
      'RugCheck score plus on-chain authority checks',
      'Mint and freeze authority flags',
      'LP-lock check',
      'Configurable thresholds',
    ],
    useCases: [
      'Screen new or unknown tokens',
      'Memecoin trading agents',
      'Pre-buy safety gate',
    ],
  },
  {
    slug: 'finance-slippage',
    suite: 'finance',
    title: 'Slippage / Liquidity Guard',
    body: 'Estimates price impact using DexScreener pool data. Prevents the thin-pool disaster where a $440k order realizes ~$40k due to pool drainage.',
    endpoint: 'POST /v1/finance/slippage',
    icon: 'coins',
    credits: '2 credits · ~$0.030',
    latency: '~200ms',
    detail:
      'Estimates price impact from live pool liquidity (constant-product AMM) so a large order does not drain a thin pool. Flags implausible volume-to-liquidity ratios that suggest wash trading.',
    capabilities: [
      'Price-impact estimate from pool depth',
      'Configurable max impact and min liquidity',
      'Wash-trading flag',
      'DexScreener pool data',
    ],
    useCases: [
      'Size trades to available liquidity',
      'Avoid thin-pool disasters',
      'Pre-trade impact preview',
    ],
  },
  {
    slug: 'finance-order-risk',
    suite: 'finance',
    title: 'Full Order Risk Scorer',
    body: 'Pre-trade gate that runs all finance checks in parallel. Returns a composite PASS/FLAG/BLOCK with per-check breakdown and blockedBy field.',
    endpoint: 'POST /v1/finance/order/risk',
    icon: 'chart-line',
    credits: '5 credits · ~$0.075',
    latency: '~500ms',
    detail:
      'The full pre-trade gate: runs token risk, slippage, price validation, and position limits in parallel and returns a composite verdict with the specific check that blocked it.',
    capabilities: [
      'Runs all applicable finance checks at once',
      'Composite PASS/FLAG/BLOCK plus blockedBy',
      'Per-check score breakdown',
      'One call',
    ],
    useCases: [
      'Single-call pre-trade gate',
      'Trading agents',
      'propose then validate then execute',
    ],
  },
  {
    slug: 'finance-position',
    suite: 'finance',
    title: 'Position Guardian',
    body: 'Deterministic kill-switch. No API calls — pure arithmetic. Enforces max position size, daily loss limits, leverage caps, and asset allowlists.',
    endpoint: 'POST /v1/finance/position/check',
    icon: 'shield-dollar',
    credits: '1 credit · ~$0.015',
    latency: '<1ms',
    detail:
      'Deterministic position-limit and kill-switch gate — no external calls, pure arithmetic. The final, non-overridable gate before executing a trade.',
    capabilities: [
      'Max position %, daily-loss, leverage, open positions',
      'Asset allowlist plus a hard USD cap',
      'Kill-switch',
      'Under 1ms, no network',
    ],
    useCases: [
      'Non-overridable safety gate',
      'Risk limits for autonomous traders',
      'The Claude Code sweep fix',
    ],
  },
];

// ── Compliance & health suite ─────────────────────────────────────────────────
export const safetyTools: Tool[] = [
  {
    slug: 'compliance-sanctions',
    suite: 'compliance',
    title: 'Sanctions Screening',
    body: 'Screens people, companies, and vessels against OFAC sanctions lists (SDN + Consolidated). Exact, alias, and fuzzy matching returns PASS/FLAG/BLOCK with a signed certificate.',
    endpoint: 'POST /v1/compliance/sanctions',
    icon: 'scale',
    credits: '1 credit · ~$0.015',
    latency: '<10ms',
    featured: true,
    detail:
      'The deterministic gate an agent calls before it onboards, pays, ships to, or contracts with a counterparty. Names are normalized (diacritics, punctuation, org suffixes) and matched against a bundled OFAC snapshot by exact name, alias, and token-sorted Jaro-Winkler similarity. No network calls — the lists ship with the tool — and every verdict carries a tamper-evident certificate.',
    capabilities: [
      'OFAC SDN + Consolidated lists, matched by name and alias',
      'Exact, alias, and fuzzy (token-sorted Jaro-Winkler) matching',
      'PASS / FLAG / BLOCK with per-match score, program, and jurisdiction',
      'Filter by list and entity type; tunable fuzzy threshold',
      'Deterministic and offline, with a SHA-256 certificate',
    ],
    useCases: [
      'KYC / onboarding agents screening new customers or vendors',
      'Payments and payouts: block transfers to sanctioned parties',
      'Marketplaces, logistics, and hiring — restricted-party checks',
      'A pre-flight compliance gate with an audit certificate',
    ],
  },
  {
    slug: 'health-rx-check',
    suite: 'health',
    title: 'Medication Safety Gate',
    body: 'Checks a medication list for unit confusion (mg vs mcg), overdoses, and dangerous drug-drug interactions. Returns PASS/FLAG/BLOCK. Informational only — not medical advice.',
    endpoint: 'POST /v1/health/rx-check',
    icon: 'pill',
    credits: '2 credits · ~$0.030',
    latency: '<10ms',
    featured: true,
    detail:
      'A deterministic safety net for healthcare copilots and prescription workflows. It validates dose units (catching the 1000× mg/mcg error), checks total daily doses against known maximums including weight-based ranges, and screens every drug pair against a curated interaction table. Every result carries a signed certificate and a clear not-medical-advice disclaimer.',
    capabilities: [
      'Unit-confusion detection (e.g. levothyroxine dosed in mg vs mcg)',
      'Overdose checks vs. max daily dose, incl. weight-based (mg/kg)',
      'Drug-drug interaction screening across a curated table',
      'Severity moderate / major / contraindicated → FLAG or BLOCK',
      'Deterministic and offline; signed certificate; not medical advice',
    ],
    useCases: [
      'Telehealth and clinical copilots drafting medication lists',
      'Pharmacy and e-prescribing assistants',
      'Patient-facing agents that must never suggest an unsafe combo',
      'A final safety gate before any dosing instruction is shown',
    ],
  },
];

// ── Agent / infra / legal suite ───────────────────────────────────────────────
export const platformTools: Tool[] = [
  {
    slug: 'agent-tool-args',
    suite: 'agent',
    title: 'Tool-Argument Firewall',
    body: "Validates a tool call's arguments against a schema + business policy: types, ranges, enums, null-safety, unit coercion (the dollars-vs-cents bug), and cross-field rules. Deterministic.",
    endpoint: 'POST /v1/agent/tool-args',
    icon: 'sliders',
    credits: '1 credit · ~$0.015',
    latency: '<5ms',
    featured: true,
    detail:
      'A generic business-rules gate for any function/tool call an agent is about to make. Declare a schema (types, required, enums, ranges, patterns, units) plus cross-field rules, and it returns PASS/FLAG/BLOCK with a precise list of violations before the call executes — catching the class of bug where an agent passes dollars where cents are expected, a null into a required field, or a value outside its allowed range.',
    capabilities: [
      'Type, required, enum, range, length, and regex checks',
      'Null-safety and unknown-argument detection',
      'Unit-coercion heuristics (dollars vs cents, the Stripe ×100 bug)',
      'Cross-field rules (e.g. min <= max) with severity-based verdicts',
      'Deterministic and offline, with a SHA-256 certificate',
    ],
    useCases: [
      'Gate any agent tool/function call touching money or quantities',
      'Validate arguments before a destructive or irreversible action',
      'Enforce business policy on LLM-generated parameters',
      'A cheap, universal pre-execution guardrail',
    ],
  },
  {
    slug: 'infra-plan-risk',
    suite: 'infra',
    title: 'IaC Risk Gate',
    body: 'Static blast-radius analysis of Terraform plans, IAM policies, and Kubernetes manifests against a bundled CIS/OPA-style ruleset. Flags public exposure, wildcards, and privileged pods. No cloud creds.',
    endpoint: 'POST /v1/infra/plan/risk',
    icon: 'server',
    credits: '2 credits · ~$0.030',
    latency: '<10ms',
    featured: true,
    detail:
      'The gate an agent calls before it applies infrastructure changes. Feed it a Terraform plan JSON (terraform show -json), an AWS IAM policy, or a Kubernetes manifest and it statically flags high-blast-radius risks — public 0.0.0.0/0 exposure, public buckets, IAM Action/Resource wildcards, destroy/replace of stateful resources, privileged or hostNetwork pods — with no cloud credentials and no network calls.',
    capabilities: [
      'Terraform plan JSON, AWS IAM, and Kubernetes manifests',
      '20 bundled CIS/OPA-style rules across the three formats',
      'Flags public exposure, IAM wildcards, stateful destroys, privileged pods',
      'Severity-ranked findings with rule IDs; tunable block threshold',
      'Deterministic and offline (no cloud credentials)',
    ],
    useCases: [
      'Gate IaC changes an agent proposes before apply',
      'PR bots reviewing Terraform / Kubernetes / IAM diffs',
      'Guardrails for autonomous DevOps and platform agents',
      'Catch blast-radius mistakes before they reach production',
    ],
  },
  {
    slug: 'legal-cite',
    suite: 'legal',
    title: 'Citation Validator',
    body: 'Validates US case citations (volume / reporter / page / year) against 150+ reporter abbreviations, flags malformed or implausible cites, and checks quote fidelity against supplied source text.',
    endpoint: 'POST /v1/legal/cite',
    icon: 'gavel',
    credits: '2 credits · ~$0.030',
    latency: '<5ms',
    featured: true,
    detail:
      'The gate for any agent that cites case law. It parses and validates citations like "347 U.S. 483 (1954)" against a bundled table of 150+ reporter abbreviations, flags malformed structure, unknown reporters, and implausible years, and — when you supply the source text — verifies the quote actually appears, catching fabricated quotations before they reach a brief or a client.',
    capabilities: [
      'Parses volume / reporter / page / year',
      '150+ Bluebook reporter abbreviations',
      'Flags malformed, unknown-reporter, and implausible-year cites',
      'Quote-fidelity check against supplied source text',
      'Deterministic and offline, with a SHA-256 certificate',
    ],
    useCases: [
      'Legal research and brief-drafting copilots',
      'Catch hallucinated or fabricated case citations',
      'Verify quotations against the record before filing',
      'A citation gate for any law-facing agent',
    ],
  },
  {
    slug: 'legal-deadline',
    suite: 'legal',
    title: 'Deadline Calculator',
    body: 'Court-day and calendar-day deadline math — counts forward or backward, skipping weekends and US federal holidays. Deterministic, with a signed result.',
    endpoint: 'POST /v1/legal/deadline',
    icon: 'gavel',
    credits: '1 credit · ~$0.015',
    latency: '<5ms',
    featured: true,
    detail:
      'Deterministic deadline arithmetic for legal and compliance workflows. Count a number of court days (skipping weekends and US federal holidays, with observed-day rules) or calendar days, forward or backward from a start date, and get the resolved date plus exactly which days were skipped — so an agent never miscounts a filing deadline.',
    capabilities: [
      'Court-day mode skips weekends + US federal holidays (2020–2035)',
      'Calendar-day mode counts every day',
      'Count forward (after) or backward (before)',
      'Returns the resolved date and the days skipped',
      'Deterministic and offline, with a SHA-256 certificate',
    ],
    useCases: [
      'Compute filing and response deadlines',
      'Statute-of-limitations math',
      'Docketing and calendaring agents',
      'Any deadline an agent must not miscount',
    ],
  },
];

// ── Data & validation suite ───────────────────────────────────────────────────
export const dataTools: Tool[] = [
  {
    slug: 'validate-identifier',
    suite: 'data',
    title: 'Identifier Validator',
    body: 'Checksum-validates IBANs, ABA routing, SWIFT/BIC, credit cards, EIN, EU VAT, VIN, NPI, SSN, and ETH/SOL addresses. Auto-detects type; cards and SSNs are masked.',
    endpoint: 'POST /v1/validate/identifier',
    icon: 'fingerprint',
    credits: '1 credit · ~$0.015',
    latency: '<5ms',
    featured: true,
    detail:
      'The deterministic gate an agent calls before it stores, pays to, or transacts against a structured identifier. Each value is validated by its real check digit or format rule — Luhn for cards, ISO-7064 mod-97 for IBANs, mod-11 transliteration for VINs, EIP-55 for Ethereum addresses, base58 for Solana — and the type is auto-detected when not given. Sensitive values (cards, SSNs) are masked in the response.',
    capabilities: [
      '11 identifier types: IBAN, ABA, SWIFT/BIC, card, EIN, EU VAT, VIN, NPI, SSN, ETH, SOL',
      'Real checksums: Luhn, ISO-7064, mod-11, EIP-55 keccak, base58',
      'Auto-detection or explicit type; batch input',
      'Card and SSN values masked to the last 4',
      'Deterministic and offline, with a SHA-256 certificate',
    ],
    useCases: [
      'KYC / onboarding and payment-setup agents',
      'Validate bank, tax, and crypto identifiers before use',
      'Catch mistyped or fabricated account numbers pre-transaction',
      'A cross-industry data-entry guardrail',
    ],
  },
  {
    slug: 'validate-schema',
    suite: 'data',
    title: 'Schema Conformance',
    body: "Validates any JSON value against a JSON Schema (Draft-07 subset) — types, required, enums, ranges, patterns, formats, oneOf/allOf. Dependency-free and deterministic.",
    endpoint: 'POST /v1/validate/schema',
    icon: 'braces',
    credits: '1 credit · ~$0.015',
    latency: '<5ms',
    featured: true,
    detail:
      "The gate an agent calls to prove its own (or a tool's) structured output matches the contract before acting on it. A dependency-free JSON Schema validator (Draft-07 subset) that returns every error with a precise JSON path — types, required fields, enums, numeric ranges, string patterns and formats, array/object constraints, and oneOf/anyOf/allOf/not.",
    capabilities: [
      'Draft-07 subset: type, required, enum, const, ranges, pattern, format',
      'Arrays (tuple + single), uniqueItems, additionalProperties',
      'oneOf / anyOf / allOf / not and local $ref',
      'Per-error JSON paths; depth + size guards',
      'Deterministic and offline, with a SHA-256 certificate',
    ],
    useCases: [
      "Gate an LLM's structured / tool-call output before acting",
      'Validate API request/response payloads in agent pipelines',
      'Enforce a data contract without shipping ajv',
      'Catch malformed JSON before it hits downstream systems',
    ],
  },
  {
    slug: 'scan-sql',
    suite: 'data',
    title: 'SQL Safety Gate',
    body: 'Flags destructive or injection-prone SQL before execution — DELETE/UPDATE without WHERE, DROP/TRUNCATE, WHERE 1=1, stacked statements, UNION injection. Comment- and string-aware.',
    endpoint: 'POST /v1/scan/sql',
    icon: 'database',
    credits: '1 credit · ~$0.015',
    latency: '<5ms',
    featured: true,
    detail:
      'The gate an agent calls before it runs SQL. A comment- and string-literal-aware tokenizer scans each statement for high-risk patterns — an unbounded DELETE/UPDATE, DROP or TRUNCATE, a WHERE 1=1 tautology, stacked statements, UNION-based injection, or a privilege change — without ever connecting to a database. Keywords inside string literals never false-positive.',
    capabilities: [
      'Unbounded DELETE/UPDATE, DROP/TRUNCATE, tautology, UNION-injection rules',
      'Comment- and string-literal-aware tokenizer (no false positives)',
      'Postgres / MySQL / SQLite / T-SQL / generic dialects',
      'Severity-ranked findings; tunable policy (allow DDL, max statements)',
      'Deterministic and offline (no DB connection), with a certificate',
    ],
    useCases: [
      'Gate agent-generated SQL before execution',
      'Text-to-SQL and analytics copilots',
      'Block accidental mass deletes and drops',
      'A safety net in front of any database tool',
    ],
  },
];

// ── Aggregated ────────────────────────────────────────────────────────────────
export const allTools: Tool[] = [
  ...features,
  ...securityTools,
  ...financeTools,
  ...safetyTools,
  ...platformTools,
  ...dataTools,
];
