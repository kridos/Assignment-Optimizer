import { db } from './database';
import type { Course, Assignment, TimeLog, UserSettings } from '../types';

// Course Operations
export const courseOps = {
  async getAll(): Promise<Course[]> {
    return await db.courses.toArray();
  },

  async getById(id: number): Promise<Course | undefined> {
    return await db.courses.get(id);
  },

  async getByCanvasId(canvasId: string): Promise<Course | undefined> {
    return await db.courses.where('canvasId').equals(canvasId).first();
  },

  async create(course: Omit<Course, 'id'>): Promise<number> {
    return await db.courses.add(course as Course);
  },

  async update(id: number, updates: Partial<Course>): Promise<number> {
    return await db.courses.update(id, { ...updates, updatedAt: new Date() });
  },

  async delete(id: number): Promise<void> {
    await db.courses.delete(id);
  },

  async getManualCourses(): Promise<Course[]> {
    return await db.courses.where('isManual').equals(1).toArray();
  },

  async getAutoSyncCourses(): Promise<Course[]> {
    return await db.courses.where('syncMode').equals('auto').toArray();
  },
};

// Assignment Operations
export const assignmentOps = {
  async getAll(): Promise<Assignment[]> {
    return await db.assignments.orderBy('dueDate').toArray();
  },

  async getById(id: number): Promise<Assignment | undefined> {
    return await db.assignments.get(id);
  },

  async getByCanvasId(canvasId: string): Promise<Assignment | undefined> {
    return await db.assignments.where('canvasId').equals(canvasId).first();
  },

  async getByCourseId(courseId: number): Promise<Assignment[]> {
    return await db.assignments.where('courseId').equals(courseId).sortBy('dueDate');
  },

  async getUpcoming(days: number = 7): Promise<Assignment[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return await db.assignments
      .where('dueDate')
      .between(now, future, true, true)
      .and((assignment) => assignment.status !== 'completed')
      .sortBy('dueDate');
  },

  async getOverdue(): Promise<Assignment[]> {
    const now = new Date();
    return await db.assignments
      .where('dueDate')
      .below(now)
      .and((assignment) => assignment.status !== 'completed')
      .sortBy('dueDate');
  },

  async getByStatus(status: Assignment['status']): Promise<Assignment[]> {
    return await db.assignments.where('status').equals(status).sortBy('dueDate');
  },

  async create(assignment: Omit<Assignment, 'id'>): Promise<number> {
    return await db.assignments.add(assignment as Assignment);
  },

  async update(id: number, updates: Partial<Assignment>): Promise<number> {
    return await db.assignments.update(id, { ...updates, updatedAt: new Date() });
  },

  async delete(id: number): Promise<void> {
    await db.assignments.delete(id);
    // Also delete associated time logs
    await db.timeLogs.where('assignmentId').equals(id).delete();
  },

  async updateStatus(id: number, status: Assignment['status']): Promise<number> {
    return await this.update(id, { status });
  },

  async bulkCreate(assignments: Omit<Assignment, 'id'>[]): Promise<number> {
    return await db.assignments.bulkAdd(assignments as Assignment[]);
  },
};

// TimeLog Operations
export const timeLogOps = {
  async getAll(): Promise<TimeLog[]> {
    return await db.timeLogs.toArray();
  },

  async getById(id: number): Promise<TimeLog | undefined> {
    return await db.timeLogs.get(id);
  },

  async getByAssignmentId(assignmentId: number): Promise<TimeLog[]> {
    return await db.timeLogs.where('assignmentId').equals(assignmentId).sortBy('startTime');
  },

  async getTotalTimeForAssignment(assignmentId: number): Promise<number> {
    const logs = await this.getByAssignmentId(assignmentId);
    return logs.reduce((total, log) => total + log.totalActiveSeconds, 0);
  },

  async getRecentLogs(days: number = 7): Promise<TimeLog[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await db.timeLogs.where('startTime').above(cutoffDate).sortBy('startTime');
  },

  async create(timeLog: Omit<TimeLog, 'id'>): Promise<number> {
    return await db.timeLogs.add(timeLog as TimeLog);
  },

  async update(id: number, updates: Partial<TimeLog>): Promise<number> {
    return await db.timeLogs.update(id, updates);
  },

  async delete(id: number): Promise<void> {
    await db.timeLogs.delete(id);
  },
};

// UserSettings Operations
export const settingsOps = {
  async get(): Promise<UserSettings | undefined> {
    const settings = await db.userSettings.toArray();
    return settings[0];
  },

  async update(updates: Partial<UserSettings>): Promise<number> {
    const settings = await this.get();
    if (settings && settings.id) {
      return await db.userSettings.update(settings.id, updates);
    }
    // If no settings exist, create them
    return await db.userSettings.add(updates as UserSettings);
  },

  async updateCanvasCredentials(baseUrl: string, token: string): Promise<number> {
    return await this.update({ canvasBaseUrl: baseUrl, canvasApiToken: token });
  },
};

// Analytics and Statistics
export const analyticsOps = {
  async getTimeStatsByCourse(): Promise<Record<number, number>> {
    const assignments = await db.assignments.toArray();
    const stats: Record<number, number> = {};

    for (const assignment of assignments) {
      const totalTime = await timeLogOps.getTotalTimeForAssignment(assignment.id!);
      stats[assignment.courseId] = (stats[assignment.courseId] || 0) + totalTime;
    }

    return stats;
  },

  async getTimeStatsByType(): Promise<Record<string, number>> {
    const assignments = await db.assignments.toArray();
    const stats: Record<string, number> = {};

    for (const assignment of assignments) {
      const totalTime = await timeLogOps.getTotalTimeForAssignment(assignment.id!);
      stats[assignment.assignmentType] = (stats[assignment.assignmentType] || 0) + totalTime;
    }

    return stats;
  },

  async getEstimationAccuracy(): Promise<{
    totalEstimated: number;
    totalActual: number;
    accuracyRatio: number;
  }> {
    const assignments = await db.assignments.where('estimatedHours').above(0).toArray();

    let totalEstimated = 0;
    let totalActual = 0;

    for (const assignment of assignments) {
      const actualSeconds = await timeLogOps.getTotalTimeForAssignment(assignment.id!);
      totalEstimated += assignment.estimatedHours;
      totalActual += actualSeconds / 3600; // convert to hours
    }

    return {
      totalEstimated,
      totalActual,
      accuracyRatio: totalEstimated > 0 ? totalActual / totalEstimated : 1,
    };
  },
};
