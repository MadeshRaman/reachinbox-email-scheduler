import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Clock,
  Send,
  Users,
  AlertCircle,
  CheckCircle2,
  FileText,
  Trash2,
  Sparkles,
  Gauge,
} from 'lucide-react';
import { scheduleEmailsApi } from '../services/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [senderEmail, setSenderEmail] = useState('reachinbox@demo.ethereal.email');
  const [senderName, setSenderName] = useState('ReachInbox Founder');
  const [subject, setSubject] = useState('Introduction: Accelerate your outbound outreach with ReachInbox');
  const [body, setBody] = useState(
    `Hi {{name}},\n\nI noticed your team has been scaling sales operations and wanted to share how ReachInbox automates cold email scheduling and rate-limiting.\n\nWould you have 10 minutes for a brief walkthrough this week?\n\nBest regards,\nReachInbox Team`
  );

  const [manualRecipientsText, setManualRecipientsText] = useState(
    'alex.smith@example.com, sara.connor@example.com\nmike.ross@example.com'
  );
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [parsedRecipients, setParsedRecipients] = useState<string[]>([]);

  // Start Date & Time
  const nowStr = new Date(Date.now() + 60000).toISOString().slice(0, 16);
  const [startTime, setStartTime] = useState<string>(nowStr);

  // Delay & Rate Limiting
  const [delaySeconds, setDelaySeconds] = useState<number>(10);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Extract all unique valid emails from manual input + uploaded file
  const getAllRecipients = (): string[] => {
    const manualEmails = manualRecipientsText
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => EMAIL_REGEX.test(e));

    const combined = Array.from(new Set([...manualEmails, ...parsedRecipients]));
    return combined;
  };

  const validRecipients = getAllRecipients();

  // CSV / TXT File Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      // Extract all email patterns from file text/CSV
      const matches = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const cleaned = Array.from(
        new Set(matches.map((m) => m.trim().toLowerCase()).filter((m) => EMAIL_REGEX.test(m)))
      );

      setParsedRecipients(cleaned);
    };

    reader.readAsText(file);
  };

  const handleRemoveFile = () => {
    setUploadedFileName(null);
    setParsedRecipients([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Compute Dispatch Duration Preview
  const calculateTotalDuration = () => {
    if (validRecipients.length <= 1) return 'Instant dispatch';
    const totalSecs = (validRecipients.length - 1) * delaySeconds;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!senderEmail || !EMAIL_REGEX.test(senderEmail)) {
      setError('Please provide a valid sender email.');
      return;
    }

    if (validRecipients.length === 0) {
      setError('Please add at least one valid recipient email address.');
      return;
    }

    if (!subject.trim() || !body.trim()) {
      setError('Subject and body cannot be empty.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        senderEmail: senderEmail.trim(),
        senderName: senderName.trim() || undefined,
        recipients: validRecipients,
        subject: subject.trim(),
        body: body.trim(),
        startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        delayBetweenEmails: Number(delaySeconds) || 0,
        hourlyLimit: Number(hourlyLimit) || 100,
      };

      const response = await scheduleEmailsApi(payload);
      setSuccessMsg(`✅ Scheduled ${response.count} email(s) successfully!`);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to schedule emails.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl glass-panel rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Compose & Schedule Outbound Campaign</h3>
              <p className="text-xs text-slate-400">
                Staggered delayed delivery powered by BullMQ & Redis Rate Limiter
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Sender Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sender Email <span className="text-brand-400">*</span>
              </label>
              <input
                type="email"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="founder@company.com"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sender Display Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Alex Morgan (ReachInbox)"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Recipient Source: CSV / TXT Upload & Manual Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-brand-400" />
                <span>Recipients List & File Upload</span>
              </label>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20">
                {validRecipients.length} valid email{validRecipients.length === 1 ? '' : 's'} detected
              </span>
            </div>

            {/* Drag & Drop / File Input Zone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-brand-500/60 rounded-xl p-4 text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/80 flex flex-col items-center justify-center space-y-1.5 group"
              >
                <Upload className="w-5 h-5 text-slate-400 group-hover:text-brand-400 transition-colors" />
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                  Upload CSV / TXT list
                </span>
                <span className="text-[10px] text-slate-500">Auto-extracts and deduplicates</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Manual Input Area */}
              <div>
                <textarea
                  rows={3}
                  value={manualRecipientsText}
                  onChange={(e) => setManualRecipientsText(e.target.value)}
                  placeholder="Paste emails separated by commas or line breaks..."
                  className="w-full h-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono resize-none"
                />
              </div>
            </div>

            {/* Uploaded File Chip */}
            {uploadedFileName && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <FileText className="w-3.5 h-3.5 text-brand-400" />
                  <span className="font-medium">{uploadedFileName}</span>
                  <span className="text-slate-500 font-mono">({parsedRecipients.length} found)</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-rose-400 hover:text-rose-300 p-1 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Recipient Chips Preview */}
            {validRecipients.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {validRecipients.slice(0, 6).map((rec, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 truncate max-w-[200px]"
                  >
                    {rec}
                  </span>
                ))}
                {validRecipients.length > 6 && (
                  <span className="text-[11px] font-semibold text-brand-400 px-2 py-0.5">
                    + {validRecipients.length - 6} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Subject & Body */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Subject Line <span className="text-brand-400">*</span>
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Product update demo..."
                className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Body (Markdown / Plaintext) <span className="text-brand-400">*</span>
              </label>
              <textarea
                rows={5}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email content..."
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all font-sans leading-relaxed"
              />
            </div>
          </div>

          {/* Timing, Staggered Delay, and Rate Limiting */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              <span>Scheduling & Rate Limiting Controls</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Delay Between Sends (Seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max="3600"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Hourly Limit (Cap/hr)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Math.max(1, parseInt(e.target.value, 10) || 100))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
            </div>

            {/* Dynamic Forecast Bar */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
              <span className="flex items-center space-x-1">
                <Gauge className="w-3.5 h-3.5 text-brand-400" />
                <span>Estimated Batch Span:</span>
              </span>
              <span className="font-mono text-brand-300 font-semibold">
                {calculateTotalDuration()} ({validRecipients.length} emails @ {delaySeconds}s interval)
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || validRecipients.length === 0}
              className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-brand-600/30 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Queueing in BullMQ...' : `Schedule ${validRecipients.length} Email(s)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
