import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../iam/authentication/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { GenerateCopyDto } from './dto/generate-copy.dto';
import { GenerateImageDto } from './dto/generate-image.dto'; // 👈 Importe o novo arquivo
import { ActiveUser, ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';

@ApiTags('Inteligência Artificial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-copy')
  @ApiOperation({ summary: 'Gerar copy + briefing de imagem' })
  generateCopy(
    @Body() dto: GenerateCopyDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.aiService.generateCampaignCopy(dto.productName, dto.objective, user);
  }

  @Post('generate-image')
  @ApiOperation({ summary: 'Gerar imagem visual (Imagen 3)' })
  generateImage(
    @Body() dto: GenerateImageDto, // 👈 Agora usa o DTO validado
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.aiService.generateCampaignImage(dto.prompt, user);
  }
}