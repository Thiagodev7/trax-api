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
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.sub },
      select: { workspaceId: true },
    });

    if (!member) throw new NotFoundException('Workspace não encontrado');

    const prompt = `
      ATUE COMO: Um Diretor de Criação e Copywriter de classe mundial.

      CONTEXTO:
      Estamos criando uma campanha visual e textual para: "${productName}".
      Objetivo: "${objective}".

      SUA TAREFA:
      1. Escreva copies persuasivas usando gatilhos mentais.
      2. DESCREVA detalhadamente 1 ideia de imagem visual (Image Prompt) que complemente este texto. Essa descrição será usada por uma IA geradora de imagens (como Midjourney ou DALL-E), então deve ser rica em detalhes visuais, iluminação, estilo e composição.

      FORMATO DE SAÍDA (MARKDOWN):

      ## ⚡ Opções de Headline
      1. [Opção 1]
      2. [Opção 2]
      3. [Opção 3]

      ## 📝 Corpo do Anúncio
      [Texto persuasivo]

      ## 🎨 Briefing Visual (Prompt de Imagem)
      [Descreva a imagem em inglês (pois IAs de imagem entendem melhor). Ex: "Cinematic shot of...", "Hyper-realistic close up of...", descreva a luz, as cores, o cenário e a emoção.]
    `;

    const response = await this.aiProvider.generateText(prompt, { 
      temperature: 0.8,
      maxTokens: 2000 
    });

    // Log de Texto
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

  // 👇 NOVO MÉTODO: Geração de Imagem Real
  async generateCampaignImage(imagePrompt: string, user: ActiveUserData) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.sub },
      select: { workspaceId: true },
    });

    if (!member) throw new NotFoundException('Workspace não encontrado');

    // 1. Chama o Provider para gerar a imagem (Base64)
    const imageBase64 = await this.aiProvider.generateImage(imagePrompt);

    // 2. Log de Imagem (Custo estimado ou fixo)
    await this.prisma.aiLog.create({
      data: {
        userId: user.sub,
        workspaceId: member.workspaceId,
        provider: 'GOOGLE_IMAGEN',
        model: 'imagen-3.0-generate-001',
        type: 'IMAGE_GENERATION',
        inputTokens: imagePrompt.length, // Estimativa
        outputTokens: 1, // 1 imagem
        totalTokens: imagePrompt.length + 1,
      },
    });

    return { 
      message: 'Imagem gerada com sucesso',
      image: `data:image/png;base64,${imageBase64}` 
    };
  }
}