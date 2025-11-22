'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface FormLayoutProps {
    title: string;
    description?: string;
    children: React.ReactNode;
}

export function FormLayout({ title, description, children }: FormLayoutProps) {
    return (
        <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl"
            >
                <div className="bg-card border rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 md:p-8 border-b bg-primary/5">
                        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">{title}</h1>
                        {description && (
                            <p className="text-muted-foreground">{description}</p>
                        )}
                    </div>
                    <div className="p-6 md:p-8">
                        {children}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
