/**
 * Shared backend-local domain and persistence types.
 *
 * These types describe the JSON shape stored in the `state` payload that the
 * frontend syncs against, plus the relevant Postgres row shapes used by the
 * repositories. They're intentionally permissive (lots of optional fields)
 * because the legacy app accepts partial records and reconstructs missing
 * pieces from defaults.
 */

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

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

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar?: string;
  certifications?: string[];
  isArchived?: boolean;
  isFullTime?: boolean | null;
  fixedDayOff?: number | string | null;
  canAddBonuses?: boolean | null;
  bankName?: string | null;
  bankBranch?: string | null;
  accountNumber?: string | null;
  hasForm101?: boolean | null;
  form101Data?: unknown;
  form101FileName?: string | null;
  quickCode?: string | null;
}

export interface ShiftBonus {
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
  endTime: string;
  teachingHours?: number;
  bonuses?: ShiftBonus[];
  notes?: string;
  isClosed?: boolean;
  hasTravel?: boolean;
  breakMinutes?: number;
}

export interface ConfirmedShift {
  id: string;
  userId: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface Lesson {
  id: string;
  clientName: string;
  phone: string;
  type: string;
  pathType: string;
  lessonNumber: number;
  date: string;
  time: string;
  endTime?: string | null;
  instructorId?: string | null;
  voucherNumber?: string | null;
  hasVoucher?: boolean | null;
  isRegistered?: boolean | null;
  isPaid?: boolean | null;
  isCancelled?: boolean | null;
  isArchived?: boolean | null;
}

export interface Rental {
  id: string;
  date: string;
  clientName: string;
  item: string;
  quantity: number;
  durationMinutes: number;
  overdueMinutes?: number | null;
  paymentType: string;
  startTime: string;
  isReturned?: boolean;
  extraPaid?: number | null;
  isArchived?: boolean | null;
}

export interface Task {
  id: string;
  title: string;
  type: string;
  clientName?: string | null;
  clientPhone?: string | null;
  assignedTo?: string[];
  priority: string;
  status: string;
  createdBy: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  source: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface AvailabilityEntry {
  id: string;
  userId: string;
  userName: string;
  date: string;
  isAvailable: boolean;
  isAllDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
}

export interface EventBoat {
  id: string;
  operatorId: string;
  assistantId?: string | null;
}

export interface EventParticipant {
  id: string;
  name: string;
  phone: string;
  equipment: string;
  status: string;
  hasArrived?: boolean;
  rescues?: number;
  notes?: string | null;
}

export interface SeaEvent {
  id: string;
  name: string;
  date: string;
  boats?: EventBoat[];
  participants?: EventParticipant[];
  googleFormLink?: string | null;
  isArchived?: boolean;
}

export interface WhatsappTemplate {
  id: string;
  title: string;
  text: string;
}

export interface KnowledgeFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

export type ActiveShiftPayload = Record<string, unknown>;

export interface ClubState {
  clubId?: string;
  currentUser: User | null;
  isEditorMode: boolean;
  isTourActive: boolean;
  clubSettings?: ClubSettings;
  users: User[];
  shifts: Shift[];
  lessons: Lesson[];
  confirmedShifts: ConfirmedShift[];
  rentals: Rental[];
  events: SeaEvent[];
  tasks: Task[];
  leads: Lead[];
  availability: AvailabilityEntry[];
  rentalStatus: string[];
  availableRentalItems: string[];
  whatsappTemplates: WhatsappTemplate[];
  knowledgeFiles: KnowledgeFile[];
  activeShifts: Record<string, ActiveShiftPayload>;
  syncStatus: SyncStatus | string;
  lastSyncTime: string;
}

/**
 * The raw `users` table shape returned by the repository's joined SELECTs.
 * Includes the `certifications` array aggregated from `user_certifications`.
 */
export interface UserRow {
  id: string;
  club_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar: string | null;
  is_archived: boolean;
  is_full_time: boolean | null;
  fixed_day_off: number | string | null;
  can_add_bonuses: boolean | null;
  bank_name: string | null;
  bank_branch: string | null;
  account_number: string | null;
  has_form_101: boolean | null;
  form_101_data: unknown;
  form_101_file_name: string | null;
  quick_code: string | null;
  certifications?: (string | null)[];
}

export interface AuthSessionRow {
  token_hash: string;
  club_id: string;
  user_id: string;
  expires_at: Date;
}

export interface PushSubscriptionRow {
  id?: string;
  club_id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
}
