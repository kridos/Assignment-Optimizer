import { assignmentOps, timeLogOps, courseOps } from '../db/operations';
import type { Assignment, AssignmentType } from '../types';

interface PredictionData {
  estimatedHours: number;
  confidence: 'low' | 'medium' | 'high';
  reason: string;
  historicalAverage?: number;
  sampleSize: number;
}

interface EstimationAccuracy {
  totalEstimated: number;
  totalActual: number;
  accuracyRatio: number;
  averageError: number;
  underestimateRate: number;
}

export class TimePredictionService {
  /**
   * Predict time for a new assignment based on historical data
   */
  static async predictTime(
    courseId: number,
    assignmentType: AssignmentType,
    title: string,
    description: string
  ): Promise<PredictionData> {
    // Try multiple prediction strategies and use the best one
    const strategies = [
      await this.predictByCourseAndType(courseId, assignmentType),
      await this.predictByCourse(courseId),
      await this.predictByType(assignmentType),
      await this.predictByKeywords(title, description, assignmentType),
    ];

    // Return the strategy with highest confidence and sample size
    const bestStrategy = strategies
      .filter((s) => s.sampleSize > 0)
      .sort((a, b) => {
        if (a.confidence !== b.confidence) {
          const confidenceOrder = { high: 3, medium: 2, low: 1 };
          return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
        }
        return b.sampleSize - a.sampleSize;
      })[0];

    return bestStrategy || this.getDefaultPrediction(assignmentType);
  }

  /**
   * Predict based on course + assignment type combination
   */
  private static async predictByCourseAndType(
    courseId: number,
    type: AssignmentType
  ): Promise<PredictionData> {
    const assignments = await assignmentOps.getByCourseId(courseId);
    const relevantAssignments = assignments.filter((a) => a.assignmentType === type);

    const avgHours = await this.calculateAverageActualTime(relevantAssignments);
    const sampleSize = relevantAssignments.length;

    const course = await courseOps.getById(courseId);
    const courseName = course?.code || 'this course';

    if (sampleSize >= 3) {
      return {
        estimatedHours: Math.round(avgHours * 10) / 10,
        confidence: 'high',
        reason: `Based on ${sampleSize} similar ${type} assignments in ${courseName}`,
        historicalAverage: avgHours,
        sampleSize,
      };
    } else if (sampleSize >= 1) {
      return {
        estimatedHours: Math.round(avgHours * 10) / 10,
        confidence: 'medium',
        reason: `Based on ${sampleSize} ${type} assignment(s) in ${courseName}`,
        historicalAverage: avgHours,
        sampleSize,
      };
    }

    return { estimatedHours: 0, confidence: 'low', reason: 'No similar assignments', sampleSize: 0 };
  }

  /**
   * Predict based on course average
   */
  private static async predictByCourse(courseId: number): Promise<PredictionData> {
    const assignments = await assignmentOps.getByCourseId(courseId);
    const avgHours = await this.calculateAverageActualTime(assignments);
    const sampleSize = assignments.length;

    const course = await courseOps.getById(courseId);
    const courseName = course?.code || 'this course';

    if (sampleSize >= 2) {
      return {
        estimatedHours: Math.round(avgHours * 10) / 10,
        confidence: sampleSize >= 5 ? 'high' : 'medium',
        reason: `Based on ${sampleSize} assignments in ${courseName}`,
        historicalAverage: avgHours,
        sampleSize,
      };
    }

    return { estimatedHours: 0, confidence: 'low', reason: 'Not enough course data', sampleSize: 0 };
  }

  /**
   * Predict based on assignment type across all courses
   */
  private static async predictByType(type: AssignmentType): Promise<PredictionData> {
    const allAssignments = await assignmentOps.getAll();
    const relevantAssignments = allAssignments.filter((a) => a.assignmentType === type);

    const avgHours = await this.calculateAverageActualTime(relevantAssignments);
    const sampleSize = relevantAssignments.length;

    if (sampleSize >= 3) {
      return {
        estimatedHours: Math.round(avgHours * 10) / 10,
        confidence: 'medium',
        reason: `Based on ${sampleSize} ${type} assignments across all courses`,
        historicalAverage: avgHours,
        sampleSize,
      };
    }

    return { estimatedHours: 0, confidence: 'low', reason: 'Not enough type data', sampleSize: 0 };
  }

  /**
   * Predict based on keywords in title/description
   */
  private static async predictByKeywords(
    title: string,
    description: string,
    type: AssignmentType
  ): Promise<PredictionData> {
    const text = `${title} ${description}`.toLowerCase();

    // Complexity indicators
    const complexityKeywords = {
      high: ['implement', 'build', 'create', 'design', 'develop', 'research', 'analyze'],
      medium: ['write', 'solve', 'calculate', 'prove', 'explain'],
      low: ['read', 'review', 'quiz', 'watch'],
    };

    let complexity: 'low' | 'medium' | 'high' = 'medium';

    if (complexityKeywords.high.some((kw) => text.includes(kw))) {
      complexity = 'high';
    } else if (complexityKeywords.low.some((kw) => text.includes(kw))) {
      complexity = 'low';
    }

    // Base estimates by type and complexity
    const estimates: Record<AssignmentType, Record<'low' | 'medium' | 'high', number>> = {
      homework: { low: 1, medium: 2, high: 4 },
      project: { low: 4, medium: 8, high: 16 },
      exam: { low: 2, medium: 4, high: 6 },
      quiz: { low: 0.5, medium: 1, high: 1.5 },
      reading: { low: 0.5, medium: 1, high: 2 },
      personal: { low: 2, medium: 4, high: 8 },
      other: { low: 1, medium: 2, high: 4 },
    };

    const estimatedHours = estimates[type][complexity];

    return {
      estimatedHours,
      confidence: 'low',
      reason: `Keyword-based estimate (${complexity} complexity ${type})`,
      sampleSize: 0,
    };
  }

  /**
   * Calculate average actual time spent on assignments
   */
  private static async calculateAverageActualTime(assignments: Assignment[]): Promise<number> {
    if (assignments.length === 0) return 0;

    let totalHours = 0;
    let count = 0;

    for (const assignment of assignments) {
      if (!assignment.id) continue;

      const actualSeconds = await timeLogOps.getTotalTimeForAssignment(assignment.id);
      if (actualSeconds > 0) {
        totalHours += actualSeconds / 3600;
        count++;
      }
    }

    return count > 0 ? totalHours / count : 0;
  }

  /**
   * Get default prediction when no data available
   */
  private static getDefaultPrediction(type: AssignmentType): PredictionData {
    const defaults: Record<AssignmentType, number> = {
      homework: 2,
      project: 8,
      exam: 4,
      quiz: 1,
      reading: 1,
      personal: 4,
      other: 2,
    };

    return {
      estimatedHours: defaults[type],
      confidence: 'low',
      reason: 'Default estimate (no historical data)',
      sampleSize: 0,
    };
  }

  /**
   * Get estimation accuracy for a course
   */
  static async getCourseEstimationAccuracy(courseId: number): Promise<EstimationAccuracy> {
    const assignments = await assignmentOps.getByCourseId(courseId);
    return this.calculateEstimationAccuracy(assignments);
  }

  /**
   * Get estimation accuracy for an assignment type
   */
  static async getTypeEstimationAccuracy(type: AssignmentType): Promise<EstimationAccuracy> {
    const allAssignments = await assignmentOps.getAll();
    const assignments = allAssignments.filter((a) => a.assignmentType === type);
    return this.calculateEstimationAccuracy(assignments);
  }

  /**
   * Get overall estimation accuracy
   */
  static async getOverallEstimationAccuracy(): Promise<EstimationAccuracy> {
    const assignments = await assignmentOps.getAll();
    return this.calculateEstimationAccuracy(assignments);
  }

  /**
   * Calculate estimation accuracy metrics
   */
  private static async calculateEstimationAccuracy(
    assignments: Assignment[]
  ): Promise<EstimationAccuracy> {
    let totalEstimated = 0;
    let totalActual = 0;
    let errorSum = 0;
    let underestimateCount = 0;
    let count = 0;

    for (const assignment of assignments) {
      if (!assignment.id || assignment.estimatedHours === 0) continue;

      const actualSeconds = await timeLogOps.getTotalTimeForAssignment(assignment.id);
      if (actualSeconds === 0) continue;

      const actualHours = actualSeconds / 3600;
      const estimatedHours = assignment.estimatedHours;

      totalEstimated += estimatedHours;
      totalActual += actualHours;
      errorSum += Math.abs(actualHours - estimatedHours);
      count++;

      if (actualHours > estimatedHours) {
        underestimateCount++;
      }
    }

    if (count === 0) {
      return {
        totalEstimated: 0,
        totalActual: 0,
        accuracyRatio: 1,
        averageError: 0,
        underestimateRate: 0,
      };
    }

    return {
      totalEstimated,
      totalActual,
      accuracyRatio: totalEstimated > 0 ? totalActual / totalEstimated : 1,
      averageError: errorSum / count,
      underestimateRate: underestimateCount / count,
    };
  }

  /**
   * Get personalized insights about estimation patterns
   */
  static async getEstimationInsights(): Promise<string[]> {
    const insights: string[] = [];
    const overall = await this.getOverallEstimationAccuracy();

    if (overall.totalEstimated === 0) {
      return ['Start tracking time to get personalized insights about your work patterns!'];
    }

    // Overall accuracy
    if (overall.accuracyRatio > 1.3) {
      insights.push(
        `You typically underestimate by ${Math.round((overall.accuracyRatio - 1) * 100)}%. Try adding more buffer time.`
      );
    } else if (overall.accuracyRatio < 0.7) {
      insights.push(
        `You typically overestimate by ${Math.round((1 - overall.accuracyRatio) * 100)}%. You're faster than you think!`
      );
    } else {
      insights.push('Your time estimates are generally accurate! Nice work.');
    }

    // Underestimate rate
    if (overall.underestimateRate > 0.7) {
      insights.push(
        `You underestimate ${Math.round(overall.underestimateRate * 100)}% of the time. Consider multiplying estimates by 1.5x.`
      );
    }

    // Average error
    if (overall.averageError > 2) {
      insights.push(
        `On average, you're off by ${overall.averageError.toFixed(1)} hours. Break tasks into smaller chunks for better estimates.`
      );
    }

    // Course-specific insights
    const courses = await courseOps.getAll();
    for (const course of courses) {
      const courseAccuracy = await this.getCourseEstimationAccuracy(course.id!);
      if (courseAccuracy.totalEstimated > 0 && courseAccuracy.accuracyRatio > 1.5) {
        insights.push(
          `${course.code} assignments take ${Math.round((courseAccuracy.accuracyRatio - 1) * 100)}% longer than expected.`
        );
      }
    }

    return insights;
  }
}
