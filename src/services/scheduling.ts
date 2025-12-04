import { assignmentOps, settingsOps } from '../db/operations';
import type { Assignment } from '../types';
import { addDays, startOfDay, format, addHours } from 'date-fns';

export interface ScheduleBlock {
  assignmentId: number;
  assignmentTitle: string;
  startTime: Date;
  endTime: Date;
  duration: number; // hours
  day: string;
  isRecommended: boolean;
}

export interface ScheduleDay {
  date: Date;
  dayName: string;
  blocks: ScheduleBlock[];
  totalScheduledHours: number;
  availableHours: number;
  isOverloaded: boolean;
}

export interface ScheduleSummary {
  days: ScheduleDay[];
  totalWorkHours: number;
  totalAvailableHours: number;
  isRealistic: boolean;
  warnings: string[];
  suggestions: string[];
}

export class SchedulingService {
  /**
   * Generate a smart schedule for upcoming assignments
   */
  static async generateSchedule(daysAhead: number = 14): Promise<ScheduleSummary> {
    // Get upcoming assignments
    const assignments = await assignmentOps.getUpcoming(daysAhead);

    // Filter out completed assignments
    const pendingAssignments = assignments.filter(a => a.status !== 'completed');

    // Get user settings for available hours
    const settings = await settingsOps.get();
    const availableHours = settings?.availableHours || this.getDefaultAvailableHours();

    // Generate schedule days
    const days: ScheduleDay[] = [];
    const today = startOfDay(new Date());

    for (let i = 0; i < daysAhead; i++) {
      const date = addDays(today, i);
      const dayName = format(date, 'EEEE').toLowerCase();
      const dayAvailableHours = this.parseDayAvailableHours(availableHours[dayName] || []);

      days.push({
        date,
        dayName: format(date, 'EEEE'),
        blocks: [],
        totalScheduledHours: 0,
        availableHours: dayAvailableHours,
        isOverloaded: false,
      });
    }

    // Sort assignments by priority (due date, then points)
    const sortedAssignments = pendingAssignments.sort((a, b) => {
      const dateCompare = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      return b.points - a.points;
    });

    // Schedule assignments
    const scheduledAssignments = new Set<number>();
    const warnings: string[] = [];
    const suggestions: string[] = [];

    for (const assignment of sortedAssignments) {
      const result = this.scheduleAssignment(assignment, days, scheduledAssignments);

      if (result.warnings.length > 0) {
        warnings.push(...result.warnings);
      }

      if (result.suggestions.length > 0) {
        suggestions.push(...result.suggestions);
      }
    }

    // Calculate totals
    const totalWorkHours = days.reduce((sum, day) => sum + day.totalScheduledHours, 0);
    const totalAvailableHours = days.reduce((sum, day) => sum + day.availableHours, 0);
    const isRealistic = totalWorkHours <= totalAvailableHours * 0.9; // 90% utilization max

    if (!isRealistic) {
      warnings.push(
        `You have ${totalWorkHours.toFixed(1)} hours of work planned but only ${totalAvailableHours.toFixed(1)} hours available. Consider requesting extensions or prioritizing.`
      );
    }

    // Check for overloaded days
    days.forEach(day => {
      if (day.totalScheduledHours > day.availableHours) {
        day.isOverloaded = true;
        warnings.push(`${day.dayName} is overloaded: ${day.totalScheduledHours.toFixed(1)}h scheduled, ${day.availableHours}h available.`);
      }
    });

    return {
      days,
      totalWorkHours,
      totalAvailableHours,
      isRealistic,
      warnings,
      suggestions,
    };
  }

  /**
   * Schedule a single assignment across available days
   */
  private static scheduleAssignment(
    assignment: Assignment,
    days: ScheduleDay[],
    scheduledAssignments: Set<number>
  ): { warnings: string[]; suggestions: string[] } {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!assignment.id) return { warnings, suggestions };

    const dueDate = startOfDay(new Date(assignment.dueDate));
    const estimatedHours = assignment.estimatedHours || 2;

    // Find days before due date
    const availableDays = days.filter(day => day.date < dueDate);

    if (availableDays.length === 0) {
      warnings.push(`${assignment.title} is due today or overdue - start immediately!`);
      return { warnings, suggestions };
    }

    // Calculate recommended session length (2 hours default, max 4 hours)
    const sessionLength = Math.min(estimatedHours / Math.ceil(estimatedHours / 2), 4);
    let remainingHours = estimatedHours;

    // Try to schedule work sessions
    for (const day of availableDays) {
      if (remainingHours <= 0) break;

      const availableInDay = day.availableHours - day.totalScheduledHours;
      if (availableInDay < 1) continue; // Need at least 1 hour

      const hoursToSchedule = Math.min(remainingHours, sessionLength, availableInDay);

      // Create schedule block
      const startHour = this.getPreferredStartTime(day);
      const block: ScheduleBlock = {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        startTime: addHours(day.date, startHour),
        endTime: addHours(day.date, startHour + hoursToSchedule),
        duration: hoursToSchedule,
        day: day.dayName,
        isRecommended: true,
      };

      day.blocks.push(block);
      day.totalScheduledHours += hoursToSchedule;
      remainingHours -= hoursToSchedule;
    }

    if (remainingHours > 0) {
      warnings.push(
        `${assignment.title}: Could only schedule ${(estimatedHours - remainingHours).toFixed(1)}/${estimatedHours}h before due date.`
      );
      suggestions.push(`Consider starting ${assignment.title} early or breaking it into smaller tasks.`);
    }

    scheduledAssignments.add(assignment.id);
    return { warnings, suggestions };
  }

  /**
   * Get preferred start time for a day (default 18:00 = 6pm)
   */
  private static getPreferredStartTime(day: ScheduleDay): number {
    // If there are existing blocks, start after the last one
    if (day.blocks.length > 0) {
      const lastBlock = day.blocks[day.blocks.length - 1];
      return lastBlock.endTime.getHours();
    }

    // Default start time is 18:00 (6pm)
    return 18;
  }

  /**
   * Parse available hours string array (e.g., ["18:00-22:00"])
   */
  private static parseDayAvailableHours(timeRanges: string[]): number {
    let totalHours = 0;

    for (const range of timeRanges) {
      const [start, end] = range.split('-');
      if (!start || !end) continue;

      const startParts = start.split(':');
      const endParts = end.split(':');

      const startHour = parseInt(startParts[0]) || 0;
      const startMin = parseInt(startParts[1] || '0') || 0;
      const endHour = parseInt(endParts[0]) || 0;
      const endMin = parseInt(endParts[1] || '0') || 0;

      const startTime = startHour + startMin / 60;
      const endTime = endHour + endMin / 60;

      totalHours += endTime - startTime;
    }

    return totalHours;
  }

  /**
   * Get default available hours if not set
   */
  private static getDefaultAvailableHours(): Record<string, string[]> {
    return {
      monday: ['18:00-22:00'],
      tuesday: ['18:00-22:00'],
      wednesday: ['18:00-22:00'],
      thursday: ['18:00-22:00'],
      friday: ['18:00-22:00'],
      saturday: ['10:00-16:00'],
      sunday: ['14:00-20:00'],
    };
  }

  /**
   * Format schedule for display
   */
  static formatScheduleBlock(block: ScheduleBlock): string {
    const start = format(block.startTime, 'h:mm a');
    const end = format(block.endTime, 'h:mm a');
    return `${start} - ${end}: ${block.assignmentTitle} (${block.duration}h)`;
  }

  /**
   * Get today's schedule
   */
  static async getTodaySchedule(): Promise<ScheduleBlock[]> {
    const schedule = await this.generateSchedule(1);
    return schedule.days[0]?.blocks || [];
  }

  /**
   * Get this week's schedule
   */
  static async getWeekSchedule(): Promise<ScheduleDay[]> {
    const schedule = await this.generateSchedule(7);
    return schedule.days;
  }
}
