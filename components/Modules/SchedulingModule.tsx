
import { BookOpen, Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, Clock, CreditCard, Edit2, Filter, GraduationCap, Hash, MessageCircle, Phone, Plus, Save, Search, ShieldCheck, Ticket, UserCheck, Waves, X, HelpCircle, Archive, Trash2, Undo2 } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { Certification, CreditCardInfo, Lesson, LessonPath } from '../../types';

const SPORT_TYPES: { value: Certification, icon: React.ReactNode, duration: number, lessons: number }[] = [
  { value: 'גלישת גלים', icon: <Waves size={24} />, duration: 90, lessons: 4 },
  { value: 'קטמרן', icon: <Waves size={24} className="text-brand" />, duration: 120, lessons: 3 },
  { value: 'גלישת רוח', icon: <Waves size={24} className="text-blue-400" />, duration: 120, lessons: 3 },
  { value: 'גלישת כנף', icon: <Waves size={24} className="text-indigo-400" />, duration: 90, lessons: 3 },
  { value: 'סאפ', icon: <Waves size={24} className="rotate-90 text-cyan-500" />, duration: 60, lessons: 3 },
  { value: 'גלישת קייט', icon: <Waves size={24} className="text-cyan-400" />, duration: 90, lessons: 3 },
  { value: 'אחר', icon: <HelpCircle size={24} className="text-slate-400" />, duration: 60, lessons: 1 }
];

const STANDARD_PATHS: { value: LessonPath, label: string }[] = [
  { value: 'Course', label: 'קורס' },
  { value: 'Trial', label: 'שיעור ניסיון' },
  { value: 'Single', label: 'שיעור פרטי' },
  { value: 'Couple', label: 'שיעור זוגי' },
  { value: 'Reinforcement', label: 'שיעור חיזוק' }
];

const CATAMARAN_PATHS: { value: LessonPath, label: string }[] = [
  { value: 'Basic Catamaran (3)', label: 'קורס בסיסי (3)' },
  { value: 'Extended Catamaran (5)', label: 'קורס מורחב (5)' },
  { value: 'Trial', label: 'שיעור ניסיון' },
  { value: 'Single', label: 'שיעור פרטי' },
  { value: 'Couple', label: 'שיעור זוגי' },
  { value: 'Reinforcement', label: 'שיעור חיזוק' }
];

const MONTH_NAMES = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const DAY_NAMES = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

const SchedulingModule: React.FC = () => {
  const { lessons, currentUser, users, availability, addLesson, updateLesson, deleteLesson } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSport, setFilterSport] = useState<Certification | 'All'>('All');
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  
  // Pickers state
  const [isCCModalOpen, setIsCCModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isSportPickerOpen, setIsSportPickerOpen] = useState(false);
  const [isPathPickerOpen, setIsPathPickerOpen] = useState(false);
  const [isNumberPickerOpen, setIsNumberPickerOpen] = useState(false);
  const [isInstructorPickerOpen, setIsInstructorPickerOpen] = useState(false);

  const [pickerMonthDate, setPickerMonthDate] = useState(new Date());

  // Time picker temp state
  const [tempTimeStart, setTempTimeStart] = useState({ h: '10', m: '00' });
  const [tempTimeEnd, setTempTimeEnd] = useState({ h: '11', m: '30' });

  const initialFormState: Partial<Lesson> = {
    clientName: '', 
    phone: '', 
    type: 'גלישת גלים',
    pathType: 'Course',
    lessonNumber: 1,
    time: '10:00',
    endTime: '11:30',
    date: new Date().toISOString().split('T')[0],
    instructorId: '',
    creditCardDeposit: { number: '', expiry: '', cvv: '', ownerId: '' },
    voucherNumber: '',
    hasVoucher: false,
    isRegistered: false,
    isPaid: false,
    isCancelled: false,
    isArchived: false
  };

  const [form, setForm] = useState<Partial<Lesson>>(initialFormState);

  const isManager = ['Site Editor', 'Manager', 'Shift Manager', 'Shop Computer'].includes(currentUser?.role || '');

  // Auto-calculate end time
  const calculateEndTime = (startH: string, startM: string, sport: Certification) => {
    const sportData = SPORT_TYPES.find(s => s.value === sport) || SPORT_TYPES[0];
    const totalMinutes = parseInt(startH) * 60 + parseInt(startM) + sportData.duration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return {
      h: endH.toString().padStart(2, '0'),
      m: endM.toString().padStart(2, '0')
    };
  };

  useEffect(() => {
    if (form.type && tempTimeStart) {
      const newEnd = calculateEndTime(tempTimeStart.h, tempTimeStart.m, form.type as Certification);
      setTempTimeEnd(newEnd);
    }
  }, [form.type, tempTimeStart.h, tempTimeStart.m]);

  const availableInstructors = useMemo(() => {
    if (!form.date) return [];
    const dateAvails = availability.filter(a => a.date === form.date && a.isAvailable);
    const eligibleInstructors = users.filter(u => dateAvails.some(a => a.userId === u.id) && !u.isArchived);
    const currentStartTime = `${tempTimeStart.h}:${tempTimeStart.m}`;
    const currentEndTime = `${tempTimeEnd.h}:${tempTimeEnd.m}`;

    return eligibleInstructors.filter(u => {
      const hasConflict = lessons.some(l => {
        if (editingLessonId && l.id === editingLessonId) return false;
        if (l.date === form.date && l.instructorId === u.id && !l.isCancelled && !l.isArchived) {
          const lStart = l.time;
          const lEnd = l.endTime || l.time;
          return (currentStartTime < lEnd && currentEndTime > lStart);
        }
        return false;
      });
      return !hasConflict;
    });
  }, [form.date, tempTimeStart, tempTimeEnd, availability, users, lessons, editingLessonId]);

  // Grouped and Filtered Lessons
  const groupedLessons = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = lessons.filter(l => {
      const matchSearch = 
        (l.clientName || '').toLowerCase().includes(term) || 
        (l.phone || '').includes(term) || 
        (l.date || '').includes(term);
      const matchSport = filterSport === 'All' || l.type === filterSport;
      const matchArchive = showArchive ? l.isArchived : !l.isArchived;
      return matchSearch && matchSport && matchArchive;
    });

    const groups: Record<string, Lesson[]> = {};
    filtered.forEach(l => {
      if (!groups[l.date]) groups[l.date] = [];
      groups[l.date].push(l);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    const result: { date: string, lessons: Lesson[] }[] = [];
    sortedDates.forEach(d => {
      result.push({
        date: d,
        lessons: groups[d].sort((a, b) => a.time.localeCompare(b.time))
      });
    });
    return result;
  }, [lessons, searchTerm, filterSport, showArchive]);

  const isLessonLive = (l: Lesson) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (l.date !== todayStr || l.isCancelled || l.isArchived) return false;
    
    const currentTimeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
    return currentTimeStr >= l.time && (l.endTime ? currentTimeStr <= l.endTime : true);
  };

  const handleArchiveFinished = (date: string) => {
    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
    const todayStr = now.toISOString().split('T')[0];

    lessons.forEach(l => {
      if (l.date === date && !l.isArchived) {
         if (l.date < todayStr || (l.date === todayStr && (l.endTime || l.time) < currentTimeStr)) {
            updateLesson({ ...l, isArchived: true });
         }
      }
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את השיעור לצמיתות? פעולה זו אינה ניתנת לביטול.')) {
      deleteLesson(id);
      setExpandedLessonId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName || !form.phone || !form.date) {
      alert('נא למלא את כל שדות החובה');
      return;
    }
    
    const lessonData: Lesson = {
      id: editingLessonId || Math.random().toString(36).substr(2, 9),
      clientName: form.clientName!,
      phone: form.phone!,
      type: (form.type as Certification) || 'גלישת גלים',
      pathType: (form.pathType as LessonPath) || 'Course',
      lessonNumber: Number(form.lessonNumber) || 1,
      time: `${tempTimeStart.h}:${tempTimeStart.m}`,
      endTime: `${tempTimeEnd.h}:${tempTimeEnd.m}`,
      date: form.date!,
      instructorId: form.instructorId,
      creditCardDeposit: form.creditCardDeposit?.number ? form.creditCardDeposit : undefined,
      voucherNumber: form.hasVoucher ? form.voucherNumber : undefined,
      isRegistered: form.isRegistered,
      isPaid: form.isPaid,
      isCancelled: form.isCancelled || false,
      isArchived: form.isArchived || false
    };

    if (editingLessonId) {
      updateLesson(lessonData);
      setEditingLessonId(null);
    } else {
      addLesson(lessonData);
    }
    setForm(initialFormState);
  };

  const handleEditClick = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setForm({
      ...lesson,
      hasVoucher: !!lesson.voucherNumber,
      creditCardDeposit: lesson.creditCardDeposit || { number: '', expiry: '', cvv: '', ownerId: '' }
    });
    const [sh, sm] = (lesson.time || '10:00').split(':');
    const [eh, em] = (lesson.endTime || '11:00').split(':');
    setTempTimeStart({ h: sh, m: sm });
    setTempTimeEnd({ h: eh, m: em });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pathOptions = form.type === 'קטמרן' ? CATAMARAN_PATHS : STANDARD_PATHS;

  const handleDateSelect = (day: number) => {
    const selected = new Date(pickerMonthDate.getFullYear(), pickerMonthDate.getMonth(), day);
    const dStr = new Date(selected.getTime() - selected.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    setForm(prev => ({ ...prev, date: dStr }));
    setIsDatePickerOpen(false);
  };

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  return (
    <div className="space-y-8 md:space-y-12 max-w-7xl mx-auto pb-24 text-right px-2" dir="rtl">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-200 pb-10">
        <div className="text-right w-full">
          <h2 className="text-4xl md:text-6xl font-black text-brand-ocean tracking-tight leading-none">ניהול שיעורים</h2>
          <p className="text-slate-600 font-bold uppercase tracking-widest text-xs mt-3">שיבוץ חכם, מעקב קורסים והודעות לקוחות</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
           <button 
             onClick={() => setShowArchive(!showArchive)}
             className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${showArchive ? 'bg-indigo-900 text-white' : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-brand'}`}
           >
              {showArchive ? <Undo2 size={18}/> : <Archive size={18}/>}
              {showArchive ? 'חזרה ליומן פעיל' : 'ארכיון שיעורים'}
           </button>
           <div className="relative flex-1 sm:w-80">
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                placeholder="חיפוש לפי שם, טלפון או תאריך..." 
                className="w-full p-5 pr-14 bg-white border-2 border-slate-200 rounded-[2.5rem] shadow-sm outline-none focus:border-brand font-black text-right transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {isManager && !showArchive && (
          <section className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-2xl space-y-8 animate-fade-in flex flex-col sticky top-8 h-fit">
            <h3 className="text-2xl font-black text-brand-ocean flex items-center gap-4 justify-end flex-row-reverse">
              {editingLessonId ? 'עדכון שיעור' : 'שיבוץ חדש'} 
              {editingLessonId ? <Edit2 size={28} className="text-brand" strokeWidth={4} /> : <Plus size={28} className="text-brand" strokeWidth={4} />}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">שם הלקוח</label>
                    <input required value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} placeholder="שם מלא" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner focus:ring-2 focus:ring-brand" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">פיקדון / אשראי</label>
                    <button 
                      type="button"
                      onClick={() => setIsCCModalOpen(true)}
                      className={`w-full p-5 flex items-center justify-between rounded-2xl border-2 transition-all cursor-pointer ${form.creditCardDeposit?.number ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-400 shadow-inner'}`}
                    >
                       <CreditCard size={18} />
                       <span className="font-black text-xs truncate">
                          {form.creditCardDeposit?.number ? `כרטיס: ****${form.creditCardDeposit.number.slice(-4)}` : 'הזן פרטי אשראי'}
                       </span>
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">תאריך</label>
                    <button type="button" onClick={() => setIsDatePickerOpen(true)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner cursor-pointer flex items-center justify-between hover:border-brand transition-all">
                       <Calendar size={18} className="text-brand" />
                       <span className="tabular-nums">{form.date ? new Date(form.date).toLocaleDateString('he-IL') : 'בחר תאריך'}</span>
                    </button>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">שעות השיעור</label>
                    <button type="button" onClick={() => setIsTimePickerOpen(true)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center shadow-inner cursor-pointer flex items-center justify-between hover:border-brand transition-all">
                       <Clock size={18} className="text-brand" />
                       <span className="tabular-nums text-xs" dir="ltr">{tempTimeStart.h}:{tempTimeStart.m} - {tempTimeEnd.h}:{tempTimeEnd.m}</span>
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">סוג ספורט</label>
                    <button type="button" onClick={() => setIsSportPickerOpen(true)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner cursor-pointer flex items-center justify-between hover:border-brand transition-all">
                       {SPORT_TYPES.find(s => s.value === form.type)?.icon || <Waves size={18} className="text-brand" />}
                       <span className="text-xs truncate">{form.type || 'בחר ספורט'}</span>
                    </button>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">סוג שיעור</label>
                    <button type="button" onClick={() => setIsPathPickerOpen(true)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner cursor-pointer flex items-center justify-between hover:border-brand transition-all">
                       <BookOpen size={18} className="text-brand" />
                       <span className="text-xs truncate">{pathOptions.find(p => p.value === form.pathType)?.label || 'בחר סוג'}</span>
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">שיעור #</label>
                    <button type="button" onClick={() => setIsNumberPickerOpen(true)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center shadow-inner cursor-pointer flex items-center justify-between hover:border-brand transition-all">
                       <Hash size={18} className="text-brand" />
                       <span className="tabular-nums">{form.lessonNumber}</span>
                    </button>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">מדריך פנוי</label>
                    <button type="button" onClick={() => setIsInstructorPickerOpen(true)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner cursor-pointer flex items-center justify-between hover:border-brand transition-all">
                       <UserCheck size={18} className="text-brand" />
                       <span className="text-xs truncate">{users.find(u => u.id === form.instructorId)?.name || 'בחר מדריך'}</span>
                    </button>
                 </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">טלפון לקוח</label>
                <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="050-0000000" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-left shadow-inner tabular-nums focus:ring-2 focus:ring-brand outline-none" />
              </div>

              <div className="flex gap-4">
                {editingLessonId && (
                  <button 
                    type="button" 
                    onClick={() => { setEditingLessonId(null); setForm(initialFormState); }}
                    className="flex-1 bg-slate-100 text-slate-600 py-6 rounded-[2rem] font-black text-base uppercase tracking-widest shadow-md transition-all active:scale-95"
                  >
                    ביטול
                  </button>
                )}
                <button type="submit" className="flex-[2] brand-gradient text-white py-6 rounded-[2rem] font-black text-base uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                  {editingLessonId ? 'עדכן שיעור' : 'שבץ ביומן'}
                </button>
              </div>
            </form>
          </section>
        )}

        <div className={`${showArchive || !isManager ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-12`}>
           {groupedLessons.length === 0 && (
              <div className="py-40 text-center bg-white border-4 border-dashed border-slate-200 rounded-[4rem] text-slate-300 font-black italic text-2xl animate-pulse">
                 {showArchive ? 'הארכיון ריק כרגע' : 'לא נמצאו שיעורים ביומן'}
              </div>
           )}

           {groupedLessons.map(group => (
              <div key={group.date} className="space-y-6">
                 <div className="flex items-center justify-between sticky top-[0px] z-[5] bg-[#F8FAFC]/90 backdrop-blur-md py-4 border-b border-slate-200">
                    <h4 className="text-2xl font-black text-brand-ocean flex items-center gap-3">
                       <Calendar className="text-brand" size={24}/>
                       {new Date(group.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h4>
                    {!showArchive && isManager && (
                       <button 
                         onClick={() => handleArchiveFinished(group.date)}
                         className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-100 transition-all border border-indigo-100"
                       >
                          <Archive size={14}/> העבר שהסתיימו לארכיון
                       </button>
                    )}
                 </div>

                 <div className="grid grid-cols-1 gap-6">
                    {group.lessons.map(l => {
                       const isExpanded = expandedLessonId === l.id;
                       const live = isLessonLive(l);
                       return (
                          <div key={l.id} className={`bg-white rounded-[3rem] border shadow-xl overflow-hidden transition-all animate-fade-in ${isExpanded ? 'ring-2 ring-brand ring-inset' : 'border-slate-200'} ${l.isCancelled ? 'grayscale opacity-60 bg-slate-50' : ''}`}>
                             <div 
                                onClick={() => setExpandedLessonId(isExpanded ? null : l.id)}
                                className="p-8 flex items-center gap-10 cursor-pointer hover:bg-slate-50 transition-colors relative"
                             >
                                {live && (
                                   <div className="absolute top-4 left-8 bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black animate-pulse flex items-center gap-1">
                                      <div className="w-1 h-1 bg-white rounded-full animate-ping"/> שיעור במים
                                   </div>
                                )}
                                
                                <div className={`flex flex-col items-center justify-center w-28 h-28 text-white rounded-[2.5rem] border-4 transition-all shadow-xl shrink-0 ${l.isCancelled ? 'bg-slate-400 border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
                                  <span className="text-2xl font-black tabular-nums tracking-tighter leading-tight" dir="ltr">{l.time}</span>
                                  {l.endTime && <span className="text-[10px] font-black opacity-60">עד {l.endTime}</span>}
                                  <span className="text-[10px] font-black text-brand uppercase mt-1">{new Date(l.date).toLocaleDateString('he-IL', {day:'numeric', month:'numeric'})}</span>
                                </div>
                                
                                <div className="flex-1 min-w-0 text-right">
                                   <h4 className={`text-3xl font-black text-brand-ocean truncate leading-tight ${l.isCancelled ? 'line-through decoration-rose-500 decoration-4' : ''}`}>{l.clientName}</h4>
                                   <div className="flex flex-wrap items-center gap-3 mt-4 flex-row-reverse justify-end">
                                      <span className="text-xs font-black uppercase px-5 py-2 rounded-xl bg-brand text-white shadow-md flex items-center gap-2">
                                         {SPORT_TYPES.find(s => s.value === l.type)?.icon} {l.type}
                                      </span>
                                      <span className="text-xs font-black uppercase px-5 py-2 rounded-xl bg-indigo-50 text-indigo-700 border-2 border-indigo-100 flex items-center gap-2">
                                         <Hash size={14} /> שיעור {l.lessonNumber}
                                      </span>
                                      {l.isCancelled && <span className="text-xs font-black uppercase px-5 py-2 rounded-xl bg-rose-50 text-rose-700 border-2 border-rose-100">בוטל</span>}
                                   </div>
                                </div>

                                <div className="flex items-center gap-4">
                                   <a onClick={(e) => e.stopPropagation()} href={`https://wa.me/${l.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="w-16 h-16 rounded-[1.5rem] bg-emerald-50 text-emerald-600 border-2 border-emerald-100 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-lg shrink-0 active:scale-90">
                                      <MessageCircle className="w-8 h-8" strokeWidth={3} />
                                   </a>
                                   {isExpanded ? <ChevronUp className="text-slate-300" /> : <ChevronDown className="text-slate-300" />}
                                </div>
                             </div>

                             {isExpanded && (
                                <div className="p-8 bg-slate-50 border-t border-slate-100 animate-fade-in text-right">
                                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                                      <div className="space-y-1">
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">טלפון ליצירת קשר</p>
                                         <a href={`tel:${l.phone}`} className="font-black tabular-nums text-lg text-brand flex items-center gap-2 justify-end">
                                            {l.phone} <Phone size={16} />
                                         </a>
                                      </div>
                                      <div className="space-y-1">
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">מדריך משובץ</p>
                                         <p className="font-black text-lg">{users.find(u => u.id === l.instructorId)?.name || 'טרם שובץ'}</p>
                                      </div>
                                      <div className="space-y-1">
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">סוג שיעור</p>
                                         <p className="font-black text-lg">{pathOptions.find(o => o.value === l.pathType)?.label || l.pathType}</p>
                                      </div>
                                   </div>

                                   <div className="flex flex-wrap gap-4 pt-8 border-t border-slate-200/40">
                                      <div className="flex gap-2 flex-1 min-w-[300px]">
                                         <button 
                                           onClick={() => updateLesson({ ...l, isRegistered: !l.isRegistered })}
                                           className={`flex-1 p-4 rounded-xl border font-black text-xs flex items-center justify-center gap-2 transition-all ${l.isRegistered ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300 shadow-sm'}`}
                                         >
                                            {l.isRegistered ? <CheckCircle2 size={16}/> : <Circle size={16}/>} הצהרת בריאות
                                         </button>
                                         <button 
                                           onClick={() => updateLesson({ ...l, isPaid: !l.isPaid })}
                                           className={`flex-1 p-4 rounded-xl border font-black text-xs flex items-center justify-center gap-2 transition-all ${l.isPaid ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300 shadow-sm'}`}
                                         >
                                            {l.isPaid ? <CheckCircle2 size={16}/> : <Circle size={16}/>} שולם
                                         </button>
                                      </div>
                                      
                                      <div className="flex gap-2 flex-1 min-w-[300px]">
                                         <button 
                                           onClick={() => updateLesson({ ...l, isCancelled: !l.isCancelled })}
                                           className={`flex-1 p-4 rounded-xl border font-black text-xs flex items-center justify-center gap-2 transition-all ${l.isCancelled ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 shadow-sm hover:border-rose-400'}`}
                                         >
                                            {l.isCancelled ? <Undo2 size={16}/> : <X size={16}/>} 
                                            {l.isCancelled ? 'שחזר שיעור' : 'בטל שיעור'}
                                         </button>
                                         
                                         {!l.isArchived && (
                                            <button 
                                              onClick={() => updateLesson({ ...l, isArchived: true })}
                                              className="flex-1 p-4 rounded-xl border border-indigo-100 bg-white text-indigo-700 font-black text-xs flex items-center justify-center gap-2 hover:bg-indigo-50 shadow-sm"
                                            >
                                               <Archive size={16}/> העבר לארכיון
                                            </button>
                                         )}
                                      </div>
                                   </div>

                                   <div className="flex items-center justify-between mt-8 pt-8 border-t border-slate-200">
                                      <div className="flex gap-3">
                                         {isManager && (
                                           <button 
                                             onClick={() => handleEditClick(l)}
                                             className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-black transition-all shadow-md active:scale-95"
                                           >
                                              עריכה <Edit2 size={14} />
                                           </button>
                                         )}
                                         {isManager && (
                                           <button 
                                             type="button"
                                             onClick={() => handleDelete(l.id)}
                                             className="flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-100 px-6 py-3 rounded-xl font-black text-xs hover:bg-rose-100 transition-all shadow-sm active:scale-95"
                                           >
                                              מחיקה סופית <Trash2 size={14} />
                                           </button>
                                         )}
                                      </div>
                                      <button onClick={() => setExpandedLessonId(null)} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900">סגור פירוט</button>
                                   </div>
                                </div>
                             )}
                          </div>
                       );
                    })}
                 </div>
              </div>
           ))}
        </div>
      </div>

      {/* Time Picker Modal */}
      {isTimePickerOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsTimePickerOpen(false)}>
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-8" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8 flex-row-reverse">
                 <h3 className="text-2xl font-black text-slate-900">שעות פעילות</h3>
                 <button onClick={() => setIsTimePickerOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>
              </div>

              <div className="grid grid-cols-2 gap-8 text-right">
                 <div className="space-y-4">
                    <h4 className="text-sm font-black text-brand uppercase tracking-widest border-b border-brand/10 pb-2 text-center">שעת התחלה</h4>
                    <div className="flex gap-2" dir="ltr">
                       <div className="flex-1 space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase block text-center">שעה</label>
                          <select 
                            className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-lg tabular-nums outline-none appearance-none text-center focus:border-brand"
                            value={tempTimeStart.h}
                            onChange={e => setTempTimeStart({...tempTimeStart, h: e.target.value})}
                          >
                             {Array.from({ length: 15 }).map((_, i) => {
                                const h = (7 + i).toString().padStart(2, '0');
                                return <option key={h} value={h}>{h}</option>
                             })}
                          </select>
                       </div>
                       <div className="flex-1 space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase block text-center">דקות</label>
                          <select 
                            className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-lg tabular-nums outline-none appearance-none text-center focus:border-brand"
                            value={tempTimeStart.m}
                            onChange={e => setTempTimeStart({...tempTimeStart, m: e.target.value})}
                          >
                             {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                                <option key={m} value={m}>{m}</option>
                             ))}
                          </select>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 text-center">שעת סיום</h4>
                    <div className="flex gap-2" dir="ltr">
                       <div className="flex-1 space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase block text-center">שעה</label>
                          <select 
                            className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-lg tabular-nums outline-none appearance-none text-center focus:border-brand"
                            value={tempTimeEnd.h}
                            onChange={e => setTempTimeEnd({...tempTimeEnd, h: e.target.value})}
                          >
                             {Array.from({ length: 15 }).map((_, i) => {
                                const h = (7 + i).toString().padStart(2, '0');
                                return <option key={h} value={h}>{h}</option>
                             })}
                          </select>
                       </div>
                       <div className="flex-1 space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase block text-center">דקות</label>
                          <select 
                            className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-lg tabular-nums outline-none appearance-none text-center focus:border-brand"
                            value={tempTimeEnd.m}
                            onChange={e => setTempTimeEnd({...tempTimeEnd, m: e.target.value})}
                          >
                             {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                                <option key={m} value={m}>{m}</option>
                             ))}
                          </select>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex gap-4 mt-12">
                 <button type="button" onClick={() => setIsTimePickerOpen(false)} className="flex-1 p-5 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase text-xs tracking-widest transition-all hover:bg-slate-200 active:scale-95">ביטול</button>
                 <button type="button" onClick={() => {
                    setForm(prev => ({ ...prev, time: `${tempTimeStart.h}:${tempTimeStart.m}`, endTime: `${tempTimeEnd.h}:${tempTimeEnd.m}` }));
                    setIsTimePickerOpen(false);
                 }} className="flex-[2] p-5 rounded-2xl brand-gradient text-white font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95">אישור שעות</button>
              </div>
           </div>
        </div>
      )}

      {/* Sport Picker Modal */}
      {isSportPickerOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsSportPickerOpen(false)}>
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8 flex-row-reverse">
                 <h3 className="text-2xl font-black text-slate-900">סוג ספורט</h3>
                 <button onClick={() => setIsSportPickerOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {SPORT_TYPES.map(s => (
                    <button 
                      key={s.value} 
                      type="button"
                      onClick={() => { 
                         const defaultPath = s.value === 'קטמרן' ? 'Basic Catamaran (3)' : 'Course';
                         setForm(p => ({ ...p, type: s.value, pathType: defaultPath, lessonNumber: 1 })); 
                         setIsSportPickerOpen(false); 
                      }}
                      className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${form.type === s.value ? 'bg-brand border-brand text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-brand active:scale-95'}`}
                    >
                       {s.icon}
                       <span className="font-black text-xs whitespace-nowrap">{s.value}</span>
                    </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Path Picker Modal */}
      {isPathPickerOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsPathPickerOpen(false)}>
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8 flex-row-reverse">
                 <h3 className="text-2xl font-black text-slate-900">סוג שיעור</h3>
                 <button onClick={() => setIsPathPickerOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="space-y-3 text-right">
                 {pathOptions.map(p => (
                    <button 
                       key={p.value}
                       type="button"
                       onClick={() => { setForm(prev => ({ ...prev, pathType: p.value, lessonNumber: 1 })); setIsPathPickerOpen(false); }}
                       className={`w-full p-6 rounded-2xl border-2 transition-all flex items-center justify-between flex-row-reverse ${form.pathType === p.value ? 'bg-brand border-brand text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-brand active:scale-95'}`}
                    >
                       <Circle size={20} />
                       <span className="font-black text-base">{p.label}</span>
                    </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Instructor Picker Modal */}
      {isInstructorPickerOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsInstructorPickerOpen(false)}>
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8 flex-row-reverse">
                 <div className="text-right">
                    <h3 className="text-2xl font-black text-slate-900">בחר מדריך</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">מוצגים רק מדריכים פנויים לזמן זה</p>
                 </div>
                 <button onClick={() => setIsInstructorPickerOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="space-y-3 text-right max-h-[400px] overflow-y-auto">
                 <button 
                    type="button"
                    onClick={() => { setForm(p => ({ ...p, instructorId: '' })); setIsInstructorPickerOpen(false); }}
                    className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between flex-row-reverse ${!form.instructorId ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-900 active:scale-95'}`}
                 >
                    <X size={18} />
                    <span className="font-black text-base">ללא שיבוץ</span>
                 </button>
                 {availableInstructors.map(u => (
                    <button 
                       key={u.id}
                       type="button"
                       onClick={() => { setForm(prev => ({ ...prev, instructorId: u.id })); setIsInstructorPickerOpen(false); }}
                       className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between flex-row-reverse ${form.instructorId === u.id ? 'bg-brand border-brand text-white shadow-md' : 'bg-white border-slate-100 text-slate-700 hover:border-brand active:scale-95'}`}
                    >
                       <span className="font-black text-base">{u.name}</span>
                    </button>
                 ))}
                 {availableInstructors.length === 0 && (
                   <div className="py-10 text-center text-slate-300 italic font-black">אין מדריכים פנויים בשעות אלו.</div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Credit Card Modal */}
      {isCCModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsCCModalOpen(false)}>
           <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 text-right shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8 flex-row-reverse">
                <h3 className="text-2xl font-black text-slate-900">פרטי פיקדון אשראי</h3>
                <button onClick={() => setIsCCModalOpen(false)} className="p-2 hover:text-rose-500 transition-colors"><X size={24}/></button>
              </div>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">מספר כרטיס</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-left tabular-nums outline-none focus:border-brand" placeholder="0000 0000 0000 0000" value={form.creditCardDeposit?.number} onChange={e => setForm({...form, creditCardDeposit: {...form.creditCardDeposit!, number: e.target.value}})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">תוקף (MM/YY)</label>
                       <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center tabular-nums outline-none focus:border-brand" placeholder="MM/YY" value={form.creditCardDeposit?.expiry} onChange={e => setForm({...form, creditCardDeposit: {...form.creditCardDeposit!, expiry: e.target.value}})} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">CVV</label>
                       <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center tabular-nums outline-none focus:border-brand" placeholder="000" maxLength={3} value={form.creditCardDeposit?.cvv} onChange={e => setForm({...form, creditCardDeposit: {...form.creditCardDeposit!, cvv: e.target.value}})} />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">מספר תעודת זהות</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-left tabular-nums outline-none focus:border-brand" placeholder="000000000" value={form.creditCardDeposit?.ownerId} onChange={e => setForm({...form, creditCardDeposit: {...form.creditCardDeposit!, ownerId: e.target.value}})} />
                 </div>
                 <button onClick={() => setIsCCModalOpen(false)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl mt-4 active:scale-95 transition-all">שמור פרטי פיקדון</button>
              </div>
           </div>
        </div>
      )}

      {/* Lesson Number Picker */}
      {isNumberPickerOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsNumberPickerOpen(false)}>
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black mb-6 text-right">מספר שיעור</h3>
              <div className="grid grid-cols-5 gap-3">
                 {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => { setForm({...form, lessonNumber: n}); setIsNumberPickerOpen(false); }} className={`aspect-square border-2 rounded-2xl font-black text-xl flex items-center justify-center transition-all ${form.lessonNumber === n ? 'border-brand bg-brand text-white shadow-md' : 'border-slate-100 bg-slate-50 hover:border-brand active:scale-95'}`}>{n}</button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {isDatePickerOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsDatePickerOpen(false)}>
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 flex-row-reverse">
                 <h3 className="text-xl font-black text-slate-900">בחר תאריך</h3>
                 <button onClick={() => setIsDatePickerOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={20}/></button>
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <button type="button" onClick={() => setPickerMonthDate(new Date(pickerMonthDate.getFullYear(), pickerMonthDate.getMonth() - 1, 1))} className="p-2 hover:bg-white rounded-xl shadow-sm transition-all text-brand active:scale-90"><ChevronRight size={20}/></button>
                    <span className="font-black text-slate-900 text-sm">{MONTH_NAMES[pickerMonthDate.getMonth()]} {pickerMonthDate.getFullYear()}</span>
                    <button type="button" onClick={() => setPickerMonthDate(new Date(pickerMonthDate.getFullYear(), pickerMonthDate.getMonth() + 1, 1))} className="p-2 hover:bg-white rounded-xl shadow-sm transition-all text-brand active:scale-90"><ChevronLeft size={20}/></button>
                 </div>
                 <div className="grid grid-cols-7 text-center gap-1">
                    {DAY_NAMES.map(d => <div key={d} className="text-[10px] font-black text-slate-400 py-1">{d}</div>)}
                    {Array.from({ length: getFirstDayOfMonth(pickerMonthDate.getFullYear(), pickerMonthDate.getMonth()) }).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({ length: getDaysInMonth(pickerMonthDate.getFullYear(), pickerMonthDate.getMonth()) }).map((_, i) => {
                       const day = i + 1;
                       const dateObj = new Date(pickerMonthDate.getFullYear(), pickerMonthDate.getMonth(), day);
                       const dStr = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                       const isSelected = form.date === dStr;
                       const isToday = new Date().toISOString().split('T')[0] === dStr;
                       return (
                          <button key={day} type="button" onClick={() => handleDateSelect(day)} className={`aspect-square flex items-center justify-center rounded-xl font-black text-sm transition-all relative ${isSelected ? 'bg-brand text-white shadow-md' : 'hover:bg-slate-100 text-slate-700 active:scale-95'} ${isToday && !isSelected ? 'border-2 border-brand/20' : ''}`}>
                             {day}
                             {isToday && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-brand rounded-full" />}
                          </button>
                       );
                    })}
                 </div>
              </div>
              <button onClick={() => setIsDatePickerOpen(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black mt-6 shadow-md uppercase tracking-widest text-xs active:scale-95 transition-all">ביטול</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default SchedulingModule;
