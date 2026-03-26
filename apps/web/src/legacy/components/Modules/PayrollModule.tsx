
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store';
import { Search, FileSpreadsheet, ChevronRight, ChevronLeft, ChevronDown, Download, FileText } from 'lucide-react';

const PayrollModule: React.FC = () => {
  const { shifts, users } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [openTables, setOpenTables] = useState<Record<string, boolean>>({});

  const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

  const payrollData = useMemo(() => {
    // filter out archived users and terminal/shop accounts
    return users.filter(u => !u.isArchived && u.role !== 'Shop Computer').map(user => {
      const userShifts = shifts.filter(s => {
        const sDate = new Date(s.date);
        return s.userId === user.id && 
               sDate.getMonth() === selectedMonth && 
               sDate.getFullYear() === selectedYear;
      });

      const totalWorkHours = userShifts.reduce((acc, s) => {
        if (!s.startTime || !s.endTime) return acc;
        const [h1, m1] = s.startTime.split(':').map(Number);
        const [h2, m2] = s.endTime.split(':').map(Number);
        const duration = (h2 * 60 + m2) - (h1 * 60 + m1);
        return acc + (duration > 0 ? duration : 0);
      }, 0);

      const totalTeaching = userShifts.reduce((acc, s) => acc + (s.teachingHours || 0), 0);
      const totalBonuses = userShifts.reduce((acc, s) => acc + s.bonuses.reduce((bAcc, b) => bAcc + b.amount, 0), 0);
      const travelDays = userShifts.filter(s => s.hasTravel).length;

      return {
        user,
        shifts: userShifts,
        summary: {
          workHours: (totalWorkHours / 60).toFixed(1),
          teachingHours: totalTeaching,
          bonuses: totalBonuses,
          travelDays
        }
      };
    }).filter(d => d.user.name.includes(searchTerm));
  }, [shifts, users, selectedMonth, selectedYear, searchTerm]);

  const download101 = (user: any) => {
    if (!user.form101Data) return;
    const link = document.createElement('a');
    link.href = user.form101Data;
    link.download = user.form101FileName || 'form101.pdf';
    link.click();
  };

  const exportEmployeeReport = (data: any) => {
    const headers = ['תאריך', 'כניסה', 'יציאה', 'דקות הפסקה', 'שעות הדרכה', 'בונוסים', 'נסיעות', 'הערות'];
    const rows = data.shifts.map((s: any) => [
      new Date(s.date).toLocaleDateString('he-IL'),
      s.startTime,
      s.endTime,
      s.breakMinutes ?? 0,
      s.teachingHours,
      s.bonuses.reduce((acc: number, b: any) => acc + b.amount, 0),
      s.hasTravel ? 'כן' : 'לא',
      s.notes
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + `דוח שכר - ${data.user.name} - ${monthNames[selectedMonth]} ${selectedYear}\n`
        + headers.join(",") + "\n" 
        + rows.map((e: any) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payroll_${data.user.name}_${selectedMonth + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const changeMonth = (delta: number) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    if (newMonth < 0) { newMonth = 11; newYear--; }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const toggleTable = (userId: string | number) => {
    const payrollKey = String(userId);
    setOpenTables(current => ({
      ...current,
      [payrollKey]: !current[payrollKey]
    }));
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto text-right animate-fade-in px-2" dir="rtl">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div className="text-right">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">דוחות שכר וטפסים</h2>
          <p className="text-slate-600 font-bold uppercase tracking-widest text-[9px] md:text-xs mt-2">ריכוז שכר, בונוסים והורדת טפסי 101</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl md:rounded-2xl shadow-sm border border-slate-200 w-full md:w-auto justify-between md:justify-center">
           <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-lg"><ChevronRight size={18}/></button>
           <span className="font-black text-sm md:text-base text-slate-900 min-w-[110px] text-center">{monthNames[selectedMonth]} {selectedYear}</span>
           <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-lg"><ChevronLeft size={18}/></button>
        </div>
      </header>

      <div className="relative w-full md:w-96 px-1">
        <Search className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
          placeholder="חפש עובד..." 
          className="w-full p-4 pr-11 md:pr-12 bg-white border border-slate-200 rounded-xl shadow-sm outline-none focus:border-brand font-bold text-sm md:text-base text-right"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-8 px-1">
        {payrollData.map(data => {
          const isTableOpen = openTables[String(data.user.id)] ?? false;

          return (
          <div key={data.user.id} className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden hover:border-brand transition-all group">
            <div className={`p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/20 ${isTableOpen ? 'border-b border-slate-50' : ''}`}>
              <div className="flex items-center gap-5 flex-row-reverse w-full md:w-auto">
                <div className="w-16 h-16 rounded-2xl brand-gradient text-white flex items-center justify-center font-black text-2xl shadow-lg shrink-0">
                  {data.user.name.charAt(0)}
                </div>
                <div className="text-right">
                  <h3 className="text-xl font-black text-slate-900 leading-none mb-1">{data.user.name}</h3>
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{data.user.role}</span>
                    {data.user.hasForm101 && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black flex items-center gap-1"><FileText size={10}/> 101 תקין</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full md:w-auto">
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

              <div className="flex gap-2 w-full md:w-auto">
                 <button
                   type="button"
                   onClick={() => toggleTable(data.user.id)}
                   aria-expanded={isTableOpen}
                   className="flex-1 md:flex-none bg-white text-slate-700 px-5 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                 >
                   <ChevronDown size={18} className={`transition-transform ${isTableOpen ? 'rotate-180' : ''}`} />
                   {isTableOpen ? 'סגור פירוט' : 'פתח פירוט'}
                 </button>
                 {data.user.hasForm101 && (
                    <button 
                      onClick={() => download101(data.user)}
                      className="flex-1 md:flex-none bg-slate-100 text-slate-700 px-5 py-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-sm"
                      title="הורדת טופס 101"
                    >
                      <Download size={18} />
                    </button>
                 )}
                 <button 
                   onClick={() => exportEmployeeReport(data)}
                   className="flex-1 md:flex-none bg-slate-900 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
                 >
                   <FileSpreadsheet size={18} />
                   דוח שעות
                 </button>
              </div>
            </div>

            {isTableOpen && (
            <div className="p-4 md:p-8 overflow-x-auto scroll-hint">
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
                    {data.shifts.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-700">{new Date(s.date).toLocaleDateString('he-IL')}</td>
                        <td className="p-4 font-black tabular-nums">{s.startTime} - {s.endTime}</td>
                        <td className="p-4 text-center"><span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg font-black text-[10px]">{s.breakMinutes ?? 0} דק'</span></td>
                        <td className="p-4 text-center"><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-black text-[10px]">{s.teachingHours} ש'</span></td>
                        <td className="p-4 text-center font-black text-emerald-600 tabular-nums">{s.bonuses.reduce((a, b) => a + b.amount, 0)}₪</td>
                        <td className="p-4 text-left">{s.hasTravel ? <span className="text-indigo-600 font-black">כן</span> : <span className="text-slate-200">לא</span>}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
            )}
          </div>
        )})}
      </div>
    </div>
  );
};

export default PayrollModule;
