import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store';
import PayrollUserCard from '../Payroll/PayrollUserCard';
import ShiftEditModal from '../Payroll/ShiftEditModal';
import { MONTH_NAMES_HE, buildPayrollEntries, exportPayrollEntryReport } from '../Payroll/payrollUtils';
import { Shift } from '../../types';

const MyHoursModule: React.FC = () => {
  const { currentUser, shifts, users, updateShift } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const myPayrollEntry = useMemo(() => {
    if (!currentUser) return null;
    return buildPayrollEntries({
      users,
      shifts,
      selectedMonth,
      selectedYear,
      userFilter: (user) => user.id === currentUser.id,
    })[0] || null;
  }, [currentUser, selectedMonth, selectedYear, shifts, users]);

  if (!currentUser || !myPayrollEntry) return null;

  const changeMonth = (delta: number) => {
    let nextMonth = selectedMonth + delta;
    let nextYear = selectedYear;

    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    }

    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto text-right animate-fade-in px-2" dir="rtl">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div className="text-right">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">שעות העבודה שלי</h2>
          <p className="text-slate-600 font-bold uppercase tracking-widest text-[9px] md:text-xs mt-2">צפייה ועריכה של דיווחי השעות האישיים</p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-xl md:rounded-2xl shadow-sm border border-slate-200 w-full md:w-auto justify-between md:justify-center">
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-lg">
            <ChevronRight size={18} />
          </button>
          <span className="font-black text-sm md:text-base text-slate-900 min-w-[110px] text-center">
            {MONTH_NAMES_HE[selectedMonth]} {selectedYear}
          </span>
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-lg">
            <ChevronLeft size={18} />
          </button>
        </div>
      </header>

      <div className="grid gap-8 px-1 min-w-0">
        <PayrollUserCard
          data={myPayrollEntry}
          isOpen={isCardOpen}
          onToggle={() => setIsCardOpen((current) => !current)}
          onExportReport={() => exportPayrollEntryReport(myPayrollEntry, selectedMonth, selectedYear)}
          onShiftClick={(shift) => setEditingShift(shift)}
          emptyMessage="אין עדיין דיווחי שעות בחודש שנבחר."
        />
      </div>

      {editingShift && (
        <ShiftEditModal
          shift={editingShift}
          onClose={() => setEditingShift(null)}
          onSave={(shift) => {
            updateShift(shift);
            setEditingShift(null);
          }}
        />
      )}
    </div>
  );
};

export default MyHoursModule;
