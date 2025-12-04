import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { SchedulingService, type ScheduleSummary } from '../services/scheduling';

export const ScheduleView: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [daysAhead, setDaysAhead] = useState(7);

  useEffect(() => {
    loadSchedule();
  }, [daysAhead]);

  const loadSchedule = async () => {
    setIsLoading(true);
    const scheduleData = await SchedulingService.generateSchedule(daysAhead);
    setSchedule(scheduleData);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📅 Smart Schedule
        </h2>
        <p className="text-gray-500 dark:text-gray-400">Generating schedule...</p>
      </div>
    );
  }

  if (!schedule) {
    return null;
  }

  const { days, totalWorkHours, totalAvailableHours, isRealistic, warnings, suggestions } = schedule;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">📅 Smart Schedule</h2>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Show:</label>
          <select
            value={daysAhead}
            onChange={(e) => setDaysAhead(Number(e.target.value))}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
            <option value={30}>Next 30 days</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Work</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalWorkHours.toFixed(1)}h
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Available</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalAvailableHours.toFixed(1)}h
          </div>
        </div>
        <div className={`rounded-lg p-4 ${
          isRealistic
            ? 'bg-green-50 dark:bg-green-900/20'
            : 'bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className={`text-xs mb-1 ${
            isRealistic
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            Status
          </div>
          <div className={`text-2xl font-bold ${
            isRealistic
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {isRealistic ? '✓ Realistic' : '⚠ Overloaded'}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
            ⚠️ Warnings
          </h3>
          <ul className="space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="text-sm text-yellow-700 dark:text-yellow-400">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
            💡 Suggestions
          </h3>
          <ul className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="text-sm text-blue-700 dark:text-blue-400">
                • {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Schedule by Day */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Daily Schedule
        </h3>
        {days.filter(day => day.blocks.length > 0).map((day) => (
          <div
            key={day.date.toISOString()}
            className={`border-l-4 pl-4 py-3 ${
              day.isOverloaded
                ? 'border-red-500 bg-red-50 dark:bg-red-900/10'
                : 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {day.dayName}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {format(day.date, 'MMM d, yyyy')}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  day.isOverloaded
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {day.totalScheduledHours.toFixed(1)}h / {day.availableHours}h
                </div>
                {day.isOverloaded && (
                  <div className="text-xs text-red-600 dark:text-red-400">Overloaded</div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {day.blocks.map((block, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {block.assignmentTitle}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {format(block.startTime, 'h:mm a')} - {format(block.endTime, 'h:mm a')}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {block.duration.toFixed(1)}h
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {days.filter(day => day.blocks.length > 0).length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No assignments to schedule. Add some assignments to see your schedule!
          </p>
        )}
      </div>

      <button
        onClick={loadSchedule}
        className="mt-6 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        Regenerate Schedule
      </button>
    </div>
  );
};
