"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { identity } from "@/content";

export type FormStatus = "idle" | "sending" | "success" | "error";

interface ContactFormProps {
  className?: string;
}

export function ContactForm({ className = "" }: ContactFormProps) {
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  // Status and error tracking
  const [status, setStatus] = useState<FormStatus>("idle");
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Time-to-fill tracking (reject if submitted under 3s)
  const mountTimeRef = useRef<number>(0);

  // Focus management refs for accessibility
  const successRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (status === "success" && successRef.current) {
      successRef.current.focus();
    } else if (status === "error" && errorRef.current) {
      errorRef.current.focus();
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;

    setClientError(null);
    setServerError(null);

    // Client-side validation in plain language
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 80) {
      setClientError("Please enter your name (up to 80 characters).");
      nameInputRef.current?.focus();
      return;
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || trimmedEmail.length > 120 || !emailRegex.test(trimmedEmail)) {
      setClientError("Please enter a valid email address so I can reply.");
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage || trimmedMessage.length < 10 || trimmedMessage.length > 2000) {
      setClientError("Please enter a message between 10 and 2,000 characters.");
      return;
    }

    setStatus("sending");

    const durationMs = Date.now() - mountTimeRef.current;

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
          company: honeypot, // Honeypot field
          durationMs,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setStatus("error");
        setServerError(
          data?.error ||
            "Failed to send message. Please try again later or use GitHub."
        );
        return;
      }

      // Success
      setStatus("success");
      // Trigger global Biyoo reaction
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("biyoo:action", {
            detail: {
              state: "happy",
              line: "Message sent. The story continues.",
            },
          })
        );
      }
    } catch {
      setStatus("error");
      setServerError("Network error encountered. Please try again or use GitHub.");
    }
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setMessage("");
    setHoneypot("");
    setStatus("idle");
    setClientError(null);
    setServerError(null);
    mountTimeRef.current = Date.now();
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);
  };

  return (
    <div className={`w-full max-w-xl mx-auto ${className}`}>
      {/* SUCCESS STATE */}
      {status === "success" && (
        <div
          ref={successRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="p-6 sm:p-8 rounded-xl border border-star/50 bg-ink/90 text-center space-y-5 focus:outline-none focus:ring-2 focus:ring-star"
        >
          {/* Biyoo Happy Avatar */}
          <div className="w-16 h-16 mx-auto rounded-full bg-star/10 border border-star/30 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="w-12 h-12 text-star"
              fill="none"
              aria-hidden="true"
            >
              {/* Fluffy body */}
              <circle cx="50" cy="52" r="32" fill="#E2EAF4" />
              {/* Horns */}
              <path d="M 36 28 C 30 20 26 12 24 8 C 30 14 36 22 40 26 Z" fill="#2A0A10" />
              <path d="M 64 28 C 70 20 74 12 76 8 C 70 14 64 22 60 26 Z" fill="#2A0A10" />
              {/* Happy eyes */}
              <path d="M 38 48 Q 42 42 46 48" stroke="#0E1118" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 54 48 Q 58 42 62 48" stroke="#0E1118" strokeWidth="2.5" strokeLinecap="round" />
              {/* Happy smile */}
              <path d="M 46 58 Q 50 64 54 58" stroke="#0E1118" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-xl sm:text-2xl font-bold text-feather tracking-wide">
              Message sent. The story continues.
            </h3>
            <p className="font-ui text-sm text-mist leading-relaxed">
              Your inquiry has been delivered directly to Sumit&apos;s private inbox.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-lg border border-line bg-ink-2 text-feather hover:border-star hover:text-star font-mono text-xs uppercase tracking-wider transition-colors focus:ring-2 focus:ring-star focus:outline-none"
            >
              Send another message &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ERROR STATE MESSAGE (Visible on submission error) */}
      {status === "error" && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          aria-live="polite"
          className="mb-6 p-4 rounded-lg border border-horn/60 bg-horn-dark/40 text-feather text-sm font-ui space-y-2 focus:outline-none focus:ring-2 focus:ring-horn"
        >
          <p className="font-semibold text-horn">
            {serverError || "Could not send message. Please try again or use GitHub."}
          </p>
          <p className="text-xs text-mist">
            You can also connect directly via{" "}
            <a
              href={identity.contact.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-star underline underline-offset-4 hover:text-feather font-mono"
            >
              GitHub (@{identity.github})
            </a>
            .
          </p>
        </div>
      )}

      {/* CLIENT VALIDATION ERROR */}
      {clientError && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 p-3 rounded-lg border border-horn/40 bg-horn-dark/30 text-xs font-ui text-feather text-center"
        >
          {clientError}
        </div>
      )}

      {/* FORM ELEMENT */}
      {status !== "success" && (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5"
          aria-label="Direct contact form"
        >
          {/* Honeypot field (hidden from screen readers & users) */}
          <div aria-hidden="true" className="sr-only">
            <label htmlFor="company">Company</label>
            <input
              type="text"
              id="company"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {/* Name field */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="name"
              className="block font-mono text-xs uppercase tracking-wider text-feather"
            >
              Your name <span className="text-star">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              id="name"
              name="name"
              required
              maxLength={80}
              disabled={status === "sending"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Reader Name"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-line bg-ink/80 text-feather placeholder-mist/40 font-ui text-sm focus:border-star focus:ring-1 focus:ring-star focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Reply-to email field */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="email"
              className="block font-mono text-xs uppercase tracking-wider text-feather"
            >
              Your email <span className="text-star">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              maxLength={120}
              disabled={status === "sending"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reader@domain.com"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-line bg-ink/80 text-feather placeholder-mist/40 font-ui text-sm focus:border-star focus:ring-1 focus:ring-star focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Message field */}
          <div className="space-y-1.5 text-left">
            <div className="flex justify-between items-center">
              <label
                htmlFor="message"
                className="block font-mono text-xs uppercase tracking-wider text-feather"
              >
                Your message <span className="text-star">*</span>
              </label>
              <span className="font-mono text-[10px] text-mist">
                {message.length}/2000
              </span>
            </div>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              minLength={10}
              maxLength={2000}
              disabled={status === "sending"}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your scenario inquiry, feedback, or message..."
              className="w-full min-h-[110px] px-3.5 py-2.5 rounded-lg border border-line bg-ink/80 text-feather placeholder-mist/40 font-ui text-sm focus:border-star focus:ring-1 focus:ring-star focus:outline-none transition-colors disabled:opacity-50 resize-y"
            />
          </div>

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={status === "sending"}
              aria-busy={status === "sending"}
              className="w-full min-h-[44px] px-6 py-3 rounded-lg border border-star/60 bg-star/15 hover:bg-star/25 active:bg-star/30 text-star font-mono text-sm uppercase tracking-wider font-semibold transition-colors focus:ring-2 focus:ring-star focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === "sending" ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-star"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send</span>
              )}
            </button>
          </div>

          {/* Microcopy: Verified truth - no message bodies logged */}
          <p className="font-ui text-xs text-mist/80 text-center leading-relaxed">
            Your message is emailed to Sumit. Nothing else is stored.
          </p>
        </form>
      )}

      {/* MAILTO-FREE FALLBACK CHANNELS */}
      <div className="pt-8 border-t border-line/40 mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-mono text-mist">
        <span className="uppercase tracking-widest text-[11px]">Channels:</span>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={identity.contact.github}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-3.5 py-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink hover:border-star hover:text-feather text-star transition-colors focus:ring-2 focus:ring-star focus:outline-none"
          >
            GitHub (@{identity.github}) &rarr;
          </a>

          {identity.contact.linkedin && (
            <a
              href={identity.contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-3.5 py-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink hover:border-star hover:text-feather text-star transition-colors focus:ring-2 focus:ring-star focus:outline-none"
            >
              LinkedIn &rarr;
            </a>
          )}

          <Link
            href="/skip"
            className="min-h-[44px] px-3.5 py-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink hover:border-star hover:text-feather text-mist transition-colors focus:ring-2 focus:ring-star focus:outline-none"
          >
            Plain Version &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
