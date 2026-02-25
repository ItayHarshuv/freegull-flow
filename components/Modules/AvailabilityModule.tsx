
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { Availability } from '../../types';
import { Save, Calendar, Check, Clock, Sun, MessageSquare } from 'lucide-react';

const AvailabilityModule: React.FC = () => {
  const { currentUser, bulkSaveAvailability, availability } = useAppStore();
  const [localAvailability, setLocalAvailability] = useState<Record<string, Partial<Availability>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const formatDateKey = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    const initial: Record<string, Partial<Availability>> = {};
    dates.forEach(date => {
      const dStr = formatDateKey(date);
      const existing = availability.find(a => a.userId === currentUser?.id && a.date === dStr);
      initial[dStr] = existing || {
        userId: currentUser?.id,
        userName: currentUser?.name,
        date: dStr,
        isAvailable: false,
        isAllDay: true, 
        startTime: '08:00',
        endTime: '17:00',
        notes: ''
      };
    });
    setLocalAvailability(initial);
  }, [currentUser?.id, availability]);

  const handleChange = (dateStr: string, updates: Partial<Availability>) => {
    setLocalAvailability(prev => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], ...updates }
    }));
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    // Fixed: Explicitly cast to Partial<Availability>[] to prevent 'unknown' type errors in .filter()
    const availsToSave = (Object.values(localAvailability) as Partial<Availability>[])
      .filter(a => a.userId && a.date) as Availability[];
    bulkSaveAvailability(availsToSave);
    setTimeout(() => setIsSaving(false), 800);
  };

  return (
    <div className="max-w-6xl mx-auto pb-40 px-2 space-y-12 text-right" dir="rtl">
       <header className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-200 pb-10">
          <div className="text-right w-full">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">הגשת זמינות צוות</h2>
            <p className="text-slate-600 mt-3 font-bold text-lg italic">סמן ימים בהם אתה פנוי לעבודה. ניתן להוסיף הערות גם לימי חופש.</p>
          </div>
          <button onClick={handleSaveAll} className="w-full md:w-auto bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
             {isSaving ? <Check className="animate-bounce" /> : <Save size={24} />}
             {isSaving ? 'נשמר' : 'שלח זמינות'}
          </button>
       </header>

       <div className="space-y-6">
          {dates.map(date => {
             const dateStr = formatDateKey(date);
             const data = localAvailability[dateStr] || {};
             return (
               <div key={dateStr} className={`bg-white border-4 p-6 md:p-8 rounded-[3rem] transition-all shadow-xl group ${data.isAvailable ? 'border-brand' : 'border-slate-50 bg-slate-50/50'}`}>
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 md:gap-10">
                     
                     {/* Date Column */}
                     <div className="flex items-center gap-6 min-w-[200px]">
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-transform group-hover:rotate-3 shrink-0 ${data.isAvailable ? 'brand-gradient text-white' : 'bg-slate-300 text-slate-500'}`}>
                           <Calendar size={24} className="md:w-8 md:h-8" />
                        </div>
                        <div>
                           <div className="text-4xl md:text-5xl font-black text-slate-900 leading-none">{date.toLocaleDateString('he-IL', { weekday: 'long' })}</div>
                           <div className="text-lg md:text-xl font-black text-brand-dark uppercase mt-2 tracking-widest tabular-nums">{date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}</div>
                        </div>
                     </div>

                     {/* Controls Column */}
                     <div className="flex-1 flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                           <label className="flex items-center gap-4 cursor-pointer p-4 bg-white rounded-2xl shadow-inner border border-slate-100 min-w-[160px] w-full md:w-auto justify-between md:justify-start">
                              <span className={`font-black text-2xl ${data.isAvailable ? 'text-slate-900' : 'text-slate-400'}`}>{data.isAvailable ? 'אני זמין' : 'לא פנוי'}</span>
                              <input type="checkbox" checked={data.isAvailable} onChange={e => handleChange(dateStr, { isAvailable: e.target.checked })} className="w-10 h-10 border-4 border-slate-200 rounded-xl checked:bg-brand appearance-none cursor-pointer transition-all" />
                           </label>
                           
                           {data.isAvailable && (
                             <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto animate-fade-in">
                               <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 rounded-2xl border border-slate-100 w-full md:w-auto">
                                  <input type="checkbox" checked={data.isAllDay} onChange={e => handleChange(dateStr, { isAllDay: e.target.checked })} className="w-6 h-6 rounded-lg accent-brand" />
                                  <span className="font-black text-sm flex items-center gap-2">יום מלא <Sun size={14}/></span>
                               </label>

                               {!data.isAllDay && (
                                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 bg-slate-100 p-2 sm:p-2 rounded-2xl border border-slate-200 animate-fade-in w-full md:w-auto">
                                     <input 
                                        type="time" 
                                        className="bg-white sm:bg-transparent border sm:border-0 border-slate-200 rounded-xl sm:rounded-none shadow-sm sm:shadow-none font-black text-lg p-2 outline-none w-[45%] sm:w-auto text-center tabular-nums" 
                                        value={data.startTime} 
                                        onChange={e => handleChange(dateStr, { startTime: e.target.value })} 
                                     />
                                     <span className="font-black text-slate-400 text-sm">עד</span>
                                     <input 
                                        type="time" 
                                        className="bg-white sm:bg-transparent border sm:border-0 border-slate-200 rounded-xl sm:rounded-none shadow-sm sm:shadow-none font-black text-lg p-2 outline-none w-[45%] sm:w-auto text-center tabular-nums" 
                                        value={data.endTime} 
                                        onChange={e => handleChange(dateStr, { endTime: e.target.value })} 
                                     />
                                     <Clock className="text-slate-400 mr-2 hidden sm:block" size={20} />
                                  </div>
                               )}
                             </div>
                           )}
                        </div>

                        {/* Notes Input - Always Visible */}
                        <div className="relative w-full">
                           <MessageSquare size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                           <input 
                              placeholder={data.isAvailable ? "הערות למנהל (אופציונלי)..." : "סיבת היעדרות / הערות..."} 
                              className={`w-full p-4 pr-12 rounded-2xl font-bold text-base text-right outline-none focus:border-brand shadow-inner transition-colors ${data.isAvailable ? 'bg-slate-50 border-2 border-slate-100' : 'bg-white border-2 border-slate-200 text-slate-500'}`}
                              value={data.notes}
                              onChange={e => handleChange(dateStr, { notes: e.target.value })}
                           />
                        </div>
                     </div>
                  </div>
               </div>
             );
          })}
       </div>
    </div>
  );
};

export default AvailabilityModule;
