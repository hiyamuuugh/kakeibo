import { ImageResponse } from "next/og";

export const renderPwaIcon = (size: number) =>
  new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #16a34a 0%, #22c55e 52%, #86efac 100%)",
          color: "#ffffff",
          fontSize: size * 0.42,
          fontWeight: 800,
          letterSpacing: 0,
        }}
      >
        ¥
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
