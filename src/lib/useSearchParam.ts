import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

export function useSearchParam(key: string, defaultValue = ''): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) =>
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === '' || next === defaultValue) params.delete(key);
          else params.set(key, next);
          return params;
        },
        { replace: true },
      ),
    [key, defaultValue, setSearchParams],
  );

  return [value, setValue];
}

export function useUpdateSearchParams() {
  const [, setSearchParams] = useSearchParams();
  return useCallback(
    (updates: Record<string, string | null>) =>
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === '') params.delete(key);
            else params.set(key, value);
          }
          return params;
        },
        { replace: true },
      ),
    [setSearchParams],
  );
}
