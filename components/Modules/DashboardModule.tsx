
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { isModuleHidden } from '../../utils/hiddenModules';
import { 
  Calendar, BookOpen, LifeBuoy, 
  ClipboardList, CheckSquare, Clock, Anchor, Users2, Info
} from 'lucide-react';

interface DashboardModuleProps {
  userName: string;
}

const DashboardModule: React.FC<DashboardModuleProps> = ({ userName }) => {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();

  const allNavItems = [
    { id: 'daily_work', label: 'יום עבודה', icon: Clock, color: 'brand-gradient text-white', desc: 'פתיחת שעון ולו"ז יומי', allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Warehouse'] },
    { id: 'my_hours', label: 'שעות העבודה שלי', icon: Clock, color: 'bg-slate-900 text-white', desc: 'צפייה ועריכת דיווחים', allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Warehouse', 'Shop Computer'] },
    { id: 'calendar', label: 'יומן ושיבוץ', icon: Calendar, color: 'bg-indigo-500 text-white', desc: 'תצוגת יומן פעילות', allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Shop Computer'] },
    { id: 'lessons', label: 'ניהול שיעורים', icon: BookOpen, color: 'bg-emerald-500 text-white', desc: 'שיבוצי הדרכה', allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Shop Computer'] },
    { id: 'rentals', label: 'השכרות ציוד', icon: LifeBuoy, color: 'bg-cyan-500 text-white', desc: 'מעקב ציוד ולקוחות', allowed: ['Manager', 'Shop Computer'] },
    { id: 'events', label: 'חילוצים במזרחית', icon: Anchor, color: 'bg-indigo-900 text-white', desc: 'שירותי חילוץ ברוחות מזרחיות', allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Shop Computer'] },
    { id: 'tasks', label: 'משימות ומלאי', icon: ClipboardList, color: 'bg-brand-ocean text-white', desc: 'ניהול משימות וציוד', allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Warehouse', 'Instructor', 'Shop Computer'] },
    { id: 'leads', label: 'ניהול לידים', icon: Users2, color: 'bg-orange-500 text-white', desc: 'מעקב פניות ומתעניינים', allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Shop Computer'] },
    { id: 'availability', label: 'הגשת זמינות', icon: CheckSquare, color: 'bg-violet-500 text-white', desc: 'עדכון ימי עבודה', allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Warehouse', 'Shop Computer'] },
    { id: 'club_info', label: 'מידע על המועדון', icon: Info, color: 'bg-slate-800 text-white', desc: 'טלפונים, מיקום ותשלום', allowed: ['Shop Computer', 'Site Editor', 'Manager', 'Shift Manager'] },
  ];

  const navItems = allNavItems.filter(item => item.allowed.includes(currentUser?.role || '') && !isModuleHidden(item.id));
  const getPathFromId = (id: string) => (id === 'dashboard' ? '/' : `/${id}`);

  return (
    <div className="space-y-6 md:space-y-16 animate-fade-in text-right px-2">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div className="flex-1">
          <h2 className="text-3xl md:text-6xl font-black text-brand-ocean tracking-tight leading-tight">שלום, {userName}</h2>
          <p className="text-brand-dark font-black uppercase tracking-widest text-[9px] md:text-xs mt-2">FREEGULL FLOW MANAGEMENT SYSTEM</p>
        </div>
      </div>

      <div id="dashboard-grid" className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-8">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(getPathFromId(item.id))}
            className="group relative bg-white p-4 xs:p-5 sm:p-6 md:p-8 rounded-[1.5rem] xs:rounded-[1.75rem] sm:rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-brand/40 transition-all text-right flex flex-col items-start gap-3 sm:gap-4 active:scale-95 overflow-hidden min-w-0"
          >
            <div className={`w-10 h-10 xs:w-12 xs:h-12 md:w-16 md:h-16 rounded-[1rem] xs:rounded-[1.2rem] md:rounded-[1.5rem] ${item.color} flex items-center justify-center shadow-lg group-hover:rotate-3 transition-all duration-500`}>
              <item.icon size={18} className="xs:w-5 xs:h-5 md:w-8 md:h-8" strokeWidth={2.5} />
            </div>
            <div className="space-y-1 min-w-0 w-full">
              <h3 className="text-base xs:text-lg sm:text-xl md:text-2xl font-black text-brand-ocean leading-tight">{item.label}</h3>
              <p className="text-[9px] xs:text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardModule;
