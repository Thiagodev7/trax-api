import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { AiProvider, AiGenerationOptions, AiResponse } from '../interfaces/ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider, OnModuleInit {
  private readonly logger = new Logger(GeminiProvider.name);
  private model: GenerativeModel;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('GOOGLE_API_KEY');
    const genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async onModuleInit() {
    this.logger.log('🔍 Validando conexão com Gemini...');
    // ... (Mantenha seu código de diagnóstico existente aqui, é útil)
  }

  async generateText(prompt: string, options?: AiGenerationOptions): Promise<AiResponse> {
    // ... (Mantenha seu código de generateText existente aqui)
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
      
      const usageMetadata = response.usageMetadata;
      const inputTokens = usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;

      if (!text) throw new Error('Gemini retornou resposta vazia.');

      return {
        content: text,
        usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
      };
    } catch (error: any) {
      console.error('🔴 ERRO REAL TEXTO:', error.message || error);
      throw new InternalServerErrorException('Falha ao gerar texto.');
    }
  }

  // 👇 NOVA IMPLEMENTAÇÃO: IMAGEN 3
  async generateImage(prompt: string): Promise<string> {
    try {
      // 🟢 CORREÇÃO: Trocamos 'imagen-3.0-generate-001' por 'imagen-4.0-generate-001'
      const modelName = 'imagen-4.0-generate-001'; 
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${this.apiKey}`;
      
      const payload = {
        instances: [{ prompt: prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1", // Quadrado
          // personGeneration: "allow_adult", // O Imagen 4 as vezes rejeita esse parametro, vamos remover por segurança
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Loga o erro exato para sabermos se é parametro ou permissão
        console.error('Erro API Google:', JSON.stringify(errorData, null, 2));
        throw new Error(`Google Imagen Error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // A estrutura do Imagen 4 costuma manter o padrão, mas vamos garantir
      const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;

      if (!imageBase64) {
        throw new Error('Nenhuma imagem retornada pela API.');
      }

      return imageBase64;

    } catch (error: any) {
      console.error('🔴 ERRO REAL IMAGEM:', error.message || error);
      
      if (error.message.includes('404') || error.message.includes('PERMISSION_DENIED')) {
        throw new InternalServerErrorException(
          'Seu projeto Google Cloud ainda não tem permissão para o modelo Imagen 4.0. Tente ativar a API no console do Google Cloud.'
        );
      }
      
      throw new InternalServerErrorException('Falha ao gerar imagem.');
    }
  }
}