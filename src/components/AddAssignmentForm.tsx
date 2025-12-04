import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { courseOps, assignmentOps } from '../db/operations';
import { TimePredictionService } from '../services/timePrediction';
import type { AssignmentType } from '../types';

interface AddAssignmentFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddAssignmentForm: React.FC<AddAssignmentFormProps> = ({ onClose, onSuccess }) => {
  const courses = useLiveQuery(() => courseOps.getAll(), []);

  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    dueDate: '',
    dueTime: '23:59',
    points: '',
    assignmentType: 'homework' as AssignmentType,
    estimatedHours: '',
  });

  const [showNewCourseForm, setShowNewCourseForm] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '',
    code: '',
    color: '#3B82F6',
  });

  const [prediction, setPrediction] = useState<{
    hours: number;
    reason: string;
    confidence: string;
  } | null>(null);
  const [showPrediction, setShowPrediction] = useState(true);

  // Auto-predict time
  useEffect(() => {
    const getPrediction = async () => {
      if (!formData.courseId || showNewCourseForm) {
        setPrediction(null);
        return;
      }

      const courseId = parseInt(formData.courseId);
      const result = await TimePredictionService.predictTime(
        courseId,
        formData.assignmentType,
        formData.title,
        formData.description
      );

      if (result.estimatedHours > 0) {
        setPrediction({
          hours: result.estimatedHours,
          reason: result.reason,
          confidence: result.confidence,
        });

        if (!formData.estimatedHours) {
          setFormData(prev => ({ ...prev, estimatedHours: result.estimatedHours.toString() }));
        }
      }
    };

    getPrediction();
  }, [formData.courseId, formData.assignmentType, formData.title, formData.description, showNewCourseForm, formData.estimatedHours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let courseId = parseInt(formData.courseId);

    if (showNewCourseForm) {
      courseId = await courseOps.create({
        canvasId: null,
        name: newCourse.name,
        code: newCourse.code,
        color: newCourse.color,
        syncMode: 'manual',
        isManual: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const dueDate = new Date(`${formData.dueDate}T${formData.dueTime}`);

    await assignmentOps.create({
      canvasId: null,
      courseId: courseId,
      title: formData.title,
      description: formData.description,
      dueDate: dueDate,
      points: parseFloat(formData.points) || 0,
      assignmentType: formData.assignmentType,
      status: 'not_started',
      estimatedHours: parseFloat(formData.estimatedHours) || 0,
      isManual: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    onSuccess?.();
    onClose();
  };

  console.log('AddAssignmentForm component rendering NOW');

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          maxWidth: '42rem',
          width: '100%',
          zIndex: 10000,
          position: 'relative'
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            ✏️ New Assignment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Course Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Course <span className="text-red-500">*</span>
              </label>
              {!showNewCourseForm ? (
                <div className="space-y-2">
                  <select
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  >
                    <option value="">Choose a course...</option>
                    {courses?.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCourseForm(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                  >
                    + Create New Course
                  </button>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <input
                    type="text"
                    placeholder="Course Name (e.g., Data Structures)"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Course Code (e.g., CSE373)"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color:</label>
                    <input
                      type="color"
                      value={newCourse.color}
                      onChange={(e) => setNewCourse({ ...newCourse, color: e.target.value })}
                      className="w-16 h-10 rounded-lg cursor-pointer border-2 border-gray-300"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewCourseForm(false)}
                    className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400 font-medium"
                  >
                    ← Back to existing courses
                  </button>
                </div>
              )}
            </div>

            {/* Assignment Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                placeholder="e.g., Homework 3 - Binary Search Trees"
              />
            </div>

            {/* Due Date and Time - Compact Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Type and Points - Compact Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={formData.assignmentType}
                  onChange={(e) =>
                    setFormData({ ...formData, assignmentType: e.target.value as AssignmentType })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="homework">Homework</option>
                  <option value="project">Project</option>
                  <option value="exam">Exam</option>
                  <option value="quiz">Quiz</option>
                  <option value="reading">Reading</option>
                  <option value="personal">Personal</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Points
                </label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Estimated Hours with Prediction */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Estimated Hours
              </label>
              <input
                type="number"
                value={formData.estimatedHours}
                onChange={(e) => {
                  setFormData({ ...formData, estimatedHours: e.target.value });
                  setShowPrediction(false);
                }}
                min="0"
                step="0.5"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0"
              />
              {prediction && showPrediction && (
                <div className={`mt-2 p-3 rounded-xl text-sm border ${
                  prediction.confidence === 'high'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : prediction.confidence === 'medium'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`}>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    💡 {prediction.hours}h suggested
                    <span className="ml-2 text-xs font-normal opacity-75">
                      ({prediction.confidence} confidence)
                    </span>
                  </div>
                  <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">{prediction.reason}</div>
                </div>
              )}
            </div>

            {/* Description - Optional */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                placeholder="Optional details..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/30"
              >
                Add Assignment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
