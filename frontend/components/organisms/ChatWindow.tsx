'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, MoreVertical, Send, Paperclip, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MessageBubble } from '@/components/molecules/MessageBubble';
import { TriageResultCard } from '@/components/organisms/TriageResultCard';
import { EnhancedTriageResult } from '@/components/organisms/EnhancedTriageResult';
import { ContextSummary } from '@/components/molecules/ContextSummary';
import { QuickReplies, generateSmartReplies } from '@/components/molecules/QuickReplies';
import { useSessionStore } from '@/lib/sessionStore';
import { toast } from 'sonner';
import { useChat, Message } from '@/hooks/useChat';
import { AnimatePresence } from 'framer-motion';

interface ChatWindowProps {
    sessionId?: string;
    initialMessages?: Message[];
}

export function ChatWindow({ sessionId, initialMessages = [] }: ChatWindowProps) {
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [message, setMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [showQuickReplies, setShowQuickReplies] = useState(true);

    const { getCurrentSession, updateSession } = useSessionStore();
    const currentSession = getCurrentSession();

    const { messages, isLoading, triageResult, sendMessage, setMessages } = useChat({
        sessionId,
        initialMessages,
    });

    // Smart quick reply suggestions based on context
    const lastAIMessage = messages.filter(m => m.role === 'assistant').pop();
    const quickReplySuggestions = generateSmartReplies({
        lastAIMessage: lastAIMessage?.content,
        symptom: currentSession?.patientData?.chiefComplaint,
        stage: messages.length > 3 ? 'details' : 'initial'
    });

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, triageResult]);

    // Initial greeting if empty
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    id: 'welcome',
                    role: 'assistant',
                    content: "Hello! I've reviewed your information. Let me ask a few follow-up questions to better understand your condition. Can you tell me more about what you're feeling?",
                    timestamp: new Date().toISOString(),
                    status: 'sent',
                },
            ]);
        }
    }, []); // Run once on mount

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error('File size must be less than 10MB');
                return;
            }
            setSelectedImage(file);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!message.trim() && !selectedImage) || isLoading) return;

        const currentMessage = message;
        const currentImage = selectedImage ? selectedImage : undefined;

        // Clear input immediately
        setMessage('');
        setSelectedImage(null);

        await sendMessage(currentMessage, currentImage);
    };

    const handleNewSession = () => {
        router.push('/intake');
    };

    const handleExport = () => {
        toast.info('Export functionality coming soon');
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="font-semibold">Chat Consultation</h2>
                        <p className="text-xs text-muted-foreground">
                            Session: {sessionId || 'New'}
                        </p>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleNewSession}>
                            New Assessment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExport}>
                            Export Conversation
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Context Summary at top */}
                {currentSession?.patientData && (
                    <ContextSummary patientData={currentSession.patientData} />
                )}

                {/* Chat Messages */}
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}
                </AnimatePresence>

                {/* AI Typing Indicator */}
                {isLoading && (
                    <div className="flex gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src="/bot-avatar.png" />
                            <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-lg p-3">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                        <span className="text-xs text-muted-foreground self-center">
                            AI is analyzing...
                        </span>
                    </div>
                )}

                {/* Enhanced Triage Result */}
                {triageResult && currentSession?.patientData && (
                    <div className="mt-4">
                        <EnhancedTriageResult
                            result={{
                                severity: (
                                    triageResult.triage_level === 'emergency' ? 'Emergency' :
                                        triageResult.triage_level === 'urgent' ? 'Urgent' :
                                            triageResult.triage_level === 'routine' ? 'Moderate' : 'Mild'
                                ) as any,
                                recommendation: triageResult.recommendation.action + ' - ' + triageResult.recommendation.timeframe,
                                whileYouWait: [
                                    triageResult.recommendation.home_care_advice,
                                    'Monitor for warning signs: ' + triageResult.recommendation.warning_signs,
                                    'Stay hydrated and rest',
                                ]
                            }}
                            patientData={currentSession.patientData}
                            onNewAssessment={handleNewSession}
                        />
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="sticky bottom-0 border-t bg-background p-4">
                {/* Quick Replies */}
                {!triageResult && !isLoading && messages.length > 0 && (
                    <QuickReplies
                        suggestions={quickReplySuggestions}
                        onSelect={(reply) => {
                            setMessage(reply);
                            setShowQuickReplies(false);
                            // Focus the textarea
                            setTimeout(() => textareaRef.current?.focus(), 100);
                        }}
                        isVisible={showQuickReplies && message.length === 0}
                    />
                )}

                <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={isLoading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Paperclip className="h-4 w-4" />
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelect}
                    />

                    <div className="flex-1 relative">
                        {selectedImage && (
                            <div className="mb-2 relative inline-block">
                                <img
                                    src={URL.createObjectURL(selectedImage)}
                                    alt="Selected"
                                    className="h-20 rounded-md border"
                                />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                    onClick={() => setSelectedImage(null)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        )}

                        <Textarea
                            ref={textareaRef}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="min-h-[44px] max-h-[120px] resize-none pr-10 py-3"
                            disabled={isLoading}
                            rows={1}
                        />
                        <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                            {message.length}/500
                        </span>
                    </div>

                    <Button
                        type="submit"
                        size="icon"
                        disabled={isLoading || (!message.trim() && !selectedImage)}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
