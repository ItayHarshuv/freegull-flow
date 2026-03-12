
import React, { useState, useRef, useMemo } from 'react';
import { useAppStore } from '../../store';
import { Anchor, Waves, Plus, Search, User, Phone, Check, Globe, X, ShieldCheck, Calendar, ChevronDown, ChevronUp, Filter, ListPlus, Trash2, Copy, Table, AlertTriangle, LifeBuoy, Play, Minus, ChevronRight, ChevronLeft, BarChart3, Archive, Undo2, Edit, Ship, Save } from 'lucide-react';
import { SeaEvent, EventParticipant, BoatAssignment } from '../../types';
import { isValidOptionalPhone, normalizePhoneInput, PHONE_VALIDATION_MESSAGE } from '../../utils/phone';

interface BulkParticipantEntry {
  tempId: string;
  name: string;
  phone: string;
  equipment: string;
  notes: string;
}

const EventsModule: React.FC = () => {
  const { events, addEvent, updateEvent, deleteEvent, currentUser, users } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Modals State
  const [isNewEventFormOpen, setIsNewEventFormOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  const [showArchive, setShowArchive] = useState(false); 
  
  // New Event State
  const [newEventData, setNewEventData] = useState({ name: '', date: new Date().toISOString().split('T')[0] });
  const [newEventBoats, setNewEventBoats] = useState<BoatAssignment[]>([]);

  // Edit Event State
  const [editingEventData, setEditingEventData] = useState<{ name: string; date: string; boats: BoatAssignment[] }>({ name: '', date: '', boats: [] });
  
  // Participant Edit State
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editParticipantForm, setEditParticipantForm] = useState<Partial<EventParticipant>>({});

  const [newP, setNewP] = useState({ name: '', phone: '', equipment: '', notes: '' });
  const [publicMode, setPublicMode] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authedParticipantId, setAuthedParticipantId] = useState<string | null>(null);

  // Date Picker State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'new' | 'edit'>('new');
  const [pickerMonthDate, setPickerMonthDate] = useState(new Date());

  const MONTH_NAMES = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
  const DAY_NAMES = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

  // Bulk Import State
  const [bulkEntries, setBulkEntries] = useState<BulkParticipantEntry[]>(
    Array.from({ length: 15 }, (_, i) => ({ 
      tempId: i.toString(), name: '', phone: '', equipment: '', notes: '' 
    }))
  );

  const displayedEvents = useMemo(() => {
    return events.filter(e => showArchive ? e.isArchived : !e.isArchived);
  }, [events, showArchive]);

  const activeEvent = useMemo(() => {
    if (selectedEventId) {
      const found = events.find(e => e.id === selectedEventId);
      if (found && (showArchive ? found.isArchived : !found.isArchived)) {
        return found;
      }
    }
    return displayedEvents.length > 0 ? [...displayedEvents].sort((a,b) => (b.date || '').localeCompare(a.date || ''))[0] : null;
  }, [events, selectedEventId, displayedEvents, showArchive]);

  const isManager = ['Site Editor', 'Manager', 'Shift Manager', 'Shop Computer'].includes(currentUser?.role || '');

  // Filter Qualified Boat Operators (Main Operator)
  const qualifiedBoatOperators = useMemo(() => {
    return users.filter(u => !u.isArchived && u.certifications.includes('מפעיל סירת חילוץ'));
  }, [users]);

  // All Users (For Assistant)
  const allStaff = useMemo(() => {
    return users.filter(u => !u.isArchived);
  }, [users]);

  const filteredParticipants = useMemo(() => {
    if (!activeEvent) return [];
    const term = searchTerm.toLowerCase();
    
    // Sort logic: Alphabetical by name only (Static order)
    return (activeEvent.participants || [])
      .filter(p => 
        (p.name || '').toLowerCase().includes(term) || 
        (p.phone || '').includes(term) ||
        (p.equipment || '').toLowerCase().includes(term)
      )
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
  }, [activeEvent, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    if (!activeEvent) return { total: 0, inWater: 0 };
    const parts = activeEvent.participants || [];
    return {
        total: parts.length,
        inWater: parts.filter(p => p.status === 'in-water').length
    };
  }, [activeEvent]);

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const handleDateSelect = (day: number) => {
    const selected = new Date(pickerMonthDate.getFullYear(), pickerMonthDate.getMonth(), day);
    const dStr = new Date(selected.getTime() - selected.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    if (pickerTarget === 'new') {
        setNewEventData(prev => ({ ...prev, date: dStr }));
    } else {
        setEditingEventData(prev => ({ ...prev, date: dStr }));
    }
    setIsDatePickerOpen(false);
  };

  const validateBoats = (boats: BoatAssignment[]) => {
    for (const [index, boat] of boats.entries()) {
      if (!boat.operatorId.trim()) {
        alert(`נא לבחור מפעיל ראשי עבור סירה #${index + 1}`);
        return null;
      }
      if (boat.assistantId && boat.assistantId === boat.operatorId) {
        alert(`לא ניתן לשבץ את אותו עובד כמפעיל וכעוזר בסירה #${index + 1}`);
        return null;
      }
    }

    return boats.map((boat) => ({
      ...boat,
      operatorId: boat.operatorId.trim(),
      assistantId: boat.assistantId.trim(),
    }));
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventData.name) return;
    const boats = validateBoats(newEventBoats);
    if (!boats) return;
    const eventId = Math.random().toString(36).substr(2, 9);
    addEvent({
      id: eventId,
      name: newEventData.name,
      date: newEventData.date,
      boats,
      participants: [],
      isArchived: false
    });
    setSelectedEventId(eventId);
    setNewEventBoats([]);
    setIsNewEventFormOpen(false);
  };

  const handleOpenEditEvent = () => {
      if (!activeEvent) return;
      setEditingEventData({
          name: activeEvent.name,
          date: activeEvent.date,
          boats: activeEvent.boats || []
      });
      setIsEditEventModalOpen(true);
  };

  const handleSaveEventChanges = () => {
      if (!activeEvent) return;
      const boats = validateBoats(editingEventData.boats);
      if (!boats) return;
      updateEvent({
          ...activeEvent,
          name: editingEventData.name,
          date: editingEventData.date,
          boats
      });
      setIsEditEventModalOpen(false);
  };

  const getUnassignedUsers = (boatList: BoatAssignment[], currentBoatId: string | 'new', role: 'operator' | 'assistant') => {
      const assignedIds = new Set<string>();
      boatList.forEach(b => {
          if (b.id !== currentBoatId) {
              if (b.operatorId) assignedIds.add(b.operatorId);
              if (b.assistantId) assignedIds.add(b.assistantId);
          } else {
              if (role === 'operator' && b.assistantId) assignedIds.add(b.assistantId);
              if (role === 'assistant' && b.operatorId) assignedIds.add(b.operatorId);
          }
      });
      return assignedIds;
  };

  const handleArchiveEvent = (e: React.MouseEvent) => {
    e.stopPropagation();
    const eventToArchive = events.find(ev => ev.id === activeEvent?.id);
    if (!eventToArchive) return;

    if (window.confirm(`האם להעביר את האירוע "${eventToArchive.name}" לארכיון?`)) {
      updateEvent({ ...eventToArchive, isArchived: true });
      setSelectedEventId(null);
    }
  };

  const handleRestoreEvent = (e: React.MouseEvent) => {
    e.stopPropagation();
    const eventToRestore = events.find(ev => ev.id === activeEvent?.id);
    if (!eventToRestore) return;

    if (window.confirm(`האם לשחזר את האירוע "${eventToRestore.name}" לפעילות שוטפת?`)) {
      updateEvent({ ...eventToRestore, isArchived: false });
      setSelectedEventId(null);
    }
  };

  const handleDeleteEventPermanently = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!activeEvent) return;
      if (window.confirm(`האם אתה בטוח שברצונך למחוק את האירוע "${activeEvent.name}" לצמיתות? פעולה זו אינה הפיכה.`)) {
          deleteEvent(activeEvent.id);
          setSelectedEventId(null);
      }
  };

  const handleEditParticipantStart = (p: EventParticipant) => {
    setEditingParticipantId(p.id);
    setEditParticipantForm(p);
  };

  const handleEditParticipantSave = () => {
    if (!activeEvent || !editingParticipantId) return;
    if (!isValidOptionalPhone(editParticipantForm.phone)) {
      alert(PHONE_VALIDATION_MESSAGE);
      return;
    }
    const updatedParticipants = activeEvent.participants.map(p => 
      p.id === editingParticipantId
        ? { ...p, ...editParticipantForm, phone: normalizePhoneInput(editParticipantForm.phone) }
        : p
    );
    updateEvent({ ...activeEvent, participants: updatedParticipants });
    setEditingParticipantId(null);
    setEditParticipantForm({});
  };

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !newP.name) return;
    if (!isValidOptionalPhone(newP.phone)) {
      alert(PHONE_VALIDATION_MESSAGE);
      return;
    }
    const p: EventParticipant = {
      id: Math.random().toString(36).substr(2, 9),
      ...newP,
      phone: normalizePhoneInput(newP.phone),
      status: 'out-water',
      hasArrived: false,
      rescues: 0
    };
    updateEvent({ ...activeEvent, participants: [p, ...(activeEvent.participants || [])] });
    setNewP({ name: '', phone: '', equipment: '', notes: '' });
  };

  const handleDeleteParticipant = (pId: string, pName: string) => {
      const eventToUpdate = events.find(ev => ev.id === activeEvent?.id);
      if (!eventToUpdate) return;

      if (window.confirm(`האם למחוק את המשתתף "${pName}" מיום החילוץ?`)) {
          const updatedParticipants = (eventToUpdate.participants || []).filter(p => p.id !== pId);
          updateEvent({ ...eventToUpdate, participants: updatedParticipants });
      }
  };

  const toggleArrived = (pId: string) => {
    if (!activeEvent) return;
    const participants = (activeEvent.participants || []).map(p => 
      p.id === pId ? { ...p, hasArrived: true, status: 'in-water' as const } : p
    );
    updateEvent({ ...activeEvent, participants });
  };

  const toggleWaterStatus = (pId: string) => {
    if (!activeEvent) return;
    const participants = (activeEvent.participants || []).map(p => 
      p.id === pId ? { ...p, status: (p.status === 'in-water' ? 'out-water' : 'in-water') as any } : p
    );
    updateEvent({ ...activeEvent, participants });
  };

  const addBulkRows = (count: number = 1) => {
    const newRows = Array.from({ length: count }, () => ({
      tempId: Math.random().toString(),
      name: '',
      phone: '',
      equipment: '',
      notes: ''
    }));
    setBulkEntries([...bulkEntries, ...newRows]);
  };

  const removeBulkRow = (tempId: string) => {
    if (bulkEntries.length > 1) {
      setBulkEntries(bulkEntries.filter(b => b.tempId !== tempId));
    }
  };

  const updateBulkEntry = (tempId: string, field: keyof BulkParticipantEntry, value: string) => {
    setBulkEntries(bulkEntries.map(b => b.tempId === tempId ? { ...b, [field]: value } : b));
  };

  const handlePaste = (e: React.ClipboardEvent, startTempId: string) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData.includes('\t') && !pasteData.includes('\n')) return;

    e.preventDefault();
    const rows = pasteData.split(/\r?\n/).filter(row => row.trim() !== '');
    
    setBulkEntries(prev => {
      const startIndex = prev.findIndex(b => b.tempId === startTempId);
      if (startIndex === -1) return prev;

      const newEntries = [...prev];

      rows.forEach((row, rowOffset) => {
        const targetIdx = startIndex + rowOffset;
        const columns = row.split('\t');
        
        if (targetIdx >= newEntries.length) {
          newEntries.push({
            tempId: Math.random().toString(),
            name: '',
            phone: '',
            equipment: '',
            notes: ''
          });
        }

        newEntries[targetIdx] = { ...newEntries[targetIdx] };

        if (columns[0]) newEntries[targetIdx].name = columns[0].trim();
        if (columns[1]) {
           let rawPhone = columns[1].trim();
           const digitsOnly = rawPhone.replace(/\D/g, '');
           if (digitsOnly.length === 9 && digitsOnly.startsWith('5')) {
              rawPhone = '0' + rawPhone;
           }
           newEntries[targetIdx].phone = rawPhone;
        }
        if (columns[2]) newEntries[targetIdx].equipment = columns[2].trim();
        if (columns[3]) newEntries[targetIdx].notes = columns[3].trim();
      });

      return newEntries;
    });
  };

  const submitBulkImport = () => {
    if (!activeEvent) return;
    const validEntries = bulkEntries.filter(b => b.name.trim() !== '');
    if (validEntries.length === 0) {
      alert('נא להזין לפחות שם אחד');
      return;
    }
    if (validEntries.some((entry) => !isValidOptionalPhone(entry.phone))) {
      alert(PHONE_VALIDATION_MESSAGE);
      return;
    }

    const newParticipants: EventParticipant[] = validEntries.map(b => {
      const p: EventParticipant = {
        id: Math.random().toString(36).substr(2, 9),
        name: b.name,
        phone: normalizePhoneInput(b.phone),
        equipment: b.equipment,
        notes: b.notes,
        status: 'out-water',
        hasArrived: false,
        rescues: 0
      };
      return p;
    });

    updateEvent({ ...activeEvent, participants: [...newParticipants, ...(activeEvent.participants || [])] });
    setIsBulkModalOpen(false);
    setBulkEntries(Array.from({ length: 15 }, (_, i) => ({ 
      tempId: i.toString(), name: '', phone: '', equipment: '', notes: '' 
    })));
  };

  const renderBoatManager = (
    currentBoats: BoatAssignment[], 
    setBoats: React.Dispatch<React.SetStateAction<BoatAssignment[]>>
  ) => {
    const handleAddBoat = () => {
      const newBoat: BoatAssignment = {
          id: Math.random().toString(36).substr(2, 9),
          operatorId: '',
          assistantId: ''
      };
      setBoats([...currentBoats, newBoat]);
    };

    const updateBoat = (id: string, field: 'operatorId' | 'assistantId', value: string) => {
        setBoats(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const removeBoat = (id: string) => {
        setBoats(prev => prev.filter(b => b.id !== id));
    };

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2 justify-end">
                ניהול סירות חילוץ <Ship size={18} className="text-indigo-600"/>
            </h4>
            {currentBoats.map((boat, idx) => {
                const busyUsers = getUnassignedUsers(currentBoats, boat.id, 'operator');
                const busyAssistants = getUnassignedUsers(currentBoats, boat.id, 'assistant');

                return (
                    <div key={boat.id} className="bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl flex flex-col gap-3">
                        <div className="flex items-center justify-between flex-row-reverse">
                            <span className="text-xs font-black text-slate-400">סירה #{idx + 1}</span>
                            <button onClick={() => removeBoat(boat.id)} className="text-rose-500 hover:text-rose-700 p-1"><Trash2 size={16}/></button>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">מפעיל ראשי</label>
                                <select 
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-right outline-none focus:border-brand"
                                    value={boat.operatorId}
                                    onChange={e => updateBoat(boat.id, 'operatorId', e.target.value)}
                                >
                                    <option value="">בחר מפעיל...</option>
                                    {qualifiedBoatOperators.map(u => (
                                        <option key={u.id} value={u.id} disabled={busyUsers.has(u.id)} className={busyUsers.has(u.id) ? 'text-slate-300' : ''}>
                                            {u.name} {busyUsers.has(u.id) ? '(משובץ)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">עוזר (אופציונלי)</label>
                                <select 
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-right outline-none focus:border-brand"
                                    value={boat.assistantId}
                                    onChange={e => updateBoat(boat.id, 'assistantId', e.target.value)}
                                >
                                    <option value="">ללא עוזר</option>
                                    {allStaff.map(u => (
                                        <option key={u.id} value={u.id} disabled={busyAssistants.has(u.id)} className={busyAssistants.has(u.id) ? 'text-slate-300' : ''}>
                                            {u.name} {busyAssistants.has(u.id) ? '(משובץ)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                );
            })}
            <button 
                onClick={handleAddBoat}
                className="w-full py-3 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-2xl font-black text-xs hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                type="button"
            >
                <Plus size={16}/> הוסף סירה
            </button>
        </div>
    );
  };

  return (
    <div className="space-y-8 md:space-y-12 max-w-7xl mx-auto text-right animate-fade-in px-1" dir="rtl">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-10 flex-row-reverse">
        <div className="text-right w-full md:w-auto">
          <h2 className="text-4xl md:text-5xl font-black text-indigo-950 tracking-tight leading-none">חילוצים במזרחית</h2>
          <p className="text-slate-600 font-bold uppercase tracking-widest text-xs mt-3">ניהול ימי חילוץ ומעקב בזמן אמת</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
           {isManager && (
             <button onClick={() => setIsNewEventFormOpen(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all justify-center">
                <Plus size={20}/> פתח יום חילוץ
             </button>
           )}
           <button 
             onClick={() => { setPublicMode(!publicMode); setAuthCode(''); setAuthedParticipantId(null); }} 
             className={`flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${publicMode ? 'bg-indigo-950 text-white' : 'bg-white text-indigo-950 border-2 border-indigo-950 hover:bg-indigo-50'}`}
           >
              <Globe size={18}/> {publicMode ? 'חזרה למפעיל' : 'מצב לקוחות (טאבלט)'}
           </button>
           {isManager && !publicMode && (
             <button 
                onClick={() => setShowArchive(!showArchive)}
                className={`flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${showArchive ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-slate-800'}`}
             >
                {showArchive ? <Undo2 size={18} /> : <Archive size={18} />}
                {showArchive ? 'חזרה לפעילים' : 'ארכיון אירועים'}
             </button>
           )}
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
         <div className="relative w-full md:w-80">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              placeholder="חפש גולש או ציוד ביום זה..." 
              className="w-full p-4 pr-11 bg-white border-2 border-slate-200 rounded-[2rem] font-black text-right shadow-sm focus:border-indigo-950 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>

         <div className="flex gap-2 overflow-x-auto pb-4 justify-end scroll-hint max-w-full">
            {[...displayedEvents].sort((a,b) => (b.date || '').localeCompare(a.date || '')).map(ev => (
              <button key={ev.id} onClick={() => setSelectedEventId(ev.id)} className={`px-6 py-3 rounded-xl font-black text-xs transition-all whitespace-nowrap shadow-sm border-2 ${activeEvent?.id === ev.id ? 'bg-indigo-950 text-white border-indigo-950' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}>
                 {ev.name} ({ev.date ? new Date(ev.date).toLocaleDateString('he-IL') : 'תאריך חסר'})
              </button>
            ))}
         </div>
      </div>

      {activeEvent ? (
        <div className="grid lg:grid-cols-4 gap-12">
           <div className="lg:col-span-3 space-y-10">
              
              <div className="flex flex-col gap-6">
                 <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                    
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex gap-4">
                            <div className="flex items-center gap-3 bg-emerald-50 text-emerald-800 border border-emerald-100 px-5 py-3 rounded-2xl shadow-sm">
                                <Waves size={24} className="animate-pulse" />
                                <div>
                                <span className="block text-2xl font-black tabular-nums leading-none">{stats.inWater}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest">במים כעת</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white text-slate-600 border border-slate-100 px-5 py-3 rounded-2xl shadow-sm">
                                <User size={24} />
                                <div>
                                <span className="block text-2xl font-black tabular-nums leading-none">{stats.total}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest">סה"כ גולשים</span>
                                </div>
                            </div>
                        </div>

                        {activeEvent.boats && activeEvent.boats.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
                                {activeEvent.boats.map(boat => {
                                    const operator = users.find(u => u.id === boat.operatorId);
                                    const assistant = users.find(u => u.id === boat.assistantId);
                                    return (
                                        <div key={boat.id} className="flex items-center gap-3 bg-indigo-50 text-indigo-900 border border-indigo-100 px-4 py-2 rounded-2xl whitespace-nowrap">
                                            <Ship size={18} className="text-indigo-500"/>
                                            <div className="text-right">
                                                <div className="text-xs font-black">{operator?.name || 'ללא מפעיל'}</div>
                                                {assistant && (
                                                   <div className="text-[9px] font-bold opacity-70 flex flex-col items-end">
                                                      <span>+ {assistant.name}</span>
                                                      <a href={`tel:${assistant.phone}`} className="tabular-nums flex items-center gap-1">
                                                         {assistant.phone} <Phone size={8}/>
                                                      </a>
                                                   </div>
                                                )}
                                                <a href={`tel:${operator?.phone}`} className="text-[9px] opacity-70 hover:opacity-100 font-bold tabular-nums flex items-center gap-1 mt-0.5 border-t border-indigo-200 pt-0.5">
                                                    {operator?.phone} <Phone size={8}/>
                                                </a>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {isManager && !publicMode && (
                      <div className="flex gap-3 w-full sm:w-auto">
                        {!activeEvent.isArchived && (
                            <button 
                                onClick={handleOpenEditEvent}
                                className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-blue-700 transition-all active:scale-95"
                            >
                                <Edit size={16} /> עריכת פרטים וסירות
                            </button>
                        )}
                        
                        {!activeEvent.isArchived ? (
                          <button 
                            onClick={handleArchiveEvent}
                            className="flex items-center justify-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-orange-600 transition-all active:scale-95"
                          >
                            <Archive size={16} /> העבר לארכיון
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={handleRestoreEvent}
                              className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-indigo-200 hover:bg-indigo-100 transition-all"
                            >
                              <Undo2 size={16} /> שחזר אירוע
                            </button>
                            <button 
                              onClick={handleDeleteEventPermanently}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-all"
                            >
                              <Trash2 size={16} /> מחיקה סופית
                            </button>
                          </>
                        )}
                      </div>
                    )}
                 </div>
              </div>

              {publicMode && (
                <div className="bg-indigo-950 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 border-b-8 border-indigo-900 flex-row-reverse">
                   <div className="text-right flex items-center gap-4 flex-row-reverse">
                      <ShieldCheck size={32} className="text-brand"/>
                      <div>
                         <h3 className="text-xl font-black">זיהוי ועדכון עצמי</h3>
                         <p className="text-xs opacity-60 italic">הזן 4 ספרות אחרונות של הטלפון ולחץ על שמך</p>
                      </div>
                   </div>
                   <input 
                      type="password" 
                      maxLength={4} 
                      placeholder="קוד" 
                      className="p-4 bg-white/10 border-2 border-white/20 rounded-2xl text-center font-black text-2xl text-white outline-none w-full md:w-48 tracking-[0.5em] shadow-inner tabular-nums"
                      value={authCode}
                      onChange={e => setAuthCode(e.target.value.replace(/\D/g, ''))}
                   />
                </div>
              )}

              {!publicMode && isManager && (
                <div className="bg-white p-8 md:p-10 rounded-[3.5rem] shadow-2xl border-2 border-slate-100 flex flex-col gap-6">
                   <div className="flex justify-between items-center flex-row-reverse">
                      <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 justify-end flex-row-reverse">
                        הוספה ידנית <Plus size={24} className="text-indigo-600" strokeWidth={4}/>
                      </h3>
                      <button 
                        onClick={() => setIsBulkModalOpen(true)}
                        className="bg-indigo-950 text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg"
                      >
                         <Table size={16}/> טעינת אקסל (העתק-הדבק)
                      </button>
                   </div>
                   <form onSubmit={handleAddParticipant} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase mr-1">שם הגולש *</label>
                            <input required placeholder="שם מלא" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner outline-none focus:ring-2 focus:ring-indigo-200" value={newP.name} onChange={e => setNewP({...newP, name: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase mr-1">טלפון</label>
                            <input inputMode="tel" title={PHONE_VALIDATION_MESSAGE} placeholder="05xxxxxxxx" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner tabular-nums outline-none focus:ring-2 focus:ring-indigo-200" value={newP.phone} onChange={e => setNewP({...newP, phone: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase mr-1">סוג ספורט</label>
                            <input placeholder="סאפ, כנף, רוח..." className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner outline-none focus:ring-2 focus:ring-indigo-200" value={newP.equipment} onChange={e => setNewP({...newP, equipment: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase mr-1">הערות / פרטים</label>
                            <input placeholder="מידע נוסף..." className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner outline-none focus:ring-2 focus:ring-indigo-200" value={newP.notes} onChange={e => setNewP({...newP, notes: e.target.value})} />
                         </div>
                      </div>
                      <button type="submit" className="w-full bg-indigo-950 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3">
                         <Plus size={20} /> הוסף גולש לרשימה
                      </button>
                   </form>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredParticipants.map(p => {
                  const isActive = p.hasArrived;
                  const isInWater = p.status === 'in-water';
                  const isEditing = editingParticipantId === p.id;

                  return (
                    <div key={p.id} className={`p-6 rounded-[2.5rem] border-2 shadow-xl transition-all relative flex flex-col gap-4 ${isActive ? 'bg-white border-slate-100' : 'bg-slate-50 border-dashed border-slate-200'}`}>
                       
                       {isEditing ? (
                          <div className="space-y-3 animate-fade-in">
                             <input className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg font-black text-sm text-right" value={editParticipantForm.name} onChange={e => setEditParticipantForm({...editParticipantForm, name: e.target.value})} placeholder="שם מלא"/>
                             <input inputMode="tel" title={PHONE_VALIDATION_MESSAGE} className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-xs text-right tabular-nums" value={editParticipantForm.phone} onChange={e => setEditParticipantForm({...editParticipantForm, phone: e.target.value})} placeholder="טלפון"/>
                             <input className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-xs text-right" value={editParticipantForm.equipment} onChange={e => setEditParticipantForm({...editParticipantForm, equipment: e.target.value})} placeholder="ציוד"/>
                             <textarea className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-xs text-right h-20" value={editParticipantForm.notes || ''} onChange={e => setEditParticipantForm({...editParticipantForm, notes: e.target.value})} placeholder="הערות"/>
                             <button onClick={handleEditParticipantSave} className="w-full bg-emerald-500 text-white py-2 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-2"><Save size={16}/> שמור שינויים</button>
                          </div>
                       ) : (
                          <div className="flex justify-between items-start flex-row-reverse">
                             <div className="flex gap-4 items-center flex-row-reverse overflow-hidden">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black shadow-md ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                   <User size={24} />
                                </div>
                                <div className="text-right min-w-0">
                                   <h3 className="text-xl font-black text-slate-900 leading-tight truncate">{p.name}</h3>
                                   <div className="text-[10px] font-bold text-slate-500 uppercase flex flex-col">
                                      <span className="truncate">{p.equipment || 'ציוד לא צוין'}</span>
                                      {p.phone && <span className="tabular-nums">{p.phone}</span>}
                                      {p.notes && <span className="text-indigo-600 truncate max-w-[150px]">{p.notes}</span>}
                                   </div>
                                </div>
                             </div>
                             
                             <div className="flex flex-col items-end gap-2 shrink-0">
                                {isManager && !publicMode && (
                                   <div className="flex gap-1">
                                      <button onClick={() => handleEditParticipantStart(p)} className="text-white bg-blue-600 hover:bg-blue-700 p-1.5 rounded-lg transition-all shadow-sm">
                                         <Edit size={14} />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteParticipant(p.id, p.name); }} 
                                        className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-all"
                                      >
                                         <Trash2 size={14} />
                                      </button>
                                   </div>
                                )}
                             </div>
                          </div>
                       )}

                       {!isActive && !isEditing ? (
                          <button 
                             onClick={() => toggleArrived(p.id)}
                             className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                             <Play size={20} fill="currentColor" /> הפעל / הגיע לים
                          </button>
                       ) : !isEditing && (
                          <div className="space-y-4 pt-2 animate-fade-in">
                             <div className="flex gap-3">
                                <button 
                                   onClick={() => toggleWaterStatus(p.id)}
                                   className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 border-b-4 flex items-center justify-center gap-2 ${isInWater ? 'bg-emerald-500 text-white border-emerald-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                                >
                                   {isInWater ? <Waves size={18} /> : <Anchor size={18} />}
                                   {isInWater ? 'נמצא במים' : 'מחוץ למים'}
                                </button>
                             </div>
                          </div>
                       )}
                    </div>
                  );
                })}
                {filteredParticipants.length === 0 && (
                   <div className="sm:col-span-2 py-20 text-center bg-white border-4 border-dashed border-slate-100 rounded-[3rem] text-slate-300 font-black italic text-xl italic">אין גולשים תואמים לחיפוש.</div>
                )}
              </div>
           </div>
        </div>
      ) : (
        <div className="py-40 text-center bg-white border-4 border-dashed border-slate-200 rounded-[4rem] text-slate-300 font-black italic text-3xl animate-pulse">
           {showArchive ? 'אין אירועים בארכיון' : 'פתח יום חילוץ חדש כדי להתחיל.'}
        </div>
      )}

      {isNewEventFormOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsNewEventFormOpen(false)}>
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-12 overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-10 flex-row-reverse">
                 <h3 className="text-3xl font-black text-slate-900 leading-tight">פתיחת יום חילוץ</h3>
                 <button onClick={() => setIsNewEventFormOpen(false)} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:text-slate-900"><X size={28} /></button>
              </div>
              <form onSubmit={handleCreateEvent} className="space-y-8 text-right">
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">שם היום</label>
                    <input required className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner" placeholder="מזרחית 2025" value={newEventData.name} onChange={e => setNewEventData({...newEventData, name: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">תאריך</label>
                    <button type="button" onClick={() => { setPickerTarget('new'); setIsDatePickerOpen(true); }} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner cursor-pointer flex items-center justify-between hover:border-brand transition-all">
                       <Calendar size={20} className="text-brand" />
                       <span className="tabular-nums">{new Date(newEventData.date).toLocaleDateString('he-IL')}</span>
                    </button>
                 </div>

                 <div className="border-t border-slate-100 pt-6">
                    {renderBoatManager(newEventBoats, setNewEventBoats)}
                 </div>

                 <button type="submit" className="w-full brand-gradient text-white py-6 rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all uppercase tracking-widest">צור אירוע</button>
              </form>
           </div>
        </div>
      )}

      {isEditEventModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsEditEventModalOpen(false)}>
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-8 md:p-12 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-10 flex-row-reverse">
                 <h3 className="text-2xl font-black text-slate-900 leading-tight">עריכת פרטי אירוע</h3>
                 <button onClick={() => setIsEditEventModalOpen(false)} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:text-slate-900"><X size={24} /></button>
              </div>
              <div className="space-y-8 text-right">
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">שם היום</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner" value={editingEventData.name} onChange={e => setEditingEventData({...editingEventData, name: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">תאריך</label>
                    <button type="button" onClick={() => { setPickerTarget('edit'); setIsDatePickerOpen(true); }} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner cursor-pointer flex items-center justify-between hover:border-brand transition-all">
                       <Calendar size={20} className="text-brand" />
                       <span className="tabular-nums">{new Date(editingEventData.date).toLocaleDateString('he-IL')}</span>
                    </button>
                 </div>

                 <div className="border-t border-slate-100 pt-6">
                    {renderBoatManager(editingEventData.boats, (newBoats) => {
                       if (typeof newBoats === 'function') {
                          setEditingEventData(prev => ({...prev, boats: newBoats(prev.boats)}));
                       } else {
                          setEditingEventData(prev => ({...prev, boats: newBoats}));
                       }
                    })}
                 </div>

                 <button onClick={handleSaveEventChanges} className="w-full brand-gradient text-white py-5 rounded-[2rem] font-black text-base shadow-xl active:scale-95 transition-all uppercase tracking-widest mt-4">שמור שינויים</button>
              </div>
           </div>
        </div>
      )}

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
                       
                       const targetDate = pickerTarget === 'new' ? newEventData.date : editingEventData.date;
                       const isSelected = targetDate === dStr;
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

      {isBulkModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsBulkModalOpen(false)}>
           <div className="bg-white w-full max-w-[98%] md:max-w-7xl rounded-[2.5rem] shadow-2xl p-6 md:p-10 overflow-y-auto max-h-[95vh]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6 flex-row-reverse">
                 <div className="text-right">
                    <h3 className="text-3xl font-black text-indigo-950 leading-tight">טעינת גולשים (Excel)</h3>
                    <p className="text-slate-500 font-bold text-sm mt-1">הדבק נתונים מהאקסל (Ctrl+V). סדר עמודות: שם | טלפון | סוג ספורט | פרטים</p>
                 </div>
                 <button onClick={() => setIsBulkModalOpen(false)} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:text-slate-900"><X size={28} /></button>
              </div>

              <div className="bg-indigo-50/50 p-4 rounded-2xl mb-6 flex items-center gap-3 border border-indigo-100 text-indigo-900 font-bold text-xs flex-row-reverse">
                 <Copy size={16}/> ניתן להדביק עמודות בסדר הבא: שם | טלפון | סוג ספורט | פרטים/הערות
              </div>

              <div className="space-y-6">
                 <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-inner bg-slate-50">
                    <table className="w-full text-right border-collapse min-w-[1200px]">
                       <thead>
                          <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 bg-white sticky top-0">
                             <th className="p-3 w-[20px] text-center">#</th>
                             <th className="p-3 w-1/4">שם מלא *</th>
                             <th className="p-3 w-1/4">טלפון</th>
                             <th className="p-3 w-1/4">סוג ספורט</th>
                             <th className="p-3 w-1/4">פרטים / הערות</th>
                             <th className="p-3 w-[50px]"></th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {bulkEntries.map((entry, index) => (
                             <tr key={entry.tempId} className="group hover:bg-white transition-colors">
                                <td className="p-2 text-center text-[10px] font-bold text-slate-300">{index + 1}</td>
                                <td className="p-1">
                                   <input 
                                     className="w-full p-3 bg-transparent hover:bg-indigo-50/30 rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" 
                                     placeholder="הזן שם או הדבק"
                                     value={entry.name}
                                     onPaste={(e) => handlePaste(e, entry.tempId)}
                                     onChange={(e) => updateBulkEntry(entry.tempId, 'name', e.target.value)}
                                   />
                                </td>
                                <td className="p-1">
                                   <input 
                                     className="w-full p-3 bg-transparent hover:bg-indigo-50/30 rounded-lg font-bold text-sm tabular-nums outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" 
                                     placeholder="טלפון"
                                     value={entry.phone}
                                     onChange={(e) => updateBulkEntry(entry.tempId, 'phone', e.target.value)}
                                   />
                                </td>
                                <td className="p-1">
                                  <input 
                                     className="w-full p-3 bg-transparent hover:bg-indigo-50/30 rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" 
                                     placeholder="סוג ספורט"
                                     value={entry.equipment}
                                     onChange={(e) => updateBulkEntry(entry.tempId, 'equipment', e.target.value)}
                                   />
                                </td>
                                <td className="p-1">
                                   <input 
                                     className="w-full p-3 bg-transparent hover:bg-indigo-50/30 rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" 
                                     placeholder="הערות..."
                                     value={entry.notes}
                                     onChange={(e) => updateBulkEntry(entry.tempId, 'notes', e.target.value)}
                                   />
                                </td>
                                <td className="p-2 text-center">
                                   <button onClick={() => removeBulkRow(entry.tempId)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                      <Trash2 size={16}/>
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>

                 <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6">
                    <div className="flex gap-3">
                       <button 
                          onClick={() => addBulkRows(1)}
                          className="flex items-center gap-2 text-indigo-600 font-black text-sm bg-white border-2 border-indigo-100 px-6 py-3 rounded-2xl hover:bg-indigo-50 transition-all shadow-sm"
                       >
                          <Plus size={18}/> הוסף שורה
                       </button>
                       <button 
                          onClick={() => addBulkRows(10)}
                          className="flex items-center gap-2 text-indigo-600 font-black text-sm bg-white border-2 border-indigo-100 px-6 py-3 rounded-2xl hover:bg-indigo-50 transition-all shadow-sm"
                       >
                          <ListPlus size={18}/> הוסף 10 שורות
                       </button>
                    </div>
                    
                    <div className="flex gap-4 w-full md:w-auto">
                       <button onClick={() => setIsBulkModalOpen(false)} className="flex-1 md:flex-none px-10 py-5 rounded-2xl font-black text-slate-500 hover:bg-slate-100 transition-all uppercase tracking-widest text-xs">ביטול</button>
                       <button 
                         onClick={submitBulkImport}
                         className="flex-1 md:flex-none bg-indigo-950 text-white px-12 py-5 rounded-[2rem] font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 border-b-8 border-indigo-900"
                       >
                          <Check size={24}/> אשר וטען ({bulkEntries.filter(b => b.name).length})
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EventsModule;
