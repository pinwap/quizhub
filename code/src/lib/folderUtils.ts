export type FolderFile = {
  name: string;
  path?: string;
  fullPath?: string;
};

export type FolderData = {
  name: string;
  files: FolderFile[];
  children?: FolderData[];
};

/** Recursively count all JSON files under the given folder nodes. */
export function countAllFiles(folders: FolderData[]): number {
  let count = 0;
  for (const folder of folders) {
    count += folder.files.length;
    if (folder.children && folder.children.length > 0) {
      count += countAllFiles(folder.children);
    }
  }
  return count;
}

/** Collect all file names under a root folder with the given name. */
export function collectAllFiles(
  folders: FolderData[],
  folderName: string
): string[] {
  const result: string[] = [];
  const collectFromFolder = (f: FolderData): string[] => {
    const files = f.files.map((file) => file.name);
    for (const child of f.children || []) {
      files.push(...collectFromFolder(child));
    }
    return files;
  };
  for (const folder of folders) {
    if (folder.name === folderName) {
      result.push(...collectFromFolder(folder));
    }
  }
  return result;
}
