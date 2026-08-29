/**
 * Email Status Enum matching database schema.
 */
export type EmailStatus = 'SCHEDULED' | 'SENT' | 'FAILED';

/**
 * User interface representing authenticated user session profile.
 */
export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  slackAccessToken?: string | null;
  slackTeamId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sender entity tied to a User.
 */
export interface Sender {
  id: string;
  userId: string;
  email: string;
  createdAt: string;
}

/**
 * Main Email model interface.
 */
export interface Email {
  id: string;
  userId: string;
  senderId: string;
  sender?: Sender;
  recipientEmail: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string | null;
  failedReason?: string | null;
  delayBetweenEmails: number;
  hourlyLimit: number;
  rescheduleCount: number;
  bullJobId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pagination metadata returned by paginated API endpoints.
 */
export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Generic type helper for paginated API responses.
 * TS Note: <T> is a generic type parameter representing the item model type (e.g. Email).
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * Schedule Email Request Payload.
 */
export interface SchedulePayload {
  subject: string;
  body: string;
  recipients: string[];
  senderId?: string;
  senderEmail?: string;
  startTime?: string;
  delayBetweenEmails?: number;
  hourlyLimit?: number;
}
