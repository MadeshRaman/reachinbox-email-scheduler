import { useState, useEffect, useCallback } from 'react';
import { checkHealth } from '../services/api';
import { HealthCheckResponse } from '../types';

export const useHealthCheck = () => {
  const [data, setData] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await checkHealth();
      setData(result);
      setLastChecked(new Date());
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to connect to backend server');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return {
    data,
    loading,
    error,
    lastChecked,
    refetch: fetchHealth,
  };
};
