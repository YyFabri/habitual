"use client";

import { cn } from "@/lib/utils";

interface SegmentedCircleProps {
    value: number; // current progress
    objective: number; // total segments
    size?: number; // pixel diameter
    strokeWidth?: number;
    color: string; // CSS color / oklch value
    className?: string;
}

export function SegmentedCircle({
    value,
    objective,
    size = 52,
    strokeWidth = 4,
    color,
    className,
}: SegmentedCircleProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    // For simple habits (objective = 1), render a single circle
    if (objective <= 1) {
        const progress = Math.min(value, 1);
        const dashOffset = circumference * (1 - progress);

        return (
            <svg
                width={size}
                height={size}
                className={cn("transform -rotate-90", className)}
            >
                {/* Background circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted/50"
                />
                {/* Progress circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                />
            </svg>
        );
    }

    // For counter habits, render segments
    const gapAngle = objective <= 3 ? 8 : 5; // degrees between segments
    const totalGapAngle = gapAngle * objective;
    const totalActiveAngle = 360 - totalGapAngle;
    const segmentAngle = totalActiveAngle / objective;

    return (
        <svg
            width={size}
            height={size}
            className={cn("transform -rotate-90", className)}
        >
            {Array.from({ length: objective }).map((_, i) => {
                const startAngle = i * (segmentAngle + gapAngle);
                const segmentLength = (segmentAngle / 360) * circumference;
                const gapLength = (gapAngle / 360) * circumference;
                const isFilled = i < value;

                // Offset to start from the correct angle
                const offset = (startAngle / 360) * circumference;

                return (
                    <circle
                        key={i}
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={isFilled ? color : "currentColor"}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="round"
                        className={cn(
                            "transition-all duration-300 ease-out",
                            isFilled ? "" : "text-muted/40"
                        )}
                    />
                );
            })}
        </svg>
    );
}
