import { Priority, Status } from './types';

export const colors = {
  primary: '#1F5FBF',
  background: '#F4F6F9',
  surface: '#FFFFFF',
  border: '#D9DEE5',
  text: '#1B2430',
  textMuted: '#5C6776',
  danger: '#C62828',
  white: '#FFFFFF',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const fontSize = { xs: 12, sm: 14, md: 16, lg: 18, xl: 24, xxl: 30 };

// Smallest comfortable tap target, used for every button and chip.
export const minTapSize = 44;

// Same colours for the same priority on every screen. White text is readable on all four.
export const priorityColors: Record<Priority, string> = {
  CRITICAL: '#C62828',
  HIGH: '#C2570C',
  MEDIUM: '#1F5FBF',
  LOW: '#5C6776',
};

export const priorityLabels: Record<Priority, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export const statusColors: Record<Status, { background: string; text: string }> = {
  OPEN: { background: '#E8EAED', text: '#3C4653' },
  ASSIGNED: { background: '#E3EDFB', text: '#174A96' },
  IN_PROGRESS: { background: '#FDF0DC', text: '#8A4B00' },
  RESOLVED: { background: '#E1F4E5', text: '#1C6B2D' },
};

export const statusLabels: Record<Status, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
};
