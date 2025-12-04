import { useState, useEffect } from 'react';
import { TimePredictionService } from '../services/timePrediction';

export const InsightsPanel: React.FC = () => {
  const [insights, setInsights] = useState<string[]>([]);
  const [accuracy, setAccuracy] = useState<{
    totalEstimated: number;
    totalActual: number;
    accuracyRatio: number;
    averageError: number;
    underestimateRate: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setIsLoading(true);
    const [insightsData, accuracyData] = await Promise.all([
      TimePredictionService.getEstimationInsights(),
      TimePredictionService.getOverallEstimationAccuracy(),
    ]);

    setInsights(insightsData);
    setAccuracy(accuracyData);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📊 Learning Insights
        </h2>
        <p className="text-gray-500 dark:text-gray-400">Loading insights...</p>
      </div>
    );
  }

  if (!accuracy || accuracy.totalEstimated === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📊 Learning Insights
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Start estimating and tracking time on assignments to see personalized insights about your
          work patterns!
        </p>
      </div>
    );
  }

  const getAccuracyColor = (ratio: number) => {
    if (ratio >= 0.8 && ratio <= 1.2) return 'text-green-600 dark:text-green-400';
    if (ratio >= 0.6 && ratio <= 1.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAccuracyLabel = (ratio: number) => {
    if (ratio >= 0.8 && ratio <= 1.2) return 'Excellent';
    if (ratio >= 0.6 && ratio <= 1.4) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        📊 Learning Insights
      </h2>

      {/* Accuracy Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Accuracy</div>
          <div className={`text-2xl font-bold ${getAccuracyColor(accuracy.accuracyRatio)}`}>
            {getAccuracyLabel(accuracy.accuracyRatio)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {(accuracy.accuracyRatio * 100).toFixed(0)}% of estimated
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Estimated</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {accuracy.totalEstimated.toFixed(1)}h
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total time</div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Actual</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {accuracy.totalActual.toFixed(1)}h
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Time spent</div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Error</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            ±{accuracy.averageError.toFixed(1)}h
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Per assignment</div>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Personalized Insights
        </h3>
        {insights.map((insight, index) => (
          <div
            key={index}
            className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
          >
            <span className="text-blue-600 dark:text-blue-400 text-lg">💡</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{insight}</p>
          </div>
        ))}
      </div>

      <button
        onClick={loadInsights}
        className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        Refresh Insights
      </button>
    </div>
  );
};
