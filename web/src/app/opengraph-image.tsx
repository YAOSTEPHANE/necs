import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "NECS SARL — Nettoyage professionnel au Cameroun · Yaoundé · Douala";
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
          padding: "56px 64px",
          background:
            "linear-gradient(135deg, #061f3f 0%, #0a3a72 50%, #1260a8 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              opacity: 0.92,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 999,
                background: "#4faf2a",
              }}
            />
            NECLEANING &amp; SERVICES SARL
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              padding: "8px 18px",
              borderRadius: 8,
              background: "rgba(79,175,42,0.25)",
              border: "1px solid rgba(79,175,42,0.55)",
              color: "#bbf7d0",
            }}
          >
            Cameroun
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              fontSize: 78,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            NECS
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 600,
              maxWidth: 980,
              lineHeight: 1.25,
              color: "#e0f2fe",
            }}
          >
            Nettoyage professionnel &amp; facility services
          </div>
          <div style={{ fontSize: 26, color: "#bae6fd", maxWidth: 920 }}>
            Entreprise basée au Cameroun — Yaoundé · Douala · environs
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#7dd3fc",
          }}
        >
          <span>Propreté · Rigueur · Confiance</span>
          <span>+237 641 33 55 53</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
