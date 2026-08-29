import { useState, useEffect, useCallback } from 'react';
import {
  getScheduledEmailsApi,
  getSentEmailsApi,
  getEmailStatsApi,
} from '../services/api';
import { EmailJob, EmailStats } from '../types';

export const useEmails = () => {
  const [scheduledJobs, setScheduledJobs] = useState<EmailJob[]>([]);
  const [sentJobs, setSentJobs] = useState<EmailJob[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    scheduled: 0,
    processing: 0,
    sent: 0,
    rateLimited: 0,
    failed: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [scheduledRes, sentRes, statsRes] = await Promise.all([
        getScheduledEmailsApi(1, 50).catch(() => ({ jobs: [], total: 0 })),
        getSentEmailsApi(1, 50).catch(() => ({ jobs: [], total: 0 })),
        getEmailStatsApi().catch(() => ({
          total: 0,
          scheduled: 0,
          processing: 0,
          sent: 0,
          rateLimited: 0,
          failed: 0,
        })),
      ]);

      setScheduledJobs(scheduledRes.jobs || []);
      setSentJobs(sentRes.jobs || []);
      setStats(statsRes);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error fetching email data');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    // Auto-polling every 4 seconds for real-time scheduled and sent status updates
    const interval = setInterval(() => {
      fetchAll(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchAll]);

  return {
    scheduledJobs,
    sentJobs,
    stats,
    loading,
    error,
    refresh: () => fetchAll(false),
  };
};
