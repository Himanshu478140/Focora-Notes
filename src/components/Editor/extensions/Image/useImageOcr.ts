"use client";

import { useState, useCallback } from "react";

export function useImageOcr() {
  const [ocrStatus, setOcrStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrMessage, setOcrMessage] = useState("");

  const runOcr = useCallback(async (resolvedSrc: string | null, onTextExtracted: (text: string) => void) => {
    if (!resolvedSrc) return;
    if (ocrStatus === "loading") return;

    setOcrStatus("loading");
    setOcrProgress(0);
    setOcrMessage("Initializing OCR...");

    let worker: any = null;
    try {
      const { createWorker } = await import("tesseract.js");

      worker = await createWorker("eng", undefined, {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
            setOcrMessage(`Extracting text... ${Math.round(m.progress * 100)}%`);
          } else {
            setOcrMessage(m.status.replace(/_/g, " "));
          }
        }
      });

      const { data: { text } } = await worker.recognize(resolvedSrc);

      const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();

      if (cleaned) {
        onTextExtracted(cleaned);
      }

      setOcrStatus("success");
      setOcrMessage("Text extracted successfully!");

      setTimeout(() => {
        setOcrStatus("idle");
        setOcrProgress(0);
        setOcrMessage("");
      }, 3000);

    } catch (error: any) {
      console.error("OCR Error:", error);
      setOcrStatus("error");
      setOcrMessage("OCR failed (CORS or image error)");

      setTimeout(() => {
        setOcrStatus("idle");
        setOcrProgress(0);
        setOcrMessage("");
      }, 5000);
    } finally {
      if (worker) {
        await worker.terminate();
      }
    }
  }, [ocrStatus]);

  return { ocrStatus, ocrProgress, ocrMessage, runOcr };
}
