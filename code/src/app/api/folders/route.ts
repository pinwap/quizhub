import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import fs from "fs";
import path from "path";

const scanDirectory = (dirPath: string, relativePath: string = ""): any => {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      const result: any = {
        name: path.basename(dirPath),
        path: relativePath,
        type: "folder",
        children: [],
        files: [],
      };
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        const itemRelativePath = relativePath
          ? `${relativePath}/${item.name}`
          : item.name;
        if (item.isDirectory()) {
          result.children.push(scanDirectory(itemPath, itemRelativePath));
        } else if (item.name.endsWith(".json")) {
          result.files.push({
            name: item.name.replace(".json", ""),
            path: itemRelativePath.replace(".json", ""),
            fullPath: itemRelativePath,
          });
        }
      }
      return result;
    };

const getFolders = unstable_cache(
  async () => {
    const dataPath = path.join(process.cwd(), "src", "data");
    const rootItems = fs.readdirSync(dataPath, { withFileTypes: true });
    const folders = [];
    for (const item of rootItems) {
      if (item.isDirectory()) {
        const folderPath = path.join(dataPath, item.name);
        folders.push(scanDirectory(folderPath, item.name));
      }
    }
    return folders;
  },
  ["folders"],
  { revalidate: 60 }
);

export async function GET() {
  try {
    const folders = await getFolders();
    return NextResponse.json(
      { folders },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("Error reading folders:", error);
    return NextResponse.json(
      { message: "Failed to read folders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { message: "Folder name is required" },
        { status: 400 }
      );
    }

    const sanitizedName = name.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

    if (sanitizedName !== name.trim()) {
      return NextResponse.json(
        { message: "Folder name contains invalid characters. Use only letters, numbers, hyphens, and underscores." },
        { status: 400 }
      );
    }

    const dataPath = path.join(process.cwd(), "src", "data");
    const folderPath = path.join(dataPath, sanitizedName);

    // Check if folder already exists
    if (fs.existsSync(folderPath)) {
      return NextResponse.json(
        { message: "Folder already exists" },
        { status: 400 }
      );
    }

    // Create the folder
    fs.mkdirSync(folderPath, { recursive: true });

    return NextResponse.json({
      message: "Folder created successfully",
      folder: {
        name: sanitizedName,
        path: sanitizedName,
        fileCount: 0,
        files: []
      }
    });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json(
      { message: "Failed to create folder" },
      { status: 500 }
    );
  }
}
