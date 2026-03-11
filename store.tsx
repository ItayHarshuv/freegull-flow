
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { AppState, User, Shift, Lesson, Rental, Task, Availability, ConfirmedShift, WhatsAppTemplate, KnowledgeFile, SeaEvent, Lead, ClubSettings } from './types';

const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
const SYNC_INTERVAL_MS = 5000;

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
  authHydrated: false,
  isEditorMode: false,
  isTourActive: false,
  users: [],
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
  login: (identifier: string) => Promise<boolean>;
  logout: () => Promise<void>;
  enterEditorMode: () => void;
  switchUser: () => Promise<void>;
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
  const [isDataDirty, setIsDataDirty] = useState(false);
  const isFirstLoad = useRef(true);
  const isUpdatingCloud = useRef(false);
  const isApplyingRemoteState = useRef(false);
  const clubIdRef = useRef(INITIAL_STATE.clubId);
  const serverVersionRef = useRef(0);
  const isDataDirtyRef = useRef(false);
  const localMutationVersionRef = useRef(0);
  const requestIdRef = useRef(0);
  const latestStateRef = useRef(INITIAL_STATE);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  const markDataDirty = useCallback(() => {
    localMutationVersionRef.current += 1;
    isDataDirtyRef.current = true;
    setIsDataDirty(true);
  }, []);

  const clearDataDirty = useCallback(() => {
    isDataDirtyRef.current = false;
    setIsDataDirty(false);
  }, []);

  const fetchServerVersion = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/state/${clubIdRef.current}/version`, {
      credentials: 'include'
    });
    if (!res.ok) {
      throw new Error(`Version check failed with status ${res.status}`);
    }
    const payload = await res.json();
    return Number(payload?.serverVersion ?? 0);
  }, []);

  const pull = useCallback(async ({ force = false, allowDuringPush = false }: { force?: boolean; allowDuringPush?: boolean } = {}) => {
    if (!force && isUpdatingCloud.current && !allowDuringPush) return;
    if (!force && isDataDirtyRef.current) return;
    const requestId = ++requestIdRef.current;
    try {
      if (!force) {
        const latestVersion = await fetchServerVersion();
        if (latestVersion === serverVersionRef.current) {
          setState(prev => ({
            ...prev,
            syncStatus: 'synced',
            lastSyncTime: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }));
          return;
        }
      }

      const res = await fetch(`${API_BASE_URL}/state/${clubIdRef.current}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const cloudPayload = await res.json();
        const serverVersion = Number(cloudPayload?.serverVersion ?? 0);
        const { serverVersion: _serverVersion, ...cloudData } = cloudPayload || {};
        const nextClubId = cloudData.clubId || clubIdRef.current;
        clubIdRef.current = nextClubId;
        serverVersionRef.current = serverVersion;
        isApplyingRemoteState.current = true;
        setState(prev => ({
          ...prev,
          ...cloudData,
          clubId: nextClubId,
          users: Array.isArray(cloudData.users) ? cloudData.users : prev.users,
          currentUser: prev.currentUser, // Auth stays local to session
          syncStatus: 'synced',
          lastSyncTime: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }));
      } else if (res.status === 401) {
        setState(prev => ({ ...prev, currentUser: null, syncStatus: 'error' }));
      }
    } catch (e) {
      console.error('Pull failed', e);
      setState(prev => ({ ...prev, syncStatus: 'error' }));
    }
  }, [fetchServerVersion]);

  const push = useCallback(async (dataToPush: AppState, mutationVersionAtSchedule: number, allowRetry = true) => {
    if (isUpdatingCloud.current) return;
    isUpdatingCloud.current = true;
    
    const { currentUser, authHydrated: _authHydrated, isEditorMode, syncStatus, lastSyncTime, isTourActive, ...pureData } = dataToPush;
    clubIdRef.current = pureData.clubId || clubIdRef.current;
    const expectedVersion = serverVersionRef.current;
    const requestId = ++requestIdRef.current;
    let shouldRetry = false;
    
    try {
      console.log('[SYNC_PUSH_START]', { requestId, expectedVersion, mutationVersionAtSchedule, clubId: clubIdRef.current });
      const res = await fetch(`${API_BASE_URL}/state/${clubIdRef.current}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: pureData, expectedVersion })
      });
      if (res.status === 409) {
        const conflictBody = await res.json().catch(() => ({}));
        serverVersionRef.current = Number(conflictBody?.serverVersion ?? serverVersionRef.current);
        console.warn('[SYNC_CONFLICT]', {
          requestId,
          expectedVersion,
          serverVersion: serverVersionRef.current,
          mutationVersionAtSchedule,
          currentMutationVersion: localMutationVersionRef.current
        });
        setState(prev => ({ ...prev, syncStatus: 'error' }));
        await pull({ force: true, allowDuringPush: true });
        shouldRetry = allowRetry && mutationVersionAtSchedule === localMutationVersionRef.current;
        return;
      }
      if (!res.ok) {
        throw new Error(`Push failed with status ${res.status}`);
      }
      const pushPayload = await res.json();
      const pushedVersion = Number(pushPayload?.serverVersion ?? expectedVersion);
      serverVersionRef.current = pushedVersion;
      clearDataDirty();
      console.log('[SYNC_PUSH_SUCCESS]', { requestId, expectedVersion, pushedVersion, mutationVersionAtSchedule });
      setState(prev => ({ ...prev, syncStatus: 'synced' }));
    } catch (e) {
      console.error('Push failed', e);
      setState(prev => ({ ...prev, syncStatus: 'error' }));
    } finally {
      isUpdatingCloud.current = false;
    }
    if (shouldRetry) {
      const retryState = latestStateRef.current;
      const retryMutationVersion = localMutationVersionRef.current;
      console.log('[SYNC_PUSH_RETRY]', { requestId, mutationVersionAtSchedule: retryMutationVersion });
      await push(retryState, retryMutationVersion, false);
    }
  }, [clearDataDirty, pull]);

  // Effect: restore auth session from backend cookie
  useEffect(() => {
    const hydrateAuth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me?clubId=${clubIdRef.current}`, {
          credentials: 'include'
        });
        if (res.ok) {
          const payload = await res.json();
          setState(prev => ({
            ...prev,
            currentUser: payload?.user || null,
            authHydrated: true
          }));
          return;
        }
      } catch (error) {
        console.error('Auth hydration failed', error);
      }
      setState(prev => ({ ...prev, currentUser: null, authHydrated: true }));
    };
    void hydrateAuth();
  }, []);

  // Effect: Initialization and Polling while authenticated
  useEffect(() => {
    if (!state.authHydrated || !state.currentUser) {
      isFirstLoad.current = true;
      return;
    }
    pull({ force: true }).then(() => { isFirstLoad.current = false; });
    const interval = setInterval(pull, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pull, state.authHydrated, state.currentUser]);

  // Effect: Auto-Push on any state change
  useEffect(() => {
    if (isFirstLoad.current) return;
    if (isApplyingRemoteState.current) {
      isApplyingRemoteState.current = false;
      return;
    }
    if (!isDataDirty) return;
    const mutationVersionAtSchedule = localMutationVersionRef.current;
    const timeout = setTimeout(() => push(state, mutationVersionAtSchedule), 1000);
    return () => clearTimeout(timeout);
  }, [state, isDataDirty, push]);

  const login = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId: clubIdRef.current, identifier: id })
      });
      if (!res.ok) return false;
      const payload = await res.json();
      const user = payload?.user || null;
      if (!user) return false;
      setState(prev => ({ ...prev, currentUser: user, authHydrated: true, isEditorMode: false }));
      return true;
    } catch (error) {
      console.error('Login failed', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout request failed', error);
    } finally {
      setState(prev => ({ ...prev, currentUser: null }));
    }
  };
  const enterEditorMode = () => setState(p => ({ ...p, isEditorMode: true }));
  const switchUser = async () => {
    await logout();
  };

  // Helper for updates to trigger push
  const update = (fn: (prev: AppState) => AppState) => {
    markDataDirty();
    setState(prev => fn(prev));
  };

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
    const map = new Map<string, Availability>();
    p.availability.forEach(a => map.set(`${a.userId}-${a.date}`, a));
    avails.forEach(a => {
      const key = `${a.userId}-${a.date}`;
      const existing = map.get(key);
      map.set(key, {
        ...a,
        id: a.id || existing?.id || key
      });
    });
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
    syncNow: () => {
      void pull({ force: true });
    },
    startTour: () => setState(p => ({ ...p, isTourActive: true })),
    endTour: () => setState(p => ({ ...p, isTourActive: false }))
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
