import { SurfaceCard } from '@freegull-flow/ui';

const metrics = [
  ['שיעורים השבוע', '24'],
  ['עובדים פעילים', '18'],
  ['לידים פתוחים', '11'],
  ['משימות דחופות', '6'],
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <SurfaceCard className="text-right">
        <h2 className="text-3xl font-black text-slate-950">תשתית חדשה ל-Freegull Flow</h2>
        <p className="mt-2 text-sm text-slate-600">
          זהו ה-shell החדש שעליו יעברו בהדרגה המודולים מהאפליקציה הישנה.
        </p>
      </SurfaceCard>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <SurfaceCard key={label} className="text-right">
            <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
              {label}
            </div>
            <div className="mt-3 text-4xl font-black text-slate-950">{value}</div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
