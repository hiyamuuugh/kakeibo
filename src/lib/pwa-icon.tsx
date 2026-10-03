import { ImageResponse } from "next/og";

export const renderPwaIcon = (size: number) =>
  new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            height: "54%",
            width: "72%",
            alignItems: "center",
            justifyContent: "center",
            border: "18px solid #111111",
            borderRadius: "48% 48% 42% 42%",
            background: "#ffffff",
          }}
        >
          <div style={{ position: "absolute", left: "-17%", top: "23%", height: "28%", width: "20%", border: "14px solid #111111", borderRight: "0px", borderRadius: "60% 0 0 60%" }} />
          <div style={{ position: "absolute", right: "-17%", top: "28%", height: "26%", width: "20%", border: "14px solid #111111", borderLeft: "0px", borderRadius: "0 60% 60% 0" }} />
          <div style={{ position: "absolute", left: "13%", top: "-30%", height: "34%", width: "25%", transform: "rotate(-28deg)", border: "16px solid #111111", borderRadius: "80% 20% 20% 20%", background: "#ffffff" }} />
          <div style={{ position: "absolute", right: "13%", top: "-30%", height: "34%", width: "25%", transform: "rotate(28deg)", border: "16px solid #111111", borderRadius: "20% 80% 20% 20%", background: "#ffffff" }} />
          <div style={{ position: "absolute", top: "12%", height: "10%", width: "28%", borderRadius: 12, background: "#111111" }} />
          <div style={{ position: "absolute", left: "25%", top: "37%", height: 22, width: 22, borderRadius: "50%", background: "#111111" }} />
          <div style={{ position: "absolute", left: "-8%", top: "47%", display: "flex", height: "22%", width: "25%", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "#111111" }}>
            <div style={{ height: 10, width: 10, borderRadius: "50%", background: "#ffffff" }} />
          </div>
          <div style={{ position: "absolute", bottom: "17%", height: "12%", width: "25%", borderBottom: "12px solid #111111", borderRadius: "0 0 50% 50%" }} />
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
