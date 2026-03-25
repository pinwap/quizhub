"use client";
import React from "react";
import DynamicRandomQuizPage from "../[setName]/page";
import { usePathname } from "next/navigation";

export default function RandomSlugPage() {
  const pathname = usePathname();
  // pathname like /quiz/random/set1/lecture9-2 -> take last segment as setName
  const segments = pathname.split("/").filter(Boolean);
  const setName = segments[segments.length - 1];
  return <DynamicRandomQuizPage />;
}
