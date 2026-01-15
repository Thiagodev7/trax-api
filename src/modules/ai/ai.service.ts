import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AI_PROVIDER, AiProvider } from './interfaces/ai-provider.interface';
import { PrismaService } from '../../database/prisma.service';
import { ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';

@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly prisma: PrismaService,
  ) {}

  async generateCampaignCopy(
    productName: string, 
    objective: string, 
    user: ActiveUserData
  ) {
    // 1. Descobrir Workspace
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.sub },
      select: { workspaceId: true },
    });

    if (!member) throw new NotFoundException('Workspace não encontrado');

    // 🚀 PROMPT DE ALTA PERFORMANCE
    const prompt = `
      ATUE COMO: Um Copywriter Sênior de Resposta Direta (Direct Response) de nível mundial, especializado em alta conversão.

      CONTEXTO:
      Estou criando uma campanha de marketing e preciso de criativos que parem o scroll (Stop the Scroll) e gerem cliques.

      📦 PRODUTO/SERVIÇO: "${productName}"
      🎯 OBJETIVO: "${objective}"

      SUAS INSTRUÇÕES ESTRATÉGICAS:
      1. Use a estrutura A.I.D.A. (Atenção, Interesse, Desejo, Ação) ou P.A.S. (Problema, Agitação, Solução).
      2. Aplique Gatilhos Mentais poderosos (Curiosidade, Urgência, Autoridade ou Prova Social).
      3. Fale sobre os BENEFÍCIOS, não apenas as características. (Transformação do cliente).
      4. O tom deve ser magnético, persuasivo e humano. Evite clichês corporativos robóticos.

      FORMATO DE SAÍDA OBRIGATÓRIO (MARKDOWN):

      ## ⚡ Opções de Headline (Títulos)
      1. [Focada em Curiosidade/Gancho Viral]
      2. [Focada na Dor/Solução Imediata]
      3. [Curta e Direta - Punchy]

      ## 📝 Corpo do Anúncio (Legenda/Email)
      [Escreva um texto curto e envolvente, de no máximo 3 parágrafos. Comece com uma pergunta ou afirmação polêmica. Termine com uma Chamada para Ação (CTA) clara e imperativa.]
    `;

    // 2. Chamar IA (Aumentei um pouco a temperatura para mais criatividade)
    const response = await this.aiProvider.generateText(prompt, { 
      temperature: 0.8, // Criatividade alta
      maxTokens: 1500 
    });

    // 3. Salvar o Log de Consumo
    await this.prisma.aiLog.create({
      data: {
        userId: user.sub,
        workspaceId: member.workspaceId,
        provider: 'GEMINI',
        model: 'gemini-2.0-flash',
        type: 'COPY_GENERATION',
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
      },
    });

    return { result: response.content };
  }
}