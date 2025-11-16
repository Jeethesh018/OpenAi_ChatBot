import { useCallback, useRef, useState } from "react";

type UseGroqResponseReturn = {
  outputText: string | null;
  loading: boolean;
  error: Error | null;
  send: (inputVal: string, options?: { model?: string }) => Promise<string | null>;
  abort: () => void;

  reset: () => void;
};

export function useGroqResponse(): UseGroqResponseReturn {
  const [outputText, setOutputText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    abort();
    setOutputText(null);
    setError(null);
    setLoading(false);
  }, [abort]);

  const send = useCallback(
    async (inputVal: string, options?: { model?: string }) => {
      // abort previous request (optional choice)
      abort();

      const apiKey = import.meta.env.VITE_GROQ_KEY;
      if (!apiKey) {
        const e = new Error("Missing VITE_GROQ_KEY in environment");
        setError(e);
        console.error("❌", e.message);
        return null;
      }

      const controller = new AbortController();
      controllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("https://api.groq.com/openai/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: options?.model ?? "openai/gpt-oss-20b",
            input: inputVal,
          }),
        });

        // If aborted, throw so we handle it consistently
        if (controller.signal.aborted) {
          throw new Error("Request aborted");
        }

        const data = await response.json();

        // Extract ONLY first output_text (ignore reasoning_text)
        let foundOutput: string | null = null;

        if (Array.isArray(data?.output)) {
          for (const outEntry of data.output) {
            if (!Array.isArray(outEntry?.content)) continue;

            for (const c of outEntry.content) {
              if (c?.type === "output_text" && typeof c?.text === "string") {
                foundOutput = c.text.trim();
                break;
              }
            }

            if (foundOutput) break;
          }
        }

        // fallback to top-level output_text if present
        if (!foundOutput && typeof data?.output_text === "string") {
          foundOutput = data.output_text.trim();
        }

        if (!foundOutput) {
          // no output_text found — treat as null (you can change to throw)
          console.warn("⚠️ No output_text found in Groq response", data);
          setOutputText(null);
          setLoading(false);
          return null;
        }

        setOutputText(foundOutput);
        setLoading(false);
        return foundOutput;
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // aborted — do not set an error (optional)
          setLoading(false);
          controllerRef.current = null;
          return null;
        }

        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setLoading(false);
        console.error("❌ Error in useGroqResponse.send:", e);
        return null;
      } finally {
        // clear controller if it's still the same one
        if (controllerRef.current && controllerRef.current.signal === controllerRef.current?.signal) {
          controllerRef.current = null;
        }
      }
    },
    [abort]
  );

  return {
    outputText,
    loading,
    error,
    send,
    abort,
    reset,
  };
}

export default useGroqResponse;
