import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
    status: 'sending' | 'sent' | 'error';
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const config = {
        sending: { icon: Loader2, className: 'animate-spin text-muted-foreground' },
        sent: { icon: Check, className: 'text-success' },
        error: { icon: AlertCircle, className: 'text-error' },
    };

    const { icon: Icon, className } = config[status];

    return <Icon className={cn('h-3 w-3', className)} />;
}
