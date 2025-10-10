
import OpenAI from 'openai';

export interface OpenAIResponse {
  content: string;
  tokensUsed: number;
}

export class OpenAIClient {
  private readonly openai: OpenAI;

  constructor(apiKey: string | null | undefined) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required to initialise OpenAIClient');
    }

    this.openai = new OpenAI({ apiKey });
  }

  async predict(prompt: string, model: string): Promise<OpenAIResponse> {
    const response = await this.openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
    });

    const choice = response.choices?.[0];
    const content = choice?.message?.content?.trim() ?? '';
    const tokensUsed = response.usage?.total_tokens ?? 0;

    return { content, tokensUsed };
  }
}
