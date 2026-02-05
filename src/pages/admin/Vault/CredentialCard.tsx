import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Lock,
  Eye,
  EyeOff,
  Copy,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { maskText } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import type { Id } from '../../../../convex/_generated/dataModel';

interface Credential {
  _id: Id<'credentials'>;
  subscriptionId: Id<'subscriptions'>;
  username: string;
  notes?: string;
}

interface Subscription {
  _id: Id<'subscriptions'>;
  name: string;
  provider: string;
}

interface CredentialCardProps {
  subscription: Subscription;
  credential: Credential | undefined;
  isRevealed: boolean;
  countdown: number;
  revealedData: { username: string; password: string } | undefined;
  onToggleReveal: (credentialId: Id<'credentials'>, subscriptionId: Id<'subscriptions'>) => void;
  index: number;
}

export function CredentialCard({
  subscription,
  credential,
  isRevealed,
  countdown,
  revealedData,
  onToggleReveal,
  index,
}: CredentialCardProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border-slate-200/60 hover:shadow-lg transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{subscription.name}</h3>
                <p className="text-sm text-gray-500">{subscription.provider}</p>
              </div>
            </div>
            {credential && isRevealed && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-mono text-amber-600">
                  {Math.ceil(countdown)}s
                </span>
              </div>
            )}
          </div>

          {credential ? (
            <div className="space-y-3">
              {/* Username */}
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Username
                  </span>
                  {isRevealed && revealedData && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => copyToClipboard(revealedData.username, 'Username')}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <code className="text-sm font-mono text-gray-900 block truncate">
                  {isRevealed && revealedData ? revealedData.username : maskText(credential.username)}
                </code>
              </div>

              {/* Password */}
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Password
                  </span>
                  {isRevealed && revealedData && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => copyToClipboard(revealedData.password, 'Password')}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <code className="text-sm font-mono text-gray-900 block truncate">
                  {isRevealed && revealedData ? revealedData.password : '••••••••'}
                </code>
              </div>

              {/* Countdown Progress */}
              {isRevealed && (
                <Progress value={(countdown / 10) * 100} className="h-1" />
              )}

              {/* Reveal Button */}
              <Button
                variant={isRevealed ? 'outline' : 'default'}
                className={`w-full rounded-xl ${
                  !isRevealed
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                    : ''
                }`}
                onClick={() => onToggleReveal(credential._id, subscription._id)}
              >
                {isRevealed ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Credentials
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Reveal Credentials
                  </>
                )}
              </Button>

              {credential.notes && (
                <div className="flex items-start gap-2 text-sm text-gray-500 mt-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{credential.notes}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-50 rounded-xl">
              <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No credentials stored</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
