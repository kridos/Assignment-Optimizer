import Dexie, { type Table } from 'dexie';
import type { Course, Assignment, TimeLog, UserSettings } from '../types';

export class AssignmentOptimizerDB extends Dexie {
  courses!: Table<Course, number>;
  assignments!: Table<Assignment, number>;
  timeLogs!: Table<TimeLog, number>;
  userSettings!: Table<UserSettings, number>;

  constructor() {
    super('AssignmentOptimizerDB');

    this.version(1).stores({
      courses: '++id, canvasId, name, code, syncMode, isManual, createdAt, updatedAt',
      assignments: '++id, canvasId, courseId, title, dueDate, assignmentType, status, isManual, createdAt, updatedAt',
      timeLogs: '++id, assignmentId, startTime, endTime, createdAt',
      userSettings: '++id',
    });
  }
}

export const db = new AssignmentOptimizerDB();

// Initialize default user settings if none exist
db.on('ready', async () => {
  const settingsCount = await db.userSettings.count();
  if (settingsCount === 0) {
    await db.userSettings.add({
      canvasApiToken: '',
      canvasBaseUrl: '',
      googleCalendarEnabled: false,
      availableHours: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      },
      preferredSessionLength: 120, // 2 hours default
      notificationPreferences: {
        enableTimerWarnings: true,
        timerWarningThreshold: 4,
        enablePauseReminders: true,
        pauseReminderDelay: 30,
        enableDailyDigest: false,
      },
    });
  }
});
