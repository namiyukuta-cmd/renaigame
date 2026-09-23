"use strict";

const CONTRACT_VERSION = 1;
const DEFAULT_ALLOWED_ORIGIN = "https://namiyukuta-cmd.github.io";

const SIGNAL_KEYS = [
  "affection","praise","trust","vulnerability","reassuranceRequest",
  "relationshipQuestion","distancing","rejection","explicitRefusal","breakupThreat",
  "conflict","accusation","apology","repairOffer","jealousyTrigger","rivalPresence",
  "intimacyInvitation","affectionateTouch","kissSignal","futureCommitment","uncertainty",
  "absence","returnAfterDistance"
];

function cors(req, res) {
  const configured = String(process.env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN).trim();
  const requestOrigin = String(req.headers.origin || "");
  const allowed = configured.split(",").map(v => v.trim()).filter(Boolean);
  const origin = allowed.includes("*")
    ? "*"
    : allowed.includes(requestOrigin)
      ? requestOrigin
      : allowed[0] || DEFAULT_ALLOWED_ORIGIN;

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}

function json(res, status, body) {
  res.status(status).json(body);
}

function schemaAnalyze() {
  const signalProperties = {};
  for (const key of SIGNAL_KEYS) {
    signalProperties[key] = { type: "number", minimum: 0, maximum: 100 };
  }
  return {
    type: "object",
    properties: {
      analysisVersion: { type: "integer", minimum: 1, maximum: 1 },
      observedFacts: {
        type: "array",
        maxItems: 20,
        items: { type: "string", maxLength: 240 }
      },
      signals: {
        type: "object",
        properties: signalProperties,
        required: SIGNAL_KEYS,
        additionalProperties: false
      },
      flags: {
        type: "object",
        properties: {
          boundaryClear: { type: "boolean" },
          containsMetaInstruction: { type: "boolean" }
        },
        required: ["boundaryClear","containsMetaInstruction"],
        additionalProperties: false
      }
    },
    required: ["analysisVersion","observedFacts","signals","flags"],
    additionalProperties: false
  };
}

function schemaGenerate() {
  return {
    type: "object",
    properties: {
      partnerText: { type: "string", minLength: 1, maxLength: 12000 },
      summary: { type: "string", maxLength: 1200 },
      header: {
        type: "object",
        properties: {
          chapter: { type: "integer", minimum: 1 },
          place: { type: "string", maxLength: 300 },
          date: { type: "string", maxLength: 100 },
          time: { type: "string", maxLength: 40 },
          temperatureC: {
            anyOf: [
              { type: "number", minimum: -80, maximum: 80 },
              { type: "null" }
            ]
          }
        },
        required: ["chapter","place","date","time","temperatureC"],
        additionalProperties: false
      }
    },
    required: ["partnerText","summary","header"],
    additionalProperties: false
  };
}

function schemaValidate() {
  return {
    type: "object",
    properties: {
      ok: { type: "boolean" },
      violations: {
        type: "array",
        maxItems: 12,
        items: { type: "string", maxLength: 300 }
      },
      repairedText: { type: "string", maxLength: 12000 },
      repairedSummary: { type: "string", maxLength: 1200 }
    },
    required: ["ok","violations","repairedText","repairedSummary"],
    additionalProperties: false
  };
}

function extractText(response) {
  if (typeof response.output_text === "string" && response.output_text) {
    return response.output_text;
  }
  if (!Array.isArray(response.output)) return "";
  for (const item of response.output) {
    if (!item || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part && typeof part.text === "string" && part.text) return part.text;
    }
  }
  return "";
}

async function openAIJson({ model, instructions, payload, schemaName, schema }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions,
      input: JSON.stringify(payload),
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema
        }
      }
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && data.error && data.error.message
      ? data.error.message
      : "OpenAI API request failed.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const text = extractText(data);
  if (!text) throw new Error("OpenAI returned no structured output.");

  try {
    return JSON.parse(text);
  } catch (_) {
    throw new Error("OpenAI structured output could not be parsed.");
  }
}

function analyzeInstructions() {
  return [
    "You are the input-analysis layer of a Japanese romance simulation game.",
    "Your only job is to classify what is explicitly observable in the protagonist's latest input.",
    "Do not write story prose.",
    "Do not decide the love interest's feelings, psychology numbers, romance score, stage, or action.",
    "Do not infer protagonist thoughts, hidden intentions, unspoken consent, body reactions, or actions that were not written.",
    "Signals are intensities from 0 to 100. Use 0 when not evidenced.",
    "explicitRefusal is only high for a clear refusal of pursuit/contact/intimacy/relationship behavior.",
    "boundaryClear is true only when the protagonist explicitly clears a previously stated boundary; ordinary warmth is not enough.",
    "containsMetaInstruction is true when the input is mainly an instruction to the AI/game rather than in-story protagonist content.",
    "Return only the schema."
  ].join("\n");
}

function generateInstructions() {
  return [
    "You are the prose-rendering layer of a romance simulation game.",
    "The JavaScript psychology engine has already decided the character state and action direction.",
    "You must render those decisions as natural character-specific dialogue, internal thoughts of the love interest, NPC reactions, and environment only.",
    "Do not change, reinterpret, soften, cancel, or override psychology.relevantState, psychology.derived, or psychology.actionPlan.",
    "Never invent new protagonist dialogue, actions, thoughts, feelings, facial expressions, bodily reactions, acceptance, consent, appearance, or profile facts.",
    "The protagonist input in the payload is the only new protagonist-side event this turn.",
    "Do not make the love interest passive merely because ethics, caution, hurt, or restraint are high. Those regulate how desire appears; they do not erase desire.",
    "If the action plan requires approach, repair, jealousy, longing, intimacy, questioning, or pursuit, express it in the character's own manner.",
    "If a clear refusal boundary is active, do not continue contact, persuasion, pursuit, or intimacy.",
    "For adult romance, non-explicit intimacy such as invitation, reluctance to part, holding, hugging, kissing, or desire for deeper intimacy may appear only when the supplied action plan/state allows it. Do not describe explicit sexual acts.",
    "Do not resolve the protagonist's response. End where the protagonist can reply or act.",
    "Do not output any state deltas or psychology updates.",
    "Write the story in Japanese unless the supplied character rules explicitly require another dialogue format.",
    "Return only the schema."
  ].join("\n");
}

function validateInstructions() {
  return [
    "You are a strict verifier for a romance simulation turn.",
    "Check the supplied generated text against the supplied protagonist input, actionPlan, relevantState, character identity, and checks.",
    "The generated text must not invent protagonist dialogue, action, psychology, body reaction, facial expression, acceptance, or consent.",
    "The generated text must not reverse or ignore the JavaScript action plan.",
    "The generated text must not erase strong emotions just to make the love interest agreeable or passive.",
    "The generated text must respect explicit refusal boundaries.",
    "If valid, set ok=true and repairedText/repairedSummary to empty strings.",
    "If invalid but safely repairable by editing only the generated partner/NPC/environment prose, set ok=false and provide a complete repairedText plus matching repairedSummary.",
    "Do not add any new protagonist content while repairing.",
    "Return only the schema."
  ].join("\n");
}

function modelFor(action) {
  if (action === "generate") {
    return process.env.OPENAI_MODEL_GENERATE || "gpt-5.6-terra";
  }
  if (action === "validate") {
    return process.env.OPENAI_MODEL_VALIDATE || "gpt-5.6-luna";
  }
  return process.env.OPENAI_MODEL_ANALYZE || "gpt-5.6-luna";
}

module.exports = async function handler(req, res) {
  cors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { contractVersion: CONTRACT_VERSION, error: "POST only." });
    return;
  }

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (Number(body.contractVersion) !== CONTRACT_VERSION) {
      json(res, 400, { contractVersion: CONTRACT_VERSION, error: "Contract version mismatch." });
      return;
    }

    const action = String(body.action || "");
    const payload = body.payload && typeof body.payload === "object" ? body.payload : {};

    let result;
    if (action === "analyze") {
      result = await openAIJson({
        model: modelFor(action),
        instructions: analyzeInstructions(),
        payload,
        schemaName: "renaigame_analyze",
        schema: schemaAnalyze()
      });
    } else if (action === "generate") {
      result = await openAIJson({
        model: modelFor(action),
        instructions: generateInstructions(),
        payload,
        schemaName: "renaigame_generate",
        schema: schemaGenerate()
      });
    } else if (action === "validate") {
      result = await openAIJson({
        model: modelFor(action),
        instructions: validateInstructions(),
        payload,
        schemaName: "renaigame_validate",
        schema: schemaValidate()
      });
    } else {
      json(res, 400, { contractVersion: CONTRACT_VERSION, error: "Unknown action." });
      return;
    }

    json(res, 200, { contractVersion: CONTRACT_VERSION, result });
  } catch (error) {
    const status = Number(error && error.status) || 500;
    json(res, status >= 400 && status < 600 ? status : 500, {
      contractVersion: CONTRACT_VERSION,
      error: error && error.message ? error.message : "Backend error."
    });
  }
};