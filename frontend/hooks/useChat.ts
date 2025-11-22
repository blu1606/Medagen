import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { TriageResult } from '@/components/organisms/TriageResultCard';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    image_url?: string;
    timestamp: string;
    status?: 'sending' | 'sent' | 'error';
}

interface UseChatOptions {
    sessionId?: string;
    initialMessages?: Message[];
}

export function useChat({ sessionId, initialMessages = [] }: UseChatOptions = {}) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isLoading, setIsLoading] = useState(false);
    const [triageResult, setTriageResult] = useState<TriageResult | null>(null);

    const sendMessage = useCallback(async (content: string, image?: File) => {
        if (!content.trim() && !image) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content,
            image_url: image ? URL.createObjectURL(image) : undefined,
            timestamp: new Date().toISOString(),
            status: 'sending',
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 2000));

            setMessages((prev) =>
                prev.map((m) => (m.id === userMessage.id ? { ...m, status: 'sent' } : m))
            );

            // Mock AI response
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I understand. Could you describe the severity of the pain on a scale of 1 to 10?",
                timestamp: new Date().toISOString(),
                status: 'sent',
            };
            setMessages((prev) => [...prev, aiMessage]);

            // Mock Triage Result trigger
            if (messages.length > 2 && !triageResult) {
                setTriageResult({
                    triage_level: 'urgent',
                    symptom_summary: 'Patient reports severe abdominal pain lasting 2 days.',
                    red_flags: ['Severe pain', 'Fever'],
                    suspected_conditions: [
                        { name: 'Appendicitis', confidence: 'medium' },
                        { name: 'Gastroenteritis', confidence: 'low' }
                    ],
                    recommendation: {
                        action: 'Visit Urgent Care',
                        timeframe: 'Within 4 hours',
                        home_care_advice: 'Do not eat or drink anything.',
                        warning_signs: 'Worsening pain, vomiting blood.'
                    },
                    nearest_clinic: {
                        name: 'City General Hospital',
                        address: '123 Main St',
                        distance_km: 2.5,
                        rating: 4.5
                    }
                });
            }

        } catch (error) {
            console.error('Error sending message:', error);
            setMessages((prev) =>
                prev.map((m) => (m.id === userMessage.id ? { ...m, status: 'error' } : m))
            );
            toast.error('Failed to send message');
        } finally {
            setIsLoading(false);
        }
    }, [messages, triageResult]);

    return {
        messages,
        isLoading,
        triageResult,
        sendMessage,
        setMessages, // Exposed for initial greeting setup if needed
    };
}
