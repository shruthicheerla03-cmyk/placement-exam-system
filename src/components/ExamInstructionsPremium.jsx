import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, Monitor, AlertTriangle, GraduationCap } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import InstructionCard from './InstructionCard';
import StepIndicator from './StepIndicator';
import NavigationButtons from './NavigationButtons';

export default function ExamInstructionsPremium({ onBegin }) {
  const instructions = [
    { icon: <CheckCircle />, color: 'bg-green-100 text-green-600', title: 'Read all questions carefully', desc: 'Double-check answers before submitting each round.' },
    { icon: <Clock />, color: 'bg-blue-100 text-blue-600', title: 'Each round has a timer', desc: 'Answers are auto-submitted when time runs out.' },
    { icon: <Monitor />, color: 'bg-purple-100 text-purple-600', title: 'Screen sharing required', desc: 'Share your entire screen (not a window or tab).' },

    { icon: <AlertTriangle />, color: 'bg-yellow-100 text-yellow-700', title: 'Full screen only', desc: 'Exiting full screen is a violation and will be recorded.' },
    { icon: <CheckCircle />, color: 'bg-green-100 text-green-600', title: 'Answers are auto-saved', desc: 'You can edit answers within the same round until submission.' },
    { icon: <Clock />, color: 'bg-blue-100 text-blue-600', title: 'Three rounds', desc: 'Aptitude → Core Subjects → DSA.' },

    { icon: <Monitor />, color: 'bg-purple-100 text-purple-600', title: 'DSA round', desc: 'Write full solutions in your preferred language.' },
    { icon: <AlertTriangle />, color: 'bg-yellow-100 text-yellow-700', title: 'No tab switching', desc: 'Tab switches or stops in screen share will be flagged.' },
    { icon: <CheckCircle />, color: 'bg-green-100 text-green-600', title: 'Exam Code required', desc: 'You will need the code from your admin to start.' },
  ];

  const groups = [];
  for (let i = 0; i < instructions.length; i += 3) groups.push(instructions.slice(i, i + 3));
  const totalSteps = groups.length + 1;

  const [current, setCurrent] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [permissionChoice, setPermissionChoice] = useState(null);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 90);
    return () => clearTimeout(t);
  }, [current]);

  useEffect(() => {
    const saved = localStorage.getItem('screenSharePermission');
    if (saved === 'always') setPermissionChoice('always');
  }, []);

  useEffect(() => {
    if (permissionChoice === 'always') {
      localStorage.setItem('screenSharePermission', 'always');
      setAgreed(true);
    }
  }, [permissionChoice]);

  const handleNext = () => setCurrent((c) => Math.min(c + 1, totalSteps - 1));
  const handlePrev = () => setCurrent((c) => Math.max(c - 1, 0));

  const handleBegin = () => {
    if (current === totalSteps - 1 && !agreed) return;
    if (permissionChoice === 'once') sessionStorage.setItem('screenSharePermission', 'once');
    if (typeof onBegin === 'function') onBegin();
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) {}
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white via-sky-50 to-sky-100 relative flex flex-col items-center justify-center px-4 py-8">
      <div className="absolute -z-10 w-96 h-96 rounded-full bg-indigo-100/40 blur-3xl top-8 left-8" />
      <div className="absolute -z-10 w-80 h-80 rounded-full bg-sky-100/40 blur-3xl bottom-12 right-8" />

      <header className="fixed top-4 left-0 right-0 mx-auto max-w-6xl px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3 text-slate-800 font-semibold">
          <span className="p-2 rounded-md bg-white/60 backdrop-blur-sm border border-white/30 shadow-sm">
            <GraduationCap size={18} className="text-slate-700" />
          </span>
          <span className="text-lg md:text-xl">Placement Exam System</span>
        </div>
        <div>
          <button
            onClick={handleLogout}
            className="rounded-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm font-semibold shadow-md transition transform hover:-translate-y-0.5"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="w-full max-w-md md:max-w-lg">
        <div className="mx-auto" aria-live="polite">
          <InstructionCard>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/60 border border-white/30 flex items-center justify-center text-xl">📋</div>
              <div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <h2 className="text-slate-900 text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">Exam Instructions</h2>
                    <div className="ml-2 hidden md:block h-0.5 w-10 rounded bg-gradient-to-r from-sky-400 to-indigo-400" />
                    <span className="ml-3 text-sm text-slate-500 md:text-sm">Step {Math.min(current + 1, totalSteps)} of {totalSteps}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Please review these rules before beginning the exam</p>
                </div>
              </div>
            </div>

            <div className={`min-h-[160px] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}>
              {current < groups.length ? (
                <div key={`step-${current}`} className="space-y-3">
                  {groups[current].map((it, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-3 rounded-lg">
                      <div className={`w-11 h-11 flex items-center justify-center rounded-lg ${it.color} shrink-0`}>
                        <div className="text-lg">{it.icon}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-slate-900 font-semibold">{it.title}</div>
                        <div className="text-sm text-slate-500 mt-1">{it.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div key="final" className="space-y-4">
                  <p className="text-slate-700">Before beginning the exam you must agree to follow the rules. Stopping screen share or exiting full screen may auto-submit your exam.</p>

                  <label className="flex items-center gap-3 bg-white/50 p-3 rounded-lg border border-white/30">
                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-4 h-4" />
                    <span className="text-sm text-slate-700 font-medium">I have read and understood all the instructions</span>
                  </label>

                  <div className="mt-2 flex flex-col gap-2">
                    <div className="text-sm text-slate-500">Screen sharing preference:</div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => { setPermissionChoice('always'); setAgreed(true); }}
                        className={`px-3 py-2 rounded-md text-sm font-semibold transition transform hover:scale-105 ${permissionChoice === 'always' ? 'bg-sky-600 text-white shadow-lg' : 'bg-white/60 border border-white/30 text-slate-700'}`}>
                        Always allow (remember)
                      </button>

                      <button
                        onClick={() => { setPermissionChoice('once'); setAgreed(true); }}
                        className={`px-3 py-2 rounded-md text-sm font-semibold transition transform hover:scale-105 ${permissionChoice === 'once' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/60 border border-white/30 text-slate-700'}`}>
                        Allow once
                      </button>

                      <button
                        onClick={() => { setPermissionChoice('ask'); setAgreed(false); }}
                        className={`px-3 py-2 rounded-md text-sm font-semibold transition transform hover:scale-105 ${permissionChoice === 'ask' ? 'bg-amber-400 text-white shadow-lg' : 'bg-white/60 border border-white/30 text-slate-700'}`}>
                        Ask me later
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <NavigationButtons current={current} totalSteps={totalSteps} onPrev={handlePrev} onNext={handleNext} onBegin={handleBegin} agreed={agreed} />
          </InstructionCard>

          <StepIndicator total={totalSteps} current={current} />
        </div>
      </div>

      <div className="fixed bottom-6 left-6 right-6 md:hidden flex gap-3">
        {current > 0 && (<button onClick={handlePrev} className="flex-1 px-4 py-2 rounded-full bg-white/60 border border-white/30 text-slate-700 font-semibold shadow-sm">← Previous</button>)}
        {current < totalSteps - 1 ? (
          <button onClick={handleNext} className="flex-1 px-6 py-2 rounded-full text-white font-bold" style={{ background: 'linear-gradient(90deg,#2563eb,#3b82f6)' }}>Next →</button>
        ) : (
          <button onClick={handleBegin} disabled={!agreed} className="flex-1 px-6 py-2 rounded-full text-white font-bold disabled:opacity-50" style={{ background: 'linear-gradient(90deg,#2563eb,#3b82f6)' }}>Begin Test</button>
        )}
      </div>
    </div>
  );
}
