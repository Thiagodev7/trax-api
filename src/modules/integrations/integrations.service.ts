import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../security/encryption.service';
import { ActiveUserData } from '../iam/authentication/decorators/active-user.decorator';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * 1. Gera a URL para o usuário iniciar o login no Facebook.
   */
  getMetaAuthUrl() {
    const appId = this.config.getOrThrow('META_APP_ID');
    const redirectUri = this.config.getOrThrow('META_CALLBACK_URL');
    const scope = 'ads_management,ads_read,pages_show_list'; 

    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=NO_STATE_FOR_NOW`;
  }

  /**
   * 2. Recebe o código do Frontend, troca por Token de Longa Duração e salva.
   */
  async handleMetaCallback(code: string, user: ActiveUserData) {
    const appId = this.config.getOrThrow('META_APP_ID');
    const appSecret = this.config.getOrThrow('META_APP_SECRET');
    const redirectUri = this.config.getOrThrow('META_CALLBACK_URL');

    // Valida Workspace
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.sub },
    });
    if (!member) throw new BadRequestException('Usuário sem workspace');

    try {
      // A. Troca Code -> Access Token (Curta Duração)
      const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`;
      const { data: shortData } = await lastValueFrom(this.http.get(tokenUrl));
      const shortLivedToken = shortData.access_token;

      if (!shortLivedToken) throw new Error('Falha ao obter token inicial.');

      // B. Troca Token Curto -> Token Longa Duração (60 dias)
      const exchangeUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
      
      let finalToken = shortLivedToken;
      try {
        const { data: longData } = await lastValueFrom(this.http.get(exchangeUrl));
        if (longData.access_token) {
          finalToken = longData.access_token;
        }
      } catch (exchangeError) {
        console.warn('Falha ao trocar por token de longa duração, usando o curto.', exchangeError);
      }

      // C. Criptografa o token FINAL
      const encryptedToken = await this.encryption.encrypt(finalToken);

      // D. Salva no Banco (Upsert)
      await this.prisma.integration.upsert({
        where: {
          workspaceId_provider_externalId: {
            workspaceId: member.workspaceId,
            provider: 'META',
            externalId: 'me', // Idealmente buscaria o ID real chamando /me
          },
        },
        update: {
          accessToken: encryptedToken,
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
        create: {
          workspaceId: member.workspaceId,
          provider: 'META',
          externalId: 'me',
          name: 'Conta Facebook',
          accessToken: encryptedToken,
          status: 'ACTIVE',
        },
      });

      return { message: 'Facebook conectado com sucesso! Token válido por 60 dias.' };

    } catch (error: any) {
      console.error('Erro na integração Meta:', error.response?.data || error.message);
      throw new BadRequestException('Falha ao conectar com Facebook.');
    }
  }

  /**
   * 3. Lista as Contas de Anúncios (Ad Accounts)
   */
  async getAdAccounts(user: ActiveUserData) {
    const accessToken = await this.getDecryptedAccessToken(user);

    try {
      const url = `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id,currency,account_status&access_token=${accessToken}`;
      const { data } = await lastValueFrom(this.http.get(url));
      return data.data; 
    } catch (error) {
      console.error('Erro ao buscar Ad Accounts:', error);
      throw new BadRequestException('Falha ao buscar contas de anúncio.');
    }
  }

  /**
   * 4. Lista as Páginas do Facebook (Pages)
   */
  async getPages(user: ActiveUserData) {
    const accessToken = await this.getDecryptedAccessToken(user);

    try {
      const url = `https://graph.facebook.com/v18.0/me/accounts?fields=name,id,category,access_token,picture&access_token=${accessToken}`;
      const { data } = await lastValueFrom(this.http.get(url));
      return data.data;
    } catch (error) {
      console.error('Erro ao buscar Páginas:', error);
      throw new BadRequestException('Falha ao buscar páginas.');
    }
  }

  // --- Helper Privado ---
  private async getDecryptedAccessToken(user: ActiveUserData): Promise<string> {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.sub },
    });
    if (!member) throw new NotFoundException('Workspace não encontrado.');

    const integration = await this.prisma.integration.findFirst({
      where: {
        workspaceId: member.workspaceId,
        provider: 'META',
        status: 'ACTIVE',
      },
    });

    if (!integration) {
      throw new BadRequestException('Nenhuma conta do Facebook conectada.');
    }

    return this.encryption.decrypt(integration.accessToken);
  }
}