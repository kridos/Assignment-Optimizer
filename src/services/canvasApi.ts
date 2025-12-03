import axios, { type AxiosInstance } from 'axios';
import type { Course, Assignment } from '../types';

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  enrollment_term_id?: number;
  workflow_state: string;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description: string;
  due_at: string | null;
  points_possible: number;
  course_id: number;
  submission_types: string[];
  workflow_state: string;
}

export class CanvasAPIService {
  private api: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;

    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000,
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.api.get('/api/v1/users/self');
      return response.status === 200;
    } catch (error) {
      console.error('Canvas API connection test failed:', error);
      return false;
    }
  }

  async getCourses(): Promise<CanvasCourse[]> {
    try {
      const response = await this.api.get('/api/v1/courses', {
        params: {
          enrollment_state: 'active',
          per_page: 100,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      throw error;
    }
  }

  async getAssignments(courseId: number): Promise<CanvasAssignment[]> {
    try {
      const response = await this.api.get(`/api/v1/courses/${courseId}/assignments`, {
        params: {
          per_page: 100,
          order_by: 'due_at',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch assignments for course ${courseId}:`, error);
      throw error;
    }
  }

  async getUpcomingAssignments(): Promise<CanvasAssignment[]> {
    try {
      const response = await this.api.get('/api/v1/users/self/upcoming_events', {
        params: {
          per_page: 50,
        },
      });
      return response.data.filter((event: any) => event.type === 'assignment');
    } catch (error) {
      console.error('Failed to fetch upcoming assignments:', error);
      throw error;
    }
  }

  static convertCanvasCourse(canvasCourse: CanvasCourse): Omit<Course, 'id'> {
    return {
      canvasId: canvasCourse.id.toString(),
      name: canvasCourse.name,
      code: canvasCourse.course_code,
      color: this.generateColorFromString(canvasCourse.name),
      syncMode: 'auto',
      isManual: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static convertCanvasAssignment(
    canvasAssignment: CanvasAssignment,
    courseId: number
  ): Omit<Assignment, 'id'> {
    return {
      canvasId: canvasAssignment.id.toString(),
      courseId: courseId,
      title: canvasAssignment.name,
      description: canvasAssignment.description || '',
      dueDate: canvasAssignment.due_at ? new Date(canvasAssignment.due_at) : new Date(),
      points: canvasAssignment.points_possible || 0,
      assignmentType: this.guessAssignmentType(canvasAssignment.name),
      status: 'not_started',
      estimatedHours: 0,
      isManual: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private static guessAssignmentType(name: string): Assignment['assignmentType'] {
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('exam') || lowercaseName.includes('test')) {
      return 'exam';
    }
    if (lowercaseName.includes('quiz')) {
      return 'quiz';
    }
    if (lowercaseName.includes('project')) {
      return 'project';
    }
    if (lowercaseName.includes('reading') || lowercaseName.includes('read')) {
      return 'reading';
    }
    if (lowercaseName.includes('hw') || lowercaseName.includes('homework')) {
      return 'homework';
    }
    return 'other';
  }

  private static generateColorFromString(str: string): string {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#14B8A6', // teal
      '#F97316', // orange
    ];

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }
}
