import { useState, useEffect } from 'react';
import { useTimer } from '../hooks/useTimer';

interface TimerProps {
  onComplete?: (assignmentId: number, totalSeconds: number) => void;
}

export const Timer: React.FC<TimerProps> = ({ onComplete }) => {
  const {
    timerState,
    currentTime,
    formattedTime,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useTimer();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [notes, setNotes] = useState('');
  const [adjustedTime, setAdjustedTime] = useState(0);

  useEffect(() => {
    setAdjustedTime(currentTime);
  }, [currentTime]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Space to pause/resume
      if (e.code === 'Space' && timerState.isRunning) {
        e.preventDefault();
        if (timerState.isPaused) {
          resumeTimer();
        } else {
          pauseTimer();
        }
      }
      // Enter to mark done (if running)
      if (e.code === 'Enter' && timerState.isRunning && !showConfirmation) {
        e.preventDefault();
        setShowConfirmation(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [timerState, pauseTimer, resumeTimer, showConfirmation]);

  // Warning for long sessions
  useEffect(() => {
    if (currentTime > 14400 && timerState.isRunning && !timerState.isPaused) {
      // 4 hours
      console.warn('Timer has been running for over 4 hours');
      // Could show a notification here
    }
  }, [currentTime, timerState]);

  const handleStop = async () => {
    const totalSeconds = await stopTimer(notes);
    if (onComplete && timerState.assignmentId) {
      onComplete(timerState.assignmentId, totalSeconds);
    }
    setShowConfirmation(false);
    setNotes('');
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setNotes('');
  };

  const getHoursAndMinutes = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours === 0) {
      return `${minutes}m`;
    }
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  if (!timerState.isRunning) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700 p-4">
      <div className="max-w-4xl mx-auto">
        {!showConfirmation ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  timerState.isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'
                }`}
              />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Currently working on:</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {timerState.assignmentTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
                  {formattedTime}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {getHoursAndMinutes(currentTime)}
                </p>
              </div>

              <div className="flex space-x-2">
                {timerState.isPaused ? (
                  <button
                    onClick={resumeTimer}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={pauseTimer}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                  >
                    Pause
                  </button>
                )}
                <button
                  onClick={() => setShowConfirmation(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Complete Work Session
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You worked on {timerState.assignmentTitle} for {getHoursAndMinutes(currentTime)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adjust time if needed:
              </label>
              <input
                type="number"
                value={Math.floor(adjustedTime / 60)}
                onChange={(e) => setAdjustedTime(parseInt(e.target.value) * 60)}
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Minutes"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">minutes</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (optional):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={2}
                placeholder="Add any notes about this work session..."
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Confirm & Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
          Tip: Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Space</kbd>{' '}
          to pause/resume, <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
            Enter
          </kbd>{' '}
          to mark done
        </div>
      </div>
    </div>
  );
};
