import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException 
} from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper privado para validar acesso ao workspace
  private async validateUserAccess(user: ActiveUserData, campaignId?: string) {
    const members = await this.prisma.extended.workspaceMember.findMany({
      where: { userId: user.sub },
      select: { workspaceId: true },
    });
    
    if (!members.length) throw new ForbiddenException('Usuário sem workspace.');
    const workspaceIds = members.map(m => m.workspaceId);

    if (campaignId) {
      const campaign = await this.prisma.extended.campaign.findFirst({
        where: { id: campaignId, workspaceId: { in: workspaceIds } }
      });
      if (!campaign) throw new NotFoundException('Campanha não encontrada ou acesso negado.');
      return campaign;
    }

    return workspaceIds; // Retorna lista de IDs permitidos para criação/listagem
  }

  async create(createCampaignDto: CreateCampaignDto, user: ActiveUserData) {
    const workspaceIds = await this.validateUserAccess(user);
    // Por padrão, cria no primeiro workspace do usuário (MVP)
    // No futuro, o DTO pode receber o workspaceId se o usuário tiver múltiplos
    const targetWorkspaceId = Array.isArray(workspaceIds) ? workspaceIds[0] : null;

    if (!targetWorkspaceId) throw new ForbiddenException('Workspace inválido');

    return this.prisma.extended.campaign.create({
      data: {
        ...createCampaignDto,
        workspaceId: targetWorkspaceId,
        createdBy: user.sub,
        status: CampaignStatus.DRAFT,
      },
    });
  }

  async findAll(user: ActiveUserData) {
    const workspaceIds = await this.validateUserAccess(user);
    return this.prisma.extended.campaign.findMany({
      where: {
        workspaceId: { in: workspaceIds as string[] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { adCreatives: true } }
      }
    });
  }
  
  async findOne(id: string, user: ActiveUserData) {
    const campaign = await this.prisma.extended.campaign.findFirst({
      where: {
        id,
        workspace: { members: { some: { userId: user.sub } } },
      },
      include: {
        adCreatives: true,
      },
    });

    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    return campaign;
  }

  async update(id: string, updateDto: UpdateCampaignDto, user: ActiveUserData) {
    await this.validateUserAccess(user, id);

    return this.prisma.extended.campaign.update({
      where: { id },
      data: {
        ...updateDto,
        // Se o usuário editou campos críticos, podemos voltar status se necessário
        // status: CampaignStatus.DRAFT 
      },
    });
  }

  // ✅ NOVO: Delete Seguro (Soft Delete via Extension)
  async remove(id: string, user: ActiveUserData) {
    await this.validateUserAccess(user, id);

    return this.prisma.extended.campaign.delete({
      where: { id },
    });
  }
}