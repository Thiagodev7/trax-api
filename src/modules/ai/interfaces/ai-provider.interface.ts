export interface AiGenerationOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface AiResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface AiProvider {
  generateText(prompt: string, options?: AiGenerationOptions): Promise<AiResponse>;
  
  // 👇 Novo método no contrato
  generateImage(prompt: string): Promise<string>; // Retorna Base64
}

export const AI_PROVIDER = 'AI_PROVIDER';