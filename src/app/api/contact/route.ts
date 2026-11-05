// Maximum allowable request body size: 32 KB
const MAX_BODY_BYTES = 32 * 1024;

// Email regex adhering to standard RFC 5322 simplified pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * In-memory rate limiter per client IP.
 * NOTE: In-memory rate limiting is best-effort on serverless/edge environments
 * because serverless instances may scale horizontally or restart between requests.
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_REQUESTS = 5; // Max 5 requests per 10 minutes per IP
const ipRateLimitMap = new Map<string, RateLimitRecord>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = ipRateLimitMap.get(ip);

  // Clean up expired entries periodically if map grows large
  if (ipRateLimitMap.size > 1000) {
    for (const [key, val] of ipRateLimitMap.entries()) {
      if (now > val.resetTime) {
        ipRateLimitMap.delete(key);
      }
    }
  }

  if (!record || now > record.resetTime) {
    ipRateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  record.count += 1;
  return false;
}

export async function POST(req: Request) {
  try {
    // 1. Enforce Max Body Size via Content-Length header if present
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return Response.json(
        { error: "Payload too large. Maximum size is 32 KB." },
        { status: 413 }
      );
    }

    // 2. Best-effort Client IP Extraction & Rate Limiting
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "unknown-ip";

    if (clientIp !== "unknown-ip" && isRateLimited(clientIp)) {
      return Response.json(
        { error: "Too many messages sent. Please wait a few minutes before trying again." },
        { status: 429 }
      );
    }

    // 3. Read and enforce raw text size
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return Response.json(
        { error: "Payload too large. Maximum size is 32 KB." },
        { status: 413 }
      );
    }

    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return Response.json(
        { error: "Malformed JSON payload." },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      message,
      company: honeypot,
      durationMs,
    } = parsedBody;

    // 4. Honeypot check: if filled, reject silently with generic success response
    if (typeof honeypot === "string" && honeypot.trim().length > 0) {
      return Response.json({ success: true });
    }

    // 5. Time-to-fill check: if submitted in under 3 seconds, reject silently with generic success response
    if (typeof durationMs === "number" && durationMs < 3000) {
      return Response.json({ success: true });
    }

    // 6. Strict validation on required fields
    if (typeof name !== "string" || name.trim().length === 0 || name.trim().length > 80) {
      return Response.json(
        { error: "Name is required and must be between 1 and 80 characters." },
        { status: 400 }
      );
    }

    if (
      typeof email !== "string" ||
      email.trim().length === 0 ||
      email.trim().length > 120 ||
      !EMAIL_REGEX.test(email.trim())
    ) {
      return Response.json(
        { error: "A valid email address is required (maximum 120 characters)." },
        { status: 400 }
      );
    }

    if (
      typeof message !== "string" ||
      message.trim().length < 10 ||
      message.trim().length > 2000
    ) {
      return Response.json(
        { error: "Message is required and must be between 10 and 2,000 characters." },
        { status: 400 }
      );
    }

    // 7. Read environment variables from process.env ONLY
    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.CONTACT_TO_EMAIL;
    const fromEmail = process.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev";

    if (!apiKey || !toEmail) {
      // Server-side log only: never log message body, secrets, or recipient email
      console.error(
        "Contact API Error: Missing environment variables (RESEND_API_KEY or CONTACT_TO_EMAIL)."
      );
      return Response.json(
        { error: "Contact delivery is currently unavailable. Please reach out via GitHub." },
        { status: 500 }
      );
    }

    // 8. Transactional email dispatch via Resend REST API (native fetch, no SDK)
    const sanitizedName = name.trim();
    const sanitizedEmail = email.trim();
    const sanitizedMessage = message.trim();

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: sanitizedEmail,
        subject: `[Portfolio Contact] Scenario Inquiry from ${sanitizedName}`,
        text: `Sender Name: ${sanitizedName}\nSender Email: ${sanitizedEmail}\n\nMessage:\n${sanitizedMessage}`,
      }),
    });

    if (!emailResponse.ok) {
      // Log failure status code only (no message bodies or secrets)
      console.error(
        "Contact API Error: Resend API request failed with HTTP status",
        emailResponse.status
      );
      return Response.json(
        { error: "Failed to send message. Please try again later or reach out via GitHub." },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch {
    // Log unexpected errors generically without sensitive data
    console.error("Contact API Error: Unexpected internal error encountered during processing.");
    return Response.json(
      { error: "An unexpected error occurred. Please try again later or reach out via GitHub." },
      { status: 500 }
    );
  }
}
