
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../../store';
import { Availability, ChangeRequestSnapshot, ConfirmedShift, ShiftChangeRequest, UserNotification } from '../../types';
import {
  fetchMyNotifications,
  fetchMyShiftChangeRequests,
  markNotificationRead,
  submitAvailabilityChangeRequest,
  submitShiftChangeRequest,
} from '../../utils/shiftApprovalApi';
import { requiresShiftChangeApproval } from '../../utils/shiftApprovalRules';
import { Save, Calendar, Check, Clock, Sun, MessageSquare, Briefcase, Bell, X, Edit3, UserMinus } from 'lucide-react';

const AvailabilityModule: React.FC = () => {
  const { currentUser, bulkSaveAvailability, availability, confirmedShifts, clubId, applyRemoteState } = useAppStore();
  const [activeTab, setActiveTab] = useState<'availability' | 'shifts'>('availability');
  const [localAvailability, setLocalAvailability] = useState<Record<string, Partial<Availability>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [myRequests, setMyRequests] = useState<ShiftChangeRequest[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [actionShiftId, setActionShiftId] = useState<string | null>(null);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState<ConfirmedShift | null>(null);
  const [proposedStart, setProposedStart] = useState('');
  const [proposedEnd, setProposedEnd] = useState('');

  const isAvailabilitySnapshot = (
    snapshot: ChangeRequestSnapshot | null
  ): snapshot is Availability => Boolean(snapshot && 'isAvailable' in snapshot);

  const formatRequestedAvailability = (entry: Availability) => {
    if (!entry.isAvailable) return 'לא פנוי';
    if (entry.isAllDay) return 'זמין כל היום';
    return `${entry.startTime} - ${entry.endTime}`;
  };

  const isSameAvailability = (left?: Availability, right?: Availability) =>
    Boolean(left && right) &&
    left.isAvailable === right.isAvailable &&
    left.isAllDay === right.isAllDay &&
    (left.startTime || '') === (right.startTime || '') &&
    (left.endTime || '') === (right.endTime || '') &&
    (left.notes || '') === (right.notes || '');

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

  const todayKey = formatDateKey(new Date());

  const buildLocalAvailabilityState = () => {
    const initial: Record<string, Partial<Availability>> = {};
    dates.forEach(date => {
      const dStr = formatDateKey(date);
      const existing = availability.find(a => a.userId === currentUser?.id && a.date === dStr);
      const generatedId = currentUser?.id ? `${currentUser.id}-${dStr}` : undefined;
      initial[dStr] = existing || {
        id: generatedId,
        userId: currentUser?.id,
        userName: currentUser?.name,
        date: dStr,
        isAvailable: false,
        isAllDay: true,
        startTime: '08:00',
        endTime: '20:00',
        notes: ''
      };
    });
    return initial;
  };

  const myShifts = useMemo(() => {
    if (!currentUser?.id) return [];
    return confirmedShifts
      .filter((s) => s.userId === currentUser.id && s.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [confirmedShifts, currentUser?.id, todayKey]);

  const requestByShiftId = useMemo(() => {
    const map = new Map<string, ShiftChangeRequest>();
    myRequests
      .filter((r) => r.requestType !== 'availability_change')
      .forEach((r) => {
      const existing = map.get(r.shiftId);
      if (!existing || new Date(r.createdAt) > new Date(existing.createdAt)) {
        map.set(r.shiftId, r);
      }
      });
    return map;
  }, [myRequests]);

  const availabilityRequestByDate = useMemo(() => {
    const map = new Map<string, ShiftChangeRequest>();
    myRequests
      .filter((r) => r.requestType === 'availability_change')
      .forEach((r) => {
        const existing = map.get(r.originalShift.date);
        if (!existing || new Date(r.createdAt) > new Date(existing.createdAt)) {
          map.set(r.originalShift.date, r);
        }
      });
    return map;
  }, [myRequests]);

  const unreadNotifications = notifications.filter((n) => !n.isRead);

  const loadShiftData = useCallback(async () => {
    if (!currentUser) return;
    setLoadingShifts(true);
    try {
      const [requests, notifs] = await Promise.all([
        fetchMyShiftChangeRequests(clubId),
        fetchMyNotifications(clubId),
      ]);
      setMyRequests(requests);
      setNotifications(notifs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingShifts(false);
    }
  }, [clubId, currentUser]);

  useEffect(() => {
    setLocalAvailability(buildLocalAvailabilityState());
  }, [currentUser?.id, availability]);

  useEffect(() => {
    void loadShiftData();
    const interval = setInterval(() => void loadShiftData(), 15000);
    return () => clearInterval(interval);
  }, [loadShiftData]);

  const handleChange = (dateStr: string, updates: Partial<Availability>) => {
    setLocalAvailability(prev => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], ...updates }
    }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setShiftError(null);
    const userId = currentUser?.id;
    if (!currentUser || !userId) {
      setIsSaving(false);
      return;
    }
    const availsToSave = (Object.values(localAvailability) as Partial<Availability>[])
      .filter((a): a is Partial<Availability> & { userId: string; date: string } => Boolean(a.userId && a.date))
      .map(a => ({
        id: a.id || `${a.userId}-${a.date}`,
        userId: a.userId,
        userName: a.userName || currentUser?.name || '',
        date: a.date,
        isAvailable: Boolean(a.isAvailable),
        isAllDay: Boolean(a.isAllDay),
        startTime: a.startTime,
        endTime: a.endTime,
        notes: a.notes
      }))
      .filter(a => (userId ? a.userId === userId : true));

    const existingByDate = new Map(
      availability
        .filter((entry) => entry.userId === userId)
        .map((entry) => [entry.date, entry])
    );
    const directSaves: Availability[] = [];
    const approvalRequests: Availability[] = [];

    availsToSave.forEach((entry) => {
      const existing = existingByDate.get(entry.date);
      if (existing && isSameAvailability(existing, entry)) {
        return;
      }
      if (existing && requiresShiftChangeApproval(entry.date)) {
        approvalRequests.push(entry);
        return;
      }
      directSaves.push(entry);
    });

    try {
      if (directSaves.length > 0) {
        bulkSaveAvailability(directSaves);
      }

      let lastRequestResult:
        | { applied: boolean; request: ShiftChangeRequest | null; state?: Record<string, unknown>; serverVersion?: number }
        | undefined;

      for (const entry of approvalRequests) {
        lastRequestResult = await submitAvailabilityChangeRequest({
          clubId,
          availability: entry,
        });
      }

      if (approvalRequests.length > 0 && directSaves.length === 0) {
        setLocalAvailability(buildLocalAvailabilityState());
      }

      if (
        approvalRequests.length > 0 &&
        directSaves.length === 0 &&
        lastRequestResult?.state
      ) {
        applyRemoteState(lastRequestResult.state, lastRequestResult.serverVersion);
      }

      await loadShiftData();
    } catch (e) {
      setShiftError(e instanceof Error ? e.message : 'שגיאה בשליחת הזמינות');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDismissNotification = async (notification: UserNotification) => {
    try {
      await markNotificationRead(clubId, notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveRequest = async (shift: ConfirmedShift) => {
    if (!window.confirm(`לבקש הסרה מהמשמרת ב-${shift.date}?`)) return;
    setActionShiftId(shift.id);
    setShiftError(null);
    try {
      const result = await submitShiftChangeRequest({
        clubId,
        shiftId: shift.id,
        requestType: 'remove',
      });
      if (result.state) {
        applyRemoteState(result.state, result.serverVersion);
      }
      await loadShiftData();
    } catch (e) {
      setShiftError(e instanceof Error ? e.message : 'שגיאה בשליחת הבקשה');
    } finally {
      setActionShiftId(null);
    }
  };

  const handleTimeChangeRequest = async () => {
    if (!editingShift) return;
    setActionShiftId(editingShift.id);
    setShiftError(null);
    try {
      const result = await submitShiftChangeRequest({
        clubId,
        shiftId: editingShift.id,
        requestType: 'time_change',
        proposedStartTime: proposedStart,
        proposedEndTime: proposedEnd,
      });
      if (result.state) {
        applyRemoteState(result.state, result.serverVersion);
      }
      setEditingShift(null);
      await loadShiftData();
    } catch (e) {
      setShiftError(e instanceof Error ? e.message : 'שגיאה בשליחת הבקשה');
    } finally {
      setActionShiftId(null);
    }
  };

  const getShiftStatusBadge = (shiftId: string) => {
    const req = requestByShiftId.get(shiftId);
    if (!req) return null;
    if (req.status === 'pending') {
      return <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">ממתין לאישור</span>;
    }
    if (req.status === 'approved') {
      return <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">אושר</span>;
    }
    if (req.status === 'rejected') {
      return <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">נדחה</span>;
    }
    return null;
  };

  const getAvailabilityStatusBadge = (dateStr: string) => {
    const req = availabilityRequestByDate.get(dateStr);
    if (!req) return null;
    if (req.status === 'pending') {
      return <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">ממתין לאישור</span>;
    }
    if (req.status === 'approved') {
      return <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">השינוי אושר</span>;
    }
    if (req.status === 'rejected') {
      return <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">השינוי נדחה</span>;
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto pb-40 px-2 space-y-8 text-right" dir="rtl">
       {unreadNotifications.length > 0 && (
         <div className="space-y-2">
           {unreadNotifications.map((n) => (
             <div key={n.id} className="bg-brand/10 border border-brand/20 rounded-2xl p-4 flex items-start justify-between gap-3">
               <button onClick={() => void handleDismissNotification(n)} className="text-slate-400 hover:text-slate-600 p-1">
                 <X size={16} />
               </button>
               <div className="flex-1 text-right">
                 <div className="flex items-center gap-2 justify-end font-black text-brand-ocean">
                   <Bell size={16} />
                   {n.title}
                 </div>
                 <p className="text-sm font-bold text-slate-600 mt-1">{n.body}</p>
               </div>
             </div>
           ))}
         </div>
       )}

       <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
          <div className="text-right w-full">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">זמינות ומשמרות</h2>
            <p className="text-slate-600 mt-3 font-bold text-lg italic">
              {activeTab === 'availability'
                ? 'סמן ימים בהם אתה פנוי לעבודה. אחרי שבת ב-18:00, שינוי לזמינות שכבר נשלחה לשבוע הבא עובר לאישור מנהל.'
                : 'המשמרות המשובצות שלך. שינויים לשבוע הבא אחרי שבת 18:00 דורשים אישור מנהל.'}
            </p>
          </div>
          {activeTab === 'availability' && (
            <button onClick={handleSaveAll} className="w-full md:w-auto bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
               {isSaving ? <Check className="animate-bounce" /> : <Save size={24} />}
               {isSaving ? 'נשמר' : 'שלח זמינות'}
            </button>
          )}
       </header>

       <div className="bg-slate-100 p-1 rounded-2xl flex w-full max-w-md">
         <button
           onClick={() => setActiveTab('availability')}
           className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all ${
             activeTab === 'availability' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'
           }`}
         >
           <Calendar size={16} /> הגשת זמינות
         </button>
         <button
           onClick={() => setActiveTab('shifts')}
           className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all ${
             activeTab === 'shifts' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'
           }`}
         >
           <Briefcase size={16} /> המשמרות שלי
           {myRequests.some((r) => r.status === 'pending') && (
             <span className="w-2 h-2 rounded-full bg-amber-500" />
           )}
         </button>
       </div>

       {shiftError && (
         <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-2xl font-bold text-sm">
           {shiftError}
         </div>
       )}

       {activeTab === 'availability' ? (
       <div className="space-y-6">
          {dates.map(date => {
             const dateStr = formatDateKey(date);
             const data = localAvailability[dateStr] || {};
             const availabilityRequest = availabilityRequestByDate.get(dateStr);
             return (
               <div key={dateStr} className={`bg-white border-4 p-6 md:p-8 rounded-[3rem] transition-all shadow-xl group ${data.isAvailable ? 'border-brand' : 'border-slate-50 bg-slate-50/50'}`}>
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 md:gap-10">
                     <div className="flex items-center gap-4 xs:gap-6 min-w-0">
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-transform group-hover:rotate-3 shrink-0 ${data.isAvailable ? 'brand-gradient text-white' : 'bg-slate-300 text-slate-500'}`}>
                           <Calendar size={24} className="md:w-8 md:h-8" />
                        </div>
                        <div className="min-w-0">
                           <div className="text-2xl xs:text-3xl md:text-5xl font-black text-slate-900 leading-none break-words">{date.toLocaleDateString('he-IL', { weekday: 'long' })}</div>
                           <div className="text-base xs:text-lg md:text-xl font-black text-brand-dark uppercase mt-2 tracking-widest tabular-nums">{date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}</div>
                           <div className="mt-3 flex flex-wrap justify-end gap-2">
                             {getAvailabilityStatusBadge(dateStr)}
                             {requiresShiftChangeApproval(dateStr) && availability.some((entry) => entry.userId === currentUser?.id && entry.date === dateStr) && (
                               <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                                 שינוי דורש אישור
                               </span>
                             )}
                           </div>
                        </div>
                     </div>

                     <div className="flex-1 flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                           <label className="flex items-center gap-4 cursor-pointer p-4 bg-white rounded-2xl shadow-inner border border-slate-100 sm:min-w-[160px] w-full md:w-auto justify-between md:justify-start">
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

                        <div className="relative w-full">
                           <MessageSquare size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                           <input 
                              placeholder={data.isAvailable ? "הערות למנהל (אופציונלי)..." : "סיבת היעדרות / הערות..."} 
                              className={`w-full p-4 pr-12 rounded-2xl font-bold text-base text-right outline-none focus:border-brand shadow-inner transition-colors ${data.isAvailable ? 'bg-slate-50 border-2 border-slate-100' : 'bg-white border-2 border-slate-200 text-slate-500'}`}
                              value={data.notes}
                              onChange={e => handleChange(dateStr, { notes: e.target.value })}
                           />
                        </div>
                        {availabilityRequest?.status === 'pending' && isAvailabilitySnapshot(availabilityRequest.proposedShift) && (
                          <div className="text-sm font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                            שינוי מבוקש: {formatRequestedAvailability(availabilityRequest.proposedShift)}
                          </div>
                        )}
                     </div>
                  </div>
               </div>
             );
          })}
       </div>
       ) : (
         <div className="space-y-4">
           {loadingShifts && myShifts.length === 0 ? (
             <div className="text-center text-slate-400 font-bold py-16">טוען משמרות...</div>
           ) : myShifts.length === 0 ? (
             <div className="text-center border-2 border-dashed border-slate-200 rounded-3xl py-16 text-slate-400 font-bold">
               אין משמרות משובצות קרובות
             </div>
           ) : (
             myShifts.map((shift) => {
               const pending = requestByShiftId.get(shift.id)?.status === 'pending';
               const needsApproval = requiresShiftChangeApproval(shift.date);
               return (
                 <div key={shift.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                   <div className="flex flex-wrap items-start justify-between gap-4">
                     <div className="space-y-2">
                       <div className="flex items-center gap-2 flex-row-reverse justify-end">
                         {getShiftStatusBadge(shift.id)}
                         {needsApproval && !pending && (
                           <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                             דורש אישור מנהל
                           </span>
                         )}
                       </div>
                       <div className="text-2xl font-black text-slate-900">
                         {new Date(shift.date + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' })}
                       </div>
                       <div className="text-lg font-bold text-slate-600 flex items-center gap-2 flex-row-reverse justify-end">
                         <Clock size={18} className="text-slate-400" />
                         {shift.startTime} - {shift.endTime}
                       </div>
                     </div>
                     {!pending && (
                       <div className="flex flex-wrap gap-2">
                         <button
                           onClick={() => {
                             setEditingShift(shift);
                             setProposedStart(shift.startTime);
                             setProposedEnd(shift.endTime);
                           }}
                           disabled={actionShiftId === shift.id}
                           className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-black text-sm hover:bg-slate-50 disabled:opacity-50"
                         >
                           <Edit3 size={16} />
                           שינוי שעות
                         </button>
                         <button
                           onClick={() => void handleRemoveRequest(shift)}
                           disabled={actionShiftId === shift.id}
                           className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 font-black text-sm hover:bg-rose-50 disabled:opacity-50"
                         >
                           <UserMinus size={16} />
                           בקשת הסרה
                         </button>
                       </div>
                     )}
                   </div>
                 </div>
               );
             })
           )}
         </div>
       )}

       {editingShift && (
         <div className="fixed inset-0 bg-slate-900/50 z-[80] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl text-right space-y-4">
             <h3 className="text-xl font-black text-slate-900">שינוי שעות משמרת</h3>
             <p className="text-sm font-bold text-slate-500">
               {editingShift.date}
               {requiresShiftChangeApproval(editingShift.date) && ' — יישלח לאישור מנהל'}
             </p>
             <div className="flex items-center gap-2">
               <input
                 type="time"
                 value={proposedStart}
                 onChange={(e) => setProposedStart(e.target.value)}
                 className="flex-1 border border-slate-200 rounded-xl p-3 font-black"
               />
               <span className="font-black text-slate-400">עד</span>
               <input
                 type="time"
                 value={proposedEnd}
                 onChange={(e) => setProposedEnd(e.target.value)}
                 className="flex-1 border border-slate-200 rounded-xl p-3 font-black"
               />
             </div>
             <div className="flex gap-2 pt-2">
               <button
                 onClick={() => void handleTimeChangeRequest()}
                 disabled={actionShiftId === editingShift.id}
                 className="flex-1 bg-brand text-white py-3 rounded-2xl font-black disabled:opacity-50"
               >
                 שלח בקשה
               </button>
               <button
                 onClick={() => setEditingShift(null)}
                 className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-black"
               >
                 ביטול
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default AvailabilityModule;
