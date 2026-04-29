import { Shift, User } from '../../types';
import { downloadWorkbook } from './xlsxWorkbook';

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

const DAILY_REGULAR_MINUTES_LIMIT = 8 * 60;

const getShiftWorkMinutes = (shift: Shift) => {
  if (!shift.startTime || !shift.endTime) return 0;
  const [startHour, startMinute] = shift.startTime.split(':').map(Number);
  const [endHour, endMinute] = shift.endTime.split(':').map(Number);
  const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  return duration > 0 ? duration : 0;
};

const getShiftNetWorkMinutes = (shift: Shift) => Math.max(0, getShiftWorkMinutes(shift) - (shift.breakMinutes ?? 0));

const formatHours = (minutes: number) => Number((minutes / 60).toFixed(2));

const hebrewDateFormatter = new Intl.DateTimeFormat('en-u-ca-hebrew', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const getHebrewDateParts = (date: Date) => {
  const parts = hebrewDateFormatter.formatToParts(date);
  return {
    day: Number(parts.find((part) => part.type === 'day')?.value ?? 0),
    month: parts.find((part) => part.type === 'month')?.value ?? '',
    year: Number(parts.find((part) => part.type === 'year')?.value ?? 0),
  };
};

const isObservedYomHaatzmaut = (date: Date, hebrewMonth: string, hebrewDay: number) => {
  if (hebrewMonth !== 'Iyar') {
    return false;
  }

  const weekday = date.getDay();
  return (hebrewDay === 3 && weekday === 4)
    || (hebrewDay === 4 && weekday === 4)
    || (hebrewDay === 5 && weekday === 3)
    || (hebrewDay === 6 && weekday === 2);
};

const isOneHundredFiftyPercentDay = (date: string) => {
  const gregorianDate = new Date(`${date}T00:00:00`);
  if (gregorianDate.getDay() === 6) {
    return true;
  }

  const hebrewDate = getHebrewDateParts(gregorianDate);
  if (isObservedYomHaatzmaut(gregorianDate, hebrewDate.month, hebrewDate.day)) {
    return true;
  }

  return (hebrewDate.month === 'Tishri' && (hebrewDate.day === 1 || hebrewDate.day === 2 || hebrewDate.day === 10 || hebrewDate.day === 15 || hebrewDate.day === 22))
    || (hebrewDate.month === 'Nisan' && (hebrewDate.day === 15 || hebrewDate.day === 21))
    || (hebrewDate.month === 'Sivan' && hebrewDate.day === 6);
};

interface DailyPayrollRow {
  date: string;
  workMinutes: number;
  teachingHours: number;
  bonuses: number;
  travelCount: number;
  notes: string[];
}

const buildDailyPayrollRows = (shifts: Shift[]) => {
  const rowsByDate = new Map<string, DailyPayrollRow>();

  shifts.forEach((shift) => {
    const existingRow = rowsByDate.get(shift.date) ?? {
      date: shift.date,
      workMinutes: 0,
      teachingHours: 0,
      bonuses: 0,
      travelCount: 0,
      notes: [],
    };

    existingRow.workMinutes += getShiftNetWorkMinutes(shift);
    existingRow.teachingHours += shift.teachingHours || 0;
    existingRow.bonuses += shift.bonuses.reduce((sum, bonus) => sum + bonus.amount, 0);
    existingRow.travelCount += shift.hasTravel ? 1 : 0;

    const trimmedNotes = shift.notes.trim();
    if (trimmedNotes) {
      existingRow.notes.push(trimmedNotes);
    }

    rowsByDate.set(shift.date, existingRow);
  });

  return Array.from(rowsByDate.values())
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .map((row) => {
      const regularMinutes = Math.min(row.workMinutes, DAILY_REGULAR_MINUTES_LIMIT);
      const overtimeMinutes = Math.max(0, row.workMinutes - DAILY_REGULAR_MINUTES_LIMIT);
      const premiumHolidayDay = isOneHundredFiftyPercentDay(row.date);

      return {
        date: row.date,
        workHours: formatHours(row.workMinutes),
        regularHours: premiumHolidayDay ? 0 : formatHours(regularMinutes),
        extraHours: premiumHolidayDay ? 0 : formatHours(overtimeMinutes),
        shabatHours: premiumHolidayDay ? formatHours(regularMinutes) : 0,
        extraShabatHours: premiumHolidayDay ? formatHours(overtimeMinutes) : 0,
        teachingHours: Number(row.teachingHours.toFixed(2)),
        shabatTeachingHours: premiumHolidayDay ? Number(row.teachingHours.toFixed(2)) : 0,
        bonuses: row.bonuses,
        travelCount: row.travelCount,
        notes: row.notes.join(' | '),
      };
    });
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
  const dailyRows = buildDailyPayrollRows(entry.shifts);
  const totals = dailyRows.reduce((sum, row) => ({
    workHours: sum.workHours + row.workHours,
    regularHours: sum.regularHours + row.regularHours,
    extraHours: sum.extraHours + row.extraHours,
    shabatHours: sum.shabatHours + row.shabatHours,
    extraShabatHours: sum.extraShabatHours + row.extraShabatHours,
    teachingHours: sum.teachingHours + row.teachingHours,
    shabatTeachingHours: sum.shabatTeachingHours + row.shabatTeachingHours,
    bonuses: sum.bonuses + row.bonuses,
    travelCount: sum.travelCount + row.travelCount,
  }), {
    workHours: 0,
    regularHours: 0,
    extraHours: 0,
    shabatHours: 0,
    extraShabatHours: 0,
    teachingHours: 0,
    shabatTeachingHours: 0,
    bonuses: 0,
    travelCount: 0,
  });

  const hourRows = [
    ['תאריך', 'סה"כ שעות עבודה', 'שעות רגילות', 'שעות נוספות', 'שעות שבת/חג', 'שעות נוספות שבת/חג', 'שעות הדרכה', 'שעות הדרכה שבת/חג', 'מכירות', 'נסיעות', 'הערות'],
    ...dailyRows.map((row) => [
      new Date(row.date).toLocaleDateString('he-IL'),
      row.workHours,
      row.regularHours,
      row.extraHours,
      row.shabatHours,
      row.extraShabatHours,
      row.teachingHours,
      row.shabatTeachingHours,
      row.bonuses,
      row.travelCount,
      row.notes,
    ]),
    ['סה"כ', totals.workHours, totals.regularHours, totals.extraHours, totals.shabatHours, totals.extraShabatHours, totals.teachingHours, totals.shabatTeachingHours, totals.bonuses, totals.travelCount, ''],
  ];

  const salesRows = [
    ['תאריך', 'שם לקוח', 'פריט', 'סכום'],
    ...entry.shifts.flatMap((shift) => shift.bonuses.map((bonus) => [
      new Date(shift.date).toLocaleDateString('he-IL'),
      bonus.clientName,
      bonus.item,
      bonus.amount,
    ])),
  ];

  downloadWorkbook(`payroll_${entry.user.name}_${selectedMonth + 1}.xlsx`, [
    { name: 'דוח שעות', rows: hourRows },
    { name: 'מכירות', rows: salesRows },
  ]);
};

export const downloadUserForm101 = (user: User) => {
  if (!user.form101Data) return;
  const link = document.createElement('a');
  link.href = user.form101Data;
  link.download = user.form101FileName || 'form101.pdf';
  link.click();
};
