/**
 * 异步任务状态 Hook
 */
import useSWR from 'swr';
import { API_ENDPOINTS } from '@/lib/api/config';
import { TaskProgress, TaskResult } from '@/types';
import { apiClient } from '@/lib/api/client';

export function useTaskProgress(taskId: string | null) {
  const { data, error, isLoading } = useSWR(
    taskId ? API_ENDPOINTS.TASKS_STATUS(taskId) : null,
    async (url) => apiClient.get(url),
    {
      refreshInterval: (data) => {
        if (!data || ['completed', 'failed'].includes(data.status)) return 0;
        return 2000;
      },
      revalidateOnFocus: false,
    }
  );

  return {
    progress: data as TaskProgress,
    isLoading,
    error,
  };
}

export function useTaskResult(taskId: string | null) {
  const { data, error, isLoading } = useSWR(
    taskId ? API_ENDPOINTS.TASKS_RESULT(taskId) : null,
    async (url) => apiClient.get(url),
    {
      refreshInterval: (data) => {
        if (!data || ['completed', 'failed'].includes(data.status)) return 0;
        return 3000;
      },
      revalidateOnFocus: false,
    }
  );

  return {
    result: data as TaskResult,
    isLoading,
    error,
  };
}

export function useTaskMonitor(taskId: string | null) {
  const progressState = useTaskProgress(taskId);
  const resultState = useTaskResult(taskId);

  return {
    ...progressState,
    result: resultState.result,
    resultError: resultState.error,
    isResultLoading: resultState.isLoading,
  };
}

export function useResourceTasks(resourceType: string, resourceId: number) {
  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINTS.TASKS_RESOURCE(resourceType, resourceId),
    async (url) => apiClient.get(url),
    {
      refreshInterval: 3000,
    }
  );

  return {
    tasks: data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}
