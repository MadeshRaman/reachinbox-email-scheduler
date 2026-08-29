import { useState, useEffect, useCallback } from 'react';
import { getSlackStatusApi, connectSlackApi, disconnectSlackApi } from '../services/api';
import { SlackStatus } from '../types';

export const useSlack = () => {
  const [status, setStatus] = useState<SlackStatus>({
    connected: false,
    teamName: null,
    channelId: null,
    configured: false,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSlackStatusApi();
      setStatus({
        connected: data.connected,
        teamName: data.teamName,
        channelId: data.channelId,
        configured: data.configured,
      });
    } catch (err: any) {
      console.warn('Slack status fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const connectSlack = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const oauthUrl = await connectSlackApi();
      if (oauthUrl) {
        window.location.href = oauthUrl;
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Slack is not configured. Add SLACK_CLIENT_ID to backend .env');
    } finally {
      setActionLoading(false);
    }
  };

  const disconnectSlack = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await disconnectSlackApi();
      setStatus((prev) => ({ ...prev, connected: false, teamName: null, channelId: null }));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to disconnect Slack');
    } finally {
      setActionLoading(false);
    }
  };

  return {
    status,
    loading,
    actionLoading,
    error,
    connectSlack,
    disconnectSlack,
    refreshStatus: fetchStatus,
  };
};
