"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ImageIcon,
  CheckCircle2,
  Circle,
  FileQuestion,
  GripVertical,
} from "lucide-react";

type Option = {
  statement: string;
  istrue: boolean;
};

type Question = {
  type: string;
  question: string;
  options: Option[];
  explanation: string;
  image?: string;
};

export default function EditSetPage() {
  const router = useRouter();
  const params = useParams();
  const slug = (params?.slug as string[]) || [];
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);

  const setPath = useMemo(() => slug.join("/"), [slug]);

  useEffect(() => {
    if (setPath) loadSet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPath]);

  const loadSet = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sets/${encodeURI(setPath)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to load set");
        setQuestions([]);
      } else {
        const arr = Array.isArray(data.data) ? data.data : [];
        const normalized: Question[] = arr.map((q: any) => {
          const qType =
            typeof q.type === "string" && q.type.trim()
              ? q.type
              : "multiple-choice";
          const qText =
            typeof q.question === "string"
              ? q.question
              : String(q.question ?? "");
          const rawOptions: any[] = Array.isArray(q.options)
            ? q.options
            : Array.isArray(q.choices)
              ? q.choices
              : Array.isArray(q.answers)
                ? q.answers
                : [];

          const options: Option[] = rawOptions.map((o: any) => {
            if (typeof o === "string") return { statement: o, istrue: false };
            const statement =
              typeof o.statement === "string" && o.statement.length > 0
                ? o.statement
                : typeof o.text === "string"
                  ? o.text
                  : typeof o.label === "string"
                    ? o.label
                    : typeof o.content === "string"
                      ? o.content
                      : typeof o.choice === "string"
                        ? o.choice
                        : typeof o.option === "string"
                          ? o.option
                          : "";
            const istrue =
              typeof o.istrue === "boolean"
                ? o.istrue
                : typeof o.isTrue === "boolean"
                  ? o.isTrue
                  : typeof o.correct === "boolean"
                    ? o.correct
                    : typeof o.answer === "boolean"
                      ? o.answer
                      : false;
            return { statement, istrue };
          });

          const explanation =
            typeof q.explanation === "string"
              ? q.explanation
              : String(q.explanation ?? "");
          const image = typeof q.image === "string" ? q.image : undefined;

          return { type: qType, question: qText, options, explanation, image };
        });
        setQuestions(normalized);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load set");
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    );
  };

  const updateOption = (qIdx: number, oIdx: number, patch: Partial<Option>) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, j) => (j === oIdx ? { ...o, ...patch } : o)) }
          : q,
      ),
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { type: "multiple-choice", question: "", options: [{ statement: "", istrue: false }], explanation: "" },
    ]);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 50);
  };

  const removeQuestion = (idx: number) => setQuestions((prev) => prev.filter((_, i) => i !== idx));

  const addOption = (qIdx: number) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: [...q.options, { statement: "", istrue: false }] } : q,
      ),
    );

  const removeOption = (qIdx: number, oIdx: number) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q,
      ),
    );

  const handleImageUpload = async (file: File, qi: number) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const uploadRes = await fetch(`/api/images/${encodeURI(setPath)}`, {
        method: "POST",
        body: formData,
      });
      const result = await uploadRes.json();
      if (!uploadRes.ok) {
        toast.error(result.message || "Upload failed");
      } else {
        updateQuestion(qi, { image: `${setPath}/${result.file}` });
        toast.success("Image uploaded");
      }
    } catch (e) {
      console.error(e);
      toast.error("Upload failed");
    }
  };

  const handlePaste = (e: React.ClipboardEvent, qi: number) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith("image/")) {
        e.preventDefault();
        handleImageUpload(file, qi);
      }
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sets/${encodeURI(setPath)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: questions }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to save");
      } else {
        toast.success("Saved successfully");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error saving");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/sets/manage">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Editing</p>
          <h1 className="text-lg font-semibold truncate">{setPath}.json</h1>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {questions.length} questions
        </Badge>
        <Button onClick={save} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
          Save
        </Button>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed rounded-xl gap-3">
            <FileQuestion className="h-10 w-10 opacity-40" />
            <p className="text-sm">No questions yet. Add one below.</p>
          </div>
        ) : (
          questions.map((q, qi) => (
            <div
              key={qi}
              className="rounded-xl border bg-card overflow-hidden"
              onPaste={(e) => handlePaste(e, qi)}
            >
              {/* Question header bar */}
              <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
                <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                <Badge variant="outline" className="shrink-0 font-mono text-xs">
                  #{qi + 1}
                </Badge>
                <Input
                  value={q.type}
                  onChange={(e) => updateQuestion(qi, { type: e.target.value })}
                  className="w-36 h-7 text-xs bg-transparent border-muted"
                  placeholder="type"
                />
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(qi)}
                  className="text-muted-foreground hover:text-destructive h-7 px-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="p-4 space-y-5">
                {/* Question text */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Question</Label>
                  <Textarea
                    value={q.question}
                    onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                    placeholder={`Question #${qi + 1}`}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Answer Options</Label>
                  <div className="space-y-2">
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2 group">
                        <button
                          type="button"
                          onClick={() => updateOption(qi, oi, { istrue: !o.istrue })}
                          className={cn(
                            "shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                            o.istrue
                              ? "border-green-500 bg-green-500/10 text-green-500"
                              : "border-muted-foreground/30 hover:border-green-500/50"
                          )}
                          title="Toggle correct answer"
                        >
                          {o.istrue
                            ? <CheckCircle2 className="h-3.5 w-3.5" />
                            : <Circle className="h-3.5 w-3.5 opacity-30" />}
                        </button>
                        <Input
                          value={o.statement}
                          onChange={(e) => updateOption(qi, oi, { statement: e.target.value })}
                          placeholder={`Choice ${oi + 1}`}
                          className={cn(
                            "h-8 text-sm flex-1",
                            o.istrue && "border-green-500/40 bg-green-500/5"
                          )}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(qi, oi)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive h-8 w-8 p-0 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addOption(qi)}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Add option
                  </Button>
                </div>

                {/* Image */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Image <span className="normal-case font-normal">(optional)</span>
                  </Label>
                  {q.image && (
                    <div className="relative inline-block">
                      <img
                        src={`/api/images-serve/${encodeURI(q.image)}`}
                        alt="question"
                        className="max-h-40 rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-80"
                        onClick={async () => {
                          const delRes = await fetch(`/api/images/${encodeURI(q.image!)}`, { method: "DELETE" });
                          if (!delRes.ok) {
                            const msg = await delRes.json().catch(() => ({}));
                            toast.error(msg.message || "Failed to delete image");
                          } else {
                            updateQuestion(qi, { image: undefined });
                            toast.success("Image removed");
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={q.image || ""}
                      onChange={(e) => updateQuestion(qi, { image: e.target.value || undefined })}
                      placeholder={`e.g. ${setPath}/image.png`}
                      className="h-8 text-xs flex-1"
                    />
                    <label className={cn(
                      "h-8 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 cursor-pointer",
                      "bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                    )}>
                      <ImageIcon className="h-3.5 w-3.5" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(ev) => {
                          const file = ev.target.files?.[0];
                          if (file) handleImageUpload(file, qi);
                        }}
                      />
                    </label>
                  </div>
                  <div
                    tabIndex={0}
                    className="p-3 rounded-lg border border-dashed text-center text-xs text-muted-foreground cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors focus:outline-none focus:border-primary"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleImageUpload(file, qi);
                    }}
                  >
                    Drag &amp; drop or paste an image here
                  </div>
                </div>

                {/* Explanation */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Explanation</Label>
                  <Textarea
                    value={q.explanation}
                    onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                    rows={2}
                    placeholder="Why is this the correct answer?"
                    className="resize-none text-sm"
                  />
                </div>
              </div>
            </div>
          ))
        )}

        {/* Add question */}
        {!loading && (
          <Button
            variant="outline"
            onClick={addQuestion}
            leftIcon={<Plus className="h-4 w-4" />}
            className="w-full border-dashed text-muted-foreground hover:text-foreground"
          >
            Add Question
          </Button>
        )}
      </div>

      {/* Bottom save bar */}
      {questions.length > 0 && (
        <div className="sticky bottom-4 flex justify-end">
          <div className="bg-card border rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{questions.length} questions</span>
            <Button onClick={save} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

