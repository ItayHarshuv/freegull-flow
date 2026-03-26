
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store';
import { ActiveShift, BonusItem } from '../../types';
import { Clock, LogOut, Car, Star, PauseCircle, PlayCircle, TimerReset } from 'lucide-react';

const getDisplayedBreakMinutes = (activeShift: ActiveShift | null, now: number) => {
  const accumulated = activeShift?.accumulatedBreakMinutes ?? 0;
  if (!activeShift?.isOnBreak || !activeShift?.breakStartedAt) {
    return accumulated;
  }
  return accumulated + Math.max(0, Math.round((now - new Date(activeShift.breakStartedAt).getTime()) / 60000));
};

const formatBreakStartTime = (activeShift: ActiveShift | null) => {
  if (!activeShift?.breakStartedAt) {
    return activeShift?.startTime ?? '';
  }
  return new Date(activeShift.breakStartedAt).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const DailyWorkModule: React.FC = () => {
  const { activeShift, startShift, updateActiveShift, startBreak, endBreak, endShift } = useAppStore();
  const [bonuses, setBonuses] = useState<BonusItem[]>([]);
  const [newBonus, setNewBonus] = useState({ clientName: '', item: '', amount: '' });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!activeShift?.isOnBreak) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeShift?.isOnBreak]);

  const displayedBreakMinutes = activeShift ? getDisplayedBreakMinutes(activeShift, now) : 0;
  const teachingHours = activeShift?.teachingHours ?? 0;
  const notes = activeShift?.notes ?? '';
  const hasTravel = activeShift?.hasTravel ?? false;

  const handleAddBonus = () => {
    if (!newBonus.clientName || !newBonus.amount) return;
    setBonuses([...bonuses, {
      id: Math.random().toString(36).substr(2, 9),
      clientName: newBonus.clientName,
      item: newBonus.item,
      amount: Number(newBonus.amount)
    }]);
    setNewBonus({ clientName: '', item: '', amount: '' });
  };

  const handleClockOut = () => {
    if (!activeShift) return;
    endShift({ 
      teachingHours, 
      notes, 
      hasTravel, 
      bonuses 
    });
    setBonuses([]);
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl mx-auto px-1 animate-fade-in" dir="rtl">
      <div className="brand-gradient rounded-[2.5rem] md:rounded-[3rem] p-6 sm:p-8 md:p-10 text-white relative shadow-2xl overflow-hidden">
        <div className="relative z-10">
           <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">יום עבודה פעיל</h2>
           <p className="text-white/70 font-bold uppercase tracking-widest text-xs mt-2">דיווח שעות, הדרכות ומכירות בזמן אמת</p>
           
           <div className="flex flex-col sm:flex-row gap-4 mt-8">
             {!activeShift ? (
               <button onClick={startShift} className="w-full sm:w-auto bg-white text-brand-ocean px-6 sm:px-10 py-4 sm:py-5 rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95">
                 <Clock size={24} strokeWidth={3} /> פתח שעון נוכחות
               </button>
             ) : (
              <div className={`w-full sm:w-auto px-5 sm:px-6 py-4 rounded-2xl flex flex-wrap items-center gap-3 sm:gap-4 backdrop-blur-md ${
                activeShift.isOnBreak
                  ? 'bg-amber-300/25 border border-amber-200/50 text-amber-50'
                  : 'bg-emerald-400/20 border border-emerald-400/30 text-emerald-100'
              }`}>
                  <div className={`w-2.5 h-2.5 rounded-full animate-ping ${activeShift.isOnBreak ? 'bg-amber-200' : 'bg-emerald-400'}`} />
                  <span className="font-black text-base sm:text-lg break-words">
                    {activeShift.isOnBreak ? 'יציאה להפסקה מ-' : 'משמרת פעילה מ-'}
                    {activeShift.isOnBreak ? formatBreakStartTime(activeShift) : activeShift.startTime}
                  </span>
               </div>
             )}
           </div>
        </div>
      </div>

      {activeShift && (
        <div className="space-y-6 md:space-y-8 pb-20">
           <section className="bg-white p-6 sm:p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border-2 border-slate-100 shadow-xl space-y-6">
              <div className="text-right">
                 <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 flex-row-reverse">
                    <TimerReset className="text-brand" /> הפסקות במהלך המשמרת
                 </h3>
                 <p className="text-slate-500 font-bold text-sm mt-2">
                   המשמרת נשארת פעילה בזמן הפסקה, והמערכת שומרת את סך הדקות בסיום.
                 </p>
              </div>

              <div className="flex flex-col xs:flex-row items-center justify-between gap-4 xs:gap-6 bg-slate-50 p-4 sm:p-6 rounded-3xl border-2 border-slate-100 shadow-inner">
                 <button
                   onClick={activeShift.isOnBreak ? endBreak : startBreak}
                   className={`w-full xs:w-auto px-6 sm:px-8 py-4 rounded-2xl font-black text-base sm:text-lg transition-all active:scale-95 flex items-center justify-center gap-3 shrink-0 ${
                     activeShift.isOnBreak
                       ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                       : 'bg-amber-500 text-white hover:bg-amber-600'
                   }`}
                 >
                   {activeShift.isOnBreak ? <PlayCircle size={24} className="shrink-0" /> : <PauseCircle size={24} className="shrink-0" />}
                   {activeShift.isOnBreak ? 'חזרה למשמרת' : 'יציאה להפסקה'}
                 </button>

                 <div className="flex flex-col items-center">
                    <span className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tabular-nums leading-none">{displayedBreakMinutes}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">דקות הפסקה סה"כ במשמרת הנוכחית</span>
                 </div>
              </div>
           </section>

           <section className="bg-white p-6 sm:p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border-2 border-slate-100 shadow-xl space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 flex-row-reverse">
                 <Star className="text-brand" /> שעות הדרכה בפועל
              </h3>
              <div className="flex flex-col xs:flex-row items-center justify-between gap-4 xs:gap-6 bg-slate-50 p-4 sm:p-6 rounded-3xl border-2 border-slate-100 shadow-inner">
                 <button onClick={() => updateActiveShift({ teachingHours: Math.max(0, teachingHours - 0.25) })} className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl shadow-md font-black text-xl sm:text-2xl hover:bg-slate-50 border border-slate-100 active:scale-90 transition-all shrink-0">—</button>
                 <div className="flex flex-col items-center">
                    <span className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tabular-nums leading-none">{teachingHours.toFixed(2)}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">שעות הדרכה</span>
                 </div>
                 <button onClick={() => updateActiveShift({ teachingHours: teachingHours + 0.25 })} className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl shadow-md font-black text-xl sm:text-2xl hover:bg-slate-50 border border-slate-100 active:scale-90 transition-all shrink-0">+</button>
              </div>
           </section>

           <section className="bg-white p-6 sm:p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border-2 border-slate-100 shadow-xl space-y-6 md:space-y-8">
              <div className="flex flex-col md:flex-row gap-8">
                 <div className="flex-1 space-y-4">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mr-2">הערות למנהל</label>
                    <textarea 
                      className="w-full p-4 sm:p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold text-right shadow-inner min-h-[120px] outline-none focus:border-brand" 
                      placeholder="פרט כאן הערות מיוחדות לגבי היום..." 
                      value={notes} 
                      onChange={e => updateActiveShift({ notes: e.target.value })}
                    />
                 </div>
                 <div className="w-full md:w-64 space-y-4">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mr-2">תשלום נסיעות</label>
                    <button 
                      onClick={() => updateActiveShift({ hasTravel: !hasTravel })}
                      className={`w-full flex items-center justify-between gap-4 p-4 sm:p-6 rounded-[2rem] border-4 transition-all ${hasTravel ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                    >
                       <span className="font-black text-base sm:text-lg">תשלום נסיעות</span>
                       <Car size={24} className={hasTravel ? 'text-white' : 'text-slate-300'} />
                    </button>
                 </div>
              </div>

              <button 
                onClick={handleClockOut} 
                className="w-full bg-rose-600 text-white py-5 sm:py-8 rounded-[2.5rem] font-black text-lg sm:text-2xl uppercase tracking-[0.1em] shadow-2xl hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-3 sm:gap-4"
              >
                <LogOut size={28} className="shrink-0" /> סיום משמרת ודיווח
              </button>
           </section>
        </div>
      )}
    </div>
  );
};

export default DailyWorkModule;
