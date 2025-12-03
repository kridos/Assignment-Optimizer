export type SyncMode = 'auto' | 'hybrid' | 'manual';
export type AssignmentStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed';
export type AssignmentType = 'homework' | 'project' | 'exam' | 'quiz' | 'reading' | 'personal' | 'other';

export interface Course {
  id?: number;
  canvasId: string | null;
  name: string;
  code: string;
  color: string;
  syncMode: SyncMode;
  isManual: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  id?: number;
  canvasId: string | null;
  courseId: number;
  title: string;
  description: string;
  dueDate: Date;
  points: number;
  assignmentType: AssignmentType;
  status: AssignmentStatus;
  estimatedHours: number;
  isManual: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeLog {
  id?: number;
  assignmentId: number;
  startTime: Date;
  endTime: Date | null;
  pauseEvents: Date[];
  resumeEvents: Date[];
  totalActiveSeconds: number;
  notes: string;
  createdAt: Date;
}

export interface UserSettings {
  id?: number;
  canvasApiToken: string;
  canvasBaseUrl: string;
  googleCalendarEnabled: boolean;
  availableHours: Record<string, string[]>; // e.g., { "monday": ["18:00-22:00"] }
  preferredSessionLength: number; // in minutes
  notificationPreferences: NotificationPreferences;
}

export interface NotificationPreferences {
  enableTimerWarnings: boolean;
  timerWarningThreshold: number; // hours
  enablePauseReminders: boolean;
  pauseReminderDelay: number; // minutes
  enableDailyDigest: boolean;
}

export interface TimerState {
  assignmentId: number | null;
  assignmentTitle: string | null;
  startTime: Date | null;
  pauseEvents: Date[];
  resumeEvents: Date[];
  totalElapsed: number; // seconds
  isRunning: boolean;
  isPaused: boolean;
}
