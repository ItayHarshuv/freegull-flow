import React, { useEffect, useRef, useState } from 'react';
import { Car, Check, Save, X } from 'lucide-react';
import { Shift } from '../../types';
import SalesEditorCard from './SalesEditorCard';

interface ShiftEditModalProps {
  shift: Shift;
  onClose: () => void;
  onSave: (shift: Shift) => void;
}

const ShiftEditModal: React.FC<ShiftEditModalProps> = ({ shift, onClose, onSave }) => {
  const [draft, setDraft] = useState<Shift>(shift);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(shift);
  }, [shift]);

  const triggerPicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (!ref.current) return;
    try {
      if ('showPicker' in HTMLInputElement.prototype) {
        ref.current.showPicker();
      } else {
        ref.current.focus();
        ref.current.click();
      }
    } catch (_error) {
      ref.current.focus();
      ref.current.click();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave({
      ...draft,
      endTime: draft.endTime || null,
      breakMinutes: Math.max(0, Number(draft.breakMinutes) || 0),
      teachingHours: Math.max(0, Number(draft.teachingHours) || 0),
      bonuses: draft.bonuses.map((bonus) => ({
        ...bonus,
        amount: Math.max(0, Number(bonus.amount) || 0),
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl p-8 md:p-10 overflow-y-auto max-h-[92vh]" onClick={(event) => event.stopPropagation()}>
        <div className="flex justify-between items-start mb-8 gap-4">
          <div className="text-right">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">עריכת דיווח שעות</h3>
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mt-2">
              {draft.userName} | {new Date(draft.date).toLocaleDateString('he-IL')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:text-slate-900 active:scale-90">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 text-right">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-600 block mr-1 tracking-widest">תאריך</label>
              <div className="relative cursor-pointer" onClick={() => triggerPicker(dateRef)}>
                <input
                  ref={dateRef}
                  type="date"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-right cursor-pointer"
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-600 block mr-1 tracking-widest">שעת כניסה</label>
              <div className="cursor-pointer" onClick={() => triggerPicker(startTimeRef)}>
                <input
                  ref={startTimeRef}
                  type="time"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-right cursor-pointer"
                  value={draft.startTime}
                  onChange={(event) => setDraft({ ...draft, startTime: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-600 block mr-1 tracking-widest">שעת יציאה</label>
              <div className="cursor-pointer" onClick={() => triggerPicker(endTimeRef)}>
                <input
                  ref={endTimeRef}
                  type="time"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-right cursor-pointer"
                  value={draft.endTime || ''}
                  onChange={(event) => setDraft({ ...draft, endTime: event.target.value || null })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-600 block mr-1 tracking-widest">דקות הפסקה</label>
              <input
                type="number"
                min="0"
                step="1"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-right"
                value={draft.breakMinutes}
                onChange={(event) => setDraft({ ...draft, breakMinutes: Math.max(0, Number(event.target.value) || 0) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-600 block mr-1 tracking-widest">שעות הדרכה</label>
              <input
                type="number"
                min="0"
                step="0.5"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-right"
                value={draft.teachingHours}
                onChange={(event) => setDraft({ ...draft, teachingHours: Math.max(0, Number(event.target.value) || 0) })}
              />
            </div>
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, hasTravel: !draft.hasTravel })}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${draft.hasTravel ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
              >
                <div className="flex items-center gap-3">
                  <Car size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">תשלום נסיעות</span>
                </div>
                {draft.hasTravel ? <Check size={16} strokeWidth={4} /> : <X size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-slate-600 block mr-1 tracking-widest">הערות</label>
            <textarea
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-right min-h-[120px] placeholder:text-slate-400"
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              placeholder="הערות על המשמרת, המכירות או חריגות"
            />
          </div>

          <SalesEditorCard
            bonuses={draft.bonuses}
            onChange={(bonuses) => setDraft((current) => ({ ...current, bonuses }))}
          />

          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            <Save size={20} />
            שמירה ועדכון דיווח
          </button>
        </form>
      </div>
    </div>
  );
};

export default ShiftEditModal;
