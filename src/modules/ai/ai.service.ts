import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { AI_PROVIDER, AiProvider } from './interfaces/ai-provider.interface';
import { PrismaService } from '../../database/prisma.service';
import { ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  /**
   * Constrói o "System Prompt" com o DNA da marca do Workspace.
   * Isso garante que a IA nunca saia do personagem ou do tom de voz da empresa.
   */
  private async buildSystemPrompt(workspaceId: string): Promise<string> {
    const workspace = await this.prisma.extended.workspace.findUnique({
      where: { id: workspaceId },
      select: { brandName: true, brandVoice: true, brandColors: true }
    });

    const brandName = workspace?.brandName || 'nossa marca';
    const voice = workspace?.brandVoice || 'Profissional, Persuasivo e Moderno';
    const colors = workspace?.brandColors?.join(', ') || 'Cores padrão da marca';

    return `
      ATUE COMO: Um Diretor de Criação Sênior e Estrategista da marca "${brandName}".
      
      💎 BRAND DNA (DIRETRIZES INEGOCIÁVEIS):
      - Tom de Voz: ${voice}
      - Identidade Visual: O mood deve harmonizar com as cores [${colors}].
      - Objetivo: Criar conteúdo de alta conversão que respeite a identidade da marca.
      - Restrições: Evite clichês genéricos, linguagem ofensiva ou promessas falsas.
    `;
  }

  /**
   * Gera copies persuasivas para anúncios (Headline + Texto Principal).
   * Agora enriquecido com o contexto da marca.
   */
  async generateCampaignCopy(
    productName: string, 
    objective: string, 
    user: ActiveUserData
  ) {
    // 1. Validação de Tenant e Busca de Contexto
    const member = await this.prisma.extended.workspaceMember.findFirst({
      where: { userId: user.sub },
      select: { workspaceId: true },
    });

    if (!member) throw new NotFoundException('Workspace não encontrado');

    const systemPrompt = await this.buildSystemPrompt(member.workspaceId);

    const userPrompt = `
      CONTEXTO DA CAMPANHA:
      Produto/Serviço: "${productName}"
      Objetivo: "${objective}"

      SUA MISSÃO:
      1. Escreva 3 opções de Headlines curtas e impactantes.
      2. Escreva 1 Texto Principal (Primary Text) focado em conversão, usando gatilhos mentais.
      3. Descreva 1 Ideia Visual (Image Prompt) detalhada para um designer ou IA generativa.

      FORMATO DE SAÍDA (MARKDOWN):
      ## ⚡ Opções de Headline
      1. ...
      2. ...
      3. ...

      ## 📝 Corpo do Anúncio
      ...

      ## 🎨 Briefing Visual (Prompt em Inglês)
      ...
    `;

    const finalPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    // 2. Chamada à IA
    const response = await this.aiProvider.generateText(finalPrompt, { 
      temperature: 0.8,
      maxTokens: 2000 
    });

    // 3. Auditoria de Custos (Log)
    await this.prisma.extended.aiLog.create({
      data: {
        userId: user.sub,
        workspaceId: member.workspaceId,
        provider: 'GEMINI', // Ou dinâmico dependendo do provider injetado
        model: 'gemini-2.0-flash',
        type: 'COPY_GENERATION',
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
      },
    });

    return { result: response.content };
  }

  /**
   * Gera imagens usando modelos DALL-E 3 ou Imagen.
   * Este método é chamado principalmente pelos Workers do BullMQ.
   */
  async generateCampaignImage(imagePrompt: string, user: ActiveUserData) {
    const member = await this.prisma.extended.workspaceMember.findFirst({
      where: { userId: user.sub },
      select: { workspaceId: true },
    });

    if (!member) throw new NotFoundException('Workspace não encontrado');

    this.logger.log(`🎨 Iniciando geração de imagem para User: ${user.sub}`);

    // 1. Geração (Base64)
    const base64Image = await this.aiProvider.generateImage(imagePrompt);
    
    // 2. Processamento de Buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // 3. Upload para Object Storage (R2/S3)
    const fileName = `ai-gen-${Date.now()}.png`;
    const publicUrl = await this.storage.uploadFile(imageBuffer, fileName, 'image/png');

    // 4. Log de Auditoria
    // Nota: IAs de imagem cobram por unidade, mas registramos tokens para padronização
    await this.prisma.extended.aiLog.create({
      data: {
        userId: user.sub,
        workspaceId: member.workspaceId,
        provider: 'GOOGLE_IMAGEN',
        model: 'imagen-3.0-generate-001',
        type: 'IMAGE_GENERATION',
        inputTokens: imagePrompt.length,
        outputTokens: 1, // 1 imagem
        totalTokens: imagePrompt.length + 1,
      },
    });

    return { 
      message: 'Imagem gerada e salva com sucesso',
      imageUrl: publicUrl 
    };
  }

  /**
   * Gera opções estratégicas (Personas/Ângulos) para a campanha.
   * Fundamental para a etapa "Strategy Engine" do frontend.
   */
  async generateStrategyOptions(campaignId: string, user: ActiveUserData) {
    const campaign = await this.prisma.extended.campaign.findUnique({
      where: { id: campaignId },
      include: { workspace: true }
    });

    if (!campaign) throw new NotFoundException('Campanha não encontrada');

    // 1. Injeção de Contexto (Brand DNA)
    const systemPrompt = await this.buildSystemPrompt(campaign.workspaceId);

    // 2. Prompt Estruturado
    const userPrompt = `
      PRODUTO/SERVIÇO: "${campaign.name}"
      OBJETIVO DE CAMPANHA: "${campaign.objective}"
      PLATAFORMA: "${campaign.platform}"
      DESCRIÇÃO ADICIONAL: "${campaign.description || 'Nenhuma'}"

      TAREFA:
      Analise os dados acima e crie 3 ABORDAGENS ESTRATÉGICAS DISTINTAS (Ângulos Criativos).
      
      REGRAS:
      - Respeite estritamente o Tom de Voz da marca definido anteriormente.
      - Foque em resultados de performance (Growth).

      SAÍDA OBRIGATÓRIA: Apenas um ARRAY JSON puro (sem markdown).
      Estrutura do JSON:
      [
        {
          "title": "Nome curto da estratégia (ex: Foco em Dor)",
          "targetAudience": "Descrição detalhada do público-alvo (Persona)",
          "keyBenefits": "Lista de 3 benefícios chave para esta persona",
          "brandTone": "Como o tom da marca se aplica especificamente aqui",
          "reasoning": "Por que esta estratégia vai converter?"
        }
      ]
    `;

    const finalPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    const response = await this.aiProvider.generateText(finalPrompt, { 
      temperature: 0.7, 
      maxTokens: 2500 
    });

    // 3. Sanitização e Parse do JSON
    const cleanJson = response.content.replace(/```json|```/g, '').trim();
    
    try {
      const strategies = JSON.parse(cleanJson);
      
      // Log do sucesso estratégico
      await this.prisma.extended.aiLog.create({
        data: {
          userId: user.sub,
          workspaceId: campaign.workspaceId,
          provider: 'GEMINI',
          model: 'gemini-2.0-flash',
          type: 'STRATEGY_GENERATION',
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          totalTokens: response.usage.totalTokens,
        },
      });

      return strategies;
    } catch (e) {
      this.logger.error('Falha ao fazer parse da estratégia gerada pela IA', e);
      // Fallback robusto retornando o texto cru para debug se necessário
      return { 
        error: 'A IA gerou uma resposta válida, mas fora do formato JSON esperado.', 
        rawContent: response.content 
      };
    }
  }
}