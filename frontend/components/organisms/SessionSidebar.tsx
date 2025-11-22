'use client';

import React from 'react';
import { useSessionStore, ConversationSession } from '@/lib/sessionStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    MessageSquare,
    Plus,
    Archive,
    Trash2,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

export function SessionSidebar() {
    const router = useRouter();
    const { sessions, currentSessionId, setCurrentSession, deleteSession, archiveSession } = useSessionStore();

    const handleSessionClick = (sessionId: string) => {
        setCurrentSession(sessionId);
        router.push(`/chat?session=${sessionId}`);
    };

    const handleNewSession = () => {
        router.push('/intake');
    };

    const handleArchive = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        archiveSession(sessionId);
    };

    const handleDelete = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this conversation?')) {
            deleteSession(sessionId);
        }
    };

    const getStatusIcon = (status: ConversationSession['status']) => {
        switch (status) {
            case 'active':
                return <MessageSquare className="h-4 w-4 text-primary" />;
            case 'waiting':
                return <Clock className="h-4 w-4 text-warning" />;
            case 'resolved':
                return <CheckCircle2 className="h-4 w-4 text-success" />;
            case 'archived':
                return <Archive className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const activeSessions = sessions.filter(s => s.status !== 'archived');
    const archivedSessions = sessions.filter(s => s.status === 'archived');

    return (
        <div className="w-80 border-r bg-card flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b">
                <h2 className="font-semibold text-lg mb-3">Conversations</h2>
                <Button onClick={handleNewSession} className="w-full" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Assessment
                </Button>
            </div>

            {/* Sessions List */}
            <ScrollArea className="flex-1">
                {activeSessions.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No conversations yet</p>
                        <p className="text-xs mt-1">Start your first assessment</p>
                    </div>
                )}

                {/* Active Sessions */}
                <div className="p-2">
                    {activeSessions.map((session) => (
                        <div
                            key={session.id}
                            onClick={() => handleSessionClick(session.id)}
                            className={cn(
                                'p-3 rounded-lg mb-2 cursor-pointer transition-all hover:bg-accent group',
                                currentSessionId === session.id && 'bg-primary/10 border border-primary/20'
                            )}
                        >
                            <div className="flex items-start justify-between mb-1">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {getStatusIcon(session.status)}
                                    <h3 className="font-medium text-sm truncate">
                                        {session.title}
                                    </h3>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => handleArchive(e, session.id)}
                                    >
                                        <Archive className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive"
                                        onClick={(e) => handleDelete(e, session.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            {session.patientData && (
                                <p className="text-xs text-muted-foreground mb-1">
                                    {session.patientData.name}, {session.patientData.age}y
                                </p>
                            )}

                            <p className="text-xs text-muted-foreground truncate mb-1">
                                {session.lastMessage}
                            </p>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(session.timestamp), { addSuffix: true })}
                                </span>
                                {session.triageResult && (
                                    <span className={cn(
                                        'text-xs px-2 py-0.5 rounded-full',
                                        session.triageResult.severity === 'Emergency' && 'bg-destructive/20 text-destructive',
                                        session.triageResult.severity === 'Urgent' && 'bg-warning/20 text-warning',
                                        session.triageResult.severity === 'Moderate' && 'bg-primary/20 text-primary',
                                        session.triageResult.severity === 'Mild' && 'bg-success/20 text-success'
                                    )}>
                                        {session.triageResult.severity}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Archived Sessions */}
                {archivedSessions.length > 0 && (
                    <div className="p-2 mt-4 border-t">
                        <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-2">
                            Archived
                        </h3>
                        {archivedSessions.map((session) => (
                            <div
                                key={session.id}
                                className="p-2 rounded-lg mb-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={() => handleSessionClick(session.id)}
                            >
                                <div className="flex items-center gap-2">
                                    <Archive className="h-3 w-3" />
                                    <span className="text-xs truncate">{session.title}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
