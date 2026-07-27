import Anthropic from "@anthropic-ai/sdk";
import type { ClaudeAnalysisResult } from "./types";

const client = new Anthropic();

const MODEL = "claude-opus-5";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    foods: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "string" },
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" },
        },
        required: ["name", "quantity", "calories", "protein", "carbs", "fat"],
        additionalProperties: false,
      },
    },
    totalCalories: { type: "number" },
    totalProtein: { type: "number" },
    totalCarbs: { type: "number" },
    totalFat: { type: "number" },
    assumptions: { type: "string" },
  },
  required: [
    "foods",
    "totalCalories",
    "totalProtein",
    "totalCarbs",
    "totalFat",
    "assumptions",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a nutrition estimation assistant for a personal food-tracking app. Given a photo of a meal (and an optional user note), you:
1. Identify each distinct food item visible on the plate.
2. Estimate the quantity/portion of each item (e.g. "1 cup", "200g", "1 medium").
3. Estimate calories and macros (protein, carbs, fat in grams) per item, and totals across all items.
4. Factor in the optional user note if provided (it may clarify ingredients, cooking method, or portion size).
5. State your assumptions in a short, plain-English sentence (cooking method, hidden oil/dressing, portion size) — be transparent about uncertainty rather than silent about it.

Respond with your best estimate even if uncertain — this is for casual personal tracking, not medical use.`;

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

async function callClaude(
  base64Image: string,
  mediaType: ImageMediaType,
  userNote: string | null,
  extraInstruction?: string
) {
  const userText = userNote
    ? `Analyze this meal photo. User note: "${userNote}"`
    : "Analyze this meal photo.";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: "disabled" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: RESPONSE_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Image },
          },
          {
            type: "text",
            text: extraInstruction ? `${userText}\n\n${extraInstruction}` : userText,
          },
        ],
      },
    ],
  });

  return response;
}

export async function analyzeFoodPhoto(
  base64Image: string,
  mediaType: ImageMediaType,
  userNote: string | null
): Promise<ClaudeAnalysisResult> {
  let response = await callClaude(base64Image, mediaType, userNote);

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to analyze this photo.");
  }

  let textBlock = response.content.find((b) => b.type === "text");

  const tryParse = (text: string | undefined): ClaudeAnalysisResult | null => {
    if (!text) return null;
    try {
      return JSON.parse(text) as ClaudeAnalysisResult;
    } catch {
      return null;
    }
  };

  let parsed = tryParse(textBlock?.type === "text" ? textBlock.text : undefined);

  if (!parsed) {
    // Retry once with an explicit follow-up asking for valid JSON only.
    response = await callClaude(
      base64Image,
      mediaType,
      userNote,
      "Your previous response was not valid JSON. Respond again with ONLY the JSON object matching the required schema — no other text."
    );

    if (response.stop_reason === "refusal") {
      throw new Error("Claude declined to analyze this photo.");
    }

    textBlock = response.content.find((b) => b.type === "text");
    parsed = tryParse(textBlock?.type === "text" ? textBlock.text : undefined);
  }

  if (!parsed) {
    throw new Error("Could not analyze that photo, try again.");
  }

  return parsed;
}
