import { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  autoDetectMapping,
  validateRow,
  generateCSVTemplate,
  SUBSCRIPTION_FIELDS,
} from '@/lib/bulkImportUtils';
import type { SubscriptionFieldKey } from '@/lib/bulkImportUtils';
import { useSubscriptions } from '@/features/subscriptions';
import { useAuth } from '@/features/auth';
import type { Id } from '../../../../convex/_generated/dataModel';

type ImportStep = 'upload' | 'mapping' | 'results';

interface Category {
  _id: string;
  name: string;
  description: string;
  color: string;
}

interface Currency {
  _id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isActive: boolean;
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[] | undefined;
  currencies: Currency[] | undefined;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  categories,
  currencies,
}: BulkImportDialogProps) {
  const { user } = useAuth();
  const { bulkCreate } = useSubscriptions();

  const [step, setStep] = useState<ImportStep>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, SubscriptionFieldKey | 'skip'>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{ index: number; success: boolean; referenceNumber?: string; error?: string }>;
  } | null>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setIsImporting(false);
    setImportResults(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const handleFileUpload = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', { description: 'Maximum file size is 5MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, {
          header: 1,
          defval: '',
          raw: false,
        });

        if (jsonData.length < 2) {
          toast.error('File is empty', { description: 'File must contain headers and at least one data row' });
          return;
        }

        const fileHeaders = (jsonData[0] as string[]).map((h) => String(h || '').trim()).filter(Boolean);
        const rows = jsonData.slice(1)
          .filter((row) => (row as string[]).some((cell) => String(cell || '').trim()))
          .map((row) => {
            const obj: Record<string, string> = {};
            fileHeaders.forEach((h, i) => {
              obj[h] = String((row as string[])[i] || '').trim();
            });
            return obj;
          });

        if (rows.length === 0) {
          toast.error('No data rows found', { description: 'File contains only headers' });
          return;
        }

        setFileName(file.name);
        setHeaders(fileHeaders);
        setRawRows(rows);
        setColumnMapping(autoDetectMapping(fileHeaders));
        setStep('mapping');
        toast.success(`Parsed ${rows.length} rows from ${file.name}`);
      } catch {
        toast.error('Failed to parse file', { description: 'Please check the file format' });
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
      e.target.value = '';
    },
    [handleFileUpload]
  );

  const updateMapping = useCallback((header: string, value: string) => {
    setColumnMapping((prev) => ({ ...prev, [header]: value as SubscriptionFieldKey | 'skip' }));
  }, []);

  // Validate all rows with current mapping
  const validationResults = useMemo(() => {
    if (!categories || !currencies || rawRows.length === 0) return [];
    return rawRows.map((row) => validateRow(row, columnMapping, categories, currencies));
  }, [rawRows, columnMapping, categories, currencies]);

  const validCount = validationResults.filter((r) => r.valid).length;
  const errorCount = validationResults.filter((r) => !r.valid).length;

  const isMappingValid = useMemo(() => {
    const mappedFields = new Set(Object.values(columnMapping).filter((v) => v !== 'skip'));
    return mappedFields.has('name') && mappedFields.has('cost') && mappedFields.has('category');
  }, [columnMapping]);

  const handleImport = useCallback(async () => {
    if (!user?.email) return;

    const validRows = validationResults
      .filter((r) => r.valid && r.data)
      .map((r) => r.data as Record<string, unknown>);

    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setIsImporting(true);

    try {
      // Process in batches of 100
      const BATCH_SIZE = 100;
      const allResults: typeof importResults = { total: 0, succeeded: 0, failed: 0, results: [] };

      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE).map((row) => ({
          name: row.name as string,
          description: row.description as string,
          provider: row.provider as string,
          categoryId: row.categoryId as Id<'categories'>,
          cost: row.cost as number,
          currencyId: row.currencyId as Id<'currencies'>,
          billingCycle: row.billingCycle as 'monthly' | 'quarterly' | 'half-yearly' | 'yearly',
          nextRenewalDate: row.nextRenewalDate as string,
          paymentMethod: row.paymentMethod as 'credit_card' | 'debit_card' | 'bank_transfer' | 'upi' | 'other',
          status: row.status as 'active' | 'expired' | 'cancelled' | 'pending',
          notificationEnabled: row.notificationEnabled as boolean,
          notificationDaysBefore: row.notificationDaysBefore as number,
        }));

        const result = await bulkCreate({
          adminEmail: user.email,
          subscriptions: batch,
        });

        allResults.total += result.total;
        allResults.succeeded += result.succeeded;
        allResults.failed += result.failed;
        allResults.results.push(
          ...result.results.map((r) => ({ ...r, index: r.index + i }))
        );
      }

      setImportResults(allResults);
      setStep('results');

      if (allResults.failed === 0) {
        toast.success(`Successfully imported ${allResults.succeeded} subscriptions`);
      } else {
        toast.warning(`Imported ${allResults.succeeded} of ${allResults.total}`, {
          description: `${allResults.failed} failed`,
        });
      }
    } catch {
      toast.error('Import failed', { description: 'An unexpected error occurred' });
    } finally {
      setIsImporting(false);
    }
  }, [user?.email, validationResults, bulkCreate]);

  const downloadTemplate = useCallback(() => {
    const csv = generateCSVTemplate();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscription_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Import Subscriptions
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV or Excel file to import subscriptions'}
            {step === 'mapping' && `${fileName} — Map columns and review data`}
            {step === 'results' && 'Import complete'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('bulk-file-input')?.click()}
            >
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="font-medium text-gray-900">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supports .csv, .xlsx, .xls (max 5MB)
              </p>
              <input
                id="bulk-file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Need a template?</p>
                <p className="text-xs text-gray-500">Download a sample CSV with the correct format</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Template
              </Button>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Required columns:</strong> name, category, cost</p>
              <p><strong>Optional columns:</strong> description, provider, currency, billingCycle, nextRenewalDate, paymentMethod, status</p>
              <p><strong>Category</strong> must match an existing category name. <strong>Currency</strong> defaults to INR if not specified.</p>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping + Validation */}
        {step === 'mapping' && (
          <div className="space-y-4">
            {/* Column Mapping */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Column Mapping</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {headers.map((header) => (
                  <div key={header} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-40 truncate font-mono bg-slate-50 px-2 py-1 rounded">
                      {header}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <Select
                      value={columnMapping[header] || 'skip'}
                      onValueChange={(value) => updateMapping(header, value)}
                    >
                      <SelectTrigger className="w-48 h-8 text-sm rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">
                          <span className="text-gray-400">Skip column</span>
                        </SelectItem>
                        {SUBSCRIPTION_FIELDS.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label} {field.required && '*'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Summary */}
            <div className="flex gap-3">
              <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-700">{validCount}</p>
                <p className="text-xs text-green-600">Valid rows</p>
              </div>
              <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-700">{errorCount}</p>
                <p className="text-xs text-red-600">Errors</p>
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <FileSpreadsheet className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-700">{rawRows.length}</p>
                <p className="text-xs text-slate-600">Total rows</p>
              </div>
            </div>

            {/* Preview Table */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Data Preview
                {rawRows.length > 10 && (
                  <span className="font-normal text-gray-400 ml-2">(showing first 10 of {rawRows.length})</span>
                )}
              </h3>
              <div className="border rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left text-gray-500 font-medium w-8">#</th>
                        <th className="px-2 py-2 text-left text-gray-500 font-medium w-14">Status</th>
                        {headers
                          .filter((h) => columnMapping[h] !== 'skip')
                          .map((header) => (
                            <th key={header} className="px-2 py-2 text-left text-gray-500 font-medium whitespace-nowrap">
                              {SUBSCRIPTION_FIELDS.find((f) => f.key === columnMapping[header])?.label || header}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rawRows.slice(0, 10).map((row, idx) => {
                        const result = validationResults[idx];
                        return (
                          <tr
                            key={idx}
                            className={result?.valid ? '' : 'bg-red-50/50'}
                          >
                            <td className="px-2 py-1.5 text-gray-400">{idx + 1}</td>
                            <td className="px-2 py-1.5">
                              {result?.valid ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <div className="group relative">
                                  <XCircle className="w-4 h-4 text-red-500" />
                                  <div className="hidden group-hover:block absolute z-10 left-6 top-0 bg-white border border-red-200 rounded-lg p-2 shadow-lg whitespace-nowrap">
                                    {result && Object.entries(result.errors).map(([field, error]) => (
                                      <p key={field} className="text-xs text-red-600">
                                        <strong>{field}:</strong> {error}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                            {headers
                              .filter((h) => columnMapping[h] !== 'skip')
                              .map((header) => {
                                const fieldKey = columnMapping[header];
                                const hasError = result && !result.valid && fieldKey !== 'skip' && result.errors[fieldKey];
                                return (
                                  <td
                                    key={header}
                                    className={`px-2 py-1.5 max-w-32 truncate ${hasError ? 'text-red-600 font-medium' : 'text-gray-700'}`}
                                  >
                                    {row[header] || <span className="text-gray-300">—</span>}
                                  </td>
                                );
                              })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {!isMappingValid && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">
                  Required columns not mapped: {!Object.values(columnMapping).includes('name') && 'Name'}{' '}
                  {!Object.values(columnMapping).includes('cost') && 'Cost'}{' '}
                  {!Object.values(columnMapping).includes('category') && 'Category'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Results */}
        {step === 'results' && importResults && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700">{importResults.succeeded}</p>
                <p className="text-sm text-green-600">Imported</p>
              </div>
              {importResults.failed > 0 && (
                <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-700">{importResults.failed}</p>
                  <p className="text-sm text-red-600">Failed</p>
                </div>
              )}
            </div>

            {importResults.results.some((r) => r.success && r.referenceNumber) && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Imported Subscriptions</h3>
                <div className="max-h-40 overflow-y-auto border rounded-xl divide-y">
                  {importResults.results
                    .filter((r) => r.success)
                    .map((r) => (
                      <div key={r.index} className="px-3 py-2 flex items-center justify-between text-sm">
                        <span className="text-gray-700">Row {r.index + 1}</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {r.referenceNumber}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {importResults.results.some((r) => !r.success) && (
              <div>
                <h3 className="text-sm font-medium text-red-700 mb-2">Failed Rows</h3>
                <div className="max-h-40 overflow-y-auto border border-red-200 rounded-xl divide-y divide-red-100">
                  {importResults.results
                    .filter((r) => !r.success)
                    .map((r) => (
                      <div key={r.index} className="px-3 py-2 text-sm">
                        <span className="font-medium text-red-700">Row {r.index + 1}:</span>{' '}
                        <span className="text-red-600">{r.error}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => { resetState(); }}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Start Over
              </Button>
              <Button
                onClick={handleImport}
                disabled={!isMappingValid || validCount === 0 || isImporting}
                className="bg-gradient-to-r from-green-600 to-emerald-600"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {validCount} Subscription{validCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'results' && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
