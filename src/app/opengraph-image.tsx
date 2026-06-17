import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { siteName, siteSlogan } from "@/lib/site";

export const alt = `${siteName} - ${siteSlogan}`;
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image() {
  const apeBytes = await readFile(join(process.cwd(), "public", "ape-game.png"));
  const apeSrc = `data:image/png;base64,${Buffer.from(apeBytes).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f4f1e8",
          color: "#0b0b0b",
          display: "flex",
          fontFamily: "Arial, Helvetica, sans-serif",
          height: "100%",
          justifyContent: "center",
          width: "100%"
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 54,
            justifyContent: "center",
            width: 980
          }}
        >
          <img
            alt=""
            height={300}
            src={apeSrc}
            style={{ objectFit: "contain" }}
            width={300}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div
              style={{
                fontSize: 72,
                fontWeight: 900,
                letterSpacing: 0,
                lineHeight: 0.95
              }}
            >
              {siteName}
            </div>
            <div
              style={{
                color: "#68645b",
                fontSize: 36,
                fontWeight: 800,
                lineHeight: 1.12,
                maxWidth: 520
              }}
            >
              {siteSlogan}
            </div>
            <div
              style={{
                border: "5px solid #0b0b0b",
                display: "flex",
                fontSize: 26,
                fontWeight: 900,
                justifyContent: "center",
                padding: "16px 22px",
                textTransform: "uppercase",
                width: 390
              }}
            >
              Free browser word game
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
