import React from 'react';

export default function NavigationButtons({ current, totalSteps, onPrev, onNext, onBegin, agreed }) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <div className="text-sm text-slate-500 hidden md:block">Step {Math.min(current + 1, totalSteps)} of {totalSteps}</div>

      <div className="flex items-center gap-3">
        {current > 0 ? (
          <button onClick={onPrev} className="hidden md:inline-flex items-center px-4 py-2 rounded-full bg-white/60 border border-white/30 text-slate-700 font-semibold shadow-sm hover:scale-105 transition">← Previous</button>
        ) : <div className="hidden md:inline-block w-[110px]" />}

        {current < totalSteps - 1 ? (
          <button onClick={onNext} className="px-6 py-2 rounded-full text-white font-bold shadow-lg" style={{ background: 'linear-gradient(90deg,#2563eb,#3b82f6)', transform: 'translateZ(0)' }}>Next →</button>
        ) : (
          <button onClick={onBegin} className="px-6 py-2 rounded-full text-white font-bold shadow-lg disabled:opacity-50" style={{ background: 'linear-gradient(90deg,#2563eb,#3b82f6)' }} disabled={!agreed}>Begin Test</button>
        )}
      </div>
    </div>
  );
}
