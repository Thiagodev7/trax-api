import { Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../iam/authentication/guards/jwt-auth.guard';
import { ActiveUser, ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';

@ApiTags('Integrações (Facebook/Meta)')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('meta/auth-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: '1. Obter URL de Login', 
    description: 'Retorna a URL para onde o Frontend deve redirecionar o usuário.' 
  })
  getMetaAuthUrl() {
    return { url: this.integrationsService.getMetaAuthUrl() };
  }

  @Post('meta/connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: '2. Conectar Facebook (Enviar Código)',
    description: 'O Frontend captura o código do redirect e envia aqui.'
  })
  @ApiBody({ schema: { type: 'object', properties: { code: { type: 'string' } } } })
  async connectFacebook(
    @Body('code') code: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    if (!code) throw new BadRequestException('Código de autorização é obrigatório.');
    return this.integrationsService.handleMetaCallback(code, user);
  }

  @Get('meta/ad-accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '3. Listar Contas de Anúncio' })
  @ApiResponse({ status: 200, description: 'Lista de contas de anúncio retornada.' })
  getAdAccounts(@ActiveUser() user: ActiveUserData) {
    return this.integrationsService.getAdAccounts(user);
  }

  @Get('meta/pages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '4. Listar Páginas do Facebook' })
  @ApiResponse({ status: 200, description: 'Lista de páginas retornada.' })
  getPages(@ActiveUser() user: ActiveUserData) {
    return this.integrationsService.getPages(user);
  }
}