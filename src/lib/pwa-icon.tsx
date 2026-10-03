import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ICON_DATA_URL = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public/icon-candidate-monochrome.png")
).toString("base64")}`;

export const renderPwaIcon = (size: number) =>
  new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background: "#ffffff",
        }}
      >
        <img alt="" src={ICON_DATA_URL} width={size} height={size} style={{ objectFit: "cover" }} />
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
