'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ConversationSession {
    id: string;
    title: string;
    timestamp: string;
    lastMessage: string;
    status: 'active' | 'waiting' | 'resolved' | 'archived';
    patientData?: {
        name: string;
        age: number;
        chiefComplaint: string;
    };
    triageResult?: {
        severity: string;
        recommendation: string;
    };
}

interface SessionStore {
    sessions: ConversationSession[];
    currentSessionId: string | null;

    // Actions
    createSession: (patientData?: any) => string;
    updateSession: (id: string, updates: Partial<ConversationSession>) => void;
    deleteSession: (id: string) => void;
    setCurrentSession: (id: string) => void;
    getCurrentSession: () => ConversationSession | null;
    archiveSession: (id: string) => void;
}

export const useSessionStore = create<SessionStore>()(
    persist(
        (set, get) => ({
            sessions: [],
            currentSessionId: null,

            createSession: (patientData) => {
                const newSession: ConversationSession = {
                    id: `session-${Date.now()}`,
                    title: patientData?.chiefComplaint || 'New Consultation',
                    timestamp: new Date().toISOString(),
                    lastMessage: 'Started',
                    status: 'active',
                    patientData,
                };

                set((state) => ({
                    sessions: [newSession, ...state.sessions],
                    currentSessionId: newSession.id,
                }));

                return newSession.id;
            },

            updateSession: (id, updates) => {
                set((state) => ({
                    sessions: state.sessions.map((session) =>
                        session.id === id ? { ...session, ...updates } : session
                    ),
                }));
            },

            deleteSession: (id) => {
                set((state) => ({
                    sessions: state.sessions.filter((session) => session.id !== id),
                    currentSessionId:
                        state.currentSessionId === id ? null : state.currentSessionId,
                }));
            },

            setCurrentSession: (id) => {
                set({ currentSessionId: id });
            },

            getCurrentSession: () => {
                const state = get();
                return (
                    state.sessions.find((s) => s.id === state.currentSessionId) || null
                );
            },

            archiveSession: (id) => {
                set((state) => ({
                    sessions: state.sessions.map((session) =>
                        session.id === id ? { ...session, status: 'archived' } : session
                    ),
                }));
            },
        }),
        {
            name: 'medagen-sessions',
        }
    )
);
