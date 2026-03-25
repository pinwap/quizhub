"use client";
import React, { memo } from "react";
import Link from "next/link";
import { FileText, Folder, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { countAllFiles, type FolderData } from "@/lib/folderUtils";

type FolderItemProps = {
  folder: FolderData;
  basePath?: string;
  isRandom?: boolean;
  expandedFolders: Set<string>;
  onToggle: (path: string) => void;
};

const FolderItem = memo(function FolderItem({
  folder,
  basePath = "",
  isRandom = false,
  expandedFolders,
  onToggle,
}: FolderItemProps) {
  const folderPath = basePath ? `${basePath}/${folder.name}` : folder.name;
  const isExpanded = expandedFolders.has(folderPath);
  const hasChildren = (folder.children?.length ?? 0) > 0;
  const hasFiles = (folder.files?.length ?? 0) > 0;
  const deepCount = countAllFiles([folder]);

  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        onClick={() => onToggle(folderPath)}
        className="w-full justify-start gap-2 h-auto py-2.5 px-3 font-normal hover:bg-accent"
        aria-expanded={isExpanded}
      >
        {hasChildren || hasFiles ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )
        ) : (
          <ChevronRight className="h-4 w-4 opacity-0 shrink-0" />
        )}
        <Folder
          className={cn(
            "h-4 w-4 shrink-0",
            isExpanded ? "text-primary" : "text-muted-foreground"
          )}
        />
        <span className="font-medium text-sm">{folder.name}</span>
        {(hasChildren || hasFiles) && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {deepCount}
          </Badge>
        )}
      </Button>

      {isExpanded && (
        <div className="ml-8 space-y-1 border-l border-border pl-3">
          {folder.files.map((file) => {
            const trimmedPath = isRandom
              ? (file.path || "").replace(/^random\//, "")
              : (file.path || "").replace(/^no-random\//, "");
            const href = isRandom
              ? `/quiz/random/${trimmedPath}`
              : `/quiz/${trimmedPath}`;
            return (
              <Link
                key={file.name}
                href={href}
                className="group flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{file.name}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}

          {folder.children?.map((child) => (
            <FolderItem
              key={child.name}
              folder={child}
              basePath={folderPath}
              isRandom={isRandom}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default FolderItem;
