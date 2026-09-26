import React from 'react';
import { Compass, Sparkles, MapPin, ShieldCheck } from 'lucide-react';

interface SplashScreenProps {
  onDismiss: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDismiss }) => {
  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-8 bg-gradient-to-b from-navy-900 via-navy-800 to-slate-950 text-white cursor-pointer select-none animate-in fade-in duration-700"
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-sm">
        {/* Animated Luxury Emblem */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gold-gradient p-0.5 shadow-gold animate-bounce duration-1000">
            <div className="w-full h-full rounded-3xl bg-navy-900 flex items-center justify-center">
              <Compass className="w-12 h-12 text-amber-400 animate-spin-slow" />
            </div>
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gold-gradient flex items-center justify-center text-slate-950 shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Titles */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Google Maps <br />
            <span className="text-gold-gradient">Address Registration</span>
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Professional address validation, coordinate precision, PDF dossiers &amp; official intake pipeline.
          </p>
        </div>

        {/* Highlight points */}
        <div className="w-full bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-gold/30 text-left space-y-2.5 text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Google Address Validation API Integration</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Places Autocomplete &amp; Draggable Hybrid Map</span>
          </div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>QR Code &amp; Luxury PDF Certificate Generation</span>
          </div>
        </div>
      </div>

      <div className="text-center space-y-2">
        <button
          onClick={onDismiss}
          className="py-3 px-8 rounded-2xl bg-gold-gradient text-slate-950 font-bold text-xs uppercase tracking-wider shadow-gold hover:opacity-95 transition-all"
        >
          Enter Application
        </button>
        <p className="text-[10px] text-slate-500">Tap anywhere to start</p>
      </div>
    </div>
  );
};
