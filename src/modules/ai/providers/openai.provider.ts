// import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import OpenAI from 'openai';
// import { AiProvider, AiGenerationOptions } from '../interfaces/ai-provider.interface';

// @Injectable()
// export class OpenAiProvider implements AiProvider {
//   private readonly logger = new Logger(OpenAiProvider.name);
//   private readonly client: OpenAI;

//   constructor(private readonly configService: ConfigService) {
//     const apiKey = this.configService.getOrThrow<string>('API_KEY_OPENAI');
//     this.client = new OpenAI({ apiKey });
//   }

//   async generateText(prompt: string, options?: AiGenerationOptions): Promise<string> {
//     try {
//       const response = await this.client.chat.completions.create({
//         model: 'gpt-4o', // Ou 'gpt-4-turbo' / 'gpt-3.5-turbo' para testes mais baratos
//         messages: [{ role: 'user', content: prompt }],
//         temperature: options?.temperature ?? 0.7,
//         max_tokens: options?.maxTokens ?? 1000,
//       }); 

//       const content = response.choices[0]?.message?.content;
      
//       if (!content) {
//         throw new Error('OpenAI retornou uma resposta vazia.');
//       }

//       return content;
//     } catch (error) {
//       this.logger.error('Erro ao chamar OpenAI:', error);
//       // Aqui poderíamos implementar retries ou circuit breaker
//       throw new InternalServerErrorException('Falha ao gerar conteúdo com IA.');
//     }
//   }
// }