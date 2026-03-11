
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
    <div className="space-y-12 max-w-6xl mx-auto pb-24 text-right animate-fade-in" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b-2 border-slate-100 pb-12">
        <div className="flex items-center gap-8 flex-row-reverse">
          <div className="w-28 h-28 rounded-[2rem] brand-gradient text-white flex items-center justify-center text-5xl font-black shadow-2xl shrink-0">
            {currentUser.name.charAt(0)}
          </div>
          <div className="text-right">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">{currentUser.name}</h2>
            <div className="flex items-center gap-3 justify-end mt-4">
               <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{currentUser.role}</span>
               <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">דף עובד אישי</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col gap-4 text-center">
           <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner"><Clock size={32} /></div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">סה"כ שעות עבודה</p>
              <h4 className="text-4xl font-black text-slate-900 tabular-nums">{totalHours}</h4>
           </div>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col gap-4 text-center">
           <div className="w-16 h-16 rounded-[1.5rem] bg-brand-light text-brand flex items-center justify-center mx-auto shadow-inner"><Award size={32} /></div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">שעות הדרכה</p>
              <h4 className="text-4xl font-black text-slate-900 tabular-nums">{totalTeaching}</h4>
           </div>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col gap-4 text-center">
           <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner"><Calendar size={32} /></div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">משמרות שבוצעו</p>
              <h4 className="text-4xl font-black text-slate-900 tabular-nums">{userShifts.length}</h4>
           </div>
        </div>
      </div>

      <section className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 flex-row-reverse">
          <h3 className="text-2xl font-black text-slate-900">היסטוריית משמרות ודיווחים</h3>
        </div>
        <div className="overflow-x-auto">
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
