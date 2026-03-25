import { useState, useEffect, useMemo, useCallback } from "react";
import "./App.css";
import { QUIZ_SETS, GROUPS } from "./sets";
import type { QuizSet, RandomQuestion } from "./types";
import { ThemeToggle } from "./components/ThemeToggle";
import { ProgressBar } from "./components/ui/ProgressBar";
import { ExplanationSection } from "./components/ExplanationSection";

// ─── helpers ────────────────────────────────────────────────────────────────

function shuffleArray<T>(array: T[]): T[] {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function prepareQuestions(raw: RandomQuestion[]): RandomQuestion[] {
  return shuffleArray(raw).map((q) => {
    if (q.type === "multiple-choice" && q.options) {
      return { ...q, options: shuffleArray(q.options) };
    }
    return q;
  });
}

// ─── Home View ──────────────────────────────────────────────────────────────

interface HomeViewProps {
  onSelectSet: (set: QuizSet) => void;
}

function HomeView({ onSelectSet }: HomeViewProps) {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold gradient-text">QuizHub</h1>
        <p className="text-muted">Choose a quiz set to start practicing</p>
      </div>

      {GROUPS.map((group) => {
        const sets = QUIZ_SETS.filter((s) => s.group === group);
        return (
          <section key={group} className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">
              {group}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {sets.map((set) => (
                <button
                  key={set.id}
                  onClick={() => onSelectSet(set)}
                  className="card p-4 text-left hover:border-accent transition-all hover:shadow-soft group focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <p className="font-semibold text-foreground group-hover:text-accent transition-colors">
                    {set.label}
                  </p>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}

// ─── Quiz View ───────────────────────────────────────────────────────────────

interface QuizViewProps {
  set: QuizSet;
  onBack: () => void;
}

function QuizView({ set, onBack }: QuizViewProps) {
  const [questions, setQuestions] = useState<RandomQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | string)[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [showScore, setShowScore] = useState(false);

  // Load and shuffle on mount / set change
  useEffect(() => {
    setLoading(true);
    setCurrent(0);
    setUserAnswers([]);
    setIsAnswered(false);
    setTextAnswer("");
    setShowScore(false);
    set.loader().then((raw) => {
      setQuestions(prepareQuestions(raw));
      setLoading(false);
    });
  }, [set]);

  const currentQ = questions[current];

  const handleOptionSelect = useCallback(
    (idx: number) => {
      if (isAnswered) return;
      const updated = [...userAnswers];
      updated[current] = idx;
      setUserAnswers(updated);
      setIsAnswered(true);
    },
    [isAnswered, userAnswers, current]
  );

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAnswered && textAnswer.trim()) {
      const updated = [...userAnswers];
      updated[current] = textAnswer.trim();
      setUserAnswers(updated);
      setIsAnswered(true);
    }
  };

  const handleNext = useCallback(() => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setIsAnswered(false);
      setTextAnswer("");
    } else {
      setShowScore(true);
    }
  }, [current, questions.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showScore) return;
      if (isAnswered) {
        e.preventDefault();
        handleNext();
        return;
      }
      if (!currentQ) return;
      if (currentQ.type === "multiple-choice" && currentQ.options) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < currentQ.options.length) {
          e.preventDefault();
          handleOptionSelect(idx);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showScore, isAnswered, currentQ, handleOptionSelect, handleNext]);

  const progress = useMemo(
    () => (questions.length ? (current / questions.length) * 100 : 0),
    [current, questions.length]
  );

  const computeScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      const ans = userAnswers[idx];
      if (q.type === "multiple-choice" && q.options) {
        if (typeof ans === "number" && q.options[ans]?.istrue) score++;
      } else if (q.type === "fill-in-blank" && q.correctAnswer) {
        if (
          typeof ans === "string" &&
          ans.toLowerCase() === q.correctAnswer.toLowerCase()
        )
          score++;
      }
    });
    return score;
  };

  // ── Results Screen ──────────────────────────────────────────────────────

  if (showScore) {
    const finalScore = computeScore();
    const pct = Math.round((finalScore / questions.length) * 100);
    return (
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold gradient-text">Results</h1>
          <p className="text-5xl font-bold text-foreground">
            {finalScore}
            <span className="text-muted text-2xl"> / {questions.length}</span>
          </p>
          <p className="text-muted">
            {pct >= 80
              ? "Excellent work! 🎉"
              : pct >= 60
              ? "Good job! Keep practicing."
              : "Keep studying — you'll get there!"}
          </p>
          <ProgressBar value={pct} className="max-w-xs mx-auto" />
        </div>

        <div className="grid gap-4">
          {questions.map((q, idx) => {
            const ans = userAnswers[idx];
            let isCorrect = false;
            let userDisplay = "";
            let correctDisplay = "";

            if (q.type === "multiple-choice" && q.options) {
              userDisplay =
                typeof ans === "number" && ans >= 0 && ans < q.options.length
                  ? q.options[ans].statement
                  : "No answer";
              correctDisplay = q.options.find((o) => o.istrue)?.statement ?? "";
              isCorrect = typeof ans === "number" && !!q.options[ans]?.istrue;
            } else if (q.type === "fill-in-blank" && q.correctAnswer) {
              userDisplay = typeof ans === "string" ? ans : "No answer";
              correctDisplay = q.correctAnswer;
              isCorrect =
                typeof ans === "string" &&
                ans.toLowerCase() === q.correctAnswer.toLowerCase();
            }

            return (
              <div
                key={idx}
                className="p-5 rounded-lg border border-border bg-card"
              >
                <p className="font-semibold mb-2">
                  Q{idx + 1}. {q.question}
                </p>
                <p className="text-sm">
                  Your answer:{" "}
                  <span
                    className={
                      isCorrect
                        ? "text-success font-medium"
                        : "text-danger font-medium"
                    }
                  >
                    {userDisplay}
                  </span>
                </p>
                {!isCorrect && (
                  <p className="text-sm mt-1">
                    Correct:{" "}
                    <span className="text-success font-medium">
                      {correctDisplay}
                    </span>
                  </p>
                )}
                <p className="mt-2 text-sm text-muted leading-relaxed whitespace-pre-line">
                  <span className="font-medium text-foreground">
                    Explanation:{" "}
                  </span>
                  {q.explanation}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              setLoading(true);
              setCurrent(0);
              setUserAnswers([]);
              setIsAnswered(false);
              setTextAnswer("");
              setShowScore(false);
              set.loader().then((raw) => {
                setQuestions(prepareQuestions(raw));
                setLoading(false);
              });
            }}
            className="btn-base btn-primary"
          >
            Retry (Reshuffled)
          </button>
          <button onClick={onBack} className="btn-base btn-outline">
            ← Back to Sets
          </button>
        </div>
      </main>
    );
  }

  // ── Loading guard ──────────────────────────────────────────────────────

  if (loading || !currentQ) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10 flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="text-muted">Loading questions…</p>
      </main>
    );
  }

  // ── Question Screen ────────────────────────────────────────────────────

  const mcCorrectStatement =
    currentQ.type === "multiple-choice"
      ? currentQ.options?.find((o) => o.istrue)?.statement ?? ""
      : currentQ.correctAnswer ?? "";

  const mcIsCorrect =
    currentQ.type === "multiple-choice"
      ? !!(
          typeof userAnswers[current] === "number" &&
          currentQ.options?.[userAnswers[current] as number]?.istrue
        )
      : typeof userAnswers[current] === "string" &&
        (userAnswers[current] as string).toLowerCase() ===
          currentQ.correctAnswer?.toLowerCase();

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight gradient-text">
            {set.label}
          </h1>
          <span className="text-xs text-muted">
            {current + 1} / {questions.length}
          </span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Question */}
      <div className="space-y-5 fade-in">
        <p className="text-lg font-medium whitespace-pre-line leading-relaxed text-foreground">
          {currentQ.question}
        </p>

        {/* Multiple choice */}
        {currentQ.type === "multiple-choice" && currentQ.options ? (
          <div className="grid gap-3">
            {currentQ.options.map((opt, idx) => {
              const chosen = userAnswers[current] === idx;
              const correct = opt.istrue;
              let styles = "";
              if (isAnswered) {
                if (correct)
                  styles = "border-success bg-success/10 text-success font-medium";
                else if (chosen)
                  styles = "border-danger bg-danger/10 text-danger";
                else styles = "border-border bg-background/60 text-muted";
              } else {
                styles =
                  "border-border bg-card text-foreground hover:border-accent hover:shadow-soft";
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  disabled={isAnswered}
                  className={`text-left px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-accent ${styles}`}
                >
                  <span className="font-mono text-xs mr-2 opacity-60">
                    [{idx + 1}]
                  </span>
                  {opt.statement}
                </button>
              );
            })}
            <p className="text-xs text-muted">
              Press{" "}
              {currentQ.options.map((_, i) => i + 1).join(" / ")} to answer
              {isAnswered && " · any key for next"}
            </p>
          </div>
        ) : (
          /* Fill-in-blank */
          <form onSubmit={handleTextSubmit} className="space-y-3">
            <input
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              disabled={isAnswered}
              placeholder="Type your answer and press Enter…"
              className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
            {!isAnswered && (
              <button type="submit" className="btn-base btn-primary">
                Submit Answer
              </button>
            )}
            {isAnswered && (
              <div
                className={`p-4 rounded-lg border ${
                  mcIsCorrect
                    ? "border-success bg-success/10"
                    : "border-danger bg-danger/10"
                }`}
              >
                <p className="font-medium text-foreground">
                  Your answer:{" "}
                  <span
                    className={mcIsCorrect ? "text-success" : "text-danger"}
                  >
                    {userAnswers[current] as string}
                  </span>
                </p>
                {!mcIsCorrect && (
                  <p className="mt-1 text-sm">
                    Correct:{" "}
                    <span className="text-success font-medium">
                      {currentQ.correctAnswer}
                    </span>
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-muted">
              Press Enter to submit{isAnswered && " · any key for next"}
            </p>
          </form>
        )}

        <ExplanationSection
          correctStatement={mcCorrectStatement}
          isCorrect={mcIsCorrect}
          explanation={currentQ.explanation}
          isAnswered={isAnswered}
        />

        {isAnswered && (
          <button onClick={handleNext} className="btn-base btn-primary">
            {current < questions.length - 1 ? "Next Question →" : "View Results"}
          </button>
        )}
      </div>
    </main>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────

export default function App() {
  const [selectedSet, setSelectedSet] = useState<QuizSet | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setSelectedSet(null)}
            className="text-xl font-bold gradient-text hover:opacity-80 transition-opacity"
          >
            QuizHub
          </button>
          <div className="flex items-center gap-2">
            {selectedSet && (
              <button
                onClick={() => setSelectedSet(null)}
                className="btn-base btn-ghost text-sm text-muted"
              >
                ← Sets
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {selectedSet ? (
        <QuizView set={selectedSet} onBack={() => setSelectedSet(null)} />
      ) : (
        <HomeView onSelectSet={setSelectedSet} />
      )}
    </div>
  );
}

