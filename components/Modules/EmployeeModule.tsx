
import React from 'react';
import { useAppStore } from '../../store';
import { Award, Clock, Calendar, ShieldCheck, ChevronLeft } from 'lucide-react';

const EmployeeModule: React.FC = () => {
  const { currentUser, shifts } = useAppStore();
  if (!currentUser) return null;

  const userShifts = shifts.filter(s => s.userId === currentUser.id);
  const totalHours = userShifts.reduce((acc, s) => {
    if (!s.startTime || !s.endTime) return acc;
    const [h1, m1] = s.startTime.split(':').map(Number);
    const [h2, m2] = s.endTime.split(':').map(Number);
    return acc + ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
  }, 0).toFixed(1);

  const totalTeaching = userShifts.reduce((acc, s) => acc + s.teachingHours, 0);

  return (
    <div className="space-y-8 md:space-y-12 max-w-6xl mx-auto pb-24 px-2 text-right animate-fade-in" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-10 border-b-2 border-slate-100 pb-8 md:pb-12">
        <div className="flex items-center gap-4 md:gap-8 flex-row-reverse min-w-0">
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-[2rem] brand-gradient text-white flex items-center justify-center text-4xl md:text-5xl font-black shadow-2xl shrink-0">
            {currentUser.name.charAt(0)}
          </div>
          <div className="text-right min-w-0">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight break-words">{currentUser.name}</h2>
            <div className="flex flex-wrap items-center gap-3 justify-end mt-3 md:mt-4">
               <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{currentUser.role}</span>
               <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">דף עובד אישי</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-xl flex flex-col gap-4 text-center">
           <div className="w-14 h-14 md:w-16 md:h-16 rounded-[1.5rem] bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner"><Clock size={28} className="md:w-8 md:h-8" /></div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">סה"כ שעות עבודה</p>
              <h4 className="text-3xl md:text-4xl font-black text-slate-900 tabular-nums">{totalHours}</h4>
           </div>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-xl flex flex-col gap-4 text-center">
           <div className="w-14 h-14 md:w-16 md:h-16 rounded-[1.5rem] bg-brand-light text-brand flex items-center justify-center mx-auto shadow-inner"><Award size={28} className="md:w-8 md:h-8" /></div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">שעות הדרכה</p>
              <h4 className="text-3xl md:text-4xl font-black text-slate-900 tabular-nums">{totalTeaching}</h4>
           </div>
        </div>
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-xl flex flex-col gap-4 text-center">
           <div className="w-14 h-14 md:w-16 md:h-16 rounded-[1.5rem] bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner"><Calendar size={28} className="md:w-8 md:h-8" /></div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">משמרות שבוצעו</p>
              <h4 className="text-3xl md:text-4xl font-black text-slate-900 tabular-nums">{userShifts.length}</h4>
           </div>
        </div>
      </div>

      <section className="bg-white rounded-[2.5rem] md:rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 flex-row-reverse">
          <h3 className="text-xl md:text-2xl font-black text-slate-900">היסטוריית משמרות ודיווחים</h3>
        </div>
        <div className="md:hidden p-4 space-y-4">
          {userShifts.map(shift => (
            <div key={shift.id} className="bg-slate-50 border border-slate-100 rounded-[2rem] p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-black text-slate-900">{new Date(shift.date).toLocaleDateString('he-IL')}</div>
                  <div className="text-xs font-bold text-slate-500 tabular-nums mt-1">{shift.startTime} - {shift.endTime || 'פעיל'}</div>
                </div>
                <div className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 shrink-0">
                  משמרת
                </div>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-slate-100 p-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">שעות הדרכה</p>
                  <p className="text-lg font-black text-blue-600 mt-1">{shift.teachingHours} ש'</p>
                </div>
                {currentUser.canAddBonuses && (
                  <div className="bg-white rounded-2xl border border-slate-100 p-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">בונוסים</p>
                    <p className="text-lg font-black text-emerald-600 mt-1 tabular-nums">{shift.bonuses.reduce((a, b) => a + b.amount, 0)} ₪</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">הערות</p>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed break-words">{shift.notes || '—'}</p>
              </div>
            </div>
          ))}
          {userShifts.length === 0 && (
            <div className="p-12 text-center text-slate-200 italic font-black text-xl">טרם בוצעו משמרות.</div>
          )}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-base">
            <thead className="bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="p-8">תאריך</th>
                <th className="p-8">כניסה - יציאה</th>
                <th className="p-8">הדרכה</th>
                {currentUser.canAddBonuses && <th className="p-8">בונוסים</th>}
                <th className="p-8">הערות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {userShifts.map(shift => (
                <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-8 font-black text-slate-900">{new Date(shift.date).toLocaleDateString('he-IL')}</td>
                  <td className="p-8 text-slate-600 font-bold tabular-nums">{shift.startTime} - {shift.endTime || 'פעיל'}</td>
                  <td className="p-8 text-blue-600 font-black">{shift.teachingHours} ש'</td>
                  {currentUser.canAddBonuses && (
                    <td className="p-8 text-emerald-600 font-black tabular-nums">{shift.bonuses.reduce((a,b) => a + b.amount, 0)} ₪</td>
                  )}
                  <td className="p-8 text-slate-400 text-xs italic max-w-xs truncate">{shift.notes || '—'}</td>
                </tr>
              ))}
              {userShifts.length === 0 && (
                <tr><td colSpan={currentUser.canAddBonuses ? 5 : 4} className="p-32 text-center text-slate-200 italic font-black text-2xl">טרם בוצעו משמרות.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default EmployeeModule;
