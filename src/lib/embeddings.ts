export async function embedText(text: string, fetchImpl: typeof fetch = fetch): Promise<number[]> {
  const response = await fetchImpl("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: text, model: "text-embedding-3-small" }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI embedding request failed: ${response.status}`);
  }
  const data = await response.json();
  return data.data[0].embedding as number[];
}
