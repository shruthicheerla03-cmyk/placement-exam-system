import React from 'react';

export default function InstructionCard({ children, className = '' }) {
  return (
    <div
      className={`bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl p-6 md:p-8 transition-all duration-300 ${className}`}
      style={{ boxShadow: '0 20px 60px rgba(16,24,40,0.12)' }}
    >
      {children}
    </div>
  );
}
