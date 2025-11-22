'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickRepliesProps {
    suggestions: string[];
    onSelect: (reply: string) => void;
    isVisible?: boolean;
}

export function QuickReplies({ suggestions, onSelect, isVisible = true }: QuickRepliesProps) {
    if (!isVisible || suggestions.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="mb-3"
            >
                <p className="text-xs text-muted-foreground mb-2 px-1">
                    💡 Quick replies:
                </p>
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, index) => (
                        <motion.div
                            key={suggestion}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onSelect(suggestion)}
                                className="text-sm rounded-full hover:bg-primary hover:text-primary-foreground transition-all"
                            >
                                {suggestion}
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// Smart suggestions based on context
export function generateSmartReplies(context: {
    lastAIMessage?: string;
    symptom?: string;
    stage?: 'initial' | 'details' | 'assessment';
}): string[] {
    const { lastAIMessage, symptom, stage } = context;

    // Context-aware suggestions based on last AI message
    if (lastAIMessage?.toLowerCase().includes('pain')) {
        return [
            "Yes, it's throbbing",
            "No, it's a dull ache",
            "It comes and goes",
            "It's constant"
        ];
    }

    if (lastAIMessage?.toLowerCase().includes('how long') || lastAIMessage?.toLowerCase().includes('when')) {
        return [
            "Just started today",
            "2-3 days ago",
            "About a week",
            "More than a week"
        ];
    }

    if (lastAIMessage?.toLowerCase().includes('worse') || lastAIMessage?.toLowerCase().includes('better')) {
        return [
            "Getting worse",
            "About the same",
            "Getting better",
            "Not sure"
        ];
    }

    if (lastAIMessage?.toLowerCase().includes('medication') || lastAIMessage?.toLowerCase().includes('medicine')) {
        return [
            "Yes, paracetamol",
            "Yes, ibuprofen",
            "No medication yet",
            "I take regular medication"
        ];
    }

    // Symptom-specific suggestions
    if (symptom?.toLowerCase().includes('headache')) {
        return [
            "Behind my eyes",
            "Whole head",
            "One side only",
            "Back of head"
        ];
    }

    if (symptom?.toLowerCase().includes('fever')) {
        return [
            "Yes, high fever",
            "Mild fever",
            "No fever",
            "Not sure"
        ];
    }

    // Stage-based suggestions
    if (stage === 'initial') {
        return [
            "Tell me more",
            "What should I do?",
            "I'm worried",
            "Is this serious?"
        ];
    }

    // Default helpful responses
    return [
        "Yes",
        "No",
        "I'm not sure",
        "Can you explain more?"
    ];
}
