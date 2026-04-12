import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAppStore } from '../../store';
import PayrollUserCard from '../Payroll/PayrollUserCard';
import ShiftEditModal from '../Payroll/ShiftEditModal';
import { MONTH_NAMES_HE, buildPayrollEntries, exportPayrollEntryReport } from '../Payroll/payrollUtils';
import { Shift } from '../../types';

const MyHoursModule: React.FC = () => {
  const { currentUser, shifts, users, addShift, updateShift, deleteShift } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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

  const createEmptyShift = (): Shift => ({
    id: Math.random().toString(36).substr(2, 9),
    userId: currentUser.id,
    userName: currentUser.name,
    date: '',
    startTime: '',
    endTime: null,
    teachingHours: 0,
    bonuses: [],
    notes: '',
    isClosed: true,
    hasTravel: false,
    breakMinutes: 0,
  });

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
          isOpen={true}
          onToggle={() => undefined}
          showDetailsToggle={false}
          extraActions={
            <button
              type="button"
              onClick={() => setEditingShift(createEmptyShift())}
              className="w-full px-5 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-black text-xs uppercase tracking-widest border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              הוספת משמרת ידנית
            </button>
          }
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
            const shiftExists = shifts.some((existingShift) => existingShift.id === shift.id);
            if (shiftExists) {
              updateShift(shift);
            } else {
              addShift(shift);
            }
            setEditingShift(null);
          }}
          isNewShift={!shifts.some((existingShift) => existingShift.id === editingShift.id)}
          onDelete={() => {
            deleteShift(editingShift.id);
            setEditingShift(null);
          }}
        />
      )}
    </div>
  );
};

export default MyHoursModule;
