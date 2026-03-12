
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { 
  Users, Calendar, Clock, ClipboardList, 
  LifeBuoy, LogOut, CheckSquare, LayoutDashboard, 
  BookOpen, FileText, UserCircle, X, Waves, RefreshCcw, Anchor, Banknote, Users2, Settings, Info
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  closeMobile: () => void;
}

// Fix: Correctly type the functional component props by passing SidebarProps to React.FC generic
const Sidebar: React.FC<SidebarProps> = ({ isOpen, closeMobile }) => {
  const { currentUser, logout, switchUser } = useAppStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  
  if (!currentUser) return null;

  const menuItems = [
    { id: 'dashboard', label: 'לוח בקרה', icon: LayoutDashboard, allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Warehouse', 'Shop Computer'] },
    { id: 'daily_work', label: 'יום עבודה', icon: Clock, allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Warehouse'] },
    { id: 'calendar', label: 'יומן ושיבוץ', icon: Calendar, allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Shop Computer'] },
    { id: 'lessons', label: 'ניהול שיעורים', icon: BookOpen, allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Shop Computer'] },
    { id: 'rentals', label: 'השכרות ציוד', icon: LifeBuoy, allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Shop Computer'] },
    { id: 'events', label: 'חילוצים במזרחית', icon: Anchor, allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Shop Computer'] },
    { id: 'tasks', label: 'משימות ומלאי', icon: ClipboardList, allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Warehouse', 'Instructor', 'Shop Computer'] },
    { id: 'leads', label: 'ניהול לידים', icon: Users2, allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Shop Computer'] },
    { id: 'availability', label: 'הגשת זמינות', icon: CheckSquare, allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Warehouse', 'Shop Computer'] },
    { id: 'payroll', label: 'דוחות שכר', icon: Banknote, allowed: ['Site Editor', 'Manager'] },
    { id: 'employee_page', label: 'דף אישי', icon: UserCircle, allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Warehouse', 'Shop Computer'] },
    { id: 'club_info', label: 'מידע על המועדון', icon: Info, allowed: ['Shop Computer', 'Site Editor', 'Manager', 'Shift Manager'] },
    { id: 'knowledge', label: 'חומר מקצועי', icon: FileText, allowed: ['Site Editor', 'Manager', 'Shift Manager', 'Instructor', 'Shop Computer'] },
    { id: 'admin', label: 'ניהול צוות', icon: Users, allowed: ['Site Editor', 'Manager'] },
    { id: 'maintenance', label: 'תחזוקת אתר', icon: Settings, allowed: ['Site Editor', 'Manager'] },
  ];

  const filteredMenu = menuItems.filter(item => item.allowed.includes(currentUser.role));
  const getPathFromId = (id: string) => (id === 'dashboard' ? '/' : `/${id}`);

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'Shop Computer': return 'חשבון חנות';
      case 'Shift Manager': return 'אחמ"ש';
      case 'Manager': return 'מנהל';
      case 'Instructor': return 'מדריך';
      case 'Warehouse': return 'מחסנאי/ת';
      case 'Site Editor': return 'עורך אתר';
      default: return role;
    }
  };

  return (
    <>
      <div className={`fixed inset-0 bg-brand-ocean/60 z-[60] backdrop-blur-md transition-opacity duration-300 nav:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeMobile} />
      <aside id="sidebar" className={`fixed top-0 right-0 h-screen w-[86vw] max-w-[320px] xs:w-[320px] nav:w-[248px] xl:w-[280px] bg-white z-[70] border-l border-slate-200 transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'} nav:translate-x-0`}>
        <div className="px-4 xs:px-6 nav:px-5 xl:px-6 pt-5 xs:pt-6 nav:pt-5 xl:pt-6 pb-6 nav:pb-7 xl:pb-8 flex justify-between items-center flex-row-reverse">
          <div className="flex items-center gap-2.5 xl:gap-3 flex-row-reverse min-w-0">
            <div className="w-10 h-10 brand-gradient rounded-xl flex items-center justify-center text-white shrink-0">
               <Waves size={20} strokeWidth={2.5} />
            </div>
            <div className="text-right min-w-0">
              <h1 className="text-lg xl:text-xl font-black text-brand-ocean tracking-tighter leading-none truncate">FREEGULL</h1>
              <p className="text-[9px] text-brand-dark font-black uppercase mt-1">FLOW MANAGEMENT</p>
            </div>
          </div>
          <button onClick={closeMobile} className="nav:hidden p-2 text-slate-400"><X size={24}/></button>
        </div>

        <nav id="sidebar-nav" className="flex-1 overflow-y-auto py-2 px-3 xs:px-4 nav:px-3 xl:px-4 space-y-1.5 custom-scrollbar">
          {filteredMenu.map(item => (
            <button
              key={item.id}
              onClick={() => {
                navigate(getPathFromId(item.id));
                closeMobile();
              }}
              className={`group w-full flex items-center gap-3 xl:gap-4 px-3 xl:px-4 py-3 rounded-xl transition-all text-right flex-row-reverse ${(item.id === 'dashboard' ? pathname === '/' || pathname === '/dashboard' : pathname === getPathFromId(item.id)) ? 'bg-brand text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <item.icon size={20} className={(item.id === 'dashboard' ? pathname === '/' || pathname === '/dashboard' : pathname === getPathFromId(item.id)) ? 'text-white' : 'text-slate-400 group-hover:text-brand'} />
              <span className={`text-sm xl:text-base font-bold ${(item.id === 'dashboard' ? pathname === '/' || pathname === '/dashboard' : pathname === getPathFromId(item.id)) ? 'font-black' : ''}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div id="user-profile" className="px-4 xs:px-6 nav:px-4 xl:px-6 py-4 xl:py-6 border-t border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-row-reverse">
             <div className="w-10 h-10 rounded-lg brand-gradient text-white flex items-center justify-center font-black">{currentUser.name.charAt(0)}</div>
             <div className="min-w-0 text-right">
                <div className="text-sm font-black text-brand-ocean truncate leading-none">{currentUser.name}</div>
                <div className="text-[9px] font-black uppercase text-brand truncate mt-1">{getRoleLabel(currentUser.role)}</div>
             </div>
          </div>
          
          <div className="grid grid-cols-1 xs:grid-cols-2 nav:grid-cols-1 xl:grid-cols-2 gap-2">
            <button onClick={switchUser} className="flex items-center justify-center gap-2 bg-slate-100 text-slate-600 hover:bg-slate-200 py-3 rounded-lg text-[10px] xl:text-[11px] font-black uppercase shadow-sm transition-all">
               <RefreshCcw size={14} /> <span>החלף</span>
            </button>
            <button onClick={logout} className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-rose-600 py-3 rounded-lg text-[10px] xl:text-[11px] font-black uppercase shadow-sm transition-all">
               <LogOut size={14} /> <span>יציאה</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
