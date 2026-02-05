import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Lock, Eye, Copy } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AuditLog {
  _id: string;
  subscriptionName?: string;
  action: 'viewed' | 'copied' | 'updated';
  performedBy: string;
  performedAt: string;
}

interface AuditLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: AuditLog[] | undefined;
}

export function AuditLogDialog({ open, onOpenChange, logs }: AuditLogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Audit Log</DialogTitle>
          <DialogDescription>Recent credential access history</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {(logs || []).map((log, idx) => (
            <motion.div
              key={log._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    log.action === 'viewed'
                      ? 'bg-blue-100'
                      : log.action === 'copied'
                      ? 'bg-green-100'
                      : 'bg-amber-100'
                  }`}
                >
                  {log.action === 'viewed' ? (
                    <Eye className="w-5 h-5 text-blue-600" />
                  ) : log.action === 'copied' ? (
                    <Copy className="w-5 h-5 text-green-600" />
                  ) : (
                    <Lock className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{log.subscriptionName || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">
                    {log.performedBy} • {formatDateTime(log.performedAt)}
                  </p>
                </div>
              </div>
              <Badge
                className={
                  log.action === 'viewed'
                    ? 'bg-blue-100 text-blue-800 capitalize'
                    : log.action === 'copied'
                    ? 'bg-green-100 text-green-800 capitalize'
                    : 'bg-amber-100 text-amber-800 capitalize'
                }
              >
                {log.action}
              </Badge>
            </motion.div>
          ))}
          {(!logs || logs.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No audit logs yet
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
