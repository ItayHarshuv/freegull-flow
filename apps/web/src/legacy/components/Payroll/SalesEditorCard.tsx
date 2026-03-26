import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { BonusItem } from '../../types';

interface SalesEditorCardProps {
  bonuses: BonusItem[];
  onChange: (bonuses: BonusItem[]) => void;
  title?: string;
  emptyMessage?: string;
  addLabel?: string;
}

const SalesEditorCard: React.FC<SalesEditorCardProps> = ({
  bonuses,
  onChange,
  title = 'מכירות',
  emptyMessage = 'אין מכירות בדיווח הזה.',
  addLabel = 'שמור מכירה',
}) => {
  const [pendingBonus, setPendingBonus] = useState({ clientName: '', item: '', amount: '' });

  const addBonus = () => {
    if (!pendingBonus.clientName.trim() || !pendingBonus.amount.trim()) {
      return;
    }

    onChange([
      ...bonuses,
      {
        id: Math.random().toString(36).slice(2, 11),
        clientName: pendingBonus.clientName.trim(),
        item: pendingBonus.item.trim(),
        amount: Math.max(0, Number(pendingBonus.amount) || 0),
      },
    ]);
    setPendingBonus({ clientName: '', item: '', amount: '' });
  };

  const removeBonus = (bonusId: string) => {
    onChange(bonuses.filter((bonus) => bonus.id !== bonusId));
  };

  const totalBonuses = bonuses.reduce((sum, bonus) => sum + (Number(bonus.amount) || 0), 0);

  return (
    <section className="bg-white p-6 sm:p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border-2 border-slate-100 shadow-xl space-y-5">
      <div className="flex justify-end">
        <div className="text-right flex flex-col items-end">
          <h4 className="text-lg font-black text-slate-900">{title}</h4>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-1">סה"כ {totalBonuses}₪</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-4 space-y-4">
          <h5 className="text-sm font-black text-slate-900 text-right">הוסף מכירה</h5>
          <div className="flex flex-wrap items-stretch gap-3">
            <input
              placeholder="שם הלקוח"
              className="min-w-[220px] flex-[1_1_220px] p-4 bg-white border border-slate-200 rounded-xl font-bold text-sm text-right outline-none focus:ring-2 focus:ring-slate-900"
              value={pendingBonus.clientName}
              onChange={(event) => setPendingBonus((current) => ({ ...current, clientName: event.target.value }))}
            />
            <input
              placeholder="פריט / סיבה"
              className="min-w-[220px] flex-[1_1_220px] p-4 bg-white border border-slate-200 rounded-xl font-bold text-sm text-right outline-none focus:ring-2 focus:ring-slate-900"
              value={pendingBonus.item}
              onChange={(event) => setPendingBonus((current) => ({ ...current, item: event.target.value }))}
            />
            <div className="relative min-w-[160px] flex-[0.8_1_160px]">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">₪</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="סכום"
                className="w-full p-4 pr-8 bg-white border border-slate-200 rounded-xl font-bold text-sm text-right outline-none focus:ring-2 focus:ring-slate-900"
                value={pendingBonus.amount}
                onChange={(event) => setPendingBonus((current) => ({ ...current, amount: event.target.value }))}
              />
            </div>
            <button
              type="button"
              onClick={addBonus}
              className="w-full min-w-[160px] flex-[1_0_100%] px-5 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-black text-xs uppercase tracking-widest border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!pendingBonus.clientName.trim() || !pendingBonus.amount.trim()}
            >
              <Plus size={16} />
              {addLabel}
            </button>
          </div>
        </div>

        {bonuses.map((bonus) => (
          <div key={bonus.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-[2rem] px-4 py-3">
            <div className="min-w-0 flex-1 text-right font-bold text-sm text-slate-700">
              <span className="text-slate-900">{bonus.clientName}</span>
              <span className="mx-2 text-slate-300">•</span>
              <span>{bonus.item || 'ללא פירוט'}</span>
              <span className="mx-2 text-slate-300">•</span>
              <span className="font-black text-emerald-700 tabular-nums">₪{bonus.amount}</span>
            </div>
            <button
              type="button"
              onClick={() => removeBonus(bonus.id)}
              className="shrink-0 px-4 py-3 bg-white border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 transition-all flex items-center justify-center"
              aria-label="מחק מרשימת המכירות"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {bonuses.length === 0 && (
          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-400 font-bold">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
};

export default SalesEditorCard;
