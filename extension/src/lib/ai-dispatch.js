import { embedTexts as openaiEmbedTexts } from "./openai.js";
import { chatCompletionJson as openaiChatCompletionJson } from "./openai.js";
import { geminiEmbedTexts, geminiGenerateJsonText } from "./gemini.js";

/**
 * @typedef {import("./ai-config.js").ResolvedAiConfig} ResolvedAiConfig
 */

/**
 * @param {ResolvedAiConfig} config
 * @param {string[]} inputs
 * @returns {Promise<number[][]>}
 */
export async function embedTextsForConfig(config, inputs) {
  if (config.provider === "gemini") {
    return geminiEmbedTexts(config.apiKey, config.embeddingModel, inputs);
  }
  return openaiEmbedTexts(config.apiKey, inputs, config.embeddingModel);
}

/**
 * @param {ResolvedAiConfig} config
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function embedQueryForConfig(config, text) {
  const [v] = await embedTextsForConfig(config, [text]);
  return v;
}

/**
 * OpenAI-shaped completion result for shared parsing in background.
 * @param {ResolvedAiConfig} config
 * @param {{ messages: { role: string; content: string }[] }} body
 */
export async function chatCompletionJsonForConfig(config, body) {
  if (config.provider === "gemini") {
    const raw = await geminiGenerateJsonText(config.apiKey, config.chatModel, body.messages);
    return { choices: [{ message: { content: raw } }] };
  }
  return openaiChatCompletionJson(config.apiKey, config.chatModel, body);
}
