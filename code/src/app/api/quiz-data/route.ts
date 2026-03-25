import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ message: "path is required" }, { status: 400 });
  }

  // Prevent directory traversal
  const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = path.join(process.cwd(), "src", "data", `${normalized}.json`);

  // Ensure the resolved path stays within src/data
  const dataRoot = path.join(process.cwd(), "src", "data");
  if (!absolutePath.startsWith(dataRoot)) {
    return NextResponse.json({ message: "Invalid path" }, { status: 403 });
  }

  try {
    const content = fs.readFileSync(absolutePath, "utf-8");
    return new NextResponse(content, {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }
}
