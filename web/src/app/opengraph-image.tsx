import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "NECS SARL — Propreté, Rigueur, Confiance";
export const size = { width: 1200, height: 630 };
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
          padding: "64px 72px",
          background: "linear-gradient(135deg, #061f3f 0%, #0a3a72 55%, #1260a8 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            opacity: 0.9,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "#4faf2a",
            }}
          />
          NECLEANING &amp; SERVICES SARL
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            NECS
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
              maxWidth: 900,
              lineHeight: 1.25,
              color: "#e0f2fe",
            }}
          >
            Propreté · Rigueur · Confiance
          </div>
          <div style={{ fontSize: 24, color: "#bae6fd", maxWidth: 880 }}>
            Nettoyage professionnel &amp; facility services au Cameroun
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#7dd3fc",
          }}
        >
          <span>Yaoundé · Douala · environs</span>
          <span>servicesnecs.vercel.app</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
