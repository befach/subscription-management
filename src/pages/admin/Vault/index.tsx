import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Search, History } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscriptions } from '@/features/subscriptions';
import { useCredentials, useAuditLogs } from '@/features/vault';
import { useAuth } from '@/features/auth';
import { VaultSkeleton } from '@/components/shared/skeletons/PageSkeletons';
import { CredentialCard } from './CredentialCard';
import { AuditLogDialog } from './AuditLogDialog';
import { SecurityNotice } from './SecurityNotice';
import type { Id } from '../../../../convex/_generated/dataModel';

export default function Vault() {
  const { user } = useAuth();
  const { subscriptions, isLoading: subsLoading } = useSubscriptions();
  const { credentials, reveal } = useCredentials(user?.email);
  const { logs: auditLogs } = useAuditLogs(user?.email);

  const [searchQuery, setSearchQuery] = useState('');
  const [revealedCredentials, setRevealedCredentials] = useState<Set<string>>(new Set());
  const [revealedData, setRevealedData] = useState<Record<string, { username: string; password: string }>>({});
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  // Create credential map for O(1) lookups
  type Credential = NonNullable<typeof credentials>[number];
  const credentialMap = useMemo(() => {
    if (!credentials) return new Map<string, Credential>();
    return new Map(credentials.map((c) => [c.subscriptionId.toString(), c]));
  }, [credentials]);

  // Auto-hide credentials after 10 seconds with countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns((prev) => {
        const newCountdowns: Record<string, number> = {};
        revealedCredentials.forEach((id) => {
          const remaining = (prev[id] || 10) - 0.1;
          if (remaining > 0) {
            newCountdowns[id] = remaining;
          }
        });
        return newCountdowns;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [revealedCredentials]);

  useEffect(() => {
    revealedCredentials.forEach((id) => {
      if (!countdowns[id]) {
        setCountdowns((prev) => ({ ...prev, [id]: 10 }));
      }
    });

    // Auto-hide when countdown reaches 0
    Object.entries(countdowns).forEach(([id, time]) => {
      if (time <= 0) {
        setRevealedCredentials((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        setRevealedData((prev) => {
          const newData = { ...prev };
          delete newData[id];
          return newData;
        });
        toast.info('Credential hidden for security');
      }
    });
  }, [revealedCredentials, countdowns]);

  const filteredSubscriptions = useMemo(
    () =>
      (subscriptions || []).filter(
        (sub) =>
          sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sub.provider.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [subscriptions, searchQuery]
  );

  const toggleReveal = useCallback(
    async (credentialId: Id<'credentials'>, subscriptionId: Id<'subscriptions'>) => {
      if (!user) return;
      const idStr = credentialId.toString();
      if (revealedCredentials.has(idStr)) {
        setRevealedCredentials((prev) => {
          const newSet = new Set(prev);
          newSet.delete(idStr);
          return newSet;
        });
        setCountdowns((c) => ({ ...c, [idStr]: 0 }));
        setRevealedData((prev) => {
          const newData = { ...prev };
          delete newData[idStr];
          return newData;
        });
      } else {
        try {
          const data = await reveal({
            adminEmail: user.email,
            subscriptionId,
            action: 'viewed',
          });
          if (data) {
            setRevealedData((prev) => ({
              ...prev,
              [idStr]: { username: data.username, password: data.password },
            }));
            setRevealedCredentials((prev) => {
              const newSet = new Set(prev);
              newSet.add(idStr);
              return newSet;
            });
            setCountdowns((c) => ({ ...c, [idStr]: 10 }));
            toast.success('Credential revealed (auto-hides in 10s)');
          }
        } catch {
          toast.error('Failed to reveal credential');
        }
      }
    },
    [user, revealedCredentials, reveal]
  );

  const getCredentialForSubscription = useCallback(
    (subscriptionId: Id<'subscriptions'>) => {
      return credentialMap.get(subscriptionId.toString());
    },
    [credentialMap]
  );

  if (subsLoading) {
    return <VaultSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Credential Vault</h1>
          <p className="text-gray-500 mt-1">Securely manage subscription credentials</p>
        </div>
        <Button variant="outline" onClick={() => setIsHistoryOpen(true)}>
          <History className="w-4 h-4 mr-2" />
          Audit Log
        </Button>
      </div>

      <SecurityNotice />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search subscriptions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-xl"
        />
      </div>

      {/* Credentials Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredSubscriptions.map((subscription, idx) => {
            const credential = getCredentialForSubscription(subscription._id);
            const credIdStr = credential?._id.toString() || '';
            const isRevealed = credential ? revealedCredentials.has(credIdStr) : false;
            const countdown = credential ? countdowns[credIdStr] || 0 : 0;

            return (
              <CredentialCard
                key={subscription._id}
                subscription={subscription}
                credential={credential}
                isRevealed={isRevealed}
                countdown={countdown}
                revealedData={revealedData[credIdStr]}
                onToggleReveal={toggleReveal}
                index={idx}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {filteredSubscriptions.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions found</h3>
          <p className="text-gray-500">Try adjusting your search</p>
        </div>
      )}

      <AuditLogDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        logs={auditLogs}
      />
    </motion.div>
  );
}
