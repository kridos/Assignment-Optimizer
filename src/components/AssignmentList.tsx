import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { assignmentOps, courseOps } from '../db/operations';
import type { Assignment } from '../types';

interface AssignmentListProps {
  onStartTimer: (assignmentId: number, assignmentTitle: string) => void;
  filter?: 'all' | 'upcoming' | 'overdue' | 'in_progress';
}

export const AssignmentList: React.FC<AssignmentListProps> = ({ onStartTimer, filter = 'all' }) => {
  const assignments = useLiveQuery(async () => {
    switch (filter) {
      case 'upcoming':
        return await assignmentOps.getUpcoming();
      case 'overdue':
        return await assignmentOps.getOverdue();
      case 'in_progress':
        return await assignmentOps.getByStatus('in_progress');
      default:
        return await assignmentOps.getAll();
    }
  }, [filter]);

  const courses = useLiveQuery(() => courseOps.getAll(), []);

  const getCourse = (courseId: number) => {
    return courses?.find((c) => c.id === courseId);
  };

  const handleStatusChange = async (assignmentId: number, status: Assignment['status']) => {
    await assignmentOps.updateStatus(assignmentId, status);
  };

  const handleDelete = async (assignmentId: number) => {
    if (confirm('Are you sure you want to delete this assignment?')) {
      await assignmentOps.delete(assignmentId);
    }
  };

  const getStatusColor = (status: Assignment['status']) => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-200 text-gray-800';
      case 'in_progress':
        return 'bg-blue-200 text-blue-800';
      case 'blocked':
        return 'bg-red-200 text-red-800';
      case 'completed':
        return 'bg-green-200 text-green-800';
    }
  };

  const isOverdue = (dueDate: Date) => {
    return new Date(dueDate) < new Date();
  };

  if (!assignments || !courses) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading assignments...</div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No assignments found. Add some assignments or sync with Canvas!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => {
        const course = getCourse(assignment.courseId);
        const overdue = isOverdue(assignment.dueDate) && assignment.status !== 'completed';

        return (
          <div
            key={assignment.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 ${
              overdue ? 'border-red-500' : 'border-transparent'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  {course && (
                    <span
                      className="px-2 py-1 text-xs font-medium rounded"
                      style={{
                        backgroundColor: course.color + '20',
                        color: course.color,
                      }}
                    >
                      {course.code}
                    </span>
                  )}
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                      assignment.status
                    )}`}
                  >
                    {assignment.status.replace('_', ' ')}
                  </span>
                  {assignment.isManual && (
                    <span className="text-xs text-gray-500" title="Manually created">
                      ✏️
                    </span>
                  )}
                  {!assignment.isManual && (
                    <span className="text-xs text-gray-500" title="Synced from Canvas">
                      🔄
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {assignment.title}
                </h3>

                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className={overdue ? 'text-red-600 font-semibold' : ''}>
                    Due: {format(new Date(assignment.dueDate), 'MMM d, yyyy h:mm a')}
                  </span>
                  {assignment.points > 0 && <span>{assignment.points} points</span>}
                  {assignment.estimatedHours > 0 && (
                    <span>Est: {assignment.estimatedHours}h</span>
                  )}
                </div>

                {assignment.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {assignment.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                <button
                  onClick={() => onStartTimer(assignment.id!, assignment.title)}
                  disabled={assignment.status === 'completed'}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                >
                  Start Timer
                </button>

                <select
                  value={assignment.status}
                  onChange={(e) =>
                    handleStatusChange(assignment.id!, e.target.value as Assignment['status'])
                  }
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                </select>

                {assignment.isManual && (
                  <button
                    onClick={() => handleDelete(assignment.id!)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
