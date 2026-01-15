export interface AiGenerationOptions {
  temperature?: number;
  maxTokens?: number;
}

// 👇 Nova estrutura de resposta
export interface AiResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface AiProvider {
  // 👇 Muda o retorno de Promise<string> para Promise<AiResponse>
  generateText(prompt: string, options?: AiGenerationOptions): Promise<AiResponse>;
}

export const AI_PROVIDER = 'AI_PROVIDER';