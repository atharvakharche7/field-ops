// TypeScript shapes of the backend's JSON. They mirror the Java DTOs, so a typo
// like ticket.tittle fails at compile time instead of showing a blank on the phone.

export type Role = 'TECHNICIAN' | 'SUPERVISOR';
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type Status = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';
export type Category = 'WIFI_DOWN' | 'FIBRE_CUT' | 'POWER' | 'EQUIPMENT' | 'OTHER';

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type TicketSummary = {
  id: number;
  ticketNo: string;
  title: string;
  priority: Priority;
  status: Status;
  category: Category;
  siteName: string;
  city: string;
  assignedToName: string | null; // null while the ticket is OPEN
  updatedAt: string;
};

export type Page<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type TicketFilters = {
  status?: Status;
  priority?: Priority;
};

// The one shape every backend error uses (GlobalExceptionHandler).
export type ApiError = {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
};
