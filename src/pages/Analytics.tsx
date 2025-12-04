import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { analyticsOps, assignmentOps, timeLogOps, courseOps } from '../db/operations';

export const Analytics: React.FC = () => {
  const [timeByType, setTimeByType] = useState<Record<string, number>>({});
  const [timeByCourse, setTimeByCourse] = useState<Record<number, number>>({});
  const [weeklyTime, setWeeklyTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const courses = useLiveQuery(() => courseOps.getAll(), []);
  const allAssignments = useLiveQuery(() => assignmentOps.getAll(), []);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);

    const [typeStats, courseStats] = await Promise.all([
      analyticsOps.getTimeStatsByType(),
      analyticsOps.getTimeStatsByCourse(),
    ]);

    // Calculate weekly time (last 7 days)
    const recentLogs = await timeLogOps.getRecentLogs(7);
    const weekTotal = recentLogs.reduce((sum, log) => sum + log.totalActiveSeconds, 0);

    setTimeByType(typeStats);
    setTimeByCourse(courseStats);
    setWeeklyTime(weekTotal / 3600);
    setIsLoading(false);
  };

  const formatHours = (seconds: number) => {
    const hours = seconds / 3600;
    return hours.toFixed(1);
  };

  const getCourseName = (courseId: number) => {
    const course = courses?.find(c => c.id === courseId);
    return course?.code || `Course ${courseId}`;
  };

  const sortedTypes = Object.entries(timeByType).sort((a, b) => b[1] - a[1]);
  const sortedCourses = Object.entries(timeByCourse).sort((a, b) => b[1] - a[1]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Analytics & Insights
            </h1>
            <nav className="flex space-x-4">
              <Link to="/" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                Dashboard
              </Link>
              <Link to="/analytics" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Analytics
              </Link>
            </nav>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const completedAssignments = allAssignments?.filter(a => a.status === 'completed').length || 0;
  const inProgressAssignments = allAssignments?.filter(a => a.status === 'in_progress').length || 0;
  const totalAssignments = allAssignments?.length || 0;
  const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Analytics & Insights
          </h1>
          <nav className="flex space-x-4">
            <Link to="/" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              Dashboard
            </Link>
            <Link to="/analytics" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Analytics
            </Link>
          </nav>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Week</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {weeklyTime.toFixed(1)}h
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Time worked</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completed</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {completedAssignments}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Assignments</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">In Progress</div>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {inProgressAssignments}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Assignments</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completion Rate</div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {completionRate.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Overall</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time by Course */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Time by Course
            </h2>
            {sortedCourses.length > 0 ? (
              <div className="space-y-3">
                {sortedCourses.map(([courseId, seconds]) => {
                  const courseName = getCourseName(Number(courseId));
                  const hours = formatHours(seconds);
                  const course = courses?.find(c => c.id === Number(courseId));

                  return (
                    <div key={courseId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        {course && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: course.color }}
                          />
                        )}
                        <span className="text-gray-700 dark:text-gray-300">{courseName}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full"
                            style={{
                              width: `${Math.min((seconds / Math.max(...sortedCourses.map(([, s]) => s))) * 100, 100)}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                          {hours}h
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No time logged yet. Start tracking time on assignments!
              </p>
            )}
          </div>

          {/* Time by Type */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Time by Assignment Type
            </h2>
            {sortedTypes.length > 0 ? (
              <div className="space-y-3">
                {sortedTypes.map(([type, seconds]) => {
                  const hours = formatHours(seconds);

                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-gray-700 dark:text-gray-300 capitalize">{type}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-green-600 dark:bg-green-400 h-2 rounded-full"
                            style={{
                              width: `${Math.min((seconds / Math.max(...sortedTypes.map(([, s]) => s))) * 100, 100)}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                          {hours}h
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No time logged yet. Start tracking time on assignments!
              </p>
            )}
          </div>
        </div>

        <button
          onClick={loadAnalytics}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Refresh Analytics
        </button>
      </div>
    </div>
  );
};
