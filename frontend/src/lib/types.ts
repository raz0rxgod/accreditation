export type ApplicationStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
export type ApplicantStatus = 'new' | 'in_review' | 'approved' | 'rejected';
export type DocumentType =
  | 'accreditation_letter'
  | 'passport_scan'
  | 'visa_scan'
  | 'press_card'
  | 'media_registration'
  | 'invitation_letter'
  | 'equipment_list_file';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  accreditation_letter: 'Письмо-заявка на аккредитацию',
  passport_scan: 'Скан паспорта',
  visa_scan: 'Скан визы',
  press_card: 'Пресс-карта',
  media_registration: 'Свидетельство о регистрации организации',
  invitation_letter: 'Письмо-приглашение',
  equipment_list_file: 'Опись техники',
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: 'Черновик',
  submitted: 'Отправлена',
  in_review: 'На рассмотрении',
  approved: 'Одобрена',
  rejected: 'Отклонена',
};

export const APPLICANT_STATUS_LABELS: Record<ApplicantStatus, string> = {
  new: 'Новая анкета',
  in_review: 'На рассмотрении',
  approved: 'Одобрена',
  rejected: 'Отказано',
};

// Вкладки админки сотрудника — маппинг на ApplicationStatus по ТЗ (§ II):
// Новая = submitted, На проверке = in_review, Одобрено = approved, Отказ = rejected.
// draft сюда не попадает — заявитель ещё не отправил заявку, сотрудникам она не видна.
export const STAFF_APPLICATION_TABS: Array<{ value: ApplicationStatus; label: string }> = [
  { value: 'submitted', label: 'Новая' },
  { value: 'in_review', label: 'На проверке' },
  { value: 'approved', label: 'Одобрено' },
  { value: 'rejected', label: 'Отказ' },
];

export type StaffRole = 'mfa_officer' | 'checkpoint' | 'customs' | 'admin';

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  mfa_officer: 'Сотрудник по аккредитации',
  checkpoint: 'КПП',
  customs: 'Таможня',
  admin: 'Администратор',
};

export interface Country {
  id: string;
  name: string;
  isoCode: string;
}

export type MediaType = 'television' | 'print' | 'radio' | 'other';

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  television: 'Телевидение',
  print: 'Печатные издания',
  radio: 'Радио',
  other: 'Другое',
};

export const BREAKDOWN_TYPE_LABELS: Record<MediaType | 'unspecified', string> = {
  television: 'Телевидение',
  print: 'Печатные издания',
  radio: 'Радио',
  other: 'Другое',
  unspecified: 'Не указано',
};

export interface MediaOrganization {
  id: string;
  name: string;
  registrationNumber?: string | null;
  website?: string | null;
  mediaType?: MediaType | null;
  countryId?: string | null;
  country?: { id: string; name: string } | null;
}

export interface ApplicantSummary {
  id: string;
  lastName: string;
  firstName: string;
  status: ApplicantStatus;
}

export interface Application {
  id: string;
  applicationNumber: string;
  status: ApplicationStatus;
  submittedAt: string | null;
  createdAt: string;
  applicants: ApplicantSummary[];
  user?: { fullName: string; email: string };
}

export interface Applicant {
  id: string;
  applicationId: string;
  lastName: string;
  firstName: string;
  middleName?: string | null;
  mediaId?: string | null;
  media?: MediaOrganization | null;
  position?: string | null;
  employerAddress?: string | null;
  citizenshipCountryId?: string | null;
  citizenshipCountry?: Country | null;
  visitedBefore: boolean;
  visitPurpose?: string | null;
  tripStart?: string | null;
  tripEnd?: string | null;
  accommodation?: string | null;
  phone?: string | null;
  email?: string | null;
  photoPath?: string | null;
  photoUrl?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  visaFree: boolean;
  visaNumber?: string | null;
  visaExpiry?: string | null;
  noPressCard: boolean;
  pressCardExpiry?: string | null;
  priorCoverageLinks?: string | null;
  status: ApplicantStatus;
  createdAt: string;
  documents?: AppDocument[];
  accreditationCard?: AccreditationCard | null;
}

export interface AppDocument {
  id: string;
  applicantId: string;
  type: DocumentType;
  filename: string;
  fileSize: string;
  uploadedAt: string;
  downloadUrl?: string;
}

export type MaterialType = 'url' | 'pdf';

export interface Material {
  id: string;
  applicantId: string;
  type: MaterialType;
  url?: string | null;
  filePath?: string | null;
  uploadedAt: string;
  downloadUrl?: string | null;
}

export interface CurrentlyInCountryEntry {
  applicantId: string;
  lastName: string;
  firstName: string;
  middleName?: string | null;
  media: string | null;
  citizenshipCountry: string | null;
  tripStart: string | null;
  tripEnd: string | null;
  applicationNumber: string;
}

export interface MediaTypeBreakdownEntry {
  type: MediaType | 'unspecified';
  count: number;
  percent: number;
}

export interface MediaTypeBreakdown {
  total: number;
  breakdown: MediaTypeBreakdownEntry[];
}

export interface MaterialsByMonthItem {
  id: string;
  type: MaterialType;
  link: string | null;
  journalist: string;
  media: string | null;
  uploadedAt: string;
}

export interface MaterialsByMonthGroup {
  month: string;
  items: MaterialsByMonthItem[];
}

export interface AccreditationCard {
  id: string;
  applicantId: string;
  accreditationNumber: string;
  issuedAt: string;
  expiresAt: string;
  active: boolean;
  downloadUrl?: string;
}

export interface EquipmentItem {
  id: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
}

export interface EquipmentList {
  id: string;
  applicationId: string;
  qrToken: string;
  items: EquipmentItem[];
}

export interface ChatMessage {
  id: string;
  applicationId: string;
  senderUserId?: string | null;
  senderStaffId?: string | null;
  message: string;
  read: boolean;
  createdAt: string;
  senderUser?: { fullName: string } | null;
  senderStaff?: { fullName: string; role: StaffRole } | null;
}

export interface ApplicationDetail extends Omit<Application, 'applicants'> {
  applicants: Applicant[];
  equipmentList?: EquipmentList | null;
}

export interface StatusHistoryEntry {
  id: string;
  applicantId: string;
  staffId: string | null;
  oldStatus: ApplicantStatus | null;
  newStatus: ApplicantStatus;
  internalComment: string | null;
  createdAt: string;
  staff?: { fullName: string; role: StaffRole } | null;
}

export interface PersonHistoryEntry {
  applicantId: string;
  applicationNumber: string;
  submittedAt: string;
  status: ApplicantStatus;
  media: string | null;
  lastRejectionComment: string | null;
}

export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
}

export type InboxNotificationType = 'chat_message' | 'status_changed';

export interface InboxNotification {
  id: string;
  type: InboxNotificationType;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

