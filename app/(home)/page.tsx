"use client";
import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

import CodeViewer from "@/components/CodeViewer";
import { useScrollTo } from "@/hooks/use-scroll-to";

function removeCodeFormatting(code: string): string {
  return code
    .replace(/```(?:typescript|javascript|tsx)?\n([\s\S]*?)```/g, "$1")
    .trim();
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<
    "initial" | "creating" | "created" | "updating" | "updated"
  >("initial");
  const [generatedCode, setGeneratedCode] = useState("");
  const [ref, scrollTo] = useScrollTo();

  const loading = status === "creating" || status === "updating";

  /**
   * Load cached code from localStorage when the component mounts
   * and set the status to "created" if cached code is found.
   * This function is called in the useEffect hook.
   * It checks if there is any cached code in localStorage
   * and if so, it sets the generatedCode state to that cached code
   */
  const loadCachedCode = useCallback(() => {
    const cachedCode = localStorage.getItem("generatedCode");
    if (cachedCode) {
      setGeneratedCode(cachedCode);
      setStatus("created");
    }
  }, []);

  useEffect(() => {
    // Load cached code from localStorage when the component mounts
    loadCachedCode();
  }, [loadCachedCode]);

  /**
   * Handle form submission
   * This function is called when the user submits the form.
   * It prevents the default form submission behavior,
   * checks if the prompt is empty, and if not, it sets the status to "creating",
   * clears the generated code, and makes a POST request to the backend API.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status !== "initial") {
      scrollTo({ delay: 0.5 });
    }

    if (!prompt) {
      return;
    }
    setStatus("creating");
    setGeneratedCode("");

    /**
     * 调用后端接口：接口路由为 /api/generate-code，对应的文件为 app/api/generate-code/route.ts
     * 该接口的作用是：
     * 1. 提交用户输入的 prompt
     * 2. 接收生成的代码
     * 3. 显示生成的代码
     * 4. 将生成的代码存储到 localStorage
     * 5. 更新状态为 "created"
     */
    const res = await fetch("/api/generate-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      alert("An error occurred: " + res.statusText);
      setStatus("initial");
      return;
    }

    if (!res.body) {
      alert("No response body received from the server.");
      setStatus("initial");
      return;
    }

    const reader = res.body.getReader();
    let receivedData = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      receivedData += new TextDecoder().decode(value);
      const cleanedData = removeCodeFormatting(receivedData);
      setGeneratedCode(cleanedData);
      localStorage.setItem("generatedCode", cleanedData);
    }

    setStatus("created");
  };

  useEffect(() => {
    const el = document.querySelector(".cm-scroller");
    console.log("el", el);
    if (el && loading) {
      const end = el.scrollHeight - el.clientHeight;
      el.scrollTo({ top: end });
    }
  }, [loading, generatedCode]);

  return (
    <main className="mt-12 flex w-full flex-1 flex-col items-center px-4 text-center sm:mt-1">
      <h1 className="text-2xl font-bold mb-4">Quick-AI-Coder</h1>
      <h3 className="my-6 max-w-3xl text-4xl font-bold text-gray-800 dark:text-white sm:text-6xl">
        Turn your <span className="text-blue-600">idea</span>
        <br /> into an <span className="text-blue-600">app</span>
      </h3>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-6 rounded-lg shadow-md"
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.trim())}
          placeholder="Enter your prompt here..."
          className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-transform transform"
        />
        <button
          type="submit"
          disabled={loading || !prompt}
          className={`w-full mt-4 py-2 px-4 rounded-lg transition-transform transform ${
            loading || !prompt
              ? "bg-gray-400 text-gray-700 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600 hover:scale-105"
          }`}
        >
          Submit
        </button>
      </form>

      <hr className="border-1 w-full mt-12 mb-12 h-px border-amber-100" />

      {!!generatedCode && (
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
          Last Generated Code
        </h2>
      )}

      {status !== "initial" && (
        <motion.div
          initial={{ height: 0 }}
          animate={{
            height: "auto",
            overflow: "hidden",
            transitionEnd: { overflow: "visible" },
          }}
          transition={{ type: "spring", bounce: 0, duration: 0.5 }}
          className="w-full pb-[25vh] pt-1"
          onAnimationComplete={() => scrollTo()}
          ref={ref}
        >
          <div className="relative mt-8 w-full overflow-hidden">
            <div className="isolate">
              <CodeViewer code={generatedCode} enableEdit={status === 'created'} />
            </div>

            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={status === "updating" ? { x: "100%" } : undefined}
                  animate={status === "updating" ? { x: "0%" } : undefined}
                  exit={{ x: "100%" }}
                  transition={{
                    type: "spring",
                    bounce: 0,
                    duration: 0.85,
                    delay: 0.5,
                  }}
                  className="absolute inset-x-0 bottom-0 top-1/2 flex items-center justify-center rounded-r border border-gray-400 dark:border-gray-700 bg-gradient-to-br from-gray-100 to-gray-300 dark:from-[#1E293B] dark:to-gray-800 md:inset-y-0 md:left-1/2 md:right-0"
                >
                  <p className="animate-pulse text-3xl font-bold dark:text-gray-100">
                    {status === "creating"
                      ? "Building your app..."
                      : "Updating your app..."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </main>
  );
}
