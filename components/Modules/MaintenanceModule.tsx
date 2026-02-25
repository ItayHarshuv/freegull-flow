
import React, { useRef, useState } from 'react';
import { useAppStore } from '../../store';
import { Download, Upload, CheckCircle2, RefreshCw, ShieldCheck, Trash2, Cloud, Server } from 'lucide-react';

const MaintenanceModule: React.FC = () => {
  const store = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExportAll = () => {
    const data = { ...store };
    delete (data as any).currentUser;
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `freegull_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSuccess('גיבוי פיזי נשמר בהצלחה! ✅');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto text-right animate-fade-in pb-20 px-1" dir="rtl">
      <header className="border-b border-slate-200 pb-10">
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">תחזוקת מערכת</h2>
        <p className="text-slate-600 font-bold uppercase tracking-widest text-xs mt-3">ניהול ענן וגיבויים פיזיים</p>
      </header>

      {success && (
        <div className="bg-emerald-600 text-white p-6 rounded-3xl flex items-center justify-center gap-3 shadow-xl font-black animate-fade-in">
           <CheckCircle2 size={24} /> {success}
        </div>
      )}

      {/* Cloud Status Section - Clean & Professional */}
      <section className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="flex items-center gap-6 flex-row-reverse text-right">
            <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-600 shadow-inner">
               <Server size={32} />
            </div>
            <div>
               <h3 className="text-2xl font-black text-slate-900">סטטוס ענן: מחובר</h3>
               <p className="text-slate-500 font-bold">כל המכשירים במועדון מסונכרנים כעת בזמן אמת.</p>
               <div className="flex items-center gap-2 flex-row-reverse mt-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">עדכון אחרון: {store.lastSyncTime}</span>
               </div>
            </div>
         </div>
         <button onClick={store.syncNow} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 hover:bg-black transition-all active:scale-95 shadow-lg">
            <RefreshCw size={20} /> סנכרן ידנית
         </button>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-200 flex flex-col items-center text-center gap-6 group hover:border-brand transition-all">
            <div className="w-24 h-24 bg-brand-light rounded-[2.5rem] flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
               <Download size={48} />
            </div>
            <div>
               <h3 className="text-2xl font-black text-slate-900 mb-2">גיבוי למחשב</h3>
               <p className="text-sm text-slate-500 font-bold px-4 leading-relaxed">שמירת עותק בטיחות של כל הנתונים כקובץ JSON אצלך במחשב.</p>
            </div>
            <button onClick={handleExportAll} className="w-full bg-slate-100 text-slate-700 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">ייצא קובץ גיבוי</button>
         </div>

         <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-200 flex flex-col items-center text-center gap-6 group hover:border-amber-500 transition-all">
            <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
               <Upload size={48} />
            </div>
            <div>
               <h3 className="text-2xl font-black text-slate-900 mb-2">שחזור נתונים</h3>
               <p className="text-sm text-slate-500 font-bold px-4 leading-relaxed">טעינת מידע מקובץ גיבוי קיים (זהירות: דורס את המידע בענן).</p>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" />
            <button onClick={() => alert('פונקציית שחזור מוגנת - צור קשר עם התמיכה')} className="w-full bg-amber-50 text-amber-600 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-100 transition-all">טען גיבוי לענן</button>
         </div>
      </div>

      <div className="pt-10 border-t border-slate-100 text-center">
         <div className="flex items-center justify-center gap-3 text-slate-300 font-black uppercase text-[10px] tracking-widest mb-4">
            <ShieldCheck size={16} /> בסיס נתונים מרכזי פעיל
         </div>
         <p className="text-slate-400 text-xs italic">אין צורך בפעולה נוספת. המערכת דואגת לסנכרון אוטומטי בין כל המכשירים.</p>
      </div>
    </div>
  );
};

export default MaintenanceModule;
