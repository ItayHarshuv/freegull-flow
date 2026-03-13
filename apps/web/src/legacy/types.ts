

export type Role = 'Site Editor' | 'Manager' | 'Shift Manager' | 'Warehouse' | 'Instructor' | 'Shop Computer';

export type Certification = 
  | 'גלישת גלים' 
  | 'סאפ' 
  | 'גלישת רוח' 
  | 'גלישת כנף' 
  | 'קטמרן' 
  | 'גלישת קייט' 
  | 'מפעיל סירת חילוץ'
  | 'אחר';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  avatar: string; 
  certifications: Certification[];
  isArchived?: boolean;
  isFullTime?: boolean;
  fixedDayOff?: number | null; 
  canAddBonuses?: boolean;
  bankName?: string;
  bankBranch?: string;
  accountNumber?: string;
  hasForm101?: boolean;
  form101Data?: string; 
  form101FileName?: string;
  quickCode?: string; // Short code for fast login
}

export interface ClubSettings {
  landline: string;
  mobile: string;
  locationText: string;
  mapsUrl: string;
  bankAccountName: string;
  bankName: string;
  bankBranch: string;
  bankAccountNumber: string;
}

export interface BoatAssignment {
  id: string;
  operatorId: string;
  assistantId: string;
}

export interface EventParticipant {
  id: string;
  name: string;
  phone: string;
  equipment: string;
  status: 'in-water' | 'out-water';
  hasArrived: boolean; // Did the user physically arrive and activate?
  rescues: number; // Counter 0-3
  notes?: string; // General details
}

export interface SeaEvent {
  id: string;
  name: string;
  date: string;
  boats: BoatAssignment[];
  participants: EventParticipant[];
  googleFormLink?: string;
  isArchived?: boolean;
}

export type TaskType = 'General' | 'Return to Client' | 'Inventory' | 'Price Quote' | 'Order';

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  clientName?: string;
  clientPhone?: string;
  assignedTo: string[]; 
  priority: 'High' | 'Medium' | 'Normal';
  status: 'Pending' | 'In Progress' | 'Done';
  createdBy: string;
  createdAt: string;
}

export type LeadStatus = 'New' | 'In Progress' | 'Converted' | 'Lost';
export type LeadSource = 'WhatsApp' | 'Email' | 'Phone' | 'Frontal' | 'Social';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  notes: string;
  createdAt: string;
}

export interface Availability {
  id: string;
  userId: string;
  userName: string;
  date: string; 
  isAvailable: boolean; 
  isAllDay: boolean;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export type LessonPath = 
  | 'Trial' 
  | 'Single' 
  | 'Couple' 
  | 'Reinforcement' 
  | 'Course'
  | 'Basic Catamaran (3)' 
  | 'Extended Catamaran (5)';

export interface Lesson {
  id: string;
  clientName: string;
  phone: string;
  type: Certification;
  pathType: LessonPath; 
  lessonNumber: number; 
  date: string; 
  time: string; // Start time
  endTime?: string; // End time
  instructorId?: string;
  voucherNumber?: string;
  hasVoucher?: boolean;
  isRegistered?: boolean; // Health declaration filled
  isPaid?: boolean; // Payment confirmed
  isCancelled?: boolean;
  isArchived?: boolean;
}

export interface Rental {
  id: string;
  date: string;
  clientName: string;
  item: string;
  quantity: number;
  durationMinutes: number;
  overdueMinutes?: number;
  paymentType: 'paid' | 'not-paid' | 'subscription-card';
  startTime: string; 
  isReturned: boolean;
  extraPaid: boolean | null;
  isArchived?: boolean;
}

/* Add BonusItem interface for type safety in HR and DailyWork modules */
export interface BonusItem {
  id: string;
  clientName: string;
  item: string;
  amount: number;
}

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string | null;
  teachingHours: number;
  /* Use BonusItem interface */
  bonuses: BonusItem[]; 
  notes: string;
  isClosed: boolean;
  hasTravel: boolean;
}

export interface ConfirmedShift {
  id: string;
  userId: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface WhatsAppTemplate {
  id: string;
  title: string;
  text: string;
}

export interface KnowledgeFile {
  id: string;
  name: string;
  size: string;
  type: string;
}

export interface AppState {
  clubId: string; // The ID for cloud synchronization
  currentUser: User | null;
  authHydrated: boolean;
  isEditorMode: boolean; 
  /* Add isTourActive to AppState */
  isTourActive: boolean;
  users: User[];
  shifts: Shift[];
  lessons: Lesson[];
  confirmedShifts: ConfirmedShift[];
  rentals: Rental[];
  events: SeaEvent[];
  tasks: Task[];
  leads: Lead[];
  availability: Availability[];
  rentalStatus: string[]; 
  availableRentalItems: string[];
  whatsappTemplates: WhatsAppTemplate[];
  knowledgeFiles: KnowledgeFile[];
  activeShifts: Record<string, Partial<Shift>>;
  clubSettings: ClubSettings;
  lastSyncTime: string;
  syncStatus: 'synced' | 'syncing' | 'error';
}
