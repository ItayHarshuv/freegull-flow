import { Shift, User } from '../../types';

export const MONTH_NAMES_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

export interface PayrollSummary {
  workHours: string;
  teachingHours: number;
  bonuses: number;
  travelDays: number;
}

export interface PayrollEntry {
  user: User;
  shifts: Shift[];
  summary: PayrollSummary;
}

const getShiftWorkMinutes = (shift: Shift) => {
  if (!shift.startTime || !shift.endTime) return 0;
  const [startHour, startMinute] = shift.startTime.split(':').map(Number);
  const [endHour, endMinute] = shift.endTime.split(':').map(Number);
  const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  return duration > 0 ? duration : 0;
};

export const buildPayrollEntries = ({
  users,
  shifts,
  selectedMonth,
  selectedYear,
  searchTerm = '',
  userFilter = () => true,
}: {
  users: User[];
  shifts: Shift[];
  selectedMonth: number;
  selectedYear: number;
  searchTerm?: string;
  userFilter?: (user: User) => boolean;
}): PayrollEntry[] => users
  .filter(userFilter)
  .map((user) => {
    const userShifts = shifts.filter((shift) => {
      const shiftDate = new Date(shift.date);
      return shift.userId === user.id
        && shiftDate.getMonth() === selectedMonth
        && shiftDate.getFullYear() === selectedYear;
    });

    const totalWorkMinutes = userShifts.reduce((sum, shift) => sum + getShiftWorkMinutes(shift), 0);
    const totalTeachingHours = userShifts.reduce((sum, shift) => sum + (shift.teachingHours || 0), 0);
    const totalBonuses = userShifts.reduce(
      (sum, shift) => sum + shift.bonuses.reduce((bonusSum, bonus) => bonusSum + bonus.amount, 0),
      0
    );
    const travelDays = userShifts.filter((shift) => shift.hasTravel).length;

    return {
      user,
      shifts: userShifts,
      summary: {
        workHours: (totalWorkMinutes / 60).toFixed(1),
        teachingHours: totalTeachingHours,
        bonuses: totalBonuses,
        travelDays,
      },
    };
  })
  .filter((entry) => entry.user.name.includes(searchTerm));

export const exportPayrollEntryReport = (entry: PayrollEntry, selectedMonth: number, selectedYear: number) => {
  const headers = ['תאריך', 'כניסה', 'יציאה', 'דקות הפסקה', 'שעות הדרכה', 'בונוסים', 'נסיעות', 'הערות'];
  const rows = entry.shifts.map((shift) => [
    new Date(shift.date).toLocaleDateString('he-IL'),
    shift.startTime,
    shift.endTime || '',
    shift.breakMinutes ?? 0,
    shift.teachingHours,
    shift.bonuses.reduce((sum, bonus) => sum + bonus.amount, 0),
    shift.hasTravel ? 'כן' : 'לא',
    shift.notes,
  ]);

  const csvContent = `data:text/csv;charset=utf-8,\uFEFFדוח שכר - ${entry.user.name} - ${MONTH_NAMES_HE[selectedMonth]} ${selectedYear}\n${headers.join(',')}\n${rows.map((row) => row.join(',')).join('\n')}`;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `payroll_${entry.user.name}_${selectedMonth + 1}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadUserForm101 = (user: User) => {
  if (!user.form101Data) return;
  const link = document.createElement('a');
  link.href = user.form101Data;
  link.download = user.form101FileName || 'form101.pdf';
  link.click();
};
