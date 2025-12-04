import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CanvasAPIService } from '../services/canvasApi';
import { settingsOps, courseOps, assignmentOps } from '../db/operations';
import type { SyncMode } from '../types';

interface CanvasSyncProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const CanvasSync: React.FC<CanvasSyncProps> = ({ onClose, onSuccess }) => {
  const settings = useLiveQuery(() => settingsOps.get(), []);

  const [step, setStep] = useState<'credentials' | 'courses'>('credentials');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [canvasCourses, setCanvasCourses] = useState<any[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<
    Record<string, { selected: boolean; syncMode: SyncMode }>
  >({});

  useState(() => {
    if (settings) {
      setBaseUrl(settings.canvasBaseUrl || '');
      setApiToken(settings.canvasApiToken || '');
      if (settings.canvasApiToken && settings.canvasBaseUrl) {
        // Auto-advance to courses if credentials exist
        handleTestConnection();
      }
    }
  });

  const handleTestConnection = async () => {
    setIsLoading(true);
    setError('');

    try {
      const api = new CanvasAPIService(baseUrl, apiToken);
      const isConnected = await api.testConnection();

      if (!isConnected) {
        setError('Failed to connect to Canvas. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      // Save credentials
      await settingsOps.updateCanvasCredentials(baseUrl, apiToken);

      // Fetch courses
      const courses = await api.getCourses();
      setCanvasCourses(courses);

      // Initialize selection state
      const initialSelection: Record<string, { selected: boolean; syncMode: SyncMode }> = {};
      courses.forEach((course) => {
        initialSelection[course.id] = { selected: true, syncMode: 'auto' };
      });
      setSelectedCourses(initialSelection);

      setStep('courses');
    } catch (err: any) {
      setError(err.message || 'An error occurred while connecting to Canvas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    setError('');

    try {
      const api = new CanvasAPIService(baseUrl, apiToken);

      // Import selected courses
      for (const canvasCourse of canvasCourses) {
        const selection = selectedCourses[canvasCourse.id];
        if (!selection?.selected) continue;

        // Check if course already exists
        const existingCourse = await courseOps.getByCanvasId(canvasCourse.id.toString());

        let courseId: number;

        if (existingCourse) {
          // Update existing course
          await courseOps.update(existingCourse.id!, {
            syncMode: selection.syncMode,
            updatedAt: new Date(),
          });
          courseId = existingCourse.id!;
        } else {
          // Create new course
          const courseData = CanvasAPIService.convertCanvasCourse(canvasCourse);
          courseId = await courseOps.create({
            ...courseData,
            syncMode: selection.syncMode,
          });
        }

        // Only sync assignments if mode is 'auto'
        if (selection.syncMode === 'auto') {
          // Fetch and import assignments
          const canvasAssignments = await api.getAssignments(canvasCourse.id);

          for (const canvasAssignment of canvasAssignments) {
            // Check if assignment already exists
            const existingAssignment = await assignmentOps.getByCanvasId(
              canvasAssignment.id.toString()
            );

            if (!existingAssignment) {
              // Create new assignment
              const assignmentData = CanvasAPIService.convertCanvasAssignment(
                canvasAssignment,
                courseId
              );
              await assignmentOps.create(assignmentData);
            } else {
              // Update existing assignment
              await assignmentOps.update(existingAssignment.id!, {
                title: canvasAssignment.name,
                description: canvasAssignment.description || '',
                dueDate: canvasAssignment.due_at ? new Date(canvasAssignment.due_at) : new Date(),
                points: canvasAssignment.points_possible || 0,
                updatedAt: new Date(),
              });
            }
          }
        }
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while syncing.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses((prev) => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        selected: !prev[courseId]?.selected,
      },
    }));
  };

  const setSyncMode = (courseId: string, syncMode: SyncMode) => {
    setSelectedCourses((prev) => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        syncMode,
      },
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 overflow-y-auto flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Sync with Canvas
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
              {error}
            </div>
          )}

          {step === 'credentials' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Canvas Base URL
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://canvas.university.edu"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your Canvas institution's URL (e.g., https://canvas.uw.edu)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Token
                </label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Your Canvas API token"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Generate from: Canvas → Account → Settings → New Access Token
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={isLoading || !baseUrl || !apiToken}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isLoading ? 'Connecting...' : 'Connect & Continue'}
                </button>
              </div>
            </div>
          )}

          {step === 'courses' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select courses to sync and choose sync mode for each:
              </p>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {canvasCourses.map((course) => (
                  <div
                    key={course.id}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedCourses[course.id]?.selected || false}
                        onChange={() => toggleCourse(course.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {course.course_code}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {course.name}
                        </div>

                        {selectedCourses[course.id]?.selected && (
                          <div className="mt-2 flex space-x-2">
                            <label className="flex items-center space-x-1">
                              <input
                                type="radio"
                                name={`sync-mode-${course.id}`}
                                checked={selectedCourses[course.id]?.syncMode === 'auto'}
                                onChange={() => setSyncMode(course.id, 'auto')}
                              />
                              <span className="text-sm">Auto-sync assignments</span>
                            </label>
                            <label className="flex items-center space-x-1">
                              <input
                                type="radio"
                                name={`sync-mode-${course.id}`}
                                checked={selectedCourses[course.id]?.syncMode === 'hybrid'}
                                onChange={() => setSyncMode(course.id, 'hybrid')}
                              />
                              <span className="text-sm">Manual assignments only</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSync}
                  disabled={
                    isLoading || !Object.values(selectedCourses).some((c) => c.selected)
                  }
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isLoading ? 'Syncing...' : 'Sync Selected Courses'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
