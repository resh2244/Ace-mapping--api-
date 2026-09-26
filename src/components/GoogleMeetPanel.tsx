import React, { useState } from 'react';
import { Video, Calendar, ExternalLink, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getCachedAccessToken } from '../lib/firebase.js';

interface GoogleMeetPanelProps {
  currentAddress: string;
  user: any;
  onMeetCreated?: (uri: string) => void;
}

export const GoogleMeetPanel: React.FC<GoogleMeetPanelProps> = ({
  currentAddress,
  user,
  onMeetCreated
}) => {
  const [meetingUri, setMeetingUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = useState('Address Review & Site Consultation');

  const handleCreateMeet = async () => {
    if (!user) {
      setError('Please sign in with Google above to create a Google Meet call.');
      return;
    }

    const token = getCachedAccessToken();
    if (!token) {
      setError('Active Google OAuth token not detected. Please sign out and sign in again to refresh Google Meet permissions.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/meet/spaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          address: currentAddress,
          notes: meetingTitle
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create Google Meet space');
      }

      const uri = data.meetingUri || (data.space && data.space.meetingUri);
      if (uri) {
        setMeetingUri(uri);
        if (onMeetCreated) onMeetCreated(uri);
      } else {
        throw new Error('Meet URI not returned by Google Meet API');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating Google Meet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Google Meet Integration</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                Workspace API
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Host a virtual address inspection or field consultation with stakeholders
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Meeting Subject / Address Context
          </label>
          <input
            type="text"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleCreateMeet}
            disabled={loading}
            className="w-full py-2 px-4 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                <span>Create Meet Room</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {meetingUri && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Google Meet Conference Created!
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-mono">
                {meetingUri}
              </p>
            </div>
          </div>
          <a
            href={meetingUri}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center space-x-1 transition-colors"
          >
            <span>Join Now</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
};
