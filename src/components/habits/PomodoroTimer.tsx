"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw, Coffee, Brain, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticTap, hapticSuccess } from "@/utils/haptics";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PomodoroPhase = "work" | "break";

export function PomodoroTimer() {
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
            osc.frequency.value = phase === "work" ? 523.25 : 659.25;
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

    const circleRadius = 90;
    const circumference = 2 * Math.PI * circleRadius;

    return (
        <div className="flex flex-col items-center gap-8 py-6 animate-[fade-in_0.3s_ease-out]">
            {/* Phase toggle */}
            <div className="flex items-center gap-2 bg-card rounded-2xl p-1 bubble-shadow">
                <button
                    onClick={() => {
                        if (isRunning) return;
                        hapticTap();
                        setPhase("work");
                        setTimeLeft(workDurationSecs);
                    }}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
                        phase === "work"
                            ? "bg-gradient-to-r from-orange-400 to-red-500 text-white bubble-shadow"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Brain className="h-4 w-4" />
                    Enfoque
                </button>
                <button
                    onClick={() => {
                        if (isRunning) return;
                        hapticTap();
                        setPhase("break");
                        setTimeLeft(breakDurationSecs);
                    }}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
                        phase === "break"
                            ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white bubble-shadow"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Coffee className="h-4 w-4" />
                    Descanso
                </button>
            </div>

            {/* Circular timer */}
            <div className="relative flex items-center justify-center">
                <svg width="220" height="220" className="transform -rotate-90">
                    {/* Background circle */}
                    <circle
                        cx="110" cy="110" r={circleRadius}
                        fill="none"
                        stroke="currentColor"
                        className="text-muted/20"
                        strokeWidth="8"
                    />
                    {/* Progress circle */}
                    <circle
                        cx="110" cy="110" r={circleRadius}
                        fill="none"
                        stroke={phase === "work" ? "#f97316" : "#10b981"}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - progress / 100)}
                        className="transition-all duration-1000 ease-linear"
                    />
                </svg>
                {/* Time display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold tabular-nums tracking-tight">
                        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                    </span>
                    <span className={cn(
                        "text-xs font-medium mt-1 uppercase tracking-widest",
                        phase === "work" ? "text-orange-500/70" : "text-emerald-500/70"
                    )}>
                        {phase === "work" ? "Concentración" : "Descansá"}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
                <button
                    onClick={resetTimer}
                    className="h-12 w-12 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all active:scale-90 bg-card bubble-shadow"
                >
                    <RotateCcw className="h-5 w-5" />
                </button>
                <button
                    onClick={toggleTimer}
                    className={cn(
                        "h-18 w-18 rounded-full flex items-center justify-center transition-all active:scale-90 bubble-shadow-lg",
                        phase === "work"
                            ? "bg-gradient-to-br from-orange-400 to-red-500 text-white"
                            : "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                    )}
                    style={{ height: "72px", width: "72px" }}
                >
                    {isRunning ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                </button>
                <button
                    onClick={() => { hapticTap(); setShowSettings(!showSettings); }}
                    className="h-12 w-12 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all active:scale-90 bg-card bubble-shadow"
                >
                    <Settings2 className="h-5 w-5" />
                </button>
            </div>

            {/* Sessions counter */}
            {sessions > 0 && (
                <div className="flex items-center gap-1.5 animate-[fade-in_0.3s_ease-out]">
                    {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
                        <div
                            key={i}
                            className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-orange-400 to-red-500"
                        />
                    ))}
                    {sessions > 8 && (
                        <span className="text-xs text-muted-foreground ml-1">+{sessions - 8}</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-2">
                        {sessions} {sessions === 1 ? "sesión" : "sesiones"} completada{sessions === 1 ? "" : "s"}
                    </span>
                </div>
            )}

            {/* Settings Panel */}
            {showSettings && (
                <div className="w-full max-w-xs bg-card rounded-3xl bubble-shadow p-5 relative animate-[slide-up_0.2s_ease-out]">
                    <button
                        onClick={() => setShowSettings(false)}
                        className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <h4 className="font-semibold mb-4 text-sm">Configurar tiempos</h4>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-orange-500 font-bold uppercase">Minutos de enfoque</Label>
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
                            <Label className="text-xs text-emerald-500 font-bold uppercase">Minutos de descanso</Label>
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
        </div>
    );
}
