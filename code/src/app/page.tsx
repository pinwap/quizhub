"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type FolderData } from "@/lib/folderUtils";
import {
  Search,
  GitBranch,
  Play,
  Edit,
  X,
  LayoutGrid,
  LayoutList,
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Home as HomeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

type SetItem = { name: string; path: string; folder: string };

function flattenSets(node: FolderData, folderLabel = ""): SetItem[] {
  const list: SetItem[] = [];
  for (const f of node.files || []) {
    if (!f.path) continue;
    list.push({ name: f.name, path: f.path, folder: folderLabel || node.name });
  }
  for (const c of node.children || []) {
    const childLabel = folderLabel ? `${folderLabel} / ${c.name}` : c.name;
    list.push(...flattenSets(c, childLabel));
  }
  return list;
}

function SetCard({ set, showFolder }: { set: SetItem; showFolder?: boolean }) {
  const router = useRouter();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/quiz/${encodeURI(set.path)}`)}
      onKeyDown={(e) =>
        e.key === "Enter" && router.push(`/quiz/${encodeURI(set.path)}`)
      }
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4",
        "hover:border-primary/40 hover:bg-accent/20 transition-all duration-200 cursor-pointer",
        "h-[72px] overflow-hidden",
      )}
    >
      <p className="text-sm font-medium leading-snug line-clamp-1 pr-12">
        {set.name.replace(/\.json$/, "").replace(/[-_]/g, " ")}
      </p>
      {showFolder && (
        <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide font-medium">
          {set.folder}
        </p>
      )}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={`/sets/edit/${encodeURI(set.path)}`}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition-colors">
            <Edit className="h-3 w-3" />
          </span>
        </Link>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Play className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const [folderStructure, setFolderStructure] = useState<FolderData[]>([]);
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [activeFolder, setActiveFolder] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "tree">("grid");

  // Tree-view state
  const [treeSelectedPath, setTreeSelectedPath] = useState("random");
  const [treeExpandedFolders, setTreeExpandedFolders] = useState<Set<string>>(
    new Set(["random"]),
  );

  const fetchFolderStructure = useCallback(async () => {
    try {
      const response = await fetch("/api/folders");
      const data = await response.json();
      setFolderStructure(data.folders || []);
    } catch (error) {
      console.error("Error fetching folder structure:", error);
    }
  }, []);

  useEffect(() => {
    fetchFolderStructure();
  }, [fetchFolderStructure]);

  // Persist view-mode preference
  useEffect(() => {
    const saved = localStorage.getItem("home-view-mode");
    if (saved === "grid" || saved === "tree") setViewMode(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("home-view-mode", viewMode);
  }, [viewMode]);

  const handleSync = useCallback(async () => {
    try {
      setSyncing(true);
      const response = await fetch("/api/sync", { method: "POST" });
      const result = await response.json();
      if (response.ok) {
        toast.success(result.message);
        fetchFolderStructure();
      } else {
        toast.error(`Sync failed: ${result.message}`);
      }
    } catch {
      toast.error("Failed to sync to GitHub.");
    } finally {
      setSyncing(false);
    }
  }, [fetchFolderStructure]);

  const randomFolder = useMemo(
    () => folderStructure.find((f) => f.name === "random"),
    [folderStructure],
  );

  const allSets = useMemo(
    () => (randomFolder ? flattenSets(randomFolder) : []),
    [randomFolder],
  );

  const folders = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of allSets) {
      if (!seen.has(s.folder)) {
        seen.add(s.folder);
        list.push(s.folder);
      }
    }
    return list;
  }, [allSets]);

  const groupedSets = useMemo(() => {
    const map = new Map<string, SetItem[]>();
    for (const s of allSets) {
      if (!map.has(s.folder)) map.set(s.folder, []);
      map.get(s.folder)!.push(s);
    }
    return map;
  }, [allSets]);

  const filteredSets = useMemo(() => {
    let base = activeFolder ? (groupedSets.get(activeFolder) ?? []) : allSets;
    if (query) {
      base = base
        .map((s) => ({
          s,
          score: Math.max(
            fuzzyScore(s.name.replace(/[-_.]/g, " "), query),
            fuzzyScore(s.folder, query),
          ),
        }))
        .filter(({ score }) => score >= 0)
        .sort((a, b) => b.score - a.score)
        .map(({ s }) => s);
    }
    return base;
  }, [allSets, query, activeFolder, groupedSets]);

  // ── Tree-view helpers ────────────────────────────────────────────────────────
  function getNodeAtPath(root: FolderData, parts: string[]): FolderData | null {
    // parts = segments AFTER "random"
    let cur: FolderData = root;
    for (const part of parts) {
      const child = (cur.children || []).find((c) => c.name === part);
      if (!child) return null;
      cur = child;
    }
    return cur;
  }

  const treeCurrentNode = useMemo(() => {
    if (!randomFolder) return null;
    const parts = treeSelectedPath.split("/").slice(1).filter(Boolean);
    return getNodeAtPath(randomFolder, parts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [randomFolder, treeSelectedPath]);

  const treeCurrentItems = useMemo(() => {
    if (!treeCurrentNode) return [];
    type TreeItem =
      | { kind: "folder"; name: string; treePath: string; childCount: number }
      | { kind: "file"; name: string; quizPath: string };
    const items: TreeItem[] = [];
    for (const c of treeCurrentNode.children || []) {
      items.push({
        kind: "folder",
        name: c.name,
        treePath: treeSelectedPath + "/" + c.name,
        childCount: (c.children?.length || 0) + c.files.length,
      });
    }
    for (const f of treeCurrentNode.files || []) {
      if (f.path) items.push({ kind: "file", name: f.name, quizPath: f.path });
    }
    return items;
  }, [treeCurrentNode, treeSelectedPath]);

  const treeBreadcrumbs = useMemo(
    () => treeSelectedPath.split("/").slice(1).filter(Boolean),
    [treeSelectedPath],
  );

  const toggleTreeFolder = (path: string) => {
    setTreeExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const treeNavigateTo = (path: string) => {
    setTreeSelectedPath(path);
    setQuery("");
  };

  /** For search results in tree mode: expand ancestors + navigate to parent */
  const treeExpandAndNavigate = (quizPath: string) => {
    const segments = quizPath.split("/"); // e.g. ["random","sub","file.json"]
    const parentSegments = segments.slice(0, -1);
    const newExpanded = new Set(treeExpandedFolders);
    for (let i = 1; i <= parentSegments.length; i++) {
      newExpanded.add(parentSegments.slice(0, i).join("/"));
    }
    setTreeExpandedFolders(newExpanded);
    setTreeSelectedPath(parentSegments.join("/"));
    setQuery("");
  };

  const renderTreeSidebarNode = (
    node: FolderData,
    nodePath: string,
    depth = 0,
  ): React.ReactNode => {
    const isSelected = treeSelectedPath === nodePath;
    const isExpanded = treeExpandedFolders.has(nodePath);
    const hasChildren = (node.children?.length || 0) + node.files.length > 0;
    const indent = depth * 12;
    return (
      <div key={nodePath}>
        <div
          style={{ paddingLeft: `${8 + indent}px` }}
          className={cn(
            "flex items-center gap-0.5 pr-1 rounded-md",
            isSelected && "bg-primary/15",
          )}
        >
          <button
            onClick={() => toggleTreeFolder(nodePath)}
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
          <button
            onClick={() => treeNavigateTo(nodePath)}
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
            {node.files
              .filter((f) => f.path)
              .map((f) => (
                <Link key={f.path} href={`/quiz/${encodeURI(f.path!)}`}>
                  <div
                    style={{ paddingLeft: `${28 + indent}px` }}
                    className="flex items-center gap-1.5 pr-2 py-1 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {f.name.replace(/\.json$/, "")}
                    </span>
                  </div>
                </Link>
              ))}
            {(node.children || []).map((c) =>
              renderTreeSidebarNode(c, nodePath + "/" + c.name, depth + 1),
            )}
          </>
        )}
      </div>
    );
  };

  const isGrouped = !query && !activeFolder;
  const totalCount = allSets.length;
  const isLoading = folderStructure.length === 0;

  return (
    <div className="space-y-0">
      {/* ── Hero ── */}
      <section className="relative pb-12 pt-4">
        {/* Dot-grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage:
              "radial-gradient(ellipse 90% 90% at 50% 50%, #000 40%, transparent 100%)",
          }}
        />

        <div className="relative space-y-8">
          {/* Top meta row */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-muted-foreground/60">
              OS · Network · Practice
            </p>
            <Button
              variant="ghost"
              size="sm"
              loading={syncing}
              onClick={handleSync}
              leftIcon={<GitBranch className="h-3.5 w-3.5" />}
              className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
            >
              {syncing ? "Syncing…" : "Sync"}
            </Button>
          </div>

          {/* Main headline + big count */}
          <div className="flex items-end justify-between gap-6">
            <div className="space-y-2">
              <h1
                className="font-black leading-none tracking-tighter"
                style={{ fontSize: "clamp(2.8rem, 9vw, 5.5rem)" }}
              >
                <span className="gradient-text block">Master</span>
                <span className="text-foreground block">the exam.</span>
              </h1>
              <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                Operating Systems &amp; Networking — structured question sets
                for deep practice.
              </p>
            </div>

            {!isLoading && (
              <div className="shrink-0 text-right select-none pb-1">
                <p
                  className="font-black tabular-nums leading-none text-primary/15 dark:text-primary/10"
                  style={{ fontSize: "clamp(3.5rem, 10vw, 7rem)" }}
                >
                  {String(totalCount).padStart(2, "0")}
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 mt-1">
                  sets
                </p>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="group relative">
            <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-primary/40 via-violet-500/30 to-primary/40 opacity-0 blur-sm transition-opacity duration-500 group-focus-within:opacity-100" />
            <div className="relative flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 transition-colors group-focus-within:border-primary/40">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search question sets…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Folder filter pills ── */}
      {!isLoading && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setActiveFolder("")}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
              !activeFolder
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card/70 text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            All
            <span
              className={cn(
                "flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                !activeFolder
                  ? "bg-white/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {totalCount}
            </span>
          </button>

          {folders.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFolder(activeFolder === f ? "" : f)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
                activeFolder === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card/70 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {f}
              <span
                className={cn(
                  "flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                  activeFolder === f
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {groupedSets.get(f)?.length ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Divider + view toggle ── */}
      <div className="flex items-center gap-4 pt-3">
        <div className="h-px flex-1 bg-border" />
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
          {isLoading
            ? "loading…"
            : activeFolder
              ? `${activeFolder} · ${filteredSets.length}`
              : `${filteredSets.length} sets`}
        </span>
        <div className="h-px flex-1 bg-border" />
        {/* Toggle */}
        {!isLoading && (
          <div className="shrink-0 flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              title="Grid view"
              className={cn(
                "flex items-center justify-center h-6 w-6 rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("tree")}
              title="Tree view"
              className={cn(
                "flex items-center justify-center h-6 w-6 rounded-md transition-colors",
                viewMode === "tree"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Sets section ── */}
      <section className="pt-5">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-xl" />
            ))}
          </div>
        ) : viewMode === "tree" ? (
          /* ═══════════════════════ TREE VIEW ═══════════════════════ */
          <div className="flex gap-3 h-[72vh] overflow-hidden rounded-xl border border-border shadow-lg bg-card">
            {/* ── Sidebar ── */}
            <div className="w-52 shrink-0 flex flex-col border-r border-border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
                <Folder className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold">Quiz Sets</span>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-0.5 p-2">
                  {randomFolder
                    ? (randomFolder.children || []).map((c) =>
                        renderTreeSidebarNode(c, "random/" + c.name, 0),
                      )
                    : null}
                </div>
              </ScrollArea>
            </div>

            {/* ── Main panel ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Top bar: breadcrumb + search */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border shrink-0">
                <div className="flex items-center gap-0.5 text-sm flex-1 min-w-0">
                  <button
                    onClick={() => treeNavigateTo("random")}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors shrink-0",
                      treeSelectedPath === "random"
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                    )}
                  >
                    <HomeIcon className="h-3 w-3" />
                    <span>random</span>
                  </button>
                  {treeBreadcrumbs.map((seg, i) => {
                    const crumbPath = [
                      "random",
                      ...treeBreadcrumbs.slice(0, i + 1),
                    ].join("/");
                    const isLast = i === treeBreadcrumbs.length - 1;
                    return (
                      <React.Fragment key={crumbPath}>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                        <button
                          onClick={() => treeNavigateTo(crumbPath)}
                          className={cn(
                            "px-1.5 py-1 rounded-md text-xs transition-colors truncate max-w-[120px]",
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

                {/* Search bar (shared query) */}
                <div className="relative w-44 shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Fuzzy search…"
                    className="w-full pl-7 pr-3 h-7 rounded-lg border border-border bg-background text-xs outline-none placeholder:text-muted-foreground/40 focus:border-primary/40 transition-colors"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Column header */}
              <div className="grid grid-cols-[minmax(0,1fr)_180px] items-center px-4 py-1.5 border-b border-border bg-muted/20 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {query ? `${filteredSets.length} results` : "Name"}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">
                  Actions
                </span>
              </div>

              {/* Rows */}
              <ScrollArea className="flex-1">
                {query ? (
                  /* ── Fuzzy search results ── */
                  filteredSets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                      <Search className="h-8 w-8 opacity-20" />
                      <p className="text-sm">
                        No results for &ldquo;{query}&rdquo;
                      </p>
                    </div>
                  ) : (
                    filteredSets.map((s) => (
                      <div
                        key={s.path}
                        className="grid grid-cols-[minmax(0,1fr)_180px] items-center px-4 py-3 border-b border-border hover:bg-accent/25 transition-colors group cursor-pointer"
                        onClick={() => treeExpandAndNavigate(s.path)}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {s.name
                                .replace(/\.json$/, "")
                                .replace(/[-_]/g, " ")}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 pl-5 text-[10px] text-muted-foreground/45">
                            <FolderOpen className="h-2.5 w-2.5 shrink-0" />
                            <span className="ml-0.5 truncate">{s.folder}</span>
                          </div>
                        </div>
                        <div
                          className="flex items-center gap-1.5 justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/quiz/${encodeURI(s.path)}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                              title="Start quiz"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/sets/edit/${encodeURI(s.path)}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Edit className="h-3 w-3" />}
                              className="h-7 px-2 text-xs"
                            >
                              Edit
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))
                  )
                ) : treeCurrentItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                    <FileText className="h-8 w-8 opacity-20" />
                    <p className="text-sm">This folder is empty.</p>
                  </div>
                ) : (
                  treeCurrentItems.map((item) => (
                    <div
                      key={
                        item.kind === "folder" ? item.treePath : item.quizPath
                      }
                      className="grid grid-cols-[minmax(0,1fr)_180px] items-center px-4 py-3 border-b border-border hover:bg-accent/25 transition-colors group"
                    >
                      {/* Name */}
                      <div className="flex items-center gap-2 min-w-0">
                        {item.kind === "folder" ? (
                          <>
                            <Folder className="h-4 w-4 text-primary/70 shrink-0" />
                            <button
                              onClick={() => {
                                toggleTreeFolder(item.treePath);
                                treeNavigateTo(item.treePath);
                              }}
                              className="text-sm font-medium truncate hover:text-primary transition-colors text-left"
                            >
                              {item.name}
                            </button>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                            <span className="text-xs text-muted-foreground/40">
                              {item.childCount} item
                              {item.childCount !== 1 ? "s" : ""}
                            </span>
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            <span className="text-sm truncate">
                              {item.name
                                .replace(/\.json$/, "")
                                .replace(/[-_]/g, " ")}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 justify-end">
                        {item.kind === "folder" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              toggleTreeFolder(item.treePath);
                              treeNavigateTo(item.treePath);
                            }}
                            className="h-7 px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Open
                          </Button>
                        ) : (
                          <>
                            <Link href={`/quiz/${encodeURI(item.quizPath)}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                                title="Start quiz"
                              >
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Link href={`/quiz/${encodeURI(item.quizPath)}`}>
                              <Button size="sm" className="h-7 px-3 text-xs">
                                Start
                              </Button>
                            </Link>
                            <Link
                              href={`/sets/edit/${encodeURI(item.quizPath)}`}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Edit className="h-3 w-3" />}
                                className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Edit
                              </Button>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>
          </div>
        ) : filteredSets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Search className="h-8 w-8 opacity-20" />
            <p className="text-sm">
              {query ? `No sets match "${query}"` : "No sets found."}
            </p>
            {(query || activeFolder) && (
              <button
                onClick={() => {
                  setQuery("");
                  setActiveFolder("");
                }}
                className="text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : isGrouped ? (
          /* ── Grouped by folder ── */
          <div className="space-y-10">
            {folders.map((folderName) => {
              const sets = groupedSets.get(folderName) ?? [];
              if (sets.length === 0) return null;
              return (
                <div key={folderName}>
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => setActiveFolder(folderName)}
                      className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground/50 hover:text-primary transition-colors whitespace-nowrap"
                    >
                      {folderName}
                    </button>
                    <div className="h-px flex-1 bg-border/50" />
                    <span className="text-[10px] font-medium tabular-nums text-muted-foreground/30 shrink-0">
                      {sets.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {sets.map((set) => (
                      <SetCard key={set.path} set={set} showFolder={false} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Flat filtered / single-folder grid ── */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {filteredSets.map((set) => (
              <SetCard key={set.path} set={set} showFolder={!activeFolder} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
