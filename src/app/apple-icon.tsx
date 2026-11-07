import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07080B",
          borderRadius: "40px",
          border: "4px solid #243044",
        }}
      >
        <svg
          width="130"
          height="130"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left Horn */}
          <path
            d="M 12 18 C 10 14, 8 10, 6 7 C 8 10, 11 14, 13 16 Z"
            fill="#2A0A10"
            stroke="#B3122B"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
          {/* Right Horn */}
          <path
            d="M 20 18 C 22 14, 24 10, 26 7 C 24 10, 21 14, 19 16 Z"
            fill="#2A0A10"
            stroke="#B3122B"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
          {/* Constellation Star Motif */}
          <path
            d="M 16 9 L 17.5 14.5 L 23 16 L 17.5 17.5 L 16 23 L 14.5 17.5 L 9 16 L 14.5 14.5 Z"
            fill="#5EE1E6"
          />
          <circle cx="16" cy="16" r="1.5" fill="#FFFFFF" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
