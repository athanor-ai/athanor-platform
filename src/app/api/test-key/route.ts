import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/test-key
 *
 * Tests an API key by making a lightweight request to the provider's API.
 * Returns the model name on success, or an error message on failure.
 *
 * Body: { provider: string; apiKey: string }
 * Response: { ok: boolean; model?: string; error?: string }
 */

type ProviderKey =
  | "openai"
  | "anthropic"
  | "gemini"
  | "azure_openai"
  | "bedrock";

interface TestKeyRequest {
  provider: ProviderKey;
  apiKey: string;
}

interface TestKeyResponse {
  ok: boolean;
  model?: string;
  error?: string;
}

async function testOpenAI(apiKey: string): Promise<TestKeyResponse> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `OpenAI API error (${res.status}): ${body.slice(0, 200)}` };
    }
    const data = await res.json();
    const models = data.data as { id: string }[];
    const preferred = models.find(
      (m) => m.id.includes("gpt-4") || m.id.includes("gpt-3.5"),
    );
    const modelName = preferred?.id ?? models[0]?.id ?? "OpenAI model";
    return { ok: true, model: modelName };
  } catch (err) {
    return { ok: false, error: `Connection error: ${String(err)}` };
  }
}

async function testAnthropic(apiKey: string): Promise<TestKeyResponse> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16,
        messages: [{ role: "user", content: "Reply with only: hello" }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Anthropic API error (${res.status}): ${body.slice(0, 200)}` };
    }
    const data = await res.json();
    const modelName = data.model ?? "Claude";
    return { ok: true, model: modelName };
  } catch (err) {
    return { ok: false, error: `Connection error: ${String(err)}` };
  }
}

async function testGemini(apiKey: string): Promise<TestKeyResponse> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Gemini API error (${res.status}): ${body.slice(0, 200)}` };
    }
    const data = await res.json();
    const models = data.models as { name: string; displayName: string }[];
    const preferred = models.find(
      (m) =>
        m.name.includes("gemini-2") || m.name.includes("gemini-1.5"),
    );
    const modelName =
      preferred?.displayName ?? models[0]?.displayName ?? "Gemini model";
    return { ok: true, model: modelName };
  } catch (err) {
    return { ok: false, error: `Connection error: ${String(err)}` };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: TestKeyRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { provider, apiKey } = body;

  if (!provider || !apiKey) {
    return NextResponse.json(
      { ok: false, error: "Missing provider or apiKey" },
      { status: 400 },
    );
  }

  let result: TestKeyResponse;

  switch (provider) {
    case "openai":
      result = await testOpenAI(apiKey);
      break;
    case "anthropic":
      result = await testAnthropic(apiKey);
      break;
    case "gemini":
      result = await testGemini(apiKey);
      break;
    case "azure_openai":
      result = {
        ok: false,
        error: "Azure OpenAI requires endpoint configuration. Key saved but not testable from this UI.",
      };
      break;
    case "bedrock":
      result = {
        ok: false,
        error: "AWS Bedrock requires IAM configuration. Key saved but not testable from this UI.",
      };
      break;
    default:
      result = { ok: false, error: `Unknown provider: ${provider}` };
  }

  return NextResponse.json(result);
}
