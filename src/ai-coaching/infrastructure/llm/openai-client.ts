
import OpenAI from 'openai';

export interface OpenAIResponse {
  content: string;
  tokensUsed: number;
}

export class OpenAIClient {
  private readonly openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async predict(prompt: string, model: string): Promise<OpenAIResponse> {
    const response = await this.openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      content: response.choices[0].message.content,
      tokensUsed: response.usage.total_tokens,
    };
  }
}
