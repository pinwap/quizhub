import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getImageRoot() {
  return path.join(process.cwd(), "src", "data", "image");
}

function safeResolve(slug: string[]) {
  if (!Array.isArray(slug) || slug.length === 0) return { error: "Invalid path", status: 400 } as const;
  if (slug.some((s) => s.includes("..") || s.includes("\\"))) return { error: "Invalid path", status: 400 } as const;
  const root = getImageRoot();
  const targetDir = path.resolve(path.join(root, ...slug));
  if (!targetDir.startsWith(path.resolve(root))) return { error: "Out of bounds", status: 400 } as const;
  return { root, targetDir } as const;
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  try {
    const params = await ctx.params;
    const res = safeResolve(params.slug);
    if ("error" in res) return NextResponse.json({ message: res.error }, { status: res.status });

    if (!fs.existsSync(res.targetDir)) {
      return NextResponse.json({ images: [] });
    }

    const files = fs.readdirSync(res.targetDir).filter((f) => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f));
    // Provide simple relative URLs that can be fetched via a separate static route in the future; for now return a file listing
    return NextResponse.json({ images: files.map((f) => ({ name: f })) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Failed to list images" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  try {
    const params = await ctx.params;
    const res = safeResolve(params.slug);
    if ("error" in res) return NextResponse.json({ message: res.error }, { status: res.status });

    const form = await req.formData();
    const file = form.get("file");
    // Check if file exists and looks like a file object (has arrayBuffer method)
    if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await (file as any).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!fs.existsSync(res.targetDir)) fs.mkdirSync(res.targetDir, { recursive: true });

    // Sanitize file name
    const fileName = (file as any).name || "uploaded_image";
    const base = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const savePath = path.join(res.targetDir, base);
    fs.writeFileSync(savePath, buffer);

    // Return stored name; retrieval will be via a simple passthrough endpoint we can add later
    return NextResponse.json({ message: "Uploaded", file: base });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Failed to upload" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  try {
    const params = await ctx.params;
    const segments = params.slug || [];
    const res = safeResolve(segments);
    if ("error" in res) return NextResponse.json({ message: res.error }, { status: res.status });

    // Expect a file path (not just a folder)
    if (!fs.existsSync(res.targetDir)) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    const stat = fs.statSync(res.targetDir);
    if (stat.isDirectory()) {
      return NextResponse.json({ message: "Provide a file path to delete" }, { status: 400 });
    }

    fs.unlinkSync(res.targetDir);
    return NextResponse.json({ message: "Deleted" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Failed to delete" }, { status: 500 });
  }
}
