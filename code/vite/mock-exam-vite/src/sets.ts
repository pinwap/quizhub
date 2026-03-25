import type { QuizSet, RandomQuestion } from "./types";

// Auto-discover every JSON file under src/data/random/**/
// Adding a new file and rebuilding is all that's needed.
const modules = import.meta.glob<{ default: RandomQuestion[] }>(
  "./data/random/**/*.json"
);

function pathToGroup(path: string): string {
  // "./data/random/Computer-Security/01-Introduction.json" -> "Computer Security"
  const parts = path.split("/");
  return parts[parts.length - 2].replace(/-/g, " ");
}

function pathToLabel(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1].replace(/\.json$/, "").replace(/-/g, " ");
}

function pathToId(path: string): string {
  return path
    .replace("./data/random/", "")
    .replace(/\.json$/, "")
    .replace(/\//g, "-");
}

export const QUIZ_SETS: QuizSet[] = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, importer]) => ({
    id: pathToId(path),
    label: pathToLabel(path),
    group: pathToGroup(path),
    loader: () => importer().then((m) => m.default),
  }));

export const GROUPS = Array.from(new Set(QUIZ_SETS.map((s) => s.group)));
