import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/favicon
 * Serves the favicon from the database (base64) or falls back to
 * the default SVG favicon in public/favicon.svg.
 *
 * Response: image binary with correct Content-Type header.
 */
export async function GET() {
  try {
    // Try to get custom favicon from database
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: "default" },
      select: { favicon: true },
    });

    if (restaurant?.favicon) {
      // Parse the base64 data URI: "data:<mime>;base64,<data>"
      const matches = restaurant.favicon.match(/^data:(.+);base64,(.+)$/);

      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        });
      }
    }

    // Fallback: serve default SVG favicon from public/
    const defaultFaviconPath = join(process.cwd(), "public", "favicon.svg");
    const svgContent = readFileSync(defaultFaviconPath, "utf-8");

    return new NextResponse(svgContent, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Error serving favicon:", error);
    // Return a minimal 1x1 transparent PNG as ultimate fallback
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB" +
        "Nl7BcQAAAABJRU5ErkJggg==",
      "base64",
    );
    return new NextResponse(pixel, {
      status: 200,
      headers: { "Content-Type": "image/png" },
    });
  }
}
