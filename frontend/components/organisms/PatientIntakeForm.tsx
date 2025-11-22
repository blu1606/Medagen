'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/molecules/ImageUpload';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSessionStore } from '@/lib/sessionStore';

// --- Schema Definition ---

const patientIntakeSchema = z.object({
    // Personal Information
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must be less than 50 characters')
        .regex(/^[a-zA-Z\s-]+$/, 'Name can only contain letters, spaces, and hyphens'),

    age: z.string()
        .refine((val) => !isNaN(parseInt(val, 10)) && parseInt(val, 10) >= 1 && parseInt(val, 10) <= 120, {
            message: 'Age must be between 1 and 120',
        }),

    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say'], {
        message: 'Please select a gender',
    }),

    // Medical History
    chronic_conditions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    current_medications: z.string().max(500).optional(),

    // Current Symptoms
    main_complaint: z.string()
        .min(10, 'Please provide more details (at least 10 characters)')
        .max(500, 'Description must be less than 500 characters'),

    duration: z.enum([
        'less_than_1_day',
        '1_3_days',
        '3_7_days',
        '1_2_weeks',
        'more_than_2_weeks'
    ], {
        message: 'Please select symptom duration',
    }),

    severity: z.enum(['mild', 'moderate', 'severe'], {
        message: 'Please select symptom severity',
    }),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    symptom_image: z.any().optional(), // File validation handled in component
});

export type PatientIntakeFormValues = z.infer<typeof patientIntakeSchema>;

// --- Component ---

interface PatientIntakeFormProps {
    onSubmit?: (data: PatientIntakeFormValues) => Promise<void>;
}

export function PatientIntakeForm({ onSubmit: propOnSubmit }: PatientIntakeFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const form = useForm<PatientIntakeFormValues>({
        resolver: zodResolver(patientIntakeSchema),
        defaultValues: {
            name: '',
            chronic_conditions: [],
            allergies: [],
            current_medications: '',
            main_complaint: '',
        },
    });

    // Auto-save to localStorage
    useEffect(() => {
        const subscription = form.watch((value) => {
            // Debounce saving could be added here
            localStorage.setItem('patient_intake_draft', JSON.stringify(value));
        });
        return () => subscription.unsubscribe();
    }, [form.watch]);

    // Restore from localStorage
    useEffect(() => {
        const draft = localStorage.getItem('patient_intake_draft');
        if (draft) {
            try {
                const data = JSON.parse(draft);
                // Need to handle file separately or exclude it, as File objects don't persist
                delete data.symptom_image;
                form.reset(data);
                toast.info('Draft restored');
            } catch (e) {
                console.error("Failed to restore draft", e);
            }
        }
    }, [form]);

    const handleSubmit = async (data: PatientIntakeFormValues) => {
        setIsSubmitting(true);
        try {
            // In a real app, we would upload the image here if present
            // and then submit the form data with the image URL.

            // For MVP, we'll just simulate a delay and then call the prop or navigate
            await new Promise(resolve => setTimeout(resolve, 1500));

            console.log('Form Submitted:', data);

            // Clear draft
            localStorage.removeItem('patient_intake_draft');

            // Create session with patient data
            const { createSession } = useSessionStore.getState();
            const sessionId = createSession({
                name: data.name,
                age: data.age,
                gender: data.gender,
                chiefComplaint: data.main_complaint,
                duration: data.duration,
                severity: data.severity,
                chronicConditions: data.chronic_conditions || []
            });

            if (propOnSubmit) {
                await propOnSubmit(data);
            } else {
                // Navigate to chat with session ID
                router.push(`/chat?session=${sessionId}`);
            }

            toast.success('Information submitted successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to submit form. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const conditions = [
        { id: 'diabetes', label: 'Diabetes' },
        { id: 'hypertension', label: 'Hypertension' },
        { id: 'asthma', label: 'Asthma' },
        { id: 'heart_disease', label: 'Heart Disease' },
    ];

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">

                {/* Section 1: Personal Information */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4 border p-4 rounded-lg bg-card shadow-sm"
                >
                    <h3 className="text-lg font-semibold text-primary">Personal Information</h3>

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Full Name *</FormLabel>
                                <FormControl>
                                    <Input placeholder="John Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="age"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Age *</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="25" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Gender *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </motion.div>

                {/* Section 2: Medical History */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4 border p-4 rounded-lg bg-card shadow-sm"
                >
                    <h3 className="text-lg font-semibold text-primary">Medical History</h3>

                    <FormField
                        control={form.control}
                        name="chronic_conditions"
                        render={() => (
                            <FormItem>
                                <div className="mb-4">
                                    <FormLabel className="text-base">Chronic Conditions</FormLabel>
                                    <FormDescription>
                                        Select all that apply.
                                    </FormDescription>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {conditions.map((item) => (
                                        <FormField
                                            key={item.id}
                                            control={form.control}
                                            name="chronic_conditions"
                                            render={({ field }) => {
                                                return (
                                                    <FormItem
                                                        key={item.id}
                                                        className="flex flex-row items-start space-x-3 space-y-0"
                                                    >
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(item.id)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                        ? field.onChange([...(field.value || []), item.id])
                                                                        : field.onChange(
                                                                            field.value?.filter(
                                                                                (value) => value !== item.id
                                                                            )
                                                                        )
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">
                                                            {item.label}
                                                        </FormLabel>
                                                    </FormItem>
                                                )
                                            }}
                                        />
                                    ))}
                                </div>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="current_medications"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Current Medications (Optional)</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="List any medications you're currently taking"
                                        className="resize-none"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </motion.div>

                {/* Section 3: Current Symptoms */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4 border p-4 rounded-lg bg-card shadow-sm"
                >
                    <h3 className="text-lg font-semibold text-primary">Current Symptoms</h3>

                    <FormField
                        control={form.control}
                        name="main_complaint"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Main Complaint *</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Describe your symptoms in detail..."
                                        className="min-h-[100px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    {field.value?.length || 0}/500 characters
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="duration"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Duration *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="How long?" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="less_than_1_day">Less than 1 day</SelectItem>
                                            <SelectItem value="1_3_days">1-3 days</SelectItem>
                                            <SelectItem value="3_7_days">3-7 days</SelectItem>
                                            <SelectItem value="1_2_weeks">1-2 weeks</SelectItem>
                                            <SelectItem value="more_than_2_weeks">More than 2 weeks</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="severity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Severity *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="How severe?" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="mild">Mild</SelectItem>
                                            <SelectItem value="moderate">Moderate</SelectItem>
                                            <SelectItem value="severe">Severe</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="symptom_image"
                        render={({ field: { value, onChange, ...field } }) => (
                            <FormItem>
                                <FormLabel>Upload Image (Optional)</FormLabel>
                                <FormControl>
                                    <ImageUpload
                                        value={value}
                                        onChange={onChange}
                                        disabled={isSubmitting}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </motion.div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        'Submit & Continue'
                    )}
                </Button>
            </form>
        </Form>
    );
}
