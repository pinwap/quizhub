"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Save, ArrowLeft, Check, Folder, FolderPlus } from "lucide-react";

export default function ImportPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [folders, setFolders] = useState<
    { name: string; path: string; fileCount: number; files: string[] }[]
  >([]);
  const [selectedFolder, setSelectedFolder] = useState("random");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const response = await fetch("/api/folders");
      const data = await response.json();
      setFolders(data.folders || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Please enter a folder name.");
      return;
    }

    try {
      setCreatingFolder(true);
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });

      if (response.ok) {
        const result = await response.json();
        setFolders([...folders, result.folder]);
        setSelectedFolder(result.folder.name);
        setNewFolderName("");
        setShowNewFolder(false);
        toast.success("Folder created successfully!");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create folder.");
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Error creating folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both title and content.");
      return;
    }

    try {
      setSaving(true);
      let jsonData;
      try {
        jsonData = JSON.parse(content);
      } catch (error) {
        toast.error("Invalid JSON content.");
        return;
      }

      // Sanitize filename: replace spaces with underscores and remove forward slashes
      const sanitizedTitle = title
        .trim()
        .replace(/\s+/g, "_")
        .replace(/\//g, "_");

      const response = await fetch("/api/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sanitizedTitle,
          data: jsonData,
          folder: selectedFolder,
        }),
      });

      if (response.ok) {
        toast.success("Set saved successfully!");
        router.push("/");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to save the set.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error saving set");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPrompt = () => {
    const prompt = `คุณเป็น 'ผู้ออกแบบข้อสอบ' คุณจะได้รับเนื้อหามาแล้วคุณจะออกข้อสอบอย่างมืออาชีพ คุณจะทดสอบความเข้าใจในหลายๆ ด้าน เช่น

Recall (การจดจำ)
Understanding (ความเข้าใจ)
Application (การประยุกต์ใช้)
Analysis (การวิเคราะห์)
Evaluation (การประเมินค่า)
และเขียนตอบใน Code block ตาม format ดังต่อไปนี้
JSON

{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "const": "multiple-choice"
      },
      "question": {
        "type": "string"
      },
      "options": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "statement": {
              "type": "string"
            },
            "istrue": {
              "type": "boolean"
            }
          },
          "required": [
            "statement",
            "istrue"
          ]
        }
      },
      "explanation": {
        "type": "string"
      }
    },
    "required": [
      "type",
      "question",
      "options",
      "explanation"
    ]
  }
}
Purpose and Goals:
สร้างชุดคำถามที่หลากหลายเพื่อประเมินความเข้าใจของผู้ใช้ในเนื้อหาที่ได้รับ
คำถามต้องครอบคลุมทักษะการคิดเชิงวิเคราะห์และการประยุกต์ใช้ความรู้ ไม่ใช่แค่การจดจำ
ให้คำตอบอยู่ในรูปแบบ JSON ที่เป็น multiple-choice ตามที่กำหนดไว้ในคำสั่ง
Behaviors and Rules:
Initial Inquiry: a. ทักทายผู้ใช้และแจ้งว่าคุณพร้อมที่จะสร้างข้อสอบปรนัย (multiple-choice) จากเนื้อหาที่พวกเขามอบให้ b. ขอให้ผู้ใช้ระบุเนื้อหาที่ต้องการให้สร้างคำถาม c. หากผู้ใช้ยังไม่มีเนื้อหา ให้เสนอหัวข้อทั่วไปเพื่อสร้างตัวอย่างคำถาม
Question Generation and Presentation: a. วิเคราะห์เนื้อหาที่ได้รับอย่างละเอียดเพื่อสร้างคำถามที่เหมาะสม b. สร้างคำถามอย่างน้อย 5 ข้อที่ครอบคลุมประเภทต่างๆ ที่ระบุไว้ c. จัดรูปแบบคำตอบให้อยู่ใน Code block และตรวจสอบให้แน่ใจว่าเป็น JSON ที่ถูกต้องตาม schema ที่ให้มา d. สำหรับช่อง "question" ให้สร้างเป็นข้อความคำถามที่สมบูรณ์ โดยห้ามใส่ประเภทของคำถาม เช่น (Recall) เข้าไปในข้อความโดยเด็ดขาด e. สำหรับช่อง "explanation" ให้เขียนเป็นคำอธิบายเชิงข้อเท็จจริง (Factual Statement) ที่กระชับและตรงไปตรงมา โดยอธิบายเหตุผลว่าทำไมคำตอบนั้นจึงถูกต้อง ห้ามขึ้นต้นด้วยข้อความชี้นำ เช่น "คำตอบที่ถูกต้องคือ", "จากเนื้อหา", หรือ "ถูกต้องครับ"
Overall Tone:
ใช้ภาษาที่เป็นทางการและเป็นมืออาชีพ
แสดงความสามารถและความเชี่ยวชาญในการออกแบบข้อสอบ
ให้คำตอบที่ชัดเจนและแม่นยำ
หลีกเลี่ยงการใช้คำพูดที่ดูเป็นกันเองมากเกินไป`;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Home
          </Button>
        </Link>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold gradient-text">
          Import Question Set
        </h1>
        <p className="text-muted-foreground">
          Enter the title and paste the JSON content of your question set.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Set Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title (Filename)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter the title for your question set"
            />
            {title.trim() && (
              <p className="text-xs text-muted-foreground">
                Filename:{" "}
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  {title.trim().replace(/\s+/g, "_").replace(/\//g, "_")}.json
                </code>
              </p>
            )}
          </div>

          {/* Folder */}
          <div className="space-y-2">
            <Label>Folder</Label>
            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger>
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                {folders.map((folder) => (
                  <SelectItem key={folder.name} value={folder.name}>
                    📁 {folder.name} ({folder.fileCount} files)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!showNewFolder ? (
              <Button
                onClick={() => setShowNewFolder(true)}
                variant="outline"
                leftIcon={<FolderPlus className="h-4 w-4" />}
                className="w-full"
              >
                Create New Folder
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateFolder}
                    loading={creatingFolder}
                    leftIcon={<Folder className="h-4 w-4" />}
                    className="flex-1"
                  >
                    Create Folder
                  </Button>
                  <Button
                    onClick={() => {
                      setShowNewFolder(false);
                      setNewFolderName("");
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="content">Question Set Content (JSON)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your JSON question set here"
              rows={20}
              className="font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleCopyPrompt}
              variant="outline"
              leftIcon={
                copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )
              }
              className={copied ? "border-green-500 text-green-600" : ""}
            >
              {copied ? "Copied!" : "Copy Prompt"}
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save Question Set
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
