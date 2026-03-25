"use client";
import React, { useEffect, useState, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/components/utils/cn";
import { CheckCircle2, XCircle } from "lucide-react";

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type RandomQuestion = {
  question: string;
  type: "multiple-choice" | "fill-in-blank"; // Add question type
  // Each option is an object with statement and istrue (optional for fill-in-blank)
  options?: { statement: string; istrue: boolean }[];
  correctAnswer?: string; // For fill-in-blank questions
  explanation: string;
  image?: string;
};

export default function RandomQuizPage() {
  const pathname = usePathname();
  // Get search params
  const searchParams = useSearchParams();
  const segments = pathname.split("/").filter(Boolean);
  // Expect path like /quiz/random/<nested...>
  // Find the index of 'random' and join the remainder as relative path
  const randomIdx = segments.indexOf("random");
  const setName =
    randomIdx >= 0
      ? segments.slice(randomIdx + 1).join("/")
      : segments[segments.length - 1];

  // Decode URL encoding (e.g. %20 → space) then split into breadcrumb + title
  const decodedName = decodeURIComponent(setName);
  const nameParts = decodedName.split("/");
  const quizTitle = nameParts[nameParts.length - 1]
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const breadcrumbParts = nameParts.slice(0, -1);

  // Determine if randomization is enabled (default is true)
  const isRandomized = searchParams.get("randomize") !== "false";

  const [questionList, setQuestionList] = useState<RandomQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | string)[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuestionSet = async () => {
      setLoading(true);
      const candidates = [
        `/api/quiz-data?path=random/${setName}`,
        `/api/quiz-data?path=no-random/${setName}`,
      ];
      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          let questions = ((await res.json()) as RandomQuestion[]).filter(
            (q) => q.question && q.type,
          );
          if (isRandomized) {
            questions = shuffleArray(questions);
            questions = questions.map((q) => {
              if (q.type === "multiple-choice" && q.options) {
                return { ...q, options: shuffleArray(q.options) };
              }
              return q;
            });
          }
          setQuestionList(questions);
          setLoading(false);
          return;
        } catch {
          // continue
        }
      }
      setQuestionList([]);
      setLoading(false);
    };
    loadQuestionSet();
  }, [setName, isRandomized]);

  const handleOptionSelect = (optionIndex: number) => {
    if (!isAnswered) {
      const updated = [...userAnswers];
      updated[currentQuestion] = optionIndex;
      setUserAnswers(updated);
      setIsAnswered(true);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAnswered && textAnswer.trim()) {
      const updated = [...userAnswers];
      updated[currentQuestion] = textAnswer.trim();
      setUserAnswers(updated);
      setIsAnswered(true);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questionList.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setIsAnswered(false);
      setTextAnswer("");
    } else {
      setShowScore(true);
    }
  };

  const computeScore = () => {
    let score = 0;
    questionList.forEach((q, idx) => {
      const userAnswer = userAnswers[idx];
      if (q.type === "multiple-choice" && q.options) {
        // Find the index of the correct option
        const correctIndex = q.options.findIndex((opt) => opt.istrue);
        if (userAnswer === correctIndex) score++;
      } else if (q.type === "fill-in-blank" && q.correctAnswer) {
        // Compare text answers case-insensitive
        if (
          typeof userAnswer === "string" &&
          userAnswer.toLowerCase() === q.correctAnswer.toLowerCase()
        ) {
          score++;
        }
      }
    });
    return score;
  };

  const currentQ = questionList[currentQuestion];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (showScore) return;
      if (isAnswered) {
        e.preventDefault();
        handleNext();
        return;
      }

      if (!currentQ) return;

      // For multiple choice questions, use number keys
      if (currentQ.type === "multiple-choice" && currentQ.options) {
        const keyMap: Record<string, number> = {};
        currentQ.options.forEach((_, idx) => {
          keyMap[(idx + 1).toString()] = idx;
        });
        const pressedKey = e.key;
        if (keyMap[pressedKey] !== undefined) {
          e.preventDefault();
          handleOptionSelect(keyMap[pressedKey]);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQuestion, isAnswered, showScore, currentQ]);

  const progress = useMemo(
    () =>
      questionList.length ? (currentQuestion / questionList.length) * 100 : 0,
    [currentQuestion, questionList.length],
  );

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (showScore) {
    const finalScore = computeScore();
    const pct = Math.round((finalScore / questionList.length) * 100);
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/40">
            {quizTitle}
          </p>
          <div>
            <p className="text-[3rem] font-black tabular-nums leading-none">
              {pct}
              <span className="text-2xl text-muted-foreground/40">%</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {finalScore} / {questionList.length} correct
            </p>
          </div>
          <Progress value={pct} className="max-w-sm mx-auto h-1" />
        </div>
        <div className="grid gap-4">
          {questionList.map((q, idx) => {
            const userAnswer = userAnswers[idx];
            let isCorrect = false;
            let userAnswerDisplay = "";
            let correctAnswerDisplay = "";
            if (q.type === "multiple-choice" && q.options) {
              userAnswerDisplay =
                typeof userAnswer === "number" &&
                userAnswer >= 0 &&
                userAnswer < q.options.length
                  ? q.options[userAnswer].statement
                  : "No answer";
              correctAnswerDisplay =
                q.options.find((o) => o.istrue)?.statement || "";
              isCorrect =
                typeof userAnswer === "number" &&
                !!q.options[userAnswer]?.istrue;
            } else if (q.type === "fill-in-blank" && q.correctAnswer) {
              userAnswerDisplay =
                typeof userAnswer === "string" ? userAnswer : "No answer";
              correctAnswerDisplay = q.correctAnswer;
              isCorrect =
                typeof userAnswer === "string" &&
                userAnswer.toLowerCase() === q.correctAnswer.toLowerCase();
            }
            return (
              <div
                key={idx}
                className={cn(
                  "rounded-lg border-l-2 bg-card px-4 py-3 space-y-2",
                  isCorrect ? "border-l-green-500" : "border-l-red-500",
                )}
              >
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <p className="font-medium leading-snug text-sm">
                    Q{idx + 1}. {q.question}
                  </p>
                </div>
                {q.image && (
                  <img
                    src={`/api/images-serve/${encodeURI(q.image)}`}
                    alt="question"
                    className="max-h-48 rounded border border-border"
                  />
                )}
                <p className="text-sm text-muted-foreground pl-6">
                  Your answer:{" "}
                  <span
                    className={cn(
                      "font-medium",
                      isCorrect
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {userAnswerDisplay}
                  </span>
                </p>
                {!isCorrect && (
                  <p className="text-sm text-muted-foreground pl-6">
                    Correct:{" "}
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {correctAnswerDisplay}
                    </span>
                  </p>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-line pl-6 text-muted-foreground">
                  {q.explanation}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20 text-muted-foreground">
        No questions found.
      </div>
    );
  }

  const userChoiceIndex =
    typeof userAnswers[currentQuestion] === "number"
      ? (userAnswers[currentQuestion] as number)
      : -1;
  const isCorrectAnswer =
    currentQ.type === "multiple-choice"
      ? (currentQ.options?.[userChoiceIndex]?.istrue ?? false)
      : typeof userAnswers[currentQuestion] === "string" &&
        currentQ.correctAnswer?.toLowerCase() ===
          (userAnswers[currentQuestion] as string).toLowerCase();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Progress header — minimal, out of the way */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/35 truncate max-w-[70%]">
            {breadcrumbParts.length > 0
              ? `${breadcrumbParts.join(" › ")} › `
              : ""}
            {quizTitle}
          </p>
          <span className="text-[11px] tabular-nums text-muted-foreground/40 shrink-0">
            {currentQuestion + 1} / {questionList.length}
          </span>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Question — the main focus */}
      <div className="space-y-6 pt-2">
        <p className="text-[1.25rem] font-semibold leading-[1.75] tracking-[-0.01em] text-foreground whitespace-pre-line">
          {currentQ.question}
        </p>
        {currentQ.image && (
          <img
            src={`/api/images-serve/${encodeURI(currentQ.image)}`}
            alt="question"
            className="max-h-64 rounded border border-border"
          />
        )}

        {currentQ.type === "multiple-choice" && currentQ.options ? (
          <div className="grid gap-3">
            {currentQ.options.map((option, idx) => {
              const isUserChoice = userAnswers[currentQuestion] === idx;
              const isCorrectOption = option.istrue;
              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  disabled={isAnswered}
                  className={cn(
                    "group w-full text-left px-4 py-3 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring flex items-start gap-3",
                    !isAnswered &&
                      "bg-card hover:bg-accent hover:text-accent-foreground border-border",
                    isAnswered && isCorrectOption && "answer-correct",
                    isAnswered &&
                      isUserChoice &&
                      !isCorrectOption &&
                      "answer-wrong",
                    isAnswered &&
                      !isUserChoice &&
                      !isCorrectOption &&
                      "answer-dimmed",
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold mt-0.5 transition-colors",
                      !isAnswered &&
                        "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary",
                      isAnswered &&
                        isCorrectOption &&
                        "bg-green-500/20 text-green-600 dark:text-green-400",
                      isAnswered &&
                        isUserChoice &&
                        !isCorrectOption &&
                        "bg-red-500/20 text-red-600 dark:text-red-400",
                      isAnswered &&
                        !isUserChoice &&
                        !isCorrectOption &&
                        "bg-muted/50 text-muted-foreground/40",
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span>{option.statement}</span>
                </button>
              );
            })}
            <p className="text-xs text-muted-foreground">
              Press {currentQ.options.map((_, i) => i + 1).join("/")} to answer
            </p>
          </div>
        ) : (
          <form onSubmit={handleTextSubmit} className="space-y-3">
            <Input
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              disabled={isAnswered}
              placeholder="Type your answer here..."
            />
            {!isAnswered && <Button type="submit">Submit Answer</Button>}
            {isAnswered && (
              <div
                className={cn(
                  "rounded-lg border-l-2 bg-card px-4 py-3 text-sm space-y-1",
                  isCorrectAnswer ? "border-l-green-500" : "border-l-red-500",
                )}
              >
                <p>
                  Your answer:{" "}
                  <span
                    className={cn(
                      "font-medium",
                      isCorrectAnswer
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {userAnswers[currentQuestion] as string}
                  </span>
                </p>
                {!isCorrectAnswer && (
                  <p>
                    Correct:{" "}
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {currentQ.correctAnswer}
                    </span>
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Press Enter to submit
            </p>
          </form>
        )}
      </div>

      {/* Inline explanation */}
      {isAnswered && (
        <div
          className={cn(
            "rounded-lg border-l-2 bg-card px-4 py-3 space-y-2",
            isCorrectAnswer ? "border-l-green-500" : "border-l-red-500",
          )}
        >
          <div className="flex items-center gap-2">
            {isCorrectAnswer ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            )}
            <p
              className={cn(
                "text-sm font-semibold",
                isCorrectAnswer
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {isCorrectAnswer ? "Correct" : "Incorrect"}
            </p>
          </div>
          {!isCorrectAnswer && currentQ.type === "multiple-choice" && (
            <p className="text-sm text-muted-foreground">
              Correct answer:{" "}
              <span className="font-medium text-green-600 dark:text-green-400">
                {currentQ.options?.find((o) => o.istrue)?.statement}
              </span>
            </p>
          )}
          {currentQ.explanation && (
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground border-t border-border/40 pt-2 mt-1">
              {currentQ.explanation}
            </p>
          )}
        </div>
      )}

      {isAnswered && (
        <Button onClick={handleNext} size="lg" className="px-8">
          {currentQuestion < questionList.length - 1
            ? "Next Question"
            : "View Results"}
        </Button>
      )}
    </div>
  );
}
