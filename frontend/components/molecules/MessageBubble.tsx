import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface MessageBubbleProps {
    message: {
        id: string;
        role: 'user' | 'assistant';
        content: string;
        image_url?: string;
        timestamp: string;
        status?: 'sending' | 'sent' | 'error';
    };
    patientName?: string;
}

export function MessageBubble({ message, patientName = 'User' }: MessageBubbleProps) {
    const isUser = message.role === 'user';

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={cn(
                'flex gap-2',
                isUser ? 'justify-end' : 'justify-start'
            )}
        >
            {!isUser && (
                <Avatar className="h-8 w-8">
                    <AvatarImage src="/bot-avatar.png" />
                    <AvatarFallback>AI</AvatarFallback>
                </Avatar>
            )}

            <div className={cn(
                'max-w-[75%] rounded-lg p-3 shadow-sm',
                isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
            )}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {message.image_url && (
                    <img
                        src={message.image_url}
                        alt="Uploaded"
                        className="mt-2 rounded-md max-w-full"
                    />
                )}

                <div className="flex items-center justify-between mt-1 gap-2">
                    <time className="text-xs opacity-70">
                        {format(new Date(message.timestamp), 'p')}
                    </time>

                    {isUser && message.status === 'sending' && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    {isUser && message.status === 'sent' && (
                        <Check className="h-3 w-3" />
                    )}
                    {isUser && message.status === 'error' && (
                        <AlertCircle className="h-3 w-3 text-destructive" />
                    )}
                </div>
            </div>

            {isUser && (
                <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(patientName)}</AvatarFallback>
                </Avatar>
            )}
        </motion.div>
    );
}
