import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "家計簿くん",
    short_name: "家計簿くん",
    description: "家族で使うためのブラウザ家計簿アプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f8",
    theme_color: "#245f8b",
    lang: "ja",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
