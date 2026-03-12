
import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store';
import { Rental } from '../../types';
import { Plus, Clock, AlertTriangle, CheckCircle2, Circle, Banknote, Download, Waves, Archive, FileSpreadsheet, X, ChevronDown, ChevronUp, RotateCcw, PackageCheck, Settings2 } from 'lucide-react';

const MASTER_EQUIPMENT_LIST = ['גלשן גלים', 'סאפ', 'ציוד גלישת רוח', 'קיאק', 'קטמרן', 'בגד גלישה', 'אחר'];

const RentalCard: React.FC<{ rental: Rental }> = ({ rental }) => {
  const { updateRental } = useAppStore();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (rental.isReturned) return;
    
    const interval = setInterval(() => {
      const start = new Date(rental.startTime).getTime();
      const end = start + rental.durationMinutes * 60000;
      const now = new Date().getTime();
      const diff = end - now;

      setTimeLeft(Math.abs(Math.floor(diff / 1000)));
      setIsOverdue(diff < 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [rental.startTime, rental.durationMinutes, rental.isReturned]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours > 0 ? hours + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`
      relative p-6 md:p-8 rounded-[2.5rem] border-2 shadow-xl transition-all animate-fade-in flex flex-col gap-6
      ${isOverdue && !rental.isReturned ? 'bg-rose-50 border-rose-500 ring-4 ring-rose-200' : 'bg-white border-slate-200'}
    `}>
      <div className="flex flex-col xs:flex-row justify-between items-start gap-3 text-right flex-row-reverse">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight truncate">{rental.clientName}</h3>
          <p className="text-[10px] font-black text-slate-600 uppercase mt-1 tracking-wider">{rental.quantity}x {rental.item}</p>
        </div>
        <div className={`
          px-4 py-2.5 rounded-2xl text-center min-w-[90px] shadow-lg border-2 shrink-0
          ${isOverdue && !rental.isReturned ? 'bg-rose-600 border-rose-700 text-white animate-pulse' : 'bg-slate-900 border-slate-900 text-white'}
        `}>
           <div className="text-[8px] font-black uppercase tracking-widest mb-0.5 opacity-80">{isOverdue ? 'חריגה' : 'נותר'}</div>
           <div className="text-xl md:text-2xl font-black tabular-nums leading-none">{formatTime(timeLeft)}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {!rental.isReturned && (
          <button 
            onClick={() => updateRental({ ...rental, isReturned: true, isArchived: true })}
            className="flex-1 flex items-center justify-center gap-3 p-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-900 hover:text-white active:scale-95 shadow-sm"
          >
            <Circle size={16} /> סיום השכרה והחזרת ציוד
          </button>
        )}

        {isOverdue && !rental.extraPaid && (
          <button 
            onClick={() => updateRental({ ...rental, extraPaid: true })}
            className="flex items-center justify-center gap-3 p-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all bg-rose-600 text-white border-2 border-rose-700 hover:bg-rose-700 shadow-xl active:scale-95"
          >
            <Banknote size={16} /> שולם הפרש חריגה
          </button>
        )}
        
        {rental.extraPaid && (
           <div className="flex flex-col gap-2 animate-fade-in">
              <div className="flex items-center justify-center gap-3 p-4 rounded-xl font-black text-xs uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={16} /> תשלום הפרש אושר
              </div>
              <button 
                onClick={() => updateRental({ ...rental, extraPaid: false })}
                className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors py-1"
              >
                <RotateCcw size={12} /> בטל סימון (החזר אחורה)
              </button>
           </div>
        )}
      </div>
    </div>
  );
};

const RentalsModule: React.FC = () => {
  const { rentals, addRental, availableRentalItems, updateAvailableRentalItems, updateRental } = useAppStore();
  const [showArchive, setShowArchive] = useState(false);
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [customMinutes, setCustomMinutes] = useState<string>('45');
  const [isOtherDuration, setIsOtherDuration] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    clientName: '',
    item: '',
    quantity: 1,
    durationMinutes: 60,
    paymentType: 'paid' as Rental['paymentType']
  });

  const activeRentals = rentals.filter(r => !r.isArchived);
  const archivedRentals = useMemo(() => {
    return rentals.filter(r => r.isArchived).sort((a,b) => b.date.localeCompare(a.date));
  }, [rentals]);

  const toggleEquipmentAvailability = (item: string) => {
    const current = [...availableRentalItems];
    if (current.includes(item)) {
      updateAvailableRentalItems(current.filter(i => i !== item));
    } else {
      updateAvailableRentalItems([...current, item]);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName || !form.item) return;
    
    const finalDuration = isOtherDuration ? (parseInt(customMinutes) || 60) : form.durationMinutes;

    addRental({
      id: Math.random().toString(36).substr(2, 9),
      ...form,
      durationMinutes: finalDuration,
      startTime: new Date().toISOString(),
      isReturned: false,
      extraPaid: false,
      isArchived: false
    });
    setForm({ ...form, clientName: '', quantity: 1 });
    setIsOtherDuration(false);
  };

  const exportArchive = (date: string) => {
    const dayRentals = archivedRentals.filter(r => r.date === date);
    const headers = ['תאריך', 'לקוח', 'פריט', 'כמות', 'זמן (דקות)', 'תשלום'];
    const rows = dayRentals.map(r => [r.date, r.clientName, r.item, r.quantity, r.durationMinutes, r.paymentType]);
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `rentals_${date}.csv`);
    link.click();
  };

  const toggleDate = (date: string) => {
    setExpandedDates(prev => 
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-20 max-w-7xl mx-auto text-right px-2">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div className="text-right">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">דלפק השכרות</h2>
          <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-2">מעקב ציוד בזמן אמת וארכיון היסטורי</p>
        </div>
        <div className="flex flex-col xs:flex-row gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsSetupOpen(!isSetupOpen)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md ${isSetupOpen ? 'bg-brand text-white' : 'bg-white text-brand border border-brand/20'}`}
          >
            <Settings2 size={18} />
            זמינות ציוד
          </button>
          <button 
            onClick={() => setShowArchive(!showArchive)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md ${showArchive ? 'bg-indigo-950 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:border-brand'}`}
          >
            {showArchive ? <X size={18} /> : <Archive size={18} />}
            {showArchive ? 'חזור למים' : 'ארכיון'}
          </button>
        </div>
      </header>

      {/* Equipment Setup Section */}
      {isSetupOpen && !showArchive && (
        <div className="bg-brand-light/30 border-2 border-brand/10 p-6 md:p-8 rounded-[2.5rem] animate-fade-in space-y-4">
           <div className="flex items-center gap-3 justify-end flex-row-reverse">
              <PackageCheck size={20} className="text-brand" />
              <h3 className="font-black text-brand-ocean text-lg">איזה ציוד משכירים היום?</h3>
           </div>
           <p className="text-xs font-bold text-slate-500 mb-4">סמן את הפריטים שזמינים להשכרה. פריטים שלא יסומנו לא יופיעו בטופס ההשכרה החדש.</p>
           <div className="flex flex-wrap gap-2 justify-end">
              {MASTER_EQUIPMENT_LIST.map(item => {
                const isActive = availableRentalItems.includes(item);
                return (
                  <button 
                    key={item}
                    onClick={() => toggleEquipmentAvailability(item)}
                    className={`px-5 py-3 rounded-xl font-black text-xs transition-all border-2 flex items-center gap-2 ${isActive ? 'bg-brand border-brand text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-brand/40'}`}
                  >
                    {item}
                    {isActive ? <CheckCircle2 size={14}/> : <Circle size={14} className="opacity-30" />}
                  </button>
                )
              })}
           </div>
        </div>
      )}

      {showArchive ? (
        <div className="bg-white p-6 md:p-12 rounded-[3rem] shadow-2xl border border-slate-200 animate-fade-in">
           <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-8 flex items-center gap-4 flex-row-reverse">
              <Archive className="text-indigo-600" size={32} /> השכרות שהסתיימו (ארכיון)
           </h3>
           <div className="space-y-6">
              {Array.from(new Set(archivedRentals.map(r => r.date))).map((date: string) => {
                const isExpanded = expandedDates.includes(date);
                const dayRentals = archivedRentals.filter(r => r.date === date);
                return (
                  <div key={date} className="border-2 border-slate-100 rounded-[2rem] overflow-hidden bg-slate-50 shadow-sm">
                     <button 
                        onClick={() => toggleDate(date)}
                        className="w-full p-6 md:p-8 flex items-center justify-between flex-row-reverse hover:bg-slate-100 transition-all"
                     >
                        <div className="flex items-center gap-4 md:gap-6 flex-row-reverse">
                           <div className="text-lg md:text-2xl font-black text-slate-900 tabular-nums">{new Date(date).toLocaleDateString('he-IL')}</div>
                           <span className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                             {dayRentals.length} השכרות
                           </span>
                        </div>
                        <div className="flex items-center gap-4">
                           <button 
                              onClick={(e) => { e.stopPropagation(); exportArchive(date); }}
                              className="bg-white text-emerald-600 border border-emerald-100 p-2 rounded-lg hover:bg-emerald-50 shadow-sm"
                              title="ייצוא לאקסל"
                           >
                              <FileSpreadsheet size={20} />
                           </button>
                           {isExpanded ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                        </div>
                     </button>
                     
                     {isExpanded && (
                       <div className="p-4 md:p-6 bg-white border-t border-slate-100 animate-fade-in">
                          <div className="overflow-x-auto">
                             <table className="w-full text-right text-xs md:text-sm min-w-[500px]">
                                <thead className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                   <tr>
                                      <th className="p-4">לקוח</th>
                                      <th className="p-4">ציוד</th>
                                      <th className="p-4">כמות</th>
                                      <th className="p-4">זמן</th>
                                      <th className="p-4">תשלום</th>
                                   </tr>
                                </thead>
                                <tbody>
                                   {dayRentals.map(r => (
                                     <tr key={r.id} className="border-b border-slate-50 last:border-0">
                                        <td className="p-4 font-black">{r.clientName}</td>
                                        <td className="p-4 font-bold">{r.item}</td>
                                        <td className="p-4">{r.quantity}</td>
                                        <td className="p-4">{r.durationMinutes} דק'</td>
                                        <td className="p-4">
                                           <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${r.paymentType === 'paid' ? 'bg-emerald-50 text-emerald-600' : r.paymentType === 'subscription-card' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                              {r.paymentType === 'paid' ? 'שולם' : r.paymentType === 'subscription-card' ? 'כרטיסייה' : 'חוב'}
                                           </span>
                                        </td>
                                     </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>
                       </div>
                     )}
                  </div>
                );
              })}
              {archivedRentals.length === 0 && <p className="text-center py-32 text-slate-300 font-black italic text-2xl">הארכיון ריק כרגע.</p>}
           </div>
        </div>
      ) : (
        <div className="space-y-8 md:space-y-10">
          <section className="bg-white p-4 xs:p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border-2 border-slate-200 shadow-2xl text-right flex flex-col gap-8">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 justify-end flex-row-reverse">
              השכרה חדשה <Plus size={24} className="text-brand" strokeWidth={4} />
            </h3>
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">שם הלקוח</label>
                 <input required className="w-full p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner focus:ring-2 focus:ring-brand" value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} placeholder="מי משכיר?" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">סוג הציוד</label>
                    <select required className="w-full p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right appearance-none" value={form.item} onChange={e => setForm({...form, item: e.target.value})}>
                       <option value="">בחר ציוד</option>
                       {availableRentalItems.length > 0 ? (
                         availableRentalItems.map(item => <option key={item} value={item}>{item}</option>)
                       ) : (
                         <option disabled>נא לסמן ציוד זמין</option>
                       )}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">כמות</label>
                    <input type="number" min="1" className="w-full p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center shadow-inner" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} />
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">משך זמן</label>
                    <select className="w-full p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right appearance-none" value={isOtherDuration ? 'other' : form.durationMinutes} onChange={e => {
                        if(e.target.value === 'other') {
                            setIsOtherDuration(true);
                        } else {
                            setIsOtherDuration(false);
                            setForm({...form, durationMinutes: Number(e.target.value)});
                        }
                    }}>
                       <option value={60}>שעה 1</option>
                       <option value={120}>שעתיים</option>
                       <option value={180}>3 שעות</option>
                       <option value="other">אחר (ידני)</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">סטטוס תשלום</label>
                    <select className="w-full p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right appearance-none" value={form.paymentType} onChange={e => setForm({...form, paymentType: e.target.value as any})}>
                       <option value="paid">שולם</option>
                       <option value="not-paid">חוב (לא שולם)</option>
                       <option value="subscription-card">כרטיסייה</option>
                    </select>
                 </div>
              </div>

              {isOtherDuration && (
                 <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] font-black text-brand uppercase tracking-widest mr-2">הזן משך זמן בדקות</label>
                    <input 
                      type="number" 
                      min="1" 
                      required 
                      className="w-full p-4 md:p-5 bg-brand-light border-2 border-brand/20 rounded-2xl font-black text-center text-brand-ocean shadow-inner focus:ring-2 focus:ring-brand outline-none tabular-nums" 
                      value={customMinutes} 
                      onChange={e => setCustomMinutes(e.target.value)} 
                      placeholder="דקות..."
                    />
                 </div>
              )}

              <button type="submit" disabled={availableRentalItems.length === 0} className="w-full brand-gradient text-white py-6 rounded-[2rem] font-black text-base uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed">פתח טיימר השכרה</button>
            </form>
          </section>

          <div className="space-y-8 text-right">
             <h3 className="text-2xl md:text-3xl font-black text-brand-ocean flex items-center gap-4 px-2 justify-end flex-row-reverse">
                ציוד פעיל במים <Clock size={32} className="text-brand" />
             </h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                {activeRentals.map(rental => <RentalCard key={rental.id} rental={rental} />)}
                {activeRentals.length === 0 && (
                   <div className="sm:col-span-2 py-40 text-center bg-white border-4 border-dashed border-slate-200 rounded-[4rem] text-slate-300 font-black italic text-2xl animate-pulse">אין השכרות פעילות.</div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalsModule;
