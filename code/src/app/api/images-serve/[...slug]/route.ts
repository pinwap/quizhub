import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getImageRoot() {
  return path.join(process.cwd(), "src", "data", "image");
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  try {
    const params = await ctx.params;
    const slug = params.slug || [];
    if (!Array.isArray(slug) || slug.length === 0) {
      return NextResponse.json({ message: "Invalid path" }, { status: 400 });
    }
    if (slug.some((s) => s.includes("..") || s.includes("\\"))) {
      return NextResponse.json({ message: "Invalid path" }, { status: 400 });
    }
    const root = getImageRoot();
    const filePath = path.resolve(path.join(root, ...slug));
    if (!filePath.startsWith(path.resolve(root))) {
      return NextResponse.json({ message: "Out of bounds" }, { status: 400 });
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const file = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" :
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      ext === ".gif" ? "image/gif" :
      ext === ".webp" ? "image/webp" :
      ext === ".svg" ? "image/svg+xml" : "application/octet-stream";

    return new NextResponse(file, { headers: { "Content-Type": contentType } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Failed to read image" }, { status: 500 });
  }
}
