'use client';

import React from 'react';
import { SessionSidebar } from '@/components/organisms/SessionSidebar';

interface ChatLayoutProps {
    children: React.ReactNode;
    showSidebar?: boolean;
}

export function ChatLayout({ children, showSidebar = true }: ChatLayoutProps) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {showSidebar && <SessionSidebar />}
            <div className="flex-1 flex flex-col overflow-hidden">
                {children}
            </div>
        </div>
    );
}
