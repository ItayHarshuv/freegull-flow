
import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { Shift, BonusItem } from '../../types';
import { Plus, Minus, Download, Edit2, Clock, DollarSign, Save, LogOut, X, Car, Check, Trash2 } from 'lucide-react';

const HRModule: React.FC = () => {
  const { shifts, currentUser, activeShift, startShift, endShift, updateShift } = useAppStore();
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);

  // New Shift State (for the current session)
  const [teachingHours, setTeachingHours] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [bonuses, setBonuses] = useState<BonusItem[]>([]);
  const [newBonus, setNewBonus] = useState({ clientName: '', item: '', amount: '' });

  const handleAddBonus = () => {
    if (!newBonus.clientName || !newBonus.amount) return;
    const item: BonusItem = {
      id: Math.random().toString(36).substr(2, 9),
      clientName: newBonus.clientName,
      item: newBonus.item,
      amount: Number(newBonus.amount),
    };
    setBonuses([...bonuses, item]);
    setNewBonus({ clientName: '', item: '', amount: '' });
  };

  const handleClockOutAction = () => {
    if (!activeShift) return;
    
    endShift({
      teachingHours,
      bonuses,
      notes,
      hasTravel: false,
    });
    
    // Reset local component state
    setTeachingHours(0);
    setBonuses([]);
    setNotes('');
  };

  const handleSaveEditedShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;
    updateShift(editingShift);
    setEditingShift(null);
  };

  const exportToExcel = () => {
    const headers = ['תאריך', 'שם עובד', 'כניסה', 'יציאה', 'שעות הדרכה', 'בונוסים', 'הערות'];
    const rows = shifts.map(s => [
      new Date(s.date).toLocaleDateString(),
      s.userName,
      s.startTime,
      s.endTime,
      s.teachingHours,
      s.bonuses.reduce((acc, b) => acc + b.amount, 0),
      s.notes
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "shifts_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerPicker = (ref: React.RefObject<HTMLInputElement>) => {
    if (ref.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype) {
          ref.current.showPicker();
        } else {
          ref.current.focus();
          ref.current.click();
        }
      } catch (e) {
        ref.current.focus();
        ref.current.click();
      }
    }
  };

  const userShifts = currentUser?.role === 'Site Editor' || currentUser?.role === 'Manager' 
    ? shifts 
    : shifts.filter(s => s.userId === currentUser?.id);

  return (
    <div className="space-y-8 md:space-y-12 max-w-6xl mx-auto text-right">
      <header className="flex flex-col md:flex-row-reverse justify-between items-start md:items-center gap-6 px-1">
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">שעון נוכחות ודיווח</h2>
          <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-2">מעקב שעות, הדרכות ובונוסים</p>
        </div>
        <button onClick={exportToExcel} className="bg-emerald-50 text-emerald-700 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 border border-emerald-200 transition-all shadow-lg flex items-center gap-3 active:scale-95">
          <Download size={20} />
          <span>ייצוא דוח שעות</span>
        </button>
      </header>

      {/* Clock In/Out Section */}
      <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden relative mx-1">
        {!activeShift ? (
          <div className="text-center py-10 space-y-8">
            <button 
              onClick={startShift}
              className="group bg-blue-600 text-white w-48 h-48 md:w-64 md:h-64 rounded-full text-2xl font-black shadow-2xl hover:bg-blue-700 hover:scale-105 transition-all flex flex-col items-center justify-center gap-4 mx-auto relative overflow-hidden active:scale-95"
            >
              <div className="absolute inset-0 bg-white/10 scale-0 group-hover:scale-150 transition-transform duration-700 rounded-full" />
              <Clock size={56} className="relative z-10" strokeWidth={3} />
              <span className="relative z-10 uppercase tracking-widest">כניסה</span>
            </button>
            <p className="text-slate-600 font-bold text-sm uppercase tracking-widest">לחץ לכניסה למשמרת חדשה</p>
          </div>
        ) : (
          <div className="space-y-10 animate-fade-in">
             <div className="flex items-center justify-between bg-blue-50/50 p-6 rounded-[2rem] border border-blue-200/50 flex-row-reverse shadow-inner">
                <div className="flex items-center gap-4 flex-row-reverse">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
                    <div>
                      <span className="font-black text-brand-ocean block">משמרת פעילה - {currentUser?.name}</span>
                      <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">התחלת ב-{activeShift?.startTime}</span>
                    </div>
                </div>
                <div className="text-2xl font-black tabular-nums text-brand-ocean">
                  {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </div>
             </div>

             <div className="grid md:grid-cols-2 gap-10 text-right">
                <div className="space-y-4">
                   <label className="block text-[11px] font-black text-slate-600 uppercase tracking-widest mr-2">שעות הדרכה בפועל</label>
                   <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
                      <button onClick={() => setTeachingHours(Math.max(0, teachingHours - 0.5))} className="w-14 h-14 bg-white border border-slate-200 rounded-xl shadow-md text-slate-900 font-black text-xl flex items-center justify-center hover:bg-slate-50 active:scale-90 transition-all">—</button>
                      <span className="text-4xl font-black text-slate-900 tabular-nums">{teachingHours}</span>
                      <button onClick={() => setTeachingHours(teachingHours + 0.5)} className="w-14 h-14 bg-white border border-slate-200 rounded-xl shadow-md text-slate-900 font-black text-xl flex items-center justify-center hover:bg-slate-50 active:scale-90 transition-all">+</button>
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="block text-[11px] font-black text-slate-600 uppercase tracking-widest mr-2">הערות למנהל המועדון</label>
                   <textarea 
                      className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 text-right shadow-inner min-h-[120px] placeholder:text-slate-400"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="היה יום עמוס במיוחד בגלל הים הגבוה..."
                   />
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex items-center justify-between flex-row-reverse mr-2">
                   <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest">מכירות ובונוסים</label>
                   <DollarSign size={18} className="text-emerald-600" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-row-reverse">
                   <input placeholder="שם הלקוח" className="p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm text-right shadow-inner placeholder:text-slate-400" value={newBonus.clientName} onChange={e => setNewBonus({...newBonus, clientName: e.target.value})} />
                   <input placeholder="מה נמכר?" className="p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm text-right shadow-inner placeholder:text-slate-400" value={newBonus.item} onChange={e => setNewBonus({...newBonus, item: e.target.value})} />
                   <input placeholder="סכום (₪)" type="number" className="p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm text-right shadow-inner placeholder:text-slate-400" value={newBonus.amount} onChange={e => setNewBonus({...newBonus, amount: e.target.value})} />
                   <button onClick={handleAddBonus} className="bg-slate-900 text-white p-4 rounded-xl hover:bg-black transition-all font-black uppercase text-xs tracking-widest active:scale-95">הוסף בונוס</button>
                </div>
                
                {bonuses.length > 0 && (
                  <div className="bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-200 shadow-inner">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-4 text-right">לקוח</th>
                          <th className="p-4 text-right">פריט</th>
                          <th className="p-4 text-right">סכום</th>
                          <th className="p-4 text-left">פעולה</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {bonuses.map((b, idx) => (
                          <tr key={b.id}>
                            <td className="p-4 font-bold text-slate-900">{b.clientName}</td>
                            <td className="p-4 text-slate-700">{b.item}</td>
                            <td className="p-4 font-black text-emerald-700 tabular-nums">{b.amount} ₪</td>
                            <td className="p-4 text-left">
                               <button onClick={() => setBonuses(bonuses.filter((_, i) => i !== idx))} className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg"><Trash2 size={16}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
             </div>

             <div className="flex justify-end pt-10 border-t border-slate-100">
                <button 
                  onClick={handleClockOutAction}
                  className="w-full md:w-auto bg-rose-600 text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-rose-700 shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <LogOut size={20} />
                  סגור משמרת ושלח דוח
                </button>
             </div>
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden mx-1">
        <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-100/50 flex justify-between items-center flex-row-reverse">
           <div className="flex items-center gap-3 flex-row-reverse text-slate-900 font-black">
              היסטוריית משמרות
           </div>
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{userShifts.length} רשומות במערכת</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
               <tr>
                 <th className="p-6">תאריך</th>
                 <th className="p-6">עובד</th>
                 <th className="p-6">שעות</th>
                 <th className="p-6">הדרכה</th>
                 <th className="p-6">בונוס</th>
                 <th className="p-6 text-left">פעולות</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userShifts.map(shift => (
                <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6 font-black text-slate-900 tabular-nums">{new Date(shift.date).toLocaleDateString('he-IL')}</td>
                  <td className="p-6">
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px] shrink-0">{shift.userName.charAt(0)}</div>
                      <span className="font-black text-slate-900">{shift.userName}</span>
                    </div>
                  </td>
                  <td className="p-6 font-black text-slate-700 tabular-nums">{shift.startTime} - {shift.endTime || 'פעיל'}</td>
                  <td className="p-6">
                     <span className="bg-blue-600 text-white px-3 py-1 rounded-lg font-black text-[10px] uppercase tabular-nums shadow-sm">{shift.teachingHours} ש'</span>
                  </td>
                  <td className="p-6">
                    <span className="text-emerald-700 font-black tabular-nums">{shift.bonuses.reduce((a, b) => a + b.amount, 0)} ₪</span>
                  </td>
                  <td className="p-6 text-left">
                    <div className="flex items-center gap-2 justify-start">
                       <button 
                         onClick={() => setEditingShift(shift)} 
                         className="p-2.5 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all active:scale-90 border border-slate-200"
                         title="עריכה"
                       >
                         <Edit2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingShift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in" onClick={() => setEditingShift(null)}>
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 md:p-12 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-10 flex-row-reverse">
               <div className="text-right">
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">עריכת משמרת סגורה</h3>
                  <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mt-1">
                    עובד: {editingShift.userName} | {new Date(editingShift.date).toLocaleDateString('he-IL')}
                  </p>
               </div>
               <button onClick={() => setEditingShift(null)} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:text-slate-900 active:scale-90"><X size={24} /></button>
            </div>

            <form onSubmit={handleSaveEditedShift} className="space-y-8 text-right">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] uppercase font-black text-slate-600 block mr-1 tracking-widest">שעת כניסה</label>
                     <div 
                        className="relative group cursor-pointer"
                        onClick={() => triggerPicker(startTimeRef)}
                     >
                        <Clock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand group-hover:scale-110 transition-transform pointer-events-none" />
                        <input 
                           ref={startTimeRef}
                           type="time" 
                           className="w-full p-4 pr-12 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-right cursor-pointer" 
                           value={editingShift.startTime} 
                           onChange={e => setEditingShift({...editingShift, startTime: e.target.value})} 
                        />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] uppercase font-black text-slate-600 block mr-1 tracking-widest">שעת יציאה</label>
                     <div 
                        className="relative group cursor-pointer"
                        onClick={() => triggerPicker(endTimeRef)}
                     >
                        <Clock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand group-hover:scale-110 transition-transform pointer-events-none" />
                        <input 
                           ref={endTimeRef}
                           type="time" 
                           className="w-full p-4 pr-12 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-right cursor-pointer" 
                           value={editingShift.endTime || ''} 
                           onChange={e => setEditingShift({...editingShift, endTime: e.target.value})} 
                        />
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <label className="text-[10px] uppercase font-black text-slate-600 block mr-1 tracking-widest">שעות הדרכה</label>
                     <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border-2 border-slate-100">
                        <button type="button" onClick={() => setEditingShift({...editingShift, teachingHours: Math.max(0, editingShift.teachingHours - 0.5)})} className="w-12 h-12 bg-white rounded-xl shadow-md font-black border border-slate-200 active:scale-90">—</button>
                        <span className="text-2xl font-black tabular-nums text-slate-900">{editingShift.teachingHours}</span>
                        <button type="button" onClick={() => setEditingShift({...editingShift, teachingHours: editingShift.teachingHours + 0.5})} className="w-12 h-12 bg-white rounded-xl shadow-md font-black border border-slate-200 active:scale-90">+</button>
                     </div>
                  </div>
                  <div className="flex flex-col justify-end">
                     <button 
                       type="button" 
                       onClick={() => setEditingShift({...editingShift, hasTravel: !editingShift.hasTravel})}
                       className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${editingShift.hasTravel ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                     >
                        <div className="flex items-center gap-3">
                           <Car size={18} />
                           <span className="text-xs font-black uppercase tracking-widest">תשלום נסיעות</span>
                        </div>
                        {editingShift.hasTravel ? <Check size={16} strokeWidth={4} /> : <X size={16} />}
                     </button>
                  </div>
               </div>

               <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                 <Save size={20} /> שמירה ועדכון משמרת
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRModule;
