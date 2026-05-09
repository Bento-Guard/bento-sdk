import axios from 'axios';
type GeminiRole = "user" | "model";

type GeminiContent = {
  role: GeminiRole;
  parts: Array<{ text: string }>;
};

export type AgentPlan =
  | {
      type: "ACTION";
      intent: string;
      message: string;
    }
  | {
      type: "CHAT";
      message: string;
    };

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

const SYSTEM_INSTRUCTION = `
You are a terminal-based autonomous crypto agent.
Convert the user's request into a concise natural-language intent that can be
sent to a transaction protection layer before execution.

Return only valid JSON. No markdown, no code fences.

Schema:
{
  "type": "ACTION" | "CHAT",
  "intent": "required only for ACTION",
  "message": "short terminal-friendly response"
}

Use ACTION only when the user asks to perform a blockchain, wallet, token,
swap, transfer, staking, contract, protocol, approval, account, or portfolio action.
Use CHAT for greetings, explanations, unclear requests, or questions that do not
require an executable action.

The intent must be explicit and security-reviewable. Include asset, amount,
destination/protocol, chain/network, and any risk-relevant details when present.
If details are missing but the user's request is still action-like, create an
intent that clearly states the missing/unknown details instead of inventing them.
`;

export class GeminiAgent {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly history: GeminiContent[] = [];

  constructor(
    apiKey = process.env.GEMINI_API_KEY || "",
    model = process.env.GEMINI_MODEL || "gemini-2.5-flash",
  ) {
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in environment");
    }

    this.apiKey = apiKey;
    this.model = model;
  }

  async plan(userInput: string): Promise<AgentPlan> {
    const modelPath = this.model.startsWith("models/")
      ? this.model
      : `models/${this.model}`;
    const contents: GeminiContent[] = [
      ...this.history,
      {
        role: "user",
        parts: [{ text: userInput }],
      },
    ];

    const response = await axios.post(
      `${GEMINI_ENDPOINT}/${modelPath}:generateContent?key=${this.apiKey}`,
      {
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      },
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    const text = extractText(response.data);
    const plan = parsePlan(text);

    this.history.push({
      role: "user",
      parts: [{ text: userInput }],
    });
    this.history.push({
      role: "model",
      parts: [{ text: JSON.stringify(plan) }],
    });

    return plan;
  }
}

function extractText(payload: any): string {
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part?.text)
    .filter(Boolean)
    .join("");

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}

function parsePlan(text: string): AgentPlan {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      type: "CHAT",
      message: cleaned,
    };
  }

  if (parsed?.type === "ACTION" && typeof parsed.intent === "string") {
    return {
      type: "ACTION",
      intent: parsed.intent.trim(),
      message:
        typeof parsed.message === "string" && parsed.message.trim()
          ? parsed.message.trim()
          : "Prepared an action intent for security review.",
    };
  }

  return {
    type: "CHAT",
    message:
      typeof parsed?.message === "string" && parsed.message.trim()
        ? parsed.message.trim()
        : "I need a clearer action request before creating an intent.",
  };
}
