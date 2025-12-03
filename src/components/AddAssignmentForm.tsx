import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { courseOps, assignmentOps } from '../db/operations';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let courseId = parseInt(formData.courseId);

    // If creating a new course
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

    // Create the assignment
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Add New Assignment
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Course Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Course *
              </label>
              {!showNewCourseForm ? (
                <div className="space-y-2">
                  <select
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a course...</option>
                    {courses?.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCourseForm(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    + Create New Course
                  </button>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <input
                    type="text"
                    placeholder="Course Name (e.g., Data Structures)"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Course Code (e.g., CSE333)"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300">Color:</label>
                    <input
                      type="color"
                      value={newCourse.color}
                      onChange={(e) => setNewCourse({ ...newCourse, color: e.target.value })}
                      className="w-12 h-8 rounded cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewCourseForm(false)}
                    className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400"
                  >
                    ← Back to existing courses
                  </button>
                </div>
              )}
            </div>

            {/* Assignment Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assignment Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Homework 3 - Binary Search Trees"
              />
            </div>

            {/* Due Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Time
                </label>
                <input
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Assignment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assignment Type
              </label>
              <select
                value={formData.assignmentType}
                onChange={(e) =>
                  setFormData({ ...formData, assignmentType: e.target.value as AssignmentType })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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

            {/* Points and Estimated Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Optional details about this assignment..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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
