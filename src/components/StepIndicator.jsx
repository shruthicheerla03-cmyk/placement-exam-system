import React from 'react';

export default function StepIndicator({ total, current }) {
  return (
    <div className="mt-4 flex items-center justify-center gap-4">
      <div className="flex gap-3">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`block rounded-full transition-all duration-300 ${i === current ? 'w-3 h-3 bg-sky-600 shadow-lg' : 'w-2 h-2 bg-slate-200'}`}
          />
        ))}
      </div>
      <div className="text-xs text-slate-500">Step {Math.min(current + 1, total)} of {total}</div>
    </div>
  );
}
