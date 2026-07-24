"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

const SPLASH_MIN_DURATION_MS = 1200;
const FADE_OUT_DURATION_MS = 500;

interface AppSplashScreenProps {
  isAppReady: boolean;
  error?: string | Error | null;
  onRetry?: () => void;
}

export default function AppSplashScreen({
  isAppReady,
  error = null,
  onRetry,
}: AppSplashScreenProps) {
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isUnmounted, setIsUnmounted] = useState(false);

  // Minimum duration timer on initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, SPLASH_MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  // Trigger fade out once app is ready and minimum display time has elapsed (with no error)
  useEffect(() => {
    if (isAppReady && minTimePassed && !error && !isFadingOut) {
      setIsFadingOut(true);
      const unmountTimer = setTimeout(() => {
        setIsUnmounted(true);
      }, FADE_OUT_DURATION_MS);
      return () => clearTimeout(unmountTimer);
    }
  }, [isAppReady, minTimePassed, error, isFadingOut]);

  if (isUnmounted) return null;

  return (
    <div
      id="app-splash-screen"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0c] text-white select-none transition-opacity duration-500 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,92,252,0.12)_0%,transparent_65%)] pointer-events-none" />

      {/* Main Container */}
      <div className="relative flex flex-col items-center justify-center px-6 text-center animate-scale-in">
        {error ? (
          /* Error State UI */
          <div className="flex flex-col items-center max-w-sm bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl p-8 rounded-3xl shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-base font-bold text-gray-100 mb-1">Initialization Failed</h2>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              {typeof error === "string" ? error : error.message || "Failed to load database. Please try again."}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-violet-650 hover:bg-violet-750 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20 hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Retry Initialization</span>
              </button>
            )}
          </div>
        ) : (
          /* Normal Loading State UI */
          <div className="flex flex-col items-center">
            {/* Logo Wrapper with Ambient Breathing Glow & Rotating Ring */}
            <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
              {/* Rotating gradient ring */}
              <div className="absolute inset-0 rounded-full border border-violet-500/20 border-t-violet-500/80 animate-spin" style={{ animationDuration: "2.5s" }} />

              {/* Outer pulsing glow */}
              <div className="absolute -inset-2 rounded-full bg-violet-500/15 blur-xl animate-pulse" />

              {/* Brand Logo */}
                <img
                  src="/focora-notes_newlogo.png"
                  alt="Focora Notes"
                  className="w-16 h-16 object-contain drop-shadow-[0_0_16px_rgba(124,92,252,0.4)]"
                />
            </div>

            {/* Clean Typography */}
            <h1 className="text-sm font-bold tracking-[0.25em] uppercase text-gray-200/90 font-sans">
              Focora Notes
            </h1>

            {/* Subtle Activity Dot */}
            <div className="mt-6 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping" />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500/60" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
