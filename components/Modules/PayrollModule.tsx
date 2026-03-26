
import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import PayrollUserCard from '../Payroll/PayrollUserCard';
import { MONTH_NAMES_HE, buildPayrollEntries, downloadUserForm101, exportPayrollEntryReport } from '../Payroll/payrollUtils';

const PayrollModule: React.FC = () => {
  const { shifts, users } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [openTables, setOpenTables] = useState<Record<string, boolean>>({});

  const payrollData = useMemo(() => {
    return buildPayrollEntries({
      users,
      shifts,
      selectedMonth,
      selectedYear,
      searchTerm,
      userFilter: (user) => !user.isArchived && user.role !== 'Shop Computer',
    });
  }, [shifts, users, selectedMonth, selectedYear, searchTerm]);

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
           <span className="font-black text-sm md:text-base text-slate-900 min-w-[110px] text-center">{MONTH_NAMES_HE[selectedMonth]} {selectedYear}</span>
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
            <PayrollUserCard
              key={data.user.id}
              data={data}
              isOpen={isTableOpen}
              onToggle={() => toggleTable(data.user.id)}
              onDownload101={() => downloadUserForm101(data.user)}
              onExportReport={() => exportPayrollEntryReport(data, selectedMonth, selectedYear)}
            />
        )})}
      </div>
    </div>
  );
};

export default PayrollModule;
