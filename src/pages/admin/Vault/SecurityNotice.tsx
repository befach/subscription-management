import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export function SecurityNotice() {
  return (
    <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Security Notice</p>
            <p className="text-sm text-amber-700">
              Credentials are automatically hidden after 10 seconds for security.
              All access is logged and audited.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-700 font-medium">Secure</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
