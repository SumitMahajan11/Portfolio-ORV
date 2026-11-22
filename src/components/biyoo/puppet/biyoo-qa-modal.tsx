'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { searchBiyooKb, kbEntries, type BiyooQaResult, type BiyooKbEntry } from './biyoo-qa-matcher';

export interface BiyooQaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpressionChange: (expression: 'curious' | 'happy' | 'confused' | 'neutral') => void;
  triggerElement?: HTMLElement | null;
}

const DEFAULT_SUGGESTED_QUESTIONS = [
  'Who is Sumit?',
  'What is Ratify?',
  'How does iac-verifier work?',
  'Where are the receipts?',
];

export function BiyooQaModal({
  isOpen,
  onClose,
  onExpressionChange,
  triggerElement,
}: BiyooQaModalProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<BiyooQaResult | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setHasInteracted(false);
      const t = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Handle Close and return focus
  const handleClose = useCallback(() => {
    onExpressionChange('neutral');
    onClose();
    if (triggerElement && typeof triggerElement.focus === 'function') {
      setTimeout(() => {
        triggerElement.focus();
      }, 10);
    }
  }, [onClose, onExpressionChange, triggerElement]);

  // Execute Question Search
  const handleAsk = useCallback(
    (questionText: string) => {
      const q = questionText.trim();
      if (!q) return;

      const searchRes = searchBiyooKb(q);
      setResult(searchRes);
      setHasInteracted(true);

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[BiyooQA]', q, 'score:', searchRes.score, 'matched:', searchRes.matched);
      }

      if (searchRes.matched) {
        onExpressionChange('happy');
      } else {
        onExpressionChange('confused');
      }
    },
    [onExpressionChange]
  );

  // Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(query);
  };

  // Direct exact-lookup answer on chip click
  const handleChipClick = (questionText: string, exactEntry?: BiyooKbEntry) => {
    setQuery(questionText);
    if (exactEntry) {
      setResult({
        matched: true,
        score: 5.0,
        secondScore: 0.0,
        coverage: 1.0,
        reason: 'matched',
        entry: exactEntry,
        answer: exactEntry.answer,
        sourceLabel: exactEntry.sourceLabel,
        sourceHref: exactEntry.sourceHref,
      });
      setHasInteracted(true);
      onExpressionChange('happy');
    } else {
      // Find matching entry from default questions
      const found = kbEntries.find(e => e.questions.includes(questionText));
      if (found) {
        setResult({
          matched: true,
          score: 5.0,
          secondScore: 0.0,
          coverage: 1.0,
          reason: 'matched',
          entry: found,
          answer: found.answer,
          sourceLabel: found.sourceLabel,
          sourceHref: found.sourceHref,
        });
        setHasInteracted(true);
        onExpressionChange('happy');
      } else {
        handleAsk(questionText);
      }
    }
  };

  // Input change triggers "curious" expression
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onExpressionChange('curious');
  };

  // Keyboard navigation & Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Outside click/tap to close
  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e: Event) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        modalRef.current &&
        !modalRef.current.contains(target) &&
        (!triggerElement || !triggerElement.contains(target))
      ) {
        handleClose();
      }
    };

    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('click', handleOutside);

    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('click', handleOutside);
    };
  }, [isOpen, handleClose, triggerElement]);

  if (!isOpen) return null;

  // Determine which chips to show
  const isAnswerShowing = Boolean(result && result.matched);
  const isFallback = Boolean(result && !result.matched);

  const fallbackChips = result?.fallbackChips && result.fallbackChips.length > 0
    ? result.fallbackChips
    : null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="biyoo-qa-title"
      data-testid="biyoo-qa-panel"
      className="biyoo-qa-panel-dock pointer-events-auto select-none rounded-xl bg-[#070e1d]/95 backdrop-blur-md border border-cyan-500/40 shadow-2xl p-3 sm:p-4 text-slate-100 font-sans transition-all duration-200"
    >
      {/* Corner HUD Ticks */}
      <span className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t-2 border-l-2 border-cyan-400" aria-hidden="true" />
      <span className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t-2 border-r-2 border-cyan-400" aria-hidden="true" />
      <span className="absolute -bottom-[1px] -left-[1px] w-2 h-2 border-b-2 border-l-2 border-cyan-400" aria-hidden="true" />
      <span className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b-2 border-r-2 border-cyan-400" aria-hidden="true" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h2 id="biyoo-qa-title" className="text-xs font-mono tracking-wider uppercase text-cyan-300 font-semibold">
            Ask Biyoo <span className="text-[10px] text-white/50 lowercase">[dokbi archivist]</span>
          </h2>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={handleClose}
          aria-label="Close question dialog"
          className="text-white/60 hover:text-cyan-300 p-1 rounded hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-400"
        >
          <span className="text-sm font-bold leading-none block">✕</span>
        </button>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-2.5">
        <label htmlFor="biyoo-question-input" className="sr-only">
          Ask Biyoo a question
        </label>
        <div className="relative flex items-center">
          <input
            id="biyoo-question-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Ask about Ratify, Z3, tech, or Sumit..."
            aria-label="Ask Biyoo a question"
            data-testid="biyoo-qa-input"
            className="w-full bg-[#0a1428] border border-cyan-500/30 rounded-lg px-3 py-1.5 pr-8 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-sans tracking-wide"
          />
          <button
            type="submit"
            aria-label="Submit question"
            className="absolute right-1 text-cyan-400 hover:text-cyan-200 p-1 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-400"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </form>

      {/* Suggested Question Chips: Collapsed while an answer is showing to ensure first 3 lines are visible */}
      {!isAnswerShowing && (
        <div className="mt-2" data-testid="biyoo-qa-chips">
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-1">
            {isFallback && fallbackChips ? 'Related Questions' : 'Suggested Questions'}
          </div>
          <div className="flex flex-wrap gap-1">
            {isFallback && fallbackChips ? (
              fallbackChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  data-testid="biyoo-qa-chip"
                  onClick={() => handleChipClick(chip.label, chip.entry)}
                  className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 hover:border-cyan-400/60 text-cyan-200 hover:text-cyan-100 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-400 text-left"
                >
                  {chip.label}
                </button>
              ))
            ) : (
              DEFAULT_SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  data-testid="biyoo-qa-chip"
                  onClick={() => handleChipClick(q)}
                  className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/50 text-cyan-200/90 hover:text-cyan-100 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-400 text-left"
                >
                  {q}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Answer Display */}
      {hasInteracted && result && (
        <div
          data-testid="biyoo-qa-answer"
          className={`mt-2.5 p-2.5 rounded-lg border text-xs leading-relaxed transition-all ${
            result.matched
              ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-100'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider uppercase">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  result.matched ? 'bg-cyan-400' : 'bg-amber-400'
                }`}
              />
              <span className={result.matched ? 'text-cyan-300 font-semibold' : 'text-amber-300 font-semibold'}>
                {result.matched ? 'Archivist Answer' : 'No Direct Receipt'}
              </span>
            </div>
            {isAnswerShowing && (
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setQuery('');
                  onExpressionChange('curious');
                }}
                className="text-[10px] font-mono text-cyan-300/70 hover:text-cyan-200 underline"
              >
                ask another
              </button>
            )}
          </div>

          {/* Plain text answer - strictly safe string rendering */}
          <p className="mt-1 font-sans text-xs break-words">
            {result.answer}
          </p>

          {/* Source Link */}
          <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between">
            <a
              href={result.sourceHref}
              onClick={handleClose}
              className="text-[11px] font-mono text-cyan-300 hover:text-cyan-100 underline decoration-cyan-400/50 hover:decoration-cyan-300 inline-flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded"
            >
              <span>{result.sourceLabel}</span>
              <span>&rarr;</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default BiyooQaModal;
