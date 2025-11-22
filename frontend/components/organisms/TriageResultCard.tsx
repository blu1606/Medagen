import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle, Info, CheckCircle, MapPin, Star, Download } from 'lucide-react';

export interface TriageResult {
    triage_level: 'emergency' | 'urgent' | 'routine' | 'self_care';
    symptom_summary: string;
    red_flags: string[];
    suspected_conditions: Array<{
        name: string;
        confidence: 'low' | 'medium' | 'high';
    }>;
    recommendation: {
        action: string;
        timeframe: string;
        home_care_advice: string;
        warning_signs: string;
    };
    nearest_clinic?: {
        name: string;
        distance_km: number;
        address: string;
        rating?: number;
    };
    session_id?: string;
}

interface TriageResultCardProps {
    result: TriageResult;
    onExport?: () => void;
    onNewAssessment?: () => void;
}

export function TriageResultCard({ result, onExport, onNewAssessment }: TriageResultCardProps) {
    const triageConfig = {
        emergency: {
            color: 'emergency',
            icon: AlertTriangle,
            title: 'Emergency',
            borderColor: 'border-emergency',
            textColor: 'text-emergency',
            badgeVariant: 'destructive' as const, // Shadcn badge variant
        },
        urgent: {
            color: 'urgent',
            icon: AlertCircle,
            title: 'Urgent',
            borderColor: 'border-urgent',
            textColor: 'text-urgent',
            badgeVariant: 'default' as const, // Using default for now, or custom if defined
        },
        routine: {
            color: 'routine',
            icon: Info,
            title: 'Routine',
            borderColor: 'border-routine',
            textColor: 'text-routine',
            badgeVariant: 'secondary' as const,
        },
        self_care: {
            color: 'selfcare',
            icon: CheckCircle,
            title: 'Self-Care',
            borderColor: 'border-selfcare',
            textColor: 'text-selfcare',
            badgeVariant: 'outline' as const,
        },
    };

    // Fallback for unknown triage level
    const config = triageConfig[result.triage_level] || triageConfig.routine;
    const Icon = config.icon;

    return (
        <Card className={`border-2 ${config.borderColor}`}>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Icon className={`h-6 w-6 ${config.textColor}`} />
                    <CardTitle>Triage Assessment</CardTitle>
                </div>
                <Badge variant={config.badgeVariant} className="w-fit">
                    {config.title}
                </Badge>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Symptom Summary */}
                <div>
                    <h4 className="font-semibold mb-1">Symptom Summary</h4>
                    <p className="text-sm text-muted-foreground">{result.symptom_summary}</p>
                </div>

                {/* Red Flags */}
                {result.red_flags && result.red_flags.length > 0 && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Warning Signs Detected</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc list-inside space-y-1">
                                {result.red_flags.map((flag, i) => (
                                    <li key={i}>{flag}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Suspected Conditions */}
                {result.suspected_conditions && result.suspected_conditions.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2">Possible Conditions</h4>
                        <div className="flex flex-wrap gap-2">
                            {result.suspected_conditions.map((condition, i) => (
                                <Badge
                                    key={i}
                                    variant={
                                        condition.confidence === 'high' ? 'default' :
                                            condition.confidence === 'medium' ? 'secondary' : 'outline'
                                    }
                                >
                                    {condition.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendations */}
                <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                    <div>
                        <span className="font-semibold">Action:</span> {result.recommendation.action}
                    </div>
                    <div>
                        <span className="font-semibold">Timeframe:</span> {result.recommendation.timeframe}
                    </div>
                    {result.recommendation.home_care_advice && (
                        <div>
                            <span className="font-semibold">Home Care:</span> {result.recommendation.home_care_advice}
                        </div>
                    )}
                    {result.recommendation.warning_signs && (
                        <div>
                            <span className="font-semibold">Warning Signs:</span> {result.recommendation.warning_signs}
                        </div>
                    )}
                </div>

                {/* Nearest Clinic */}
                {result.nearest_clinic && (
                    <div className="border rounded-md p-3">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Nearest Healthcare Facility
                        </h4>
                        <div className="space-y-1 text-sm">
                            <p className="font-medium">{result.nearest_clinic.name}</p>
                            <p className="text-muted-foreground">{result.nearest_clinic.address}</p>
                            <p className="text-muted-foreground">Distance: {result.nearest_clinic.distance_km} km</p>
                            {result.nearest_clinic.rating && (
                                <p className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    {result.nearest_clinic.rating}/5
                                </p>
                            )}
                        </div>
                        <Button
                            className="w-full mt-3"
                            variant="outline"
                            onClick={() => {
                                window.open(
                                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.nearest_clinic!.name)}`,
                                    '_blank'
                                );
                            }}
                        >
                            <MapPin className="h-4 w-4 mr-2" />
                            Open in Google Maps
                        </Button>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    {onExport && (
                        <Button variant="outline" onClick={onExport} className="flex-1">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    )}
                    {onNewAssessment && (
                        <Button onClick={onNewAssessment} className="flex-1">
                            New Assessment
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
