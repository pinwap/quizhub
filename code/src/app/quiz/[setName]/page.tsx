"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/utils/cn";
import { CheckCircle2, XCircle } from "lucide-react";

type Question = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  image?: string;
};

export default function QuizPage() {
  const params = useParams();
  const setName = (params?.setName as string) ?? "";

  const [questionList, setQuestionList] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showScore, setShowScore] = useState(false);
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
          setQuestionList((await res.json()) as Question[]);
          setLoading(false);
          return;
        } catch {
          // continue to next folder
        }
      }
      setQuestionList([]);
      setLoading(false);
    };

    loadQuestionSet();
  }, [setName]);

  const handleOptionSelect = useCallback(
    (optionIndex: number) => {
      if (!isAnswered) {
        setUserAnswers((prev) => {
          const updated = [...prev];
          updated[currentQuestion] = optionIndex.toString();
          return updated;
        });
        setIsAnswered(true);
      }
    },
    [isAnswered, currentQuestion],
  );

  const handleNext = useCallback(() => {
    if (currentQuestion < questionList.length - 1) {
      setCurrentQuestion((q) => q + 1);
      setIsAnswered(false);
    } else {
      setShowScore(true);
    }
  }, [currentQuestion, questionList.length]);

  const computeScore = () => {
    let score = 0;
    for (let i = 0; i < questionList.length; i++) {
      if (userAnswers[i] === questionList[i].answer.toString()) {
        score++;
      }
    }
    return score;
  };

  const decodedName = decodeURIComponent(setName);
  const quizTitle = decodedName
    .split("/")
    .pop()!
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const breadcrumbParts = decodedName.split("/").slice(0, -1);

  const currentQ = questionList[currentQuestion];
  const userChoice = userAnswers[currentQuestion];
  const isCorrect = userChoice === currentQ?.answer.toString();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (showScore) return;

      if (isAnswered) {
        e.preventDefault();
        handleNext();
        return;
      }

      // Add a check to ensure currentQ is defined
      if (!currentQ) return;

      // Dynamically create keyMap based on the number of options
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

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    currentQuestion,
    isAnswered,
    showScore,
    currentQ,
    handleNext,
    handleOptionSelect,
  ]);

  const progress = useMemo(
    () =>
      questionList.length ? (currentQuestion / questionList.length) * 100 : 0,
    [currentQuestion, questionList.length],
  );

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-3">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      </div>
    );
  }

  // Results view
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
            const correct = userAnswers[idx] === q.answer.toString();
            return (
              <div
                key={idx}
                className={cn(
                  "rounded-lg border-l-2 bg-card px-4 py-3 space-y-2",
                  correct ? "border-l-green-500" : "border-l-red-500",
                )}
              >
                <div className="flex items-start gap-2">
                  {correct ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <p className="font-medium leading-snug text-sm">
                    Q{idx + 1}. {q.question}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  Your answer:{" "}
                  <span
                    className={cn(
                      "font-medium",
                      correct
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {q.options[parseInt(userAnswers[idx])]}
                  </span>
                </p>
                {!correct && (
                  <p className="text-sm text-muted-foreground pl-6">
                    Correct:{" "}
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {q.options[q.answer]}
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
        No questions found for &quot;{setName}&quot;.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Progress header — minimal */}
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

      {/* Question */}
      <div className="space-y-6 pt-2">
        <p className="text-[1.25rem] font-semibold leading-[1.75] tracking-[-0.01em] text-foreground whitespace-pre-line">
          {currentQ.question}
        </p>
        {currentQ.image && (
          <div>
            <Image
              src={`/api/images-serve/${encodeURI(currentQ.image)}`}
              alt="question"
              width={800}
              height={400}
              className="max-h-64 w-auto rounded border border-border mt-2 object-contain"
              unoptimized
              loading="lazy"
            />
          </div>
        )}

        {/* Answer options */}
        <div className="grid gap-3">
          {currentQ.options.map((option, idx) => {
            const isUserChoice =
              userAnswers[currentQuestion] === idx.toString();
            const isCorrectOption = idx === currentQ.answer;
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
                <span>{option}</span>
              </button>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Press {currentQ.options.map((_, idx) => idx + 1).join("/")} to
            answer
          </p>
        </div>
      </div>

      {/* Explanation */}
      {isAnswered && (
        <div
          className={cn(
            "rounded-lg border-l-2 bg-card px-4 py-3 space-y-2",
            isCorrect ? "border-l-green-500" : "border-l-red-500",
          )}
        >
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            )}
            <p
              className={cn(
                "text-sm font-semibold",
                isCorrect
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {isCorrect ? "Correct" : "Incorrect"}
            </p>
          </div>
          {!isCorrect && (
            <p className="text-sm text-muted-foreground">
              Correct answer:{" "}
              <span className="font-medium text-green-600 dark:text-green-400">
                {currentQ.options[currentQ.answer]}
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

      {/* Next button */}
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
