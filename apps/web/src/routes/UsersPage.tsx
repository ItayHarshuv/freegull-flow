import { SurfaceCard } from '@freegull-flow/ui';

export function UsersPage() {
  return (
    <SurfaceCard className="text-right">
      <h2 className="text-2xl font-black">מודול צוות</h2>
      <p className="mt-2 text-sm text-slate-500">
        כאן יעבור ניהול המשתמשים, הרשאות, ו-PINs מתוך ה-legacy store אל ה-API החדש.
      </p>
    </SurfaceCard>
  );
}
