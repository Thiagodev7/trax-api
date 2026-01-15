import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../iam/authentication/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { GenerateCopyDto } from './dto/generate-copy.dto';
// 👇 IMPORTAÇÃO QUE FALTAVA
import { ActiveUser, ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';

@ApiTags('Inteligência Artificial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-copy')
  @ApiOperation({ summary: 'Gerar copy e registrar consumo de tokens' })
  generateCopy(
    @Body() dto: GenerateCopyDto,
    @ActiveUser() user: ActiveUserData, // 👈 Agora o TS sabe o que é isso
  ) {
    // Repassa o usuário para o service
    return this.aiService.generateCampaignCopy(dto.productName, dto.objective, user);
  }
}