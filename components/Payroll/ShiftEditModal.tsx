import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Car, Check, Minus, Plus, Save, Trash2, X } from 'lucide-react';
import { Shift } from '../../types';
import SalesEditorCard from './SalesEditorCard';

interface ShiftEditModalProps {
  shift: Shift;
  onClose: () => void;
  onSave: (shift: Shift) => void;
  onDelete?: () => void;
  isNewShift?: boolean;
}

const normalizeQuarterHourValue = (value: number) => Math.max(0, Math.round(value * 4) / 4);
const formatOptionalNumberInput = (value: number) => (value > 0 ? String(normalizeQuarterHourValue(value)) : '');

const ShiftEditModal: React.FC<ShiftEditModalProps> = ({ shift, onClose, onSave, onDelete, isNewShift = false }) => {
  const [draft, setDraft] = useState<Shift>(shift);
  const [breakMinutesInput, setBreakMinutesInput] = useState(() => formatOptionalNumberInput(shift.breakMinutes));
  const [teachingHoursInput, setTeachingHoursInput] = useState(() => formatOptionalNumberInput(shift.teachingHours));
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const formattedDate = draft.date ? new Date(draft.date).toLocaleDateString('he-IL') : 'משמרת חדשה';

  useEffect(() => {
    setDraft(shift);
    setBreakMinutesInput(formatOptionalNumberInput(shift.breakMinutes));
    setTeachingHoursInput(formatOptionalNumberInput(shift.teachingHours));
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

  const handleBreakMinutesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setBreakMinutesInput(nextValue);
    setDraft((current) => ({
      ...current,
      breakMinutes: nextValue === '' ? 0 : Math.max(0, Number(nextValue) || 0),
    }));
  };

  const handleTeachingHoursChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setTeachingHoursInput(nextValue);
    setDraft((current) => ({
      ...current,
      teachingHours: nextValue === '' ? 0 : normalizeQuarterHourValue(Number(nextValue) || 0),
    }));
  };

  const adjustTeachingHours = (delta: number) => {
    const nextValue = normalizeQuarterHourValue((draft.teachingHours || 0) + delta);
    setTeachingHoursInput(formatOptionalNumberInput(nextValue));
    setDraft((current) => ({
      ...current,
      teachingHours: nextValue,
    }));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl p-8 md:p-10 overflow-y-auto max-h-[92vh]" onClick={(event) => event.stopPropagation()}>
        <div className="flex justify-between items-start mb-8 gap-4">
          <div className="text-right">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
              {isNewShift ? 'הוספת משמרת ידנית' : 'עריכת דיווח שעות'}
            </h3>
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mt-2">
              {draft.userName} | {formattedDate}
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
                  required
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
                  required
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
                value={breakMinutesInput}
                onChange={handleBreakMinutesChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-600 block mr-1 tracking-widest">שעות הדרכה</label>
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => adjustTeachingHours(0.25)}
                  className="shrink-0 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 text-slate-700 transition-all hover:bg-slate-100 active:scale-95"
                  aria-label="הוספת רבע שעת הדרכה"
                >
                  <Plus size={18} />
                </button>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  inputMode="decimal"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-center"
                  value={teachingHoursInput}
                  onChange={handleTeachingHoursChange}
                />
                <button
                  type="button"
                  onClick={() => adjustTeachingHours(-0.25)}
                  className="shrink-0 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 text-slate-700 transition-all hover:bg-slate-100 active:scale-95"
                  aria-label="הפחתת רבע שעת הדרכה"
                >
                  <Minus size={18} />
                </button>
              </div>
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

          <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center">
            {onDelete && !isNewShift && (
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="w-full md:w-auto md:min-w-[180px] bg-red-50 text-red-700 border border-red-200 py-5 px-6 rounded-[2rem] font-black text-sm tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-red-100"
              >
                <Trash2 size={20} />
                מחיקת משמרת
              </button>
            )}
            <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
              <Save size={20} />
              {isNewShift ? 'הוספת משמרת' : 'שמירה ועדכון דיווח'}
            </button>
          </div>
        </form>
      </div>

      {onDelete && isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4" onClick={() => setIsDeleteConfirmOpen(false)}>
          <div
            className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl text-right"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <AlertTriangle size={22} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black text-slate-900">מחיקת משמרת</h4>
                <p className="text-sm font-bold text-slate-600">האם אתה בטוח שברצונך למחוק את המשמרת?</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 md:flex-row">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-black text-slate-700 transition-all hover:bg-slate-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="w-full rounded-2xl bg-red-600 px-5 py-4 font-black text-white transition-all hover:bg-red-700"
              >
                מחיקה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftEditModal;
