import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { assignmentOps } from '../db/operations';
import { AssignmentList } from '../components/AssignmentList';
import { Timer } from '../components/Timer';
import { AddAssignmentForm } from '../components/AddAssignmentForm';
import { CanvasSync } from '../components/CanvasSync';
import { InsightsPanel } from '../components/InsightsPanel';
import { ScheduleView } from '../components/ScheduleView';
import { useTimer } from '../hooks/useTimer';

type FilterType = 'all' | 'upcoming' | 'overdue' | 'in_progress';

export const Dashboard: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCanvasSync, setShowCanvasSync] = useState(false);
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const { startTimer } = useTimer();

  const allAssignments = useLiveQuery(() => assignmentOps.getAll(), []);
  const upcomingAssignments = useLiveQuery(() => assignmentOps.getUpcoming(7), []);
  const overdueAssignments = useLiveQuery(() => assignmentOps.getOverdue(), []);
  const inProgressAssignments = useLiveQuery(() => assignmentOps.getByStatus('in_progress'), []);

  const handleStartTimer = (assignmentId: number, assignmentTitle: string) => {
    startTimer(assignmentId, assignmentTitle);
    // Update assignment status to in_progress
    assignmentOps.updateStatus(assignmentId, 'in_progress');
  };

  const handleTimerComplete = async (assignmentId: number, totalSeconds: number) => {
    console.log(`Timer completed for assignment ${assignmentId}: ${totalSeconds}s`);
    // Could show a success notification here
  };

  const getFilteredCount = (filterType: FilterType): number => {
    switch (filterType) {
      case 'all':
        return allAssignments?.length || 0;
      case 'upcoming':
        return upcomingAssignments?.length || 0;
      case 'overdue':
        return overdueAssignments?.length || 0;
      case 'in_progress':
        return inProgressAssignments?.length || 0;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Assignment Deadline Optimizer
              </h1>
              <nav className="flex space-x-4 mt-2">
                <Link to="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  Dashboard
                </Link>
                <Link to="/analytics" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Analytics
                </Link>
              </nav>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  console.log('Canvas Sync clicked');
                  setShowAddForm(false);
                  setShowCanvasSync(true);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Sync with Canvas
              </button>
              <button
                onClick={() => {
                  console.log('Add Assignment clicked');
                  setShowCanvasSync(false);
                  setShowAddForm(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                + Add Assignment
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
              {allAssignments?.length || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Upcoming</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {upcomingAssignments?.length || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {overdueAssignments?.length || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {inProgressAssignments?.length || 0}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'upcoming', label: 'Upcoming' },
                { key: 'overdue', label: 'Overdue' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'all', label: 'All' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as FilterType)}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm transition-colors
                    ${
                      filter === tab.key
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  {tab.label} ({getFilteredCount(tab.key as FilterType)})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Assignments List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <AssignmentList onStartTimer={handleStartTimer} filter={filter} />
        </div>

        {/* Insights and Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <InsightsPanel />
          <ScheduleView />
        </div>
      </main>

      {/* Timer (Fixed at bottom) */}
      <Timer onComplete={handleTimerComplete} />

      {/* Modals */}
      {showAddForm && (
        <AddAssignmentForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => setShowAddForm(false)}
        />
      )}

      {showCanvasSync && (
        <CanvasSync
          onClose={() => setShowCanvasSync(false)}
          onSuccess={() => setShowCanvasSync(false)}
        />
      )}
    </div>
  );
};
