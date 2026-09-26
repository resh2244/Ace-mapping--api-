import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Database,
  Key,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Calendar,
  CheckCircle,
  XCircle,
  UserCheck
} from 'lucide-react';
import { getSubmissionsFromFirestore, deleteSubmissionFromFirestore } from '../lib/firebase.js';
import { CsvUploader } from './CsvUploader.js';

interface AdminViewProps {
  onSelectAddress?: (sub: any) => void;
  currentUser?: any;
}

export const AdminView: React.FC<AdminViewProps> = ({ onSelectAddress, currentUser }) => {
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const [adminToken, setAdminToken] = useState(
    localStorage.getItem('address_app_admin_token') || 'adm-secret-superkey-8899'
  );
  const [sqliteSubmissions, setSqliteSubmissions] = useState<any[]>([]);
  const [firestoreSubmissions, setFirestoreSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<'sqlite' | 'firestore'>('sqlite');

  // Search, Filter, Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [granularityFilter, setGranularityFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'address-asc' | 'granularity'>('date-desc');

  const fetchSqliteSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/submissions`, {
        headers: {
          'x-admin-token': adminToken
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate admin token');
      }
      setSqliteSubmissions(data.submissions || []);
      localStorage.setItem('address_app_admin_token', adminToken);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFirestoreData = async () => {
    setLoading(true);
    try {
      const list = await getSubmissionsFromFirestore();
      setFirestoreSubmissions(list);
    } catch (err: any) {
      setError('Firestore fetch error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchSqliteSubmissions();
    }
    fetchFirestoreData();
  }, []);

  const handleDeleteSqlite = async (id: string) => {
    if (!confirm(`Delete submission ${id}?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/submissions/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': adminToken
        }
      });
      if (res.ok) {
        setSqliteSubmissions((prev) => prev.filter((s) => s.id !== id));
        setSuccessMsg(`Deleted ${id} from SQLite`);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (e: any) {
      alert('Delete error: ' + e.message);
    }
  };

  const handleDeleteFirestore = async (id: string) => {
    if (!confirm(`Delete submission ${id} from Firestore?`)) return;
    try {
      await deleteSubmissionFromFirestore(id);
      setFirestoreSubmissions((prev) => prev.filter((s) => s.id !== id));
      setSuccessMsg(`Deleted ${id} from Firestore`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      alert('Delete error: ' + e.message);
    }
  };

  const rawList = activeSource === 'sqlite' ? sqliteSubmissions : firestoreSubmissions;

  // Extract unique regions and granularities for dropdown filters
  const uniqueRegions = useMemo(() => {
    const set = new Set<string>();
    rawList.forEach((item) => {
      if (item.regionCode) set.add(item.regionCode.toUpperCase());
    });
    return Array.from(set);
  }, [rawList]);

  const uniqueGranularities = useMemo(() => {
    const set = new Set<string>();
    rawList.forEach((item) => {
      if (item.granularity) set.add(item.granularity);
    });
    return Array.from(set);
  }, [rawList]);

  // Filter and Sort Processing
  const filteredAndSortedList = useMemo(() => {
    return rawList
      .filter((item) => {
        // Search query (matches address, components, notes, or user)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesAddr = item.formattedAddress?.toLowerCase().includes(q);
          const matchesLines = item.addressLines?.toLowerCase().includes(q);
          const matchesNotes = item.notes?.toLowerCase().includes(q);
          const matchesUser = item.userEmail?.toLowerCase().includes(q);
          const matchesRegion = item.regionCode?.toLowerCase().includes(q);
          if (!matchesAddr && !matchesLines && !matchesNotes && !matchesUser && !matchesRegion) {
            return false;
          }
        }

        // Status filter
        if (statusFilter === 'complete' && !item.complete) return false;
        if (statusFilter === 'incomplete' && item.complete) return false;

        // Region filter
        if (regionFilter !== 'all' && item.regionCode?.toUpperCase() !== regionFilter) {
          return false;
        }

        // Granularity filter
        if (granularityFilter !== 'all' && item.granularity !== granularityFilter) {
          return false;
        }

        // User filter
        if (userFilter === 'mine') {
          if (!currentUser || item.userId !== currentUser.uid) return false;
        } else if (userFilter === 'unassigned') {
          if (item.userId) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'date-asc') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'address-asc') {
          return (a.formattedAddress || '').localeCompare(b.formattedAddress || '');
        }
        if (sortBy === 'granularity') {
          return (a.granularity || '').localeCompare(b.granularity || '');
        }
        return 0;
      });
  }, [
    rawList,
    searchQuery,
    statusFilter,
    regionFilter,
    granularityFilter,
    userFilter,
    sortBy,
    currentUser
  ]);

  // Export to CSV helper
  const handleExportCSV = () => {
    if (filteredAndSortedList.length === 0) return;
    const headers = [
      'ID',
      'Formatted Address',
      'Region',
      'Latitude',
      'Longitude',
      'Granularity',
      'Complete',
      'User Email',
      'Created At'
    ];
    const rows = filteredAndSortedList.map((item) => [
      `"${item.id}"`,
      `"${item.formattedAddress.replace(/"/g, '""')}"`,
      `"${item.regionCode || ''}"`,
      item.lat,
      item.lng,
      `"${item.granularity || ''}"`,
      item.complete ? 'Yes' : 'No',
      `"${item.userEmail || ''}"`,
      `"${item.createdAt}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `address_submissions_${activeSource}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Token config */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Submissions Management & Admin Portal
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                SQLite (/api/submissions) and Cloud Firestore databases with search, filtering, and export
              </p>
            </div>
          </div>

          {/* Source toggle */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveSource('sqlite')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeSource === 'sqlite'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              SQLite ({sqliteSubmissions.length})
            </button>
            <button
              onClick={() => setActiveSource('firestore')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeSource === 'firestore'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Cloud Firestore ({firestoreSubmissions.length})
            </button>
          </div>
        </div>

        {/* Admin token input for SQLite */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Key className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="x-admin-token (ADMIN_TOKEN from .env)"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
            />
          </div>
          <button
            onClick={() => {
              fetchSqliteSubmissions();
              fetchFirestoreData();
            }}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center justify-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Authenticate & Refresh</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
            {successMsg}
          </div>
        )}
      </div>

      {/* Search, Filter, Sort Controls Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by address, user email, components, or notes..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="complete">Complete Only</option>
              <option value="incomplete">Incomplete Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="date-desc">Newest First (Date ↓)</option>
              <option value="date-asc">Oldest First (Date ↑)</option>
              <option value="address-asc">Address (A - Z)</option>
              <option value="granularity">Granularity</option>
            </select>
          </div>
        </div>

        {/* Secondary filters row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400 flex items-center space-x-1">
              <Filter className="w-3 h-3" />
              <span>Filter:</span>
            </span>

            {/* Region dropdown */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Regions ({uniqueRegions.length})</option>
              {uniqueRegions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {/* Granularity dropdown */}
            <select
              value={granularityFilter}
              onChange={(e) => setGranularityFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Granularities</option>
              {uniqueGranularities.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            {/* User Account Filter */}
            {currentUser && (
              <select
                value={userFilter}
                onChange={(e: any) => setUserFilter(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Accounts</option>
                <option value="mine">Linked to My Account ({currentUser.email})</option>
                <option value="unassigned">Guest / Unassigned</option>
              </select>
            )}

            {(searchQuery || statusFilter !== 'all' || regionFilter !== 'all' || granularityFilter !== 'all' || userFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setRegionFilter('all');
                  setGranularityFilter('all');
                  setUserFilter('all');
                }}
                className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline px-2 py-0.5"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* CSV Actions: Import & Export */}
          <div className="flex items-center space-x-2">
            <CsvUploader
              apiBaseUrl={apiBaseUrl}
              adminToken={adminToken}
              onImportComplete={() => {
                fetchSqliteSubmissions();
                setSuccessMsg('Bulk CSV import completed successfully!');
                setTimeout(() => setSuccessMsg(null), 4000);
              }}
            />

            <button
              onClick={handleExportCSV}
              disabled={filteredAndSortedList.length === 0}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 transition-colors flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV ({filteredAndSortedList.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-slate-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {activeSource === 'sqlite' ? 'SQLite Database Table' : 'Cloud Firestore Collection (/submissions)'}
            </h4>
          </div>
          <span className="text-xs text-slate-500">
            Showing {filteredAndSortedList.length} of {rawList.length} items
          </span>
        </div>

        {filteredAndSortedList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Database className="w-8 h-8 mx-auto text-slate-400 stroke-1" />
            <p className="text-sm">No submissions match the selected filters.</p>
            <p className="text-xs text-slate-400">
              Try adjusting your search criteria or reset filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Address & Account</th>
                  <th className="px-4 py-3">Coordinates</th>
                  <th className="px-4 py-3">Granularity</th>
                  <th className="px-4 py-3">Validation Status</th>
                  <th className="px-4 py-3">Meet / Notes</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredAndSortedList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 max-w-[260px]">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {item.formattedAddress}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center space-x-1 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                          {item.regionCode || 'N/A'}
                        </span>
                        {item.userEmail ? (
                          <span className="text-purple-600 dark:text-purple-400 font-medium">
                            • {item.userEmail}
                          </span>
                        ) : (
                          <span className="text-slate-400">• Guest</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {item.lat?.toFixed(5)}, {item.lng?.toFixed(5)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                        {item.granularity || 'SUB_PREMISE'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.complete ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle className="w-3 h-3" />
                          <span>Complete</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <XCircle className="w-3 h-3" />
                          <span>Incomplete</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      {item.meetUri ? (
                        <a
                          href={item.meetUri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 hover:underline text-[11px]"
                        >
                          <span>Meet Call</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No meeting</span>
                      )}
                      {item.notes && (
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                      {onSelectAddress && (
                        <button
                          onClick={() => onSelectAddress(item)}
                          className="px-2 py-1 text-[11px] rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                        >
                          View Map
                        </button>
                      )}
                      <button
                        onClick={() =>
                          activeSource === 'sqlite'
                            ? handleDeleteSqlite(item.id)
                            : handleDeleteFirestore(item.id)
                        }
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
