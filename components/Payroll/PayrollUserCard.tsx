import React from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Shift } from '../../types';
import { PayrollEntry } from './payrollUtils';

interface PayrollUserCardProps {
  data: PayrollEntry;
  isOpen: boolean;
  onToggle: () => void;
  onExportReport?: () => void;
  onDownload101?: () => void;
  onShiftClick?: (shift: Shift) => void;
  emptyMessage?: string;
}

const PayrollUserCard: React.FC<PayrollUserCardProps> = ({
  data,
  isOpen,
  onToggle,
  onExportReport,
  onDownload101,
  onShiftClick,
  emptyMessage = 'אין דיווחי שעות לחודש זה.',
}) => {
  const isRowClickable = typeof onShiftClick === 'function';

  return (
    <div className="min-w-0 bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden hover:border-brand transition-all group">
      <div className={`min-w-0 p-6 md:p-8 flex flex-col xl:flex-row items-center xl:items-center justify-between gap-6 bg-slate-50/20 ${isOpen ? 'border-b border-slate-50' : ''}`}>
        <div className="min-w-0 flex items-center gap-5 flex-row-reverse w-full xl:w-auto">
          <div className="w-16 h-16 rounded-2xl brand-gradient text-white flex items-center justify-center font-black text-2xl shadow-lg shrink-0">
            {data.user.name.charAt(0)}
          </div>
          <div className="min-w-0 text-right">
            <h3 className="text-xl font-black text-slate-900 leading-none mb-1">{data.user.name}</h3>
            <div className="flex items-center gap-2 flex-row-reverse">
              <span className="text-[10px] font-bold text-slate-500 uppercase">{data.user.role}</span>
              {data.user.hasForm101 && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black flex items-center gap-1">
                  <FileText size={10} />
                  101 תקין
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0 grid grid-cols-2 lg:grid-cols-4 gap-3 w-full xl:w-auto">
          <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-inner">
            <div className="text-[8px] font-black text-slate-400 uppercase mb-1">שעות עבודה</div>
            <div className="text-lg font-black text-slate-900 tabular-nums">{data.summary.workHours}</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-inner">
            <div className="text-[8px] font-black text-slate-400 uppercase mb-1">הדרכה</div>
            <div className="text-lg font-black text-brand tabular-nums">{data.summary.teachingHours}</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-inner">
            <div className="text-[8px] font-black text-slate-400 uppercase mb-1">בונוסים</div>
            <div className="text-lg font-black text-emerald-600 tabular-nums">{data.summary.bonuses}₪</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-inner">
            <div className="text-[8px] font-black text-slate-400 uppercase mb-1">נסיעות</div>
            <div className="text-lg font-black text-indigo-600 tabular-nums">{data.summary.travelDays}</div>
          </div>
        </div>

        <div className="min-w-0 flex flex-wrap gap-2 w-full xl:w-auto">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            className="flex-1 xl:flex-none min-w-[140px] bg-white text-slate-700 px-5 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            {isOpen ? 'סגור פירוט' : 'פתח פירוט'}
          </button>
          {data.user.hasForm101 && onDownload101 && (
            <button
              onClick={onDownload101}
              className="flex-1 xl:flex-none min-w-[64px] bg-slate-100 text-slate-700 px-5 py-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-sm"
              title="הורדת טופס 101"
            >
              <Download size={18} />
            </button>
          )}
          {onExportReport && (
            <button
              onClick={onExportReport}
              className="flex-1 xl:flex-none min-w-[140px] bg-slate-900 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
            >
              <FileSpreadsheet size={18} />
              דוח שעות
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="min-w-0 p-4 md:p-8 overflow-x-auto scroll-hint">
          {isRowClickable && data.shifts.length > 0 && (
            <div className="mb-4 text-[10px] font-black uppercase tracking-widest text-brand text-right">
              לחץ על שורה כדי לערוך את הדיווח
            </div>
          )}
          <table className="w-full text-sm text-right min-w-[600px]">
            <thead className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
              <tr>
                <th className="p-4">תאריך</th>
                <th className="p-4">משמרת</th>
                <th className="p-4 text-center">הפסקה</th>
                <th className="p-4 text-center">הדרכה</th>
                <th className="p-4 text-center">בונוס</th>
                <th className="p-4 text-left">נסיעות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.shifts.map((shift) => (
                <tr
                  key={shift.id}
                  onClick={isRowClickable ? () => onShiftClick?.(shift) : undefined}
                  className={`transition-colors ${isRowClickable ? 'cursor-pointer hover:bg-brand/5' : 'hover:bg-slate-50/50'}`}
                >
                  <td className="p-4 font-bold text-slate-700">{new Date(shift.date).toLocaleDateString('he-IL')}</td>
                  <td className="p-4 font-black tabular-nums">{shift.startTime} - {shift.endTime || '—'}</td>
                  <td className="p-4 text-center">
                    <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg font-black text-[10px]">
                      {shift.breakMinutes ?? 0} דק'
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-black text-[10px]">
                      {shift.teachingHours} ש'
                    </span>
                  </td>
                  <td className="p-4 text-center font-black text-emerald-600 tabular-nums">
                    {shift.bonuses.reduce((sum, bonus) => sum + bonus.amount, 0)}₪
                  </td>
                  <td className="p-4 text-left">
                    {shift.hasTravel ? <span className="text-indigo-600 font-black">כן</span> : <span className="text-slate-200">לא</span>}
                  </td>
                </tr>
              ))}
              {data.shifts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400 font-bold">{emptyMessage}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PayrollUserCard;
