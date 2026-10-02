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
          background: "#0f172a",
          color: "#ffffff",
          fontSize: size * 0.3,
          fontWeight: 700,
          letterSpacing: 0,
        }}
      >
        K
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
