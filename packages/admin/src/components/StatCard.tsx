interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'default';
}

const ACCENTS: Record<NonNullable<StatCardProps['color']>, string> = {
  green: 'bg-brand',
  yellow: 'bg-yellow-400',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  default: 'bg-surface-border',
};

export function StatCard({ label, value, subtext, color = 'default' }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-surface-border bg-surface-card p-4">
      <div className={`absolute inset-x-0 top-0 h-1 ${ACCENTS[color]}`} />
      <div className="text-3xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-gray-400">{label}</div>
      {subtext ? <div className="mt-1 text-xs text-gray-500">{subtext}</div> : null}
    </div>
  );
}
