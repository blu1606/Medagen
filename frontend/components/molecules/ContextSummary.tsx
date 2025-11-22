'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, AlertCircle, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface ContextSummaryProps {
    patientData: {
        name: string;
        age: number;
        gender?: string;
        chiefComplaint: string;
        duration?: string;
        severity?: string;
        chronicConditions?: string[];
    };
}

export function ContextSummary({ patientData }: ContextSummaryProps) {
    const getSeverityColor = (severity?: string) => {
        switch (severity?.toLowerCase()) {
            case 'mild':
                return 'bg-success/20 text-success border-success/30';
            case 'moderate':
                return 'bg-primary/20 text-primary border-primary/30';
            case 'severe':
                return 'bg-warning/20 text-warning border-warning/30';
            case 'emergency':
                return 'bg-destructive/20 text-destructive border-destructive/30';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="p-4 mb-4 bg-primary/5 border-primary/20">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        Your Intake Summary
                    </h3>
                    <Badge variant="outline" className="text-xs">
                        Session Active
                    </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {/* Patient Info */}
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Patient:</span>
                        <span className="font-medium">
                            {patientData.name}, {patientData.age}
                            {patientData.gender && `, ${patientData.gender}`}
                        </span>
                    </div>

                    {/* Chief Complaint */}
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Complaint:</span>
                        <span className="font-medium">{patientData.chiefComplaint}</span>
                    </div>

                    {/* Duration */}
                    {patientData.duration && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-medium">{patientData.duration}</span>
                        </div>
                    )}

                    {/* Severity */}
                    {patientData.severity && (
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Severity:</span>
                            <Badge className={getSeverityColor(patientData.severity)}>
                                {patientData.severity}
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Chronic Conditions */}
                {patientData.chronicConditions && patientData.chronicConditions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-primary/20">
                        <span className="text-xs text-muted-foreground mb-2 block">
                            Medical History:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {patientData.chronicConditions.map((condition) => (
                                <Badge
                                    key={condition}
                                    variant="secondary"
                                    className="text-xs"
                                >
                                    {condition}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </Card>
        </motion.div>
    );
}
