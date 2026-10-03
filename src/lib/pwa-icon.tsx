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
          background: "#ffffff",
        }}
      >
        <svg width="82%" height="82%" viewBox="0 0 512 512" fill="none">
          <path
            d="M102 292c0-78 65-141 145-141h74c76 0 137 59 137 132v39c0 67-54 121-121 121H211c-60 0-109-49-109-109v-42Z"
            fill="#fff"
            stroke="#111"
            strokeWidth="18"
            strokeLinejoin="round"
          />
          <path
            d="M105 297c-45-6-72 19-72 55 0 36 31 57 78 48M422 320c45-7 67 13 67 42 0 30-26 47-67 40"
            stroke="#111"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path d="M166 174 139 112l58 30 45-52 20 71" fill="#111" />
          <path d="M276 149c-2-51 29-82 67-82s65 31 62 82" fill="#fff" stroke="#111" strokeWidth="18" />
          <path d="M304 104h73" stroke="#111" strokeWidth="16" strokeLinecap="round" />
          <circle cx="202" cy="260" r="13" fill="#111" />
          <path d="M119 304c-1-18 14-32 34-32h23c20 0 35 14 34 32-1 17-14 29-34 29h-23c-20 0-33-12-34-29Z" fill="#111" />
          <circle cx="142" cy="303" r="5" fill="#fff" />
          <circle cx="177" cy="303" r="5" fill="#fff" />
          <path d="M248 337c18 17 45 17 63 0" stroke="#111" strokeWidth="12" strokeLinecap="round" />
          <path d="M250 151h75" stroke="#111" strokeWidth="16" strokeLinecap="round" />
          <path d="M174 423v35M357 423v35" stroke="#111" strokeWidth="18" strokeLinecap="round" />
          <circle cx="350" cy="111" r="9" fill="#111" />
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
