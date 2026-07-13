interface BadgeProps {
  value: string | null | undefined;
}

const STYLES: Record<string, string> = {
  PASS: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  ok: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  FLAG: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  degraded: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  BLOCK: 'bg-red-500/15 text-red-400 border-red-500/30',
  down: 'bg-red-500/15 text-red-400 border-red-500/30',
  unknown: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

const DEFAULT_STYLE = 'bg-gray-500/15 text-gray-400 border-gray-500/30';

export function Badge({ value }: BadgeProps) {
  const label = value ?? 'unknown';
  const style = STYLES[label] ?? DEFAULT_STYLE;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
