
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { AppState, User, Shift, Lesson, Rental, Task, Availability, ConfirmedShift, WhatsAppTemplate, KnowledgeFile, SeaEvent, Lead, ClubSettings } from './types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';
const SYNC_INTERVAL_MS = 5000;

const fetchWithResponseLogging = async (input: RequestInfo | URL, init?: RequestInit) => {
  const method = init?.method || 'GET';
  const requestUrl = typeof input === 'string' ? input : input.toString();

  try {
    const response = await fetch(input, init);
    const contentType = response.headers.get('content-type') || '';
    const responseClone = response.clone();
    let responseBody: unknown = null;

    try {
      if (contentType.includes('application/json')) {
        responseBody = await responseClone.json();
      } else {
        responseBody = await responseClone.text();
      }
    } catch (parseError) {
      responseBody = '[Unable to parse response body]';
      console.error('[HTTP_RESPONSE_PARSE_FAILED]', { method, url: requestUrl, parseError });
    }

    console.log('[HTTP_RESPONSE]', {
      method,
      url: requestUrl,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: responseBody
    });

    return response;
  } catch (error) {
    console.error('[HTTP_REQUEST_FAILED]', { method, url: requestUrl, error });
    throw error;
  }
};

const INITIAL_USERS: User[] = [
  { id: 'u2', name: 'אור פרידמן', email: 'or@wind.co.il', phone: '0524383707', role: 'Manager', avatar: '', certifications: ['גלישת גלים', 'סאפ'], isArchived: false, isFullTime: true, fixedDayOff: null, canAddBonuses: true, quickCode: '1001' },
  { id: 'u3', name: 'דן פרידמן', email: 'dan@wind.co.il', phone: '0526920922', role: 'Manager', avatar: '', certifications: ['גלישת רוח'], isArchived: false, isFullTime: true, fixedDayOff: null, canAddBonuses: true, quickCode: '1002' },
  { id: 'u4', name: 'ברנדון קפלן שילד', email: 'brandon@wind.co.il', phone: '0502202532', role: 'Shift Manager', avatar: '', certifications: ['גלישת כנף', 'קטמרן'], isArchived: false, canAddBonuses: true, quickCode: '1003' },
  { id: 'u7', name: 'Freegull-חנות', email: 'shop@wind.co.il', phone: '0500000000', role: 'Shop Computer', avatar: '', certifications: [], isArchived: false, canAddBonuses: false, quickCode: '2025' },
  { id: 'u1', name: 'שחר אגוזי', email: 'shachar.egosi@gmail.com', phone: '0504340049', role: 'Instructor', avatar: '', certifications: ['גלישת כנף', 'קטמרן'], isArchived: false, isFullTime: false, fixedDayOff: null, canAddBonuses: false, quickCode: '1111' },
  { id: 'u5', name: 'יהלי לבקוביץ', email: 'yahli@wind.co.il', phone: '0535680071', role: 'Instructor', avatar: '', certifications: ['גלישת גלים', 'סאפ'], isArchived: false, canAddBonuses: false, quickCode: '2222' },
  { id: 'u6', name: 'דוד', email: 'david@wind.co.il', phone: '0544455667', role: 'Warehouse', avatar: '', certifications: [], isArchived: false, canAddBonuses: false, quickCode: '3333' },
];

const INITIAL_CLUB_SETTINGS: ClubSettings = {
  landline: '09-8651474',
  mobile: '052-4383707',
  locationText: 'חוף פולג, נתניה - מועדון גלישה FreeGull',
  mapsUrl: 'https://maps.app.goo.gl/freegull_example',
  bankAccountName: 'פרידמן ספורט ימי בע"מ',
  bankName: 'בנק הפועלים (12)',
  bankBranch: '612',
  bankAccountNumber: '456789'
};

const INITIAL_STATE: AppState = {
  clubId: 'FREEGULL_MAIN',
  currentUser: null,
  isEditorMode: false,
  isTourActive: false,
  users: INITIAL_USERS, 
  shifts: [],
  lessons: [],
  confirmedShifts: [],
  rentals: [],
  events: [],
  tasks: [],
  leads: [],
  availability: [],
  rentalStatus: ['גלישת גלים', 'סאפ', 'גלישת רוח'],
  availableRentalItems: ['גלשן גלים', 'סאפ', 'ציוד גלישת רוח', 'קיאק', 'קטמרן'],
  whatsappTemplates: [
    { id: '1', title: 'אישור שיבוץ שיעור', text: 'היי [שם], שמחנו לשבץ אותך לשיעור גלישה במועדון FreeGull בתאריך [תאריך] בשעה [שעה]. נתראה במים!' },
  ],
  knowledgeFiles: [],
  activeShifts: {},
  clubSettings: INITIAL_CLUB_SETTINGS,
  lastSyncTime: 'מתחבר...',
  syncStatus: 'syncing',
};

interface AppContextType extends AppState {
  login: (identifier: string) => boolean;
  logout: () => void;
  enterEditorMode: () => void;
  switchUser: () => void;
  activeShift: Partial<Shift> | null;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  archiveUser: (userId: string) => void;
  addShift: (shift: Shift) => void;
  updateShift: (shift: Shift) => void;
  startShift: () => void;
  endShift: (data: any) => void;
  addLesson: (lesson: Lesson) => void;
  updateLesson: (lesson: Lesson) => void;
  deleteLesson: (id: string) => void;
  toggleConfirmedShift: (shift: ConfirmedShift) => void;
  addRental: (rental: Rental) => void;
  updateRental: (rental: Rental) => void;
  updateAvailableRentalItems: (items: string[]) => void;
  addTask: (task: Task) => void;
  updateTaskStatus: (id: string, status: Task['status']) => void;
  addLead: (lead: Lead) => void;
  updateLead: (lead: Lead) => void;
  deleteLead: (id: string) => void;
  bulkSaveAvailability: (avails: Availability[]) => void;
  updateClubSettings: (settings: ClubSettings) => void;
  addEvent: (e: SeaEvent) => void;
  updateEvent: (e: SeaEvent) => void;
  deleteEvent: (id: string) => void;
  addWhatsAppTemplate: (t: WhatsAppTemplate) => void;
  updateWhatsAppTemplate: (t: WhatsAppTemplate) => void;
  deleteWhatsAppTemplate: (id: string) => void;
  addKnowledgeFile: (f: KnowledgeFile) => void;
  deleteKnowledgeFile: (id: string) => void;
  syncNow: () => void;
  startTour: () => void;
  endTour: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within an AppProvider');
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const isFirstLoad = useRef(true);
  const isUpdatingCloud = useRef(false);
  const isApplyingRemoteState = useRef(false);
  const clubIdRef = useRef(INITIAL_STATE.clubId);

  const pull = useCallback(async () => {
    try {
      const res = await fetchWithResponseLogging(`${API_BASE_URL}/state/${clubIdRef.current}`);
      if (res.ok) {
        const cloudData = await res.json();
        const nextClubId = cloudData.clubId || clubIdRef.current;
        clubIdRef.current = nextClubId;
        isApplyingRemoteState.current = true;
        setState(prev => ({
          ...prev,
          ...cloudData,
          clubId: nextClubId,
          // If backend is freshly initialized (empty users), keep built-in users for login.
          users: Array.isArray(cloudData.users) && cloudData.users.length > 0 ? cloudData.users : prev.users,
          currentUser: prev.currentUser, // Auth stays local to session
          syncStatus: 'synced',
          lastSyncTime: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }));
      }
    } catch (e) {
      console.error('Pull failed', e);
      setState(prev => ({ ...prev, syncStatus: 'error' }));
    }
  }, []);

  const push = useCallback(async (dataToPush: AppState) => {
    if (isUpdatingCloud.current) return;
    isUpdatingCloud.current = true;
    
    const { currentUser, isEditorMode, syncStatus, lastSyncTime, isTourActive, ...pureData } = dataToPush;
    clubIdRef.current = pureData.clubId || clubIdRef.current;
    
    try {
      await fetchWithResponseLogging(`${API_BASE_URL}/state/${clubIdRef.current}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: pureData })
      });
      setState(prev => ({ ...prev, syncStatus: 'synced' }));
    } catch (e) {
      console.error('Push failed', e);
      setState(prev => ({ ...prev, syncStatus: 'error' }));
    } finally {
      isUpdatingCloud.current = false;
    }
  }, []);

  // Effect: Initialization and Polling
  useEffect(() => {
    pull().then(() => { isFirstLoad.current = false; });
    const interval = setInterval(pull, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pull]);

  // Effect: Auto-Push on any state change
  useEffect(() => {
    if (isFirstLoad.current) return;
    if (isApplyingRemoteState.current) {
      isApplyingRemoteState.current = false;
      return;
    }
    const timeout = setTimeout(() => push(state), 1000);
    return () => clearTimeout(timeout);
  }, [state, push]);

  const login = (id: string) => {
    const user = state.users.find(u => u.email === id || u.quickCode === id);
    if (user && !user.isArchived) {
      setState(p => ({ ...p, currentUser: user }));
      return true;
    }
    return false;
  };

  const logout = () => setState(p => ({ ...p, currentUser: null }));
  const enterEditorMode = () => setState(p => ({ ...p, isEditorMode: true }));
  const switchUser = () => setState(p => ({ ...p, currentUser: null }));

  // Helper for updates to trigger push
  const update = (fn: (prev: AppState) => AppState) => setState(prev => fn(prev));

  const addUser = (u: User) => update(p => ({ ...p, users: [...p.users, u] }));
  const updateUser = (u: User) => update(p => ({ ...p, users: p.users.map(x => x.id === u.id ? u : x) }));
  const deleteUser = (id: string) => update(p => ({ ...p, users: p.users.filter(x => x.id !== id) }));
  const archiveUser = (id: string) => update(p => ({ ...p, users: p.users.map(x => x.id === id ? { ...x, isArchived: true } : x) }));
  
  const addShift = (s: Shift) => update(p => ({ ...p, shifts: [s, ...p.shifts] }));
  const updateShift = (s: Shift) => update(p => ({ ...p, shifts: p.shifts.map(x => x.id === s.id ? s : x) }));

  const startShift = () => {
    if (!state.currentUser) return;
    const s: Partial<Shift> = {
      id: Math.random().toString(36).substr(2, 9),
      userId: state.currentUser.id,
      userName: state.currentUser.name,
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }),
      isClosed: false, bonuses: [], notes: '', teachingHours: 0, hasTravel: false
    };
    update(p => ({ ...p, activeShifts: { ...p.activeShifts, [state.currentUser!.id]: s } }));
  };

  const endShift = (data: any) => {
    if (!state.currentUser) return;
    const active = state.activeShifts[state.currentUser.id];
    if (!active) return;
    const completed: Shift = {
      ...(active as Shift),
      endTime: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }),
      isClosed: true, ...data
    };
    update(p => {
      const nextActive = { ...p.activeShifts };
      delete nextActive[state.currentUser!.id];
      return { ...p, shifts: [completed, ...p.shifts], activeShifts: nextActive };
    });
  };

  const addLesson = (l: Lesson) => update(p => ({ ...p, lessons: [l, ...p.lessons] }));
  const updateLesson = (l: Lesson) => update(p => ({ ...p, lessons: p.lessons.map(x => x.id === l.id ? l : x) }));
  const deleteLesson = (id: string) => update(p => ({ ...p, lessons: p.lessons.filter(x => x.id !== id) }));

  const toggleConfirmedShift = (s: ConfirmedShift) => update(p => {
     const exists = p.confirmedShifts.find(x => x.userId === s.userId && x.date === s.date);
     return { ...p, confirmedShifts: exists ? p.confirmedShifts.filter(x => x.id !== exists.id) : [...p.confirmedShifts, s] };
  });

  const addRental = (r: Rental) => update(p => ({ ...p, rentals: [r, ...p.rentals] }));
  const updateRental = (r: Rental) => update(p => ({ ...p, rentals: p.rentals.map(x => x.id === r.id ? r : x) }));
  const updateAvailableRentalItems = (items: string[]) => update(p => ({ ...p, availableRentalItems: items }));

  const addTask = (t: Task) => update(p => ({ ...p, tasks: [t, ...p.tasks] }));
  const updateTaskStatus = (id: string, s: Task['status']) => update(p => ({ ...p, tasks: p.tasks.map(x => x.id === id ? { ...x, status: s } : x) }));

  const addLead = (l: Lead) => update(p => ({ ...p, leads: [l, ...p.leads] }));
  const updateLead = (l: Lead) => update(p => ({ ...p, leads: p.leads.map(x => x.id === l.id ? l : x) }));
  const deleteLead = (id: string) => update(p => ({ ...p, leads: p.leads.filter(x => x.id !== id) }));

  const bulkSaveAvailability = (avails: Availability[]) => update(p => {
    const map = new Map();
    p.availability.forEach(a => map.set(`${a.userId}-${a.date}`, a));
    avails.forEach(a => map.set(`${a.userId}-${a.date}`, a));
    return { ...p, availability: Array.from(map.values()) };
  });

  const updateClubSettings = (s: ClubSettings) => update(p => ({ ...p, clubSettings: s }));
  const addEvent = (e: SeaEvent) => update(p => ({ ...p, events: [e, ...p.events] }));
  const updateEvent = (e: SeaEvent) => update(p => ({ ...p, events: p.events.map(x => x.id === e.id ? e : x) }));
  const deleteEvent = (id: string) => update(p => ({ ...p, events: p.events.filter(x => x.id !== id) }));

  const addWhatsAppTemplate = (t: WhatsAppTemplate) => update(p => ({ ...p, whatsappTemplates: [t, ...p.whatsappTemplates] }));
  const updateWhatsAppTemplate = (t: WhatsAppTemplate) => update(p => ({ ...p, whatsappTemplates: p.whatsappTemplates.map(x => x.id === t.id ? t : x) }));
  const deleteWhatsAppTemplate = (id: string) => update(p => ({ ...p, whatsappTemplates: p.whatsappTemplates.filter(x => x.id !== id) }));

  const addKnowledgeFile = (f: KnowledgeFile) => update(p => ({ ...p, knowledgeFiles: [f, ...p.knowledgeFiles] }));
  const deleteKnowledgeFile = (id: string) => update(p => ({ ...p, knowledgeFiles: p.knowledgeFiles.filter(x => x.id !== id) }));

  const value: AppContextType = {
    ...state,
    login, logout, enterEditorMode, switchUser,
    activeShift: state.currentUser ? state.activeShifts[state.currentUser.id] || null : null,
    addUser, updateUser, deleteUser, archiveUser,
    addShift, updateShift, startShift, endShift, addLesson, updateLesson, deleteLesson,
    toggleConfirmedShift, addRental, updateRental, updateAvailableRentalItems, addTask, updateTaskStatus,
    addLead, updateLead, deleteLead, bulkSaveAvailability, updateClubSettings,
    addEvent, updateEvent, deleteEvent, 
    addWhatsAppTemplate, updateWhatsAppTemplate, deleteWhatsAppTemplate,
    addKnowledgeFile, deleteKnowledgeFile,
    syncNow: pull,
    startTour: () => setState(p => ({ ...p, isTourActive: true })),
    endTour: () => setState(p => ({ ...p, isTourActive: false }))
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
