import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  ShieldCheck,
  HelpCircle,
  MapPin,
  Sparkles
} from 'lucide-react';

interface CsvRow {
  address: string;
  regionCode?: string;
  name?: string;
  category?: string;
  notes?: string;
  lat?: number;
  lng?: number;
}

interface CsvUploaderProps {
  apiBaseUrl: string;
  adminToken: string;
  onImportComplete: () => void;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({
  apiBaseUrl,
  adminToken,
  onImportComplete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [autoValidate, setAutoValidate] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    importedCount: number;
    errorsCount: number;
    errors: any[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse simple CSV line handling quotes
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      setParseError('Please upload a valid .csv file.');
      return;
    }

    setFile(selectedFile);
    setParseError(null);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length < 2) {
          setParseError('The CSV file must contain a header row and at least one address row.');
          setParsedRows([]);
          return;
        }

        const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        
        // Find column indices
        const addressIndex = headers.findIndex((h) =>
          ['address', 'formattedaddress', 'addresslines', 'street', 'fulladdress', 'location'].includes(h)
        );
        const regionIndex = headers.findIndex((h) =>
          ['region', 'regioncode', 'country', 'countrycode', 'iso'].includes(h)
        );
        const nameIndex = headers.findIndex((h) =>
          ['name', 'buildingname', 'placename', 'title'].includes(h)
        );
        const categoryIndex = headers.findIndex((h) =>
          ['category', 'type', 'buildingtype'].includes(h)
        );
        const notesIndex = headers.findIndex((h) =>
          ['notes', 'description', 'instructions', 'comment'].includes(h)
        );
        const latIndex = headers.findIndex((h) =>
          ['lat', 'latitude', 'y'].includes(h)
        );
        const lngIndex = headers.findIndex((h) =>
          ['lng', 'lon', 'longitude', 'x'].includes(h)
        );

        if (addressIndex === -1) {
          setParseError('Could not find an "address" or "street" column header in your CSV file.');
          setParsedRows([]);
          return;
        }

        const rows: CsvRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cells = parseCsvLine(lines[i]);
          const addr = cells[addressIndex];
          if (!addr) continue;

          rows.push({
            address: addr,
            regionCode: regionIndex !== -1 ? cells[regionIndex] || 'US' : 'US',
            name: nameIndex !== -1 ? cells[nameIndex] : undefined,
            category: categoryIndex !== -1 ? cells[categoryIndex] : 'Residential',
            notes: notesIndex !== -1 ? cells[notesIndex] : undefined,
            lat: latIndex !== -1 && cells[latIndex] ? parseFloat(cells[latIndex]) : undefined,
            lng: lngIndex !== -1 && cells[lngIndex] ? parseFloat(cells[lngIndex]) : undefined
          });
        }

        if (rows.length === 0) {
          setParseError('No address rows found in the CSV file.');
          setParsedRows([]);
        } else {
          setParsedRows(rows);
        }
      } catch (err: any) {
        setParseError('Failed to parse CSV file: ' + err.message);
        setParsedRows([]);
      }
    };

    reader.readAsText(selectedFile);
  };

  const handleUploadAndImport = async () => {
    if (parsedRows.length === 0) return;

    setIsUploading(true);
    setUploadResult(null);
    setParseError(null);

    try {
      const res = await fetch(`${apiBaseUrl}/api/submissions/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          items: parsedRows,
          autoValidate
        })
      });

      const data: any = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Bulk import failed');
      }

      setUploadResult(data);
      onImportComplete();
    } catch (err: any) {
      setParseError('Bulk upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'address,regionCode,name,category,notes,lat,lng\n' +
      '"1600 Amphitheatre Pkwy, Mountain View, CA 94043",US,"Googleplex Campus",Commercial,"Main Headquarters Visitor Entrance",37.4220,-122.0841\n' +
      '"Via Sant\'Anna 8, 95124 Catania CT",IT,"Villa Bellini",Residential,"Side courtyard access gate",37.5029,15.0873\n' +
      '"10 Downing Street, London",GB,"Prime Minister Office",Government,"Front door security checkpoint",51.5034,-0.1276';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'simone_jovita_addresses_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetUploader = () => {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gold-gradient text-slate-950 shadow-gold hover:opacity-95 transition-all flex items-center space-x-1.5"
      >
        <Upload className="w-3.5 h-3.5" />
        <span>Bulk CSV Import</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-gold/30">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>Bulk Address CSV Uploader</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy-800 text-amber-300 border border-gold/30">
                      SQLite / Cloudflare D1
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload a CSV file of addresses to bulk-validate and import directly into the database.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  resetUploader();
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template & Guidelines */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-900 dark:text-white flex items-center space-x-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>CSV Column Requirements</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Columns: <code className="text-amber-500 font-mono">address</code> (required),{' '}
                  <code className="text-slate-400 font-mono">regionCode</code>,{' '}
                  <code className="text-slate-400 font-mono">name</code>,{' '}
                  <code className="text-slate-400 font-mono">category</code>,{' '}
                  <code className="text-slate-400 font-mono">notes</code>,{' '}
                  <code className="text-slate-400 font-mono">lat, lng</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-[11px] transition-colors whitespace-nowrap"
              >
                Download Sample CSV
              </button>
            </div>

            {/* File Drop / Select Area */}
            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-400 rounded-3xl p-8 text-center cursor-pointer bg-slate-50 dark:bg-slate-800/30 hover:bg-amber-500/5 transition-all space-y-2 group"
              >
                <Upload className="w-8 h-8 mx-auto text-slate-400 group-hover:text-amber-500 transition-colors" />
                <div className="font-semibold text-xs text-slate-700 dark:text-slate-200">
                  Click to select CSV file from your computer
                </div>
                <div className="text-[11px] text-slate-400">
                  Supported formats: Standard UTF-8 comma-separated <span className="font-mono">.csv</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {file.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} addresses identified
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={resetUploader}
                    className="text-xs text-rose-500 hover:underline font-semibold"
                  >
                    Change File
                  </button>
                </div>

                {/* Validation Option */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoValidate}
                      onChange={(e) => setAutoValidate(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Auto-validate each address via Google Address Validation API
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-400">Standardizes lines &amp; derives GPS</span>
                </div>

                {/* Preview Table */}
                {parsedRows.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                      Preview First {Math.min(parsedRows.length, 3)} Records:
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {parsedRows.slice(0, 3).map((row, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] flex items-center justify-between"
                        >
                          <div className="truncate pr-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {row.address}
                            </span>
                            {row.name && (
                              <span className="text-slate-400 ml-1">({row.name})</span>
                            )}
                          </div>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono text-[9px] text-slate-400">
                            {row.regionCode || 'US'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {parseError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Success Result */}
            {uploadResult && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-1.5">
                <div className="flex items-center space-x-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>
                    Successfully imported {uploadResult.importedCount} addresses into the database!
                  </span>
                </div>
                {uploadResult.errorsCount > 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    {uploadResult.errorsCount} address rows encountered formatting issues and were skipped.
                  </p>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  resetUploader();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleUploadAndImport}
                disabled={parsedRows.length === 0 || isUploading}
                className="px-5 py-2 rounded-xl bg-gold-gradient text-slate-950 font-bold text-xs shadow-gold hover:opacity-95 disabled:opacity-50 transition-all flex items-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing &amp; Validating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Upload &amp; Import ({parsedRows.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
