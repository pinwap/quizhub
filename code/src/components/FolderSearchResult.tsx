"use client";
import React from "react";
import Link from "next/link";
import {
  FileText,
  Play,
  Edit,
  Trash2,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FileEntry = {
  name: string;
  path: string;
  parentPath: string;
  score?: number;
};

type Props = {
  item: FileEntry;
  /** Called when the row body is clicked — triggers sidebar auto-expand */
  onSelect: (filePath: string, parentPath: string) => void;
  deleting: string | null;
  onDelete: (path: string, name: string) => void;
  highlighted?: boolean;
};

/**
 * A search-result row that shows the file name + its folder breadcrumb.
 * Clicking the row body calls `onSelect`, which auto-expands the sidebar tree
 * to reveal the file and navigates the main panel to the parent folder.
 */
export function FolderSearchResult({
  item,
  onSelect,
  deleting,
  onDelete,
  highlighted = false,
}: Props) {
  // Build display breadcrumb — drop the leading "random" segment
  const pathParts = item.parentPath.split("/").filter(Boolean).slice(1);

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_72px_110px_180px] items-center px-4 py-3 border-b border-border transition-colors group cursor-pointer",
        highlighted
          ? "bg-primary/8 border-l-2 border-l-primary hover:bg-primary/12"
          : "hover:bg-accent/25",
      )}
      onClick={() => onSelect(item.path, item.parentPath)}
    >
      {/* ── Name + path breadcrumb ── */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <span className="text-sm font-medium truncate">
            {item.name.replace(/\.json$/, "")}
          </span>
        </div>

        {pathParts.length > 0 && (
          <div className="flex items-center gap-0.5 pl-6 overflow-hidden">
            <FolderOpen className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
            {pathParts.map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
                )}
                <span className="text-[10px] text-muted-foreground/50 font-medium truncate">
                  {part}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* ── Type badge ── */}
      <div>
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 font-mono tracking-wide"
        >
          JSON
        </Badge>
      </div>

      {/* ── Status ── */}
      <div>
        <Badge className="text-[10px] px-2 py-0 h-5 bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
          Ready
        </Badge>
      </div>

      {/* ── Actions — stop propagation so row-click doesn't fire ── */}
      <div
        className="flex items-center gap-1.5 justify-end"
        onClick={(e) => e.stopPropagation()}
      >
        <Link href={`/quiz/${encodeURI(item.path)}`}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
            title="Start quiz"
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
        </Link>

        <Link href={`/sets/edit/${encodeURI(item.path)}`}>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Edit className="h-3 w-3" />}
            className="h-7 px-2 text-xs"
          >
            Edit
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(item.path, item.name)}
          loading={deleting === item.path}
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          title="Delete"
        >
          {deleting !== item.path && <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
