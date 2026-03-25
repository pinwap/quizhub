import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getDataDir() {
  return path.join(process.cwd(), "src", "data");
}

function resolveFilePath(slug: string[]) {
  const dataDir = getDataDir();
  // Basic validation against path traversal
  if (!Array.isArray(slug) || slug.length === 0 || slug.some((s) => s.includes("..") || s.includes("\\"))) {
    return { error: "Invalid path", status: 400 } as const;
  }

  const joined = path.join(dataDir, ...slug);
  const resolved = path.resolve(joined);
  if (!resolved.startsWith(path.resolve(dataDir))) {
    return { error: "Path outside data directory", status: 400 } as const;
  }

  // Accept with or without .json
  let filePath = resolved;
  if (!filePath.endsWith(".json")) {
    filePath = `${resolved}.json`;
  }

  return { filePath } as const;
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  try {
    const params = await ctx.params;
    const res = resolveFilePath(params.slug);
    if ("error" in res) {
      return NextResponse.json({ message: res.error }, { status: res.status });
    }

    if (!fs.existsSync(res.filePath)) {
      return NextResponse.json({ message: "Set not found" }, { status: 404 });
    }

    const content = fs.readFileSync(res.filePath, "utf-8");
    let json: any;
    try {
      json = JSON.parse(content);
    } catch (e) {
      // Return raw content if not valid JSON, but mark it
      return NextResponse.json(
        { message: "File is not valid JSON", raw: content },
        { status: 422 }
      );
    }

    return NextResponse.json({ data: json, path: params.slug.join("/") });
  } catch (error) {
    console.error("Error reading set:", error);
    return NextResponse.json({ message: "Failed to read set" }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  try {
    const params = await ctx.params;
    const res = resolveFilePath(params.slug);
    if ("error" in res) {
      return NextResponse.json({ message: res.error }, { status: res.status });
    }

    if (!fs.existsSync(res.filePath)) {
      return NextResponse.json({ message: "Set not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => undefined);
    if (!body || typeof body !== "object" || !("data" in body)) {
      return NextResponse.json(
        { message: "Request body must be JSON with a 'data' field" },
        { status: 400 }
      );
    }

    // Validate that data is serializable JSON
    let toWrite: string;
    try {
      toWrite = JSON.stringify((body as any).data, null, 2);
    } catch {
      return NextResponse.json(
        { message: "Provided data is not valid JSON" },
        { status: 400 }
      );
    }

    fs.writeFileSync(res.filePath, toWrite, "utf-8");
    return NextResponse.json({ message: "Set updated successfully" });
  } catch (error) {
    console.error("Error updating set:", error);
    return NextResponse.json({ message: "Failed to update set" }, { status: 500 });
  }
}
