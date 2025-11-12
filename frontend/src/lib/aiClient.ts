export type AIRequestType = 'diagram' | 'task';

export async function generateAI<T>(params: { type: AIRequestType; prompt: string }): Promise<T> {
  const { type, prompt } = params;
  const endpoint =
    type === 'diagram' ? '/api/ai/generate-diagram' : '/api/ai/parse-task';

  // Build request body per endpoint contract
  const body =
    type === 'diagram'
      ? { prompt, type: 'mermaid' }
      : { prompt };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI request failed (${res.status}): ${text || res.statusText}`);
  }

  return res.json() as Promise<T>;
}


