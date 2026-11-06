import { ImageResponse } from "next/og";
import { identity } from "@/content";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#07080B",
          color: "#F4F6FA",
          fontFamily: "sans-serif",
          border: "2px solid #243044",
          position: "relative",
        }}
      >
        {/* Subtle Constellation Glow */}
        <div
          style={{
            position: "absolute",
            top: "-150px",
            right: "-150px",
            width: "500px",
            height: "500px",
            borderRadius: "250px",
            background: "radial-gradient(circle, rgba(94,225,230,0.12) 0%, rgba(7,8,11,0) 70%)",
          }}
        />

        {/* Top Header Tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          {/* Star Motif */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 16 2 L 18.5 13.5 L 30 16 L 18.5 18.5 L 16 30 L 13.5 18.5 L 2 16 L 13.5 13.5 Z"
              fill="#5EE1E6"
            />
            <circle cx="16" cy="16" r="3" fill="#FFFFFF" />
          </svg>
          <span
            style={{
              fontSize: "18px",
              fontFamily: "monospace",
              letterSpacing: "0.2em",
              color: "#5EE1E6",
              textTransform: "uppercase",
            }}
          >
            [IDENTITY ARCHIVE // VERIFIED]
          </span>
        </div>

        {/* Center Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <h1
            style={{
              fontSize: "68px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#F4F6FA",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {identity.name}
          </h1>
          <p
            style={{
              fontSize: "26px",
              color: "#5EE1E6",
              margin: 0,
              maxWidth: "960px",
              lineHeight: 1.4,
            }}
          >
            {identity.degree}, {identity.institution}, {identity.city}
          </p>
          <p
            style={{
              fontSize: "22px",
              color: "#9AA7BD",
              margin: 0,
              maxWidth: "960px",
              lineHeight: 1.4,
            }}
          >
            Graduating {identity.graduation} • Targeting: {identity.targeting}
          </p>
        </div>

        {/* Bottom Metadata */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #243044",
            paddingTop: "24px",
          }}
        >
          <span
            style={{
              fontSize: "18px",
              color: "#9AA7BD",
            }}
          >
            Public Portfolio
          </span>
          <span
            style={{
              fontSize: "18px",
              fontFamily: "monospace",
              color: "#5EE1E6",
            }}
          >
            github.com/{identity.github}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
