
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store';
import { ChevronRight, ChevronLeft, Grid, List, UserCheck, X, Users, CalendarDays, ExternalLink, Globe, Ticket, CreditCard, CheckCircle2, Circle, BookOpen, Anchor } from 'lucide-react';

const CalendarModule: React.FC = () => {
  const { availability, lessons, users, confirmedShifts, currentUser, updateLesson } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'weekly-grid'>('calendar');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Restricted visibility: Only Shift Managers, Shop, Managers, and Site Editors see availability
  const isManager = ['Site Editor', 'Manager', 'Shift Manager', 'Shop Computer'].includes(currentUser?.role || '');
  const canSeeAvailability = ['Site Editor', 'Manager', 'Shift Manager', 'Shop Computer'].includes(currentUser?.role || '');

  const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
  const dayNames = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const formatDateKey = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const selectedDayInfo = useMemo(() => {
    if (!selectedDay) return null;
    
    // 1. Get confirmed manual shifts
    const dayConfirmed = confirmedShifts.filter(s => s.date === selectedDay);
    
    // 2. Get active lessons for the day
    const dayLessons = lessons.filter(l => l.date === selectedDay && !l.isCancelled && !l.isArchived);
    
    // 3. Automated logic: include instructors from lessons as confirmed shifts
    const instructorIdsFromLessons = new Set<string>();
    dayLessons.forEach(l => {
      if (l.instructorId) instructorIdsFromLessons.add(l.instructorId);
    });

    // Create virtual confirmed shifts for instructors in lessons who aren't already manually confirmed
    const virtualShifts = Array.from(instructorIdsFromLessons).map(id => {
       const user = users.find(u => u.id === id);
       const alreadyManual = dayConfirmed.find(s => s.userId === id);
       
       if (user && !alreadyManual) {
          return {
             id: `auto-${id}-${selectedDay}`,
             userId: id,
             userName: user.name,
             date: selectedDay,
             startTime: 'משובץ לשיעור',
             endTime: ''
          };
       }
       return null;
    }).filter(Boolean);

    const mergedConfirmed = [...dayConfirmed, ...(virtualShifts as any)];

    const dayAvailable = availability.filter(a => a.date === selectedDay && a.isAvailable);
    
    return { 
      confirmed: mergedConfirmed, 
      lessons: dayLessons, 
      available: dayAvailable 
    };
  }, [selectedDay, confirmedShifts, lessons, availability, users]);

  return (
    <div className="h-full bg-white md:rounded-[2.5rem] md:shadow-2xl md:border border-slate-100 overflow-hidden flex flex-col text-right animate-fade-in" dir="rtl">
      <header className="p-4 xs:p-5 sm:p-6 md:p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 bg-white sticky top-0 z-10">
        <div className="w-full text-right">
           <div className="flex flex-wrap items-center gap-2 xs:gap-3 flex-row-reverse mb-1">
              <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
                {viewMode === 'calendar' ? `${monthNames[month]} ${year}` : `זמינות צוות - ${monthNames[month]}`}
              </h2>
              <div className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                 office@wind.co.il
              </div>
           </div>
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">
             {viewMode === 'calendar' ? 'תצוגת אירועים ושיעורים' : 'תצוגת כוח אדם וזמינות'}
           </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
           {isManager && (
             <div className="bg-slate-100 p-1 rounded-2xl flex shadow-inner w-full sm:w-auto">
                <button onClick={() => setViewMode('calendar')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black transition-all ${viewMode === 'calendar' ? 'bg-white shadow-md text-slate-900 border border-slate-200' : 'text-slate-400'}`}>
                   <List size={16} /> יומן
                </button>
                <button onClick={() => setViewMode('weekly-grid')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black transition-all ${viewMode === 'weekly-grid' ? 'bg-white shadow-md text-slate-900 border border-slate-200' : 'text-slate-400'}`}>
                   <Grid size={16} /> זמינות
                </button>
             </div>
           )}

           <div className="flex gap-2 w-full sm:w-auto justify-center">
             <button onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentDate(newDate);
             }} className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-90"><ChevronRight size={20}/></button>
             <button onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentDate(newDate);
             }} className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-90"><ChevronLeft size={20}/></button>
           </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
          {dayNames.map(d => (
            <div key={d} className="p-2 sm:p-4 text-center text-[9px] xs:text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 bg-slate-200 gap-[1px]">
          {blanks.map(b => <div key={`blank-${b}`} className="bg-slate-50/50 min-h-[96px] xs:min-h-[110px] md:min-h-[160px]"></div>)}
          {days.map(d => {
             const date = new Date(year, month, d);
             const dStr = formatDateKey(date);
             
             // Count day's manual and automated (from lessons) confirmed staff
             const dayLessons = lessons.filter(l => l.date === dStr && !l.isCancelled && !l.isArchived);
             const manualStaffIds = confirmedShifts.filter(s => s.date === dStr).map(s => s.userId);
             const lessonInstructorIds = dayLessons.map(l => l.instructorId).filter(Boolean) as string[];
             
             const uniqueActiveStaffIds = new Set([...manualStaffIds, ...lessonInstructorIds]);
             const countActive = uniqueActiveStaffIds.size;
             const countLessons = dayLessons.length;
             
             const availableStaff = availability
                .filter(a => a.date === dStr && a.isAvailable)
                .map(a => users.find(u => u.id === a.userId))
                .filter(Boolean);

             const isToday = formatDateKey(new Date()) === dStr;
             
             return (
               <div 
                 key={d} 
                 onClick={() => setSelectedDay(dStr)}
                 className={`bg-white min-h-[96px] xs:min-h-[110px] md:min-h-[160px] p-1.5 xs:p-2 md:p-3 cursor-pointer hover:bg-slate-50 transition-all flex flex-col relative group ${isToday ? 'ring-2 ring-brand ring-inset' : ''}`}>
                  <div className="flex justify-between items-start flex-row-reverse mb-2">
                     <span className={`text-xs xs:text-sm md:text-lg font-black w-6 h-6 xs:w-7 xs:h-7 md:w-9 md:h-9 flex items-center justify-center rounded-lg xs:rounded-xl ${isToday ? 'bg-brand text-white shadow-lg' : 'text-slate-800'}`}>{d}</span>
                  </div>
                  
                  {viewMode === 'weekly-grid' && canSeeAvailability ? (
                    <div className="mt-1 flex flex-col gap-1 overflow-y-auto max-h-[72px] xs:max-h-[84px] md:max-h-[100px] custom-scrollbar pr-1">
                        {availableStaff.map((u) => (
                            <div key={u?.id} className="text-[9px] xs:text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg border border-indigo-100 truncate text-right shadow-sm" title={u?.name}>
                                {u?.name}
                            </div>
                        ))}
                        {availableStaff.length === 0 && <div className="text-[9px] text-slate-300 font-bold text-center mt-2 italic">אין זמינות</div>}
                    </div>
                  ) : (
                    <div className="mt-auto flex flex-col gap-1 overflow-y-auto max-h-[72px] xs:max-h-[84px] md:max-h-[100px] custom-scrollbar pr-1">
                        {dayLessons.slice(0, 3).map(lesson => (
                          <div key={lesson.id} className="text-[9px] xs:text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-100 truncate text-right shadow-sm" title={`${lesson.clientName} • ${lesson.time}`}>
                            {lesson.clientName}
                          </div>
                        ))}
                        {countLessons > 3 && (
                          <div className="text-[9px] xs:text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-lg border border-blue-200 text-right shadow-sm">
                            +{countLessons - 3} שיעורים
                          </div>
                        )}
                        {countActive > 0 && (
                          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm w-full">
                            <CheckCircle2 size={14} className="shrink-0" strokeWidth={2.5} />
                            <span className="text-[9px] xs:text-[10px] font-black">{countActive} במשמרת</span>
                          </div>
                        )}
                        {countLessons === 0 && countActive === 0 && (
                          <div className="text-[9px] text-slate-300 font-bold text-center mt-2 italic">אין פעילות</div>
                        )}
                    </div>
                  )}
               </div>
             );
          })}
        </div>
      </div>

      {selectedDay && selectedDayInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-2 xs:p-3 sm:p-4 animate-fade-in" onClick={() => setSelectedDay(null)}>
          <div className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[3rem] shadow-2xl p-4 xs:p-5 sm:p-6 md:p-12 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-start gap-4 mb-6 sm:mb-8 flex-row-reverse">
                <div className="text-right">
                   <h3 className="text-xl xs:text-2xl sm:text-3xl font-black text-slate-900 leading-tight">פירוט יום {new Date(selectedDay).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                </div>
                <button onClick={() => setSelectedDay(null)} className="p-2.5 sm:p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-900 transition-all shrink-0"><X size={24} className="sm:w-7 sm:h-7" /></button>
             </div>

             <div className="space-y-6 sm:space-y-8 md:space-y-10 text-right">
                {/* Available Staff - Limited Visibility */}
                {canSeeAvailability && (
                  <div className="space-y-4">
                     <h4 className="text-lg font-black text-emerald-700 flex items-center gap-2 flex-row-reverse">
                        <UserCheck size={20} className="text-emerald-500" /> עובדים שזמינים ביום זה
                     </h4>
                     <div className="flex flex-wrap gap-2 justify-end">
                        {selectedDayInfo.available.map(a => (
                           <div key={a.userId} className="bg-emerald-50 border border-emerald-100 px-3 sm:px-4 py-2 rounded-xl text-emerald-900 font-bold text-xs sm:text-sm flex flex-col items-center w-full xs:w-auto">
                              <span>{a.userName}</span>
                              {!a.isAllDay && <span className="text-[10px] opacity-70">{a.startTime}-{a.endTime}</span>}
                           </div>
                        ))}
                        {selectedDayInfo.available.length === 0 && <p className="text-slate-400 italic font-bold text-sm">אף עובד לא סימן זמינות.</p>}
                     </div>
                  </div>
                )}

                {/* Confirmed Staff - Includes Lesson Instructors automatically */}
                <div className="space-y-4 pt-6 border-t border-slate-100">
                   <h4 className="text-lg font-black text-brand-ocean flex items-center gap-2 flex-row-reverse">
                      <CheckCircle2 size={20} className="text-brand" /> משמרות בפועל (כולל משובצים לשיעורים)
                   </h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedDayInfo.confirmed.map(s => (
                        <div key={s.id} className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col xs:flex-row xs:items-center justify-between gap-2 flex-row-reverse">
                           <span className="font-black text-indigo-900 text-sm sm:text-base">{s.userName}</span>
                           <span className={`text-[10px] font-black px-2 py-1 rounded-lg shadow-sm border tabular-nums ${s.startTime === 'משובץ לשיעור' ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-white border-indigo-200'}`}>
                              {s.startTime === 'משובץ לשיעור' ? s.startTime : `${s.startTime}-${s.endTime}`}
                           </span>
                        </div>
                      ))}
                      {selectedDayInfo.confirmed.length === 0 && <p className="text-slate-400 italic font-bold text-sm">אין משמרות או שיעורים ליום זה.</p>}
                   </div>
                </div>

                {/* Daily Lessons List */}
                <div className="space-y-4 pt-6 border-t border-slate-100">
                   <h4 className="text-lg font-black text-slate-900 flex items-center gap-2 flex-row-reverse">
                      <CalendarDays size={20} className="text-blue-500" /> לו"ז שיעורים
                   </h4>
                   <div className="space-y-6">
                      {selectedDayInfo.lessons.map(l => (
                        <div key={l.id} className="bg-slate-50 border border-slate-100 p-4 xs:p-5 sm:p-6 rounded-[2rem] flex flex-col gap-4 text-right shadow-sm hover:shadow-md transition-shadow">
                           <div className="flex flex-col gap-4">
                              <div className="flex flex-col xs:flex-row xs:items-center gap-4 flex-row-reverse">
                                 <div className="w-full xs:w-24 text-center font-black text-slate-900 tabular-nums text-lg xs:text-xl flex flex-col bg-white p-2 rounded-2xl shadow-inner border border-slate-100 shrink-0">
                                    <span>{l.time}</span>
                                    {l.endTime && <span className="text-[10px] text-brand-ocean opacity-60">עד {l.endTime}</span>}
                                 </div>
                                 <div className="text-right min-w-0 flex-1">
                                    <div className="font-black text-slate-800 text-lg xs:text-xl leading-tight">{l.clientName}</div>
                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{l.type} • {l.pathType === 'Single' ? 'שיעור פרטי' : (l.pathType === 'Trial' ? 'שיעור ניסיון' : l.pathType)}</div>
                                 </div>
                              </div>

                              <div className="flex flex-col items-stretch xs:items-end gap-3 shrink-0">
                                 <div className="flex flex-col xs:flex-row gap-2 justify-end">
                                    <button 
                                      onClick={() => updateLesson({ ...l, isRegistered: !l.isRegistered })}
                                      className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black transition-all border ${l.isRegistered ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}
                                    >
                                       {l.isRegistered ? <CheckCircle2 size={14}/> : <Circle size={14}/>} הצהרת בריאות
                                    </button>
                                    <button 
                                      onClick={() => updateLesson({ ...l, isPaid: !l.isPaid })}
                                      className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black transition-all border ${l.isPaid ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}
                                    >
                                       {l.isPaid ? <CheckCircle2 size={14}/> : <Circle size={14}/>} שולם
                                    </button>
                                 </div>
                              </div>
                           </div>
                           <div className="flex flex-col gap-3 xs:flex-row xs:justify-between xs:items-center border-t border-slate-200/50 pt-4">
                              <div className="text-[11px] xs:text-[12px] font-black text-slate-500 tabular-nums bg-white px-3 py-1 rounded-lg w-full xs:w-auto">
                                 שיעור <span className="text-brand">#{l.lessonNumber}</span> | טלפון: <a href={`tel:${l.phone}`} className="hover:text-brand transition-colors">{l.phone}</a>
                              </div>
                              {l.instructorId && (
                                <div className="text-[11px] font-black bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 w-full xs:w-auto justify-center xs:justify-start">
                                   <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                   מדריך: {users.find(u => u.id === l.instructorId)?.name}
                                </div>
                              )}
                           </div>
                        </div>
                      ))}
                      {selectedDayInfo.lessons.length === 0 && (
                        <div className="py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] text-slate-300 font-black italic text-xl">אין שיעורים משובצים ליום זה.</div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarModule;
