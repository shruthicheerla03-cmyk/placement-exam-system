import React, { useState } from 'react';
import styles from './InstructionsFlow.module.css';
import { CheckCircle, Clock, Monitor, AlertTriangle, Lock, FileText, CornerUpRight } from 'lucide-react';

// Reusable InstructionCard component
function InstructionCard({ children }) {
  return (
    <div className={styles.card} role="region" aria-label="Exam instructions card">
      {children}
    </div>
  );
}

// StepIndicator component
function StepIndicator({ total, current }) {
  return (
    <div className={styles.indicatorRow}>
      <div className={styles.indicatorDots} aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
            aria-current={i === current ? 'step' : undefined}
          />
        ))}
      </div>
      <div className={styles.indicatorLabel}>Step {Math.min(current + 1, total)} of {total}</div>
    </div>
  );
}

// NavigationButtons component
function NavigationButtons({ isFirst, isLast, onPrev, onNext, disabledNext, onBegin }) {
  return (
    <div className={styles.navRow}>
      {!isFirst ? (
        <button className={styles.prevBtn} onClick={onPrev} type="button">← Previous</button>
      ) : <div />}

      {!isLast ? (
        <button className={styles.nextBtn} onClick={onNext} type="button">Next →</button>
      ) : (
        <button className={styles.nextBtn} onClick={onBegin} type="button" disabled={disabledNext}>Begin Test 🚀</button>
      )}
    </div>
  );
}

export default function InstructionsFlow({ onComplete }) {
  const instructions = [
    { icon: <CheckCircle size={20} />, title: 'Read all questions carefully', desc: 'Before answering; take your time and double-check.' },
    { icon: <Clock size={20} />, title: 'Each round has a timer', desc: 'Answers auto-submit when time runs out.' },
    { icon: <Monitor size={20} />, title: 'Screen sharing required', desc: 'Share your entire screen (not a window/tab).' },

    { icon: <Lock size={20} />, title: 'Full screen only', desc: 'Exiting full screen is a violation.' },
    { icon: <AlertTriangle size={20} />, title: 'Do not switch tabs', desc: 'Tab switching or minimizing will be recorded.' },
    { icon: <FileText size={20} />, title: 'Answers are auto-saved', desc: 'You can change answers within the same round.' },

    { icon: <CornerUpRight size={20} />, title: 'Exam Code required', desc: 'Enter the code provided by your administrator.' },
    { icon: <CheckCircle size={20} />, title: 'No re-entry after submit', desc: 'Once you submit a round you cannot go back.' },
    { icon: <Monitor size={20} />, title: 'DSA Round', desc: 'Write full code solutions in your preferred language.' },
  ];

  // Split into groups of 3 for steps
  const groups = [];
  for (let i = 0; i < instructions.length; i += 3) groups.push(instructions.slice(i, i + 3));

  // total steps = groups.length (content steps) + 1 final agreement step
  const totalSteps = groups.length + 1;
  const [current, setCurrent] = useState(0);
  const [agreed, setAgreed] = useState(false);

  const goNext = () => setCurrent((c) => Math.min(c + 1, totalSteps - 1));
  const goPrev = () => setCurrent((c) => Math.max(c - 1, 0));

  const handleBegin = () => {
    if (!agreed) return;
    if (typeof onComplete === 'function') onComplete();
  };

  return (
    <div className={styles.wrapper}>
      <InstructionCard>
        <div className={styles.header}>
          <div className={styles.headerIcon}>📋</div>
          <div className={styles.headerTexts}>
            <h3 className={styles.headerTitle}>Exam Instructions</h3>
            <p className={styles.headerSubtitle}>Step {Math.min(current + 1, totalSteps)} — Please review these rules carefully</p>
          </div>
        </div>

        <div className={styles.contentArea}>
          {current < groups.length ? (
            <div className={`${styles.stepContent} ${styles.enter}`} key={current}>
              {groups[current].map((ins, i) => (
                <div className={styles.instructionRow} key={i}>
                  <div className={styles.iconWrap}>{ins.icon}</div>
                  <div className={styles.textWrap}>
                    <div className={styles.insTitle}>{ins.title}</div>
                    <div className={styles.insDesc}>{ins.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`${styles.stepContent} ${styles.enter}`} key="final">
              <p className={styles.finalText}>
                You must agree to the instructions and share your entire screen before beginning the exam. Exiting full screen or stopping screen share may auto-submit your exam.
              </p>

              <label className={styles.checkboxRow}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                <span>I have read and understood all the instructions</span>
              </label>
            </div>
          )}
        </div>

        <NavigationButtons
          isFirst={current === 0}
          isLast={current === totalSteps - 1}
          onPrev={goPrev}
          onNext={goNext}
          disabledNext={!agreed}
          onBegin={handleBegin}
        />
      </InstructionCard>

      <StepIndicator total={totalSteps} current={current} />
    </div>
  );
}
