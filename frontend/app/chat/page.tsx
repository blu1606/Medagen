'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWindow } from '@/components/organisms/ChatWindow';
import { ChatLayout } from '@/components/templates/ChatLayout';
import { LoadingSpinner } from '@/components/utility/LoadingSpinner';

function ChatContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session') || undefined;

    return (
        <ChatLayout>
            <ChatWindow sessionId={sessionId} />
        </ChatLayout>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>}>
            <ChatContent />
        </Suspense>
    );
}
