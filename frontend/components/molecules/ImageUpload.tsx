import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
    value?: File | null;
    onChange: (file: File | null) => void;
    maxSize?: number; // in MB
    disabled?: boolean;
}

export function ImageUpload({
    value,
    onChange,
    maxSize = 10,
    disabled
}: ImageUploadProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > maxSize * 1024 * 1024) {
            toast.error(`File must be less than ${maxSize}MB`);
            return;
        }

        onChange(file);
    };

    return (
        <div className="space-y-2">
            <Input
                type="file"
                accept="image/*"
                onChange={handleChange}
                disabled={disabled}
            />
            {value && (
                <div className="relative inline-block">
                    <img
                        src={URL.createObjectURL(value)}
                        alt="Preview"
                        className="max-w-xs rounded-md"
                    />
                    <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => onChange(null)}
                        type="button"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
