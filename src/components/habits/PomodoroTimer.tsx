"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw, Coffee, Brain, X, Timer, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticTap, hapticSuccess } from "@/utils/haptics";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PomodoroPhase = "work" | "break";

export function PomodoroTimer() {
    const [isOpen, setIsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [workMinutes, setWorkMinutes] = useState(25);
    const [breakMinutes, setBreakMinutes] = useState(5);

    const [phase, setPhase] = useState<PomodoroPhase>("work");
    const [timeLeft, setTimeLeft] = useState(workMinutes * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [sessions, setSessions] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioRef = useRef<AudioContext | null>(null);

    const workDurationSecs = workMinutes * 60;
    const breakDurationSecs = breakMinutes * 60;
    const totalTime = phase === "work" ? workDurationSecs : breakDurationSecs;
    const progress = ((totalTime - timeLeft) / totalTime) * 100;

    // Timer logic
    useEffect(() => {
        if (!isRunning) return;

        intervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    // Timer complete
                    playCompletionSound();
                    hapticSuccess();

                    if (phase === "work") {
                        setSessions((s) => s + 1);
                        setPhase("break");
                        setIsRunning(false);
                        return breakDurationSecs;
                    } else {
                        setPhase("work");
                        setIsRunning(false);
                        return workDurationSecs;
                    }
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, phase]);

    const playCompletionSound = useCallback(() => {
        try {
            if (!audioRef.current) {
                audioRef.current = new AudioContext();
            }
            const ctx = audioRef.current;
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.frequency.value = phase === "work" ? 523.25 : 659.25; // C5 or E5
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.8);
        } catch {
            // Audio not supported
        }
    }, [phase]);

    const toggleTimer = () => {
        hapticTap();
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        hapticTap();
        setIsRunning(false);
        setPhase("work");
        setTimeLeft(workDurationSecs);
    };

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    // Floating button when closed
    if (!isOpen) {
        return (
            <button
                onClick={() => { hapticTap(); setIsOpen(true); }}
                className={cn(
                    "fixed bottom-24 right-4 z-50",
                    "h-14 w-14 rounded-full",
                    "bg-gradient-to-br from-purple-500 to-indigo-600",
                    "bubble-shadow-lg flex items-center justify-center",
                    "hover:scale-110 active:scale-95 transition-all duration-200",
                    isRunning && "animate-pulse"
                )}
                title="Pomodoro Timer"
            >
                <Timer className="h-6 w-6 text-white" />
                {isRunning && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-400 rounded-full border-2 border-white" />
                )}
            </button>
        );
    }

    return (
        <div className="fixed bottom-24 right-4 z-50 w-72 animate-[slide-up_0.3s_ease-out]">
            <div className="bg-card rounded-3xl bubble-shadow-lg p-6 relative overflow-hidden">
                {/* Background gradient based on phase */}
                <div
                    className={cn(
                        "absolute inset-0 opacity-5 transition-colors duration-500",
                        phase === "work" ? "bg-gradient-to-br from-red-500 to-orange-500" : "bg-gradient-to-br from-emerald-500 to-teal-500"
                    )}
                />

                {/* Close button */}
                <button
                    onClick={() => { hapticTap(); setIsOpen(false); }}
                    className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors z-10"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Phase indicator */}
                <div className="flex items-center gap-2 mb-4 relative">
                    {phase === "work" ? (
                        <Brain className="h-5 w-5 text-orange-500" />
                    ) : (
                        <Coffee className="h-5 w-5 text-emerald-500" />
                    )}
                    <span className={cn(
                        "text-sm font-semibold uppercase tracking-wider",
                        phase === "work" ? "text-orange-500" : "text-emerald-500"
                    )}>
                        {phase === "work" ? "Enfoque" : "Descanso"}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                        sesión #{sessions + 1}
                    </span>
                </div>

                {/* Circular progress */}
                <div className="relative flex items-center justify-center my-4">
                    <svg width="140" height="140" className="transform -rotate-90">
                        {/* Background circle */}
                        <circle
                            cx="70" cy="70" r="60"
                            fill="none"
                            stroke="currentColor"
                            className="text-muted/30"
                            strokeWidth="6"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="70" cy="70" r="60"
                            fill="none"
                            stroke={phase === "work" ? "#f97316" : "#10b981"}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 60}
                            strokeDashoffset={2 * Math.PI * 60 * (1 - progress / 100)}
                            className="transition-all duration-1000 ease-linear"
                        />
                    </svg>
                    {/* Time display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold tabular-nums">
                            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                        </span>
                    </div>
                </div>

                {/* Settings Overlay */}
                {showSettings && (
                    <div className="absolute inset-0 z-20 bg-card p-6 bubble-shadow-lg flex flex-col justify-center animate-[fade-in_0.2s_ease-out]">
                        <button
                            onClick={() => setShowSettings(false)}
                            className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <h4 className="font-semibold mb-4">Configuración</h4>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-orange-500 font-bold">MINUTOS DE ENFOQUE</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={120}
                                    value={workMinutes}
                                    className="bg-muted/50 border-0 h-10 rounded-xl"
                                    onChange={(e) => {
                                        const val = Math.max(1, parseInt(e.target.value) || 25);
                                        setWorkMinutes(val);
                                        if (phase === "work" && !isRunning) setTimeLeft(val * 60);
                                    }}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-emerald-500 font-bold">MINUTOS DE DESCANSO</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={breakMinutes}
                                    className="bg-muted/50 border-0 h-10 rounded-xl"
                                    onChange={(e) => {
                                        const val = Math.max(1, parseInt(e.target.value) || 5);
                                        setBreakMinutes(val);
                                        if (phase === "break" && !isRunning) setTimeLeft(val * 60);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="flex items-center justify-center gap-3 mt-2 relative z-10">
                    <button
                        onClick={resetTimer}
                        className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all active:scale-90"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                        onClick={toggleTimer}
                        className={cn(
                            "h-14 w-14 rounded-full flex items-center justify-center transition-all active:scale-90 bubble-shadow",
                            phase === "work"
                                ? "bg-gradient-to-br from-orange-400 to-red-500 text-white"
                                : "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                        )}
                    >
                        {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all active:scale-90"
                    >
                        <Settings2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
