import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
// 👇 AQUI ESTAVA FALTANDO 'AiResponse'
import { AiProvider, AiGenerationOptions, AiResponse } from '../interfaces/ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider, OnModuleInit {
  private readonly logger = new Logger(GeminiProvider.name);
  private model: GenerativeModel;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('GOOGLE_API_KEY');
    const genAI = new GoogleGenerativeAI(this.apiKey);
    
    // Usando 'gemini-2.0-flash' que está na sua lista e é muito estável/gratuito
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async onModuleInit() {
    this.logger.log('🔍 Validando conexão com Gemini...');
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
      const data = await response.json();
      
      if (data.error) {
        this.logger.error('❌ Erro na chave de API:', data.error.message);
        return;
      }
      
      this.logger.log('✅ Conexão com Google AI estabelecida com sucesso.');
    } catch (error) {
      this.logger.error('Falha de conexão inicial.', error);
    }
  }

  async generateText(prompt: string, options?: AiGenerationOptions): Promise<AiResponse> {
    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 1000,
        },
      });

      const response = result.response;
      const text = response.text();
      
      // Captura o uso de tokens (ou 0 se a API não retornar)
      const usageMetadata = response.usageMetadata;
      const inputTokens = usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;

      if (!text) throw new Error('Gemini retornou resposta vazia.');

      // Retorna o objeto completo
      return {
        content: text,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
      };
    } catch (error: any) {
      console.error('🔴 ERRO REAL:', error.message || error);
      
      if (error.response) {
        console.error('Detalhes da API:', JSON.stringify(error.response, null, 2));
      }

      throw new InternalServerErrorException('Falha ao gerar conteúdo com IA.');
    }
  }
}