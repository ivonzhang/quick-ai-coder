import dedent from "dedent";
import { z } from "zod";
import OpenAI from "openai";

const apiKey = process.env.DEEPSEEK_AI_API_KEY || "";

const genAI = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey,
});

export async function POST(req: Request) {
  const json = await req.json();
  const result = z
    .object({
      messages: z.array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        }),
      ),
    })
    .safeParse(json);

  if (result.error) {
    return new Response(result.error.message, { status: 422 });
  }

  const { messages } = result.data;
  const systemPrompt = getSystemPrompt();

  const deepseekStream = await genAI.chat.completions.create({
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    model: "deepseek-chat",
    stream: true,
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      // const decoder = new TextDecoder();
      const encoder = new TextEncoder();

      try {
        for await (const chunk of deepseekStream) {
          const chunkText = chunk.choices[0].delta?.content || "";
          console.log("chunkText", chunkText);
          controller.enqueue(encoder.encode(chunkText));
        }
      } catch (error) {
        console.error("Error reading from stream:", error);
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain" },
  });
}

function getSystemPrompt() {
  let systemPrompt = `You are an expert frontend React engineer who is also a great UI/UX designer. Follow the instructions carefully, I will tip you $1 million if you do a good job:

- Think carefully step by step.
- Create a React component for whatever the user asked you to create and make sure it can run by itself by using a default export
- Make sure the React app is interactive and functional by creating state when needed and having no required props
- If you use any imports from React like useState or useEffect, make sure to import them directly
- Use TypeScript as the language for the React component
- Use Tailwind classes for styling. DO NOT USE ARBITRARY VALUES (e.g. \`h-[600px]\`). Make sure to use a consistent color palette.
- Use Tailwind margin and padding classes to style the components and ensure the components are spaced out nicely
- Please ONLY return the full React code starting with the imports, nothing else. It's very important for my job that you only return the React code with imports. DO NOT START WITH \`\`\`typescript or \`\`\`javascript or \`\`\`tsx or \`\`\`.
- ONLY IF the user asks for a dashboard, graph or chart, the recharts library is available to be imported, e.g. \`import { LineChart, XAxis, ... } from "recharts"\` & \`<LineChart ...><XAxis dataKey="name"> ...\`. Please only use this when needed.
- For placeholder images, please use a <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
  `;

  systemPrompt += `
    NO OTHER LIBRARIES (e.g. zod, hookform) ARE INSTALLED OR ABLE TO BE IMPORTED.
  `;

  return dedent(systemPrompt);
}

export const runtime = "edge";