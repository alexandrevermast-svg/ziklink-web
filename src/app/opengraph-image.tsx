import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/site";

export const alt = "ZikLink";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0E0B16",
          backgroundImage:
            "radial-gradient(circle at 25% 20%, rgba(192,132,252,0.25), transparent 55%), radial-gradient(circle at 80% 80%, rgba(129,140,248,0.25), transparent 55%)",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 120,
            fontWeight: 700,
            backgroundImage: "linear-gradient(90deg, #C084FC, #818CF8)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          ZikLink
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            padding: "0 100px",
            fontSize: 34,
            textAlign: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    { ...size }
  );
}
