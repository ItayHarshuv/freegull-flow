
import React, { useState } from 'react';
import { AppProvider, useAppStore } from './store';
import Sidebar from './components/Layout/Sidebar';
import LoginScreen from './components/LoginScreen';
import TourOverlay from './components/Common/TourOverlay';
import CalendarModule from './components/Modules/CalendarModule';
import SchedulingModule from './components/Modules/SchedulingModule';
import AvailabilityModule from './components/Modules/AvailabilityModule';
import RentalsModule from './components/Modules/RentalsModule';
import TasksModule from './components/Modules/TasksModule';
import LeadsModule from './components/Modules/LeadsModule';
import AdminModule from './components/Modules/AdminModule';
import DashboardModule from './components/Modules/DashboardModule';
import DailyWorkModule from './components/Modules/DailyWorkModule';
import EmployeeModule from './components/Modules/EmployeeModule';
import KnowledgeModule from './components/Modules/KnowledgeModule';
import EventsModule from './components/Modules/EventsModule';
import PayrollModule from './components/Modules/PayrollModule';
import MaintenanceModule from './components/Modules/MaintenanceModule';
import ClubInfoModule from './components/Modules/ClubInfoModule';
import { Menu, Waves, Cloud, CloudOff, RefreshCw } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { currentUser, syncStatus, lastSyncTime, clubId, syncNow } = useAppStore();
  const [currentView, setView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!currentUser) return <LoginScreen />;

  const renderModule = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardModule setView={setView} userName={currentUser.name} />;
      case 'calendar': return <CalendarModule />;
      case 'lessons': return <SchedulingModule />;
      case 'daily_work': return <DailyWorkModule />;
      case 'availability': return <AvailabilityModule />;
      case 'rentals': return <RentalsModule />;
      case 'tasks': return <TasksModule />;
      case 'leads': return <LeadsModule />;
      case 'employee_page': return <EmployeeModule />;
      case 'club_info': return <ClubInfoModule />;
      case 'knowledge': return <KnowledgeModule />;
      case 'admin': return <AdminModule />;
      case 'events': return <EventsModule />;
      case 'payroll': return <PayrollModule />;
      case 'maintenance': return <MaintenanceModule />;
      default: return <DashboardModule setView={setView} userName={currentUser.name} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex font-sans antialiased overflow-x-hidden selection:bg-brand/20" dir="rtl">
      <TourOverlay />
      
      {/* Universal Desktop Header / Status Bar */}
      <header className="fixed top-0 right-[280px] left-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-[40] hidden md:flex items-center justify-between px-8">
         <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
               syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
               syncStatus === 'syncing' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
            }`}>
               {syncStatus === 'synced' ? <Cloud size={14}/> : syncStatus === 'syncing' ? <RefreshCw size={14} className="animate-spin"/> : <CloudOff size={14}/>}
               {syncStatus === 'synced' ? 'מחובר ומסונכרן' : syncStatus === 'syncing' ? 'מעדכן נתונים...' : 'שגיאת חיבור'}
            </div>
            <span className="text-[10px] text-slate-400 font-bold">עדכון אחרון: {lastSyncTime}</span>
         </div>
         
         <div className="flex items-center gap-4 flex-row-reverse">
            <span className="text-xs font-black text-brand-ocean tracking-tighter uppercase">ID המועדון: <span className="bg-slate-100 px-2 py-1 rounded text-brand select-all">{clubId}</span></span>
            <button onClick={syncNow} className="p-2 text-slate-400 hover:text-brand transition-colors" title="סנכרן עכשיו">
               <RefreshCw size={16} />
            </button>
         </div>
      </header>

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-[50] flex items-center justify-between px-4 md:hidden">
         <div className="flex items-center gap-2 flex-row-reverse">
            <div className="w-8 h-8 brand-gradient rounded-lg flex items-center justify-center text-white">
               <Waves size={16} />
            </div>
            <span className="font-black text-brand-ocean tracking-tighter">FREEGULL FLOW</span>
         </div>
         <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse'}`} />
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 bg-slate-50 rounded-xl">
               <Menu size={24} />
            </button>
         </div>
      </header>

      <Sidebar currentView={currentView} setView={setView} isOpen={isMobileMenuOpen} closeMobile={() => setIsMobileMenuOpen(false)} />
      
      <main id="main-content" className="flex-1 transition-all duration-300 ease-in-out md:mr-[280px]">
        <div className="pt-20 md:pt-28 p-4 md:p-12">
          <div className="animate-fade-in max-w-[1600px] mx-auto pb-16">
            {renderModule()}
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  );
};

export default App;
