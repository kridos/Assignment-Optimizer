import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerState } from '../types';
import { timeLogOps } from '../db/operations';

const TIMER_STORAGE_KEY = 'assignment_optimizer_timer_state';

const getInitialTimerState = (): TimerState => {
  const stored = localStorage.getItem(TIMER_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      return {
        ...parsed,
        startTime: parsed.startTime ? new Date(parsed.startTime) : null,
        pauseEvents: parsed.pauseEvents.map((d: string) => new Date(d)),
        resumeEvents: parsed.resumeEvents.map((d: string) => new Date(d)),
      };
    } catch (error) {
      console.error('Failed to parse timer state from localStorage:', error);
    }
  }

  return {
    assignmentId: null,
    assignmentTitle: null,
    startTime: null,
    pauseEvents: [],
    resumeEvents: [],
    totalElapsed: 0,
    isRunning: false,
    isPaused: false,
  };
};

export const useTimer = () => {
  const [timerState, setTimerState] = useState<TimerState>(getInitialTimerState);
  const [currentTime, setCurrentTime] = useState(0); // seconds
  const intervalRef = useRef<number | null>(null);

  // Calculate current elapsed time
  const calculateElapsedTime = useCallback((state: TimerState): number => {
    if (!state.startTime) return 0;

    let totalTime = 0;
    const now = new Date();

    // If currently running and not paused, calculate time from last resume
    if (state.isRunning && !state.isPaused) {
      const lastResume =
        state.resumeEvents.length > 0
          ? state.resumeEvents[state.resumeEvents.length - 1]
          : state.startTime;
      totalTime += (now.getTime() - lastResume.getTime()) / 1000;
    }

    // Add all completed work intervals
    for (let i = 0; i < state.pauseEvents.length; i++) {
      const pauseTime = state.pauseEvents[i];
      const startOrLastResume = i === 0 ? state.startTime : state.resumeEvents[i - 1];
      totalTime += (pauseTime.getTime() - startOrLastResume.getTime()) / 1000;
    }

    return Math.floor(totalTime);
  }, []);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState));
  }, [timerState]);

  // Update current time every second when timer is running
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTime(calculateElapsedTime(timerState));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState, calculateElapsedTime]);

  const startTimer = useCallback((assignmentId: number, assignmentTitle: string) => {
    const now = new Date();
    setTimerState({
      assignmentId,
      assignmentTitle,
      startTime: now,
      pauseEvents: [],
      resumeEvents: [],
      totalElapsed: 0,
      isRunning: true,
      isPaused: false,
    });
    setCurrentTime(0);
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerState((prev) => {
      if (!prev.isRunning || prev.isPaused) return prev;
      return {
        ...prev,
        pauseEvents: [...prev.pauseEvents, new Date()],
        isPaused: true,
      };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setTimerState((prev) => {
      if (!prev.isRunning || !prev.isPaused) return prev;
      return {
        ...prev,
        resumeEvents: [...prev.resumeEvents, new Date()],
        isPaused: false,
      };
    });
  }, []);

  const stopTimer = useCallback(
    async (notes: string = ''): Promise<number> => {
      const finalElapsed = calculateElapsedTime(timerState);
      const now = new Date();

      if (timerState.assignmentId && timerState.startTime) {
        // Save time log to database
        await timeLogOps.create({
          assignmentId: timerState.assignmentId,
          startTime: timerState.startTime,
          endTime: now,
          pauseEvents: timerState.pauseEvents,
          resumeEvents: timerState.resumeEvents,
          totalActiveSeconds: finalElapsed,
          notes,
          createdAt: now,
        });

        // Reset timer state
        setTimerState({
          assignmentId: null,
          assignmentTitle: null,
          startTime: null,
          pauseEvents: [],
          resumeEvents: [],
          totalElapsed: 0,
          isRunning: false,
          isPaused: false,
        });
        setCurrentTime(0);

        return finalElapsed;
      }

      return 0;
    },
    [timerState, calculateElapsedTime]
  );

  const resetTimer = useCallback(() => {
    setTimerState({
      assignmentId: null,
      assignmentTitle: null,
      startTime: null,
      pauseEvents: [],
      resumeEvents: [],
      totalElapsed: 0,
      isRunning: false,
      isPaused: false,
    });
    setCurrentTime(0);
  }, []);

  // Format time for display (HH:MM:SS)
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    timerState,
    currentTime,
    formattedTime: formatTime(currentTime),
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
  };
};
