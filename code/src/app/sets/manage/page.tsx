"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Folder,
  FolderOpen,
  FileText,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Home,
  Plus,
  Play,
} from "lucide-react";
import {
  FolderSearchResult,
  type FileEntry,
} from "@/components/FolderSearchResult";

// ── Fuzzy search ──────────────────────────────────────────────────────────────
function fuzzyScore(str: string, pattern: string): number {
  if (!pattern) return 1;
  const s = str.toLowerCase();
  const p = pattern.toLowerCase();
  if (s.includes(p)) return 1000 + p.length;
  let pi = 0,
    score = 0,
    consec = 0;
  for (let si = 0; si < s.length && pi < p.length; si++) {
    if (s[si] === p[pi]) {
      pi++;
      consec++;
      score += consec * 2;
    } else {
      consec = 0;
    }
  }
  return pi === p.length ? score : -1;
}

type FolderNode = {
  name: string;
  path: string;
  type: "folder";
  children: FolderNode[];
  files: { name: string; path: string; fullPath: string }[];
};

type TableItem =
  | { kind: "folder"; name: string; path: string; childCount: number }
  | { kind: "file"; name: string; path: string };

export default function ManageSetsPage() {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState("random");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["random"]),
  );
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [highlightedFile, setHighlightedFile] = useState<string | null>(null);

  const toggleSidebarFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/folders");
      const data = await res.json();
      setFolders(data.folders || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load folders");
    } finally {
      setLoading(false);
    }
  };

  const getNode = useCallback(
    (path: string): FolderNode | null => {
      if (!path) return null;
      const parts = path.split("/");
      let nodes = folders;
      let current: FolderNode | null = null;
      for (const part of parts) {
        current = nodes.find((n) => n.name === part) || null;
        if (!current) return null;
        nodes = current.children;
      }
      return current;
    },
    [folders],
  );

  // The entire UI is scoped to the "random" top-level folder
  const randomNode = useMemo(
    () => folders.find((f) => f.name === "random") || null,
    [folders],
  );

  const currentItems = useMemo<TableItem[]>(() => {
    const node = getNode(selectedPath);
    if (!node) return [];
    const items: TableItem[] = [];
    for (const c of node.children || []) {
      items.push({
        kind: "folder",
        name: c.name,
        path: c.path,
        childCount: (c.children?.length || 0) + (c.files?.length || 0),
      });
    }
    for (const f of node.files || []) {
      items.push({ kind: "file", name: f.name, path: f.path });
    }
    return items;
  }, [selectedPath, getNode]);

  // Breadcrumb segments are everything after "random/"
  const breadcrumbs = useMemo(() => {
    const parts = selectedPath.split("/");
    return parts.slice(1); // drop "random"
  }, [selectedPath]);

  const navigateTo = (path: string) => {
    setSelectedPath(path);
    setSearch("");
    setHighlightedFile(null);
  };

  // ── Global flat file list for fuzzy search ─────────────────────────────────
  const allFiles = useMemo<FileEntry[]>(() => {
    const result: FileEntry[] = [];
    function collect(node: FolderNode) {
      for (const f of node.files || []) {
        result.push({ name: f.name, path: f.path, parentPath: node.path });
      }
      for (const c of node.children || []) collect(c);
    }
    if (randomNode) collect(randomNode);
    return result;
  }, [randomNode]);

  const searchResults = useMemo<(FileEntry & { score: number })[]>(() => {
    if (!search) return [];
    return allFiles
      .map((f) => ({
        ...f,
        score: fuzzyScore(f.name.replace(/\.json$/, ""), search),
      }))
      .filter((f) => f.score >= 0)
      .sort((a, b) => b.score - a.score);
  }, [allFiles, search]);

  const matchedFilePaths = useMemo(
    () => new Set(searchResults.map((r) => r.path)),
    [searchResults],
  );

  /**
   * Expands every ancestor folder of `filePath` in the sidebar tree,
   * navigates the main panel to `parentPath`, and highlights the file row.
   */
  const expandPathAndNavigate = (filePath: string, parentPath: string) => {
    const parts = parentPath.split("/");
    const newExpanded = new Set(expandedFolders);
    for (let i = 1; i <= parts.length; i++) {
      newExpanded.add(parts.slice(0, i).join("/"));
    }
    setExpandedFolders(newExpanded);
    setHighlightedFile(filePath);
    setSelectedPath(parentPath);
    setSearch("");
  };

  const handleDelete = async (path: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(path);
    try {
      const res = await fetch(`/api/sets/${encodeURI(path)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`"${name}" deleted`);
        loadFolders();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.message || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const renderSidebarNode = (node: FolderNode, depth = 0): React.ReactNode => {
    const isSelected = selectedPath === node.path;
    const isExpanded = expandedFolders.has(node.path);
    const hasChildren =
      (node.children?.length || 0) + (node.files?.length || 0) > 0;
    const indent = depth * 12;
    return (
      <div key={node.path}>
        <div
          style={{ paddingLeft: `${8 + indent}px` }}
          className={cn(
            "flex items-center gap-0.5 pr-1 rounded-md transition-colors",
            isSelected ? "bg-primary/15" : "",
          )}
        >
          {/* Collapse toggle */}
          <button
            onClick={() => toggleSidebarFolder(node.path)}
            className={cn(
              "shrink-0 h-5 w-5 flex items-center justify-center rounded transition-colors text-muted-foreground/50 hover:text-muted-foreground",
              !hasChildren && "invisible",
            )}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>

          {/* Folder name — navigates main panel */}
          <button
            onClick={() => navigateTo(node.path)}
            className={cn(
              "flex-1 flex items-center gap-1.5 py-1.5 text-sm rounded-md transition-colors text-left min-w-0",
              isSelected
                ? "text-primary font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isSelected ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Folder className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </button>
        </div>

        {isExpanded && (
          <>
            {node.files?.map((f) => (
              <Link key={f.path} href={`/sets/edit/${encodeURI(f.path)}`}>
                <div
                  style={{ paddingLeft: `${28 + indent}px` }}
                  className={cn(
                    "flex items-center gap-1.5 pr-2 py-1 text-xs rounded-md transition-colors",
                    f.path === highlightedFile
                      ? "text-primary bg-primary/10 font-medium"
                      : matchedFilePaths.has(f.path)
                        ? "text-primary/70 bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                  )}
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate flex-1">
                    {f.name.replace(/\.json$/, "")}
                  </span>
                  {matchedFilePaths.has(f.path) && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  )}
                </div>
              </Link>
            ))}

            {node.children?.map((c) => renderSidebarNode(c, depth + 1))}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[78vh] gap-3 overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 shrink-0 rounded-xl border border-border shadow-lg bg-card flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-3 border-b border-border shrink-0">
          <Folder className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Quiz Sets</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-0.5 p-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-7 rounded-md" />
              ))
            ) : randomNode ? (
              <>
                {randomNode.files?.map((f) => (
                  <Link key={f.path} href={`/sets/edit/${encodeURI(f.path)}`}>
                    <div className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {f.name.replace(/\.json$/, "")}
                      </span>
                    </div>
                  </Link>
                ))}
                {randomNode.children?.map((c) => renderSidebarNode(c, 0))}
              </>
            ) : null}
          </div>
        </ScrollArea>
      </div>

      {/* Main panel */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-border shadow-lg bg-card">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-0.5 text-sm flex-1 min-w-0">
            <button
              onClick={() => navigateTo("random")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors shrink-0",
                selectedPath === "random"
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
            >
              <Home className="h-3.5 w-3.5" />
              <span>random</span>
            </button>
            {breadcrumbs.map((seg, i) => {
              const crumbPath = ["random", ...breadcrumbs.slice(0, i + 1)].join(
                "/",
              );
              const isLast = i === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumbPath}>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  <button
                    onClick={() => navigateTo(crumbPath)}
                    className={cn(
                      "px-2 py-1 rounded-md text-sm transition-colors truncate max-w-[140px]",
                      isLast
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                    )}
                  >
                    {seg}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="relative w-48 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 h-8 text-sm"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadFolders}
            className="h-8 w-8 p-0 shrink-0"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          <Link href="/import" className="shrink-0">
            <Button
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="h-8"
            >
              New Set
            </Button>
          </Link>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[minmax(0,1fr)_72px_110px_180px] items-center px-4 py-2 border-b border-border bg-muted/20 shrink-0">
          {["Name", "Type", "Status", "Actions"].map((col, i) => (
            <span
              key={col}
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest text-muted-foreground",
                i === 3 && "text-right",
              )}
            >
              {col}
            </span>
          ))}
        </div>

        {/* Rows */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="px-4 py-3 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : search ? (
            /* ── Global fuzzy search results ── */
            searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                <Search className="h-10 w-10 opacity-25" />
                <p className="text-sm">
                  No results match &ldquo;{search}&rdquo;
                </p>
              </div>
            ) : (
              <div>
                <div className="px-4 py-1.5 text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest border-b border-border bg-muted/20">
                  {searchResults.length} result
                  {searchResults.length !== 1 ? "s" : ""} &mdash; click to
                  reveal in tree
                </div>
                {searchResults.map((item) => (
                  <FolderSearchResult
                    key={item.path}
                    item={item}
                    onSelect={expandPathAndNavigate}
                    deleting={deleting}
                    onDelete={handleDelete}
                    highlighted={item.path === highlightedFile}
                  />
                ))}
              </div>
            )
          ) : currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <FileText className="h-10 w-10 opacity-25" />
              <p className="text-sm">This folder is empty.</p>
            </div>
          ) : (
            <div>
              {currentItems.map((item) => (
                <div
                  key={item.path}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_72px_110px_180px] items-center px-4 py-3 border-b border-border hover:bg-accent/25 transition-colors group",
                    item.kind === "file" &&
                      item.path === highlightedFile &&
                      "bg-primary/8 border-l-2 border-l-primary",
                  )}
                >
                  {/* Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    {item.kind === "folder" ? (
                      <Folder className="h-4 w-4 text-primary/70 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    )}
                    {item.kind === "folder" ? (
                      <button
                        onClick={() => navigateTo(item.path)}
                        className="text-sm font-medium truncate hover:text-primary transition-colors text-left"
                      >
                        {item.name}
                      </button>
                    ) : (
                      <span className="text-sm truncate">
                        {item.name.replace(/\.json$/, "")}
                      </span>
                    )}
                    {item.kind === "folder" && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    )}
                  </div>

                  {/* Type */}
                  <div>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 font-mono tracking-wide"
                    >
                      {item.kind === "folder" ? "DIR" : "JSON"}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div>
                    {item.kind === "folder" ? (
                      <span className="text-xs text-muted-foreground">
                        {item.childCount} item
                        {item.childCount !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <Badge className="text-[10px] px-2 py-0 h-5 bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20">
                        Ready
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 justify-end">
                    {item.kind === "folder" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateTo(item.path)}
                        className="h-7 px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Open
                      </Button>
                    ) : (
                      <>
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
                          onClick={() => handleDelete(item.path, item.name)}
                          loading={deleting === item.path}
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          {deleting !== item.path && (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
