import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsService } from './integrations.service';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { EncryptionService } from '../security/encryption.service';
import { of } from 'rxjs';
import { BadRequestException } from '@nestjs/common';

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let prisma: PrismaService;
  let http: HttpService;
  let encryption: EncryptionService;

  // Mocks (Simulações)
  const mockPrismaService = {
    workspaceMember: { findFirst: jest.fn() },
    integration: { upsert: jest.fn(), findFirst: jest.fn() },
  };

  const mockConfigService = {
    // 👇 CORREÇÃO AQUI: Adicionamos o tipo Record<string, string>
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'META_APP_ID': '123_APP_ID',
        'META_APP_SECRET': '123_SECRET',
        'META_CALLBACK_URL': 'http://front.com/callback',
      };
      return config[key];
    }),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockEncryptionService = {
    encrypt: jest.fn((val) => Promise.resolve(`encrypted_${val}`)),
    decrypt: jest.fn((val) => Promise.resolve(val.replace('encrypted_', ''))),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<IntegrationsService>(IntegrationsService);
    prisma = module.get<PrismaService>(PrismaService);
    http = module.get<HttpService>(HttpService);
    encryption = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMetaAuthUrl', () => {
    it('deve gerar a URL correta com as variáveis de ambiente', () => {
      const url = service.getMetaAuthUrl();
      expect(url).toContain('client_id=123_APP_ID');
      expect(url).toContain('redirect_uri=http://front.com/callback');
      expect(url).toContain('scope=ads_management');
    });
  });

  describe('handleMetaCallback', () => {
    const mockUser = { sub: 'user-id', email: 'test@trax.com' };
    const mockCode = 'auth-code-123';

    it('deve trocar code por token longo e salvar criptografado', async () => {
      // 1. Simula usuário pertencendo a um workspace
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue({ workspaceId: 'ws-1' });

      // 2. Simula resposta do FB para token CURTO
      mockHttpService.get.mockImplementationOnce(() => of({ 
        data: { access_token: 'short_token_abc' } 
      }));

      // 3. Simula resposta do FB para token LONGO (Exchange)
      mockHttpService.get.mockImplementationOnce(() => of({ 
        data: { access_token: 'long_token_xyz' } 
      }));

      // Executa
      const result = await service.handleMetaCallback(mockCode, mockUser);

      // Verificações
      expect(http.get).toHaveBeenCalledTimes(2); // Chamou token curto e token longo
      expect(encryption.encrypt).toHaveBeenCalledWith('long_token_xyz');
      
      expect(prisma.integration.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          workspaceId_provider_externalId: {
            workspaceId: 'ws-1',
            provider: 'META',
            externalId: 'me',
          }
        },
        create: expect.objectContaining({
          accessToken: 'encrypted_long_token_xyz', // Verifica se salvou o criptografado
        })
      }));

      expect(result).toEqual({ 
        message: 'Facebook conectado com sucesso! Token válido por 60 dias.' 
      });
    });

    it('deve lançar erro se usuário não tiver workspace', async () => {
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue(null);

      await expect(service.handleMetaCallback(mockCode, mockUser))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('getAdAccounts', () => {
    const mockUser = { sub: 'user-id', email: 'test@trax.com' };

    it('deve descriptografar token e buscar contas', async () => {
      // 1. Setup do banco
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue({ workspaceId: 'ws-1' });
      mockPrismaService.integration.findFirst.mockResolvedValue({ 
        accessToken: 'encrypted_fake_token' 
      });

      // 2. Simula resposta do FB
      const mockFbResponse = {
        data: [{ name: 'Conta 1', account_id: 'act_123' }]
      };
      mockHttpService.get.mockReturnValue(of({ data: mockFbResponse }));

      // Executa
      const result = await service.getAdAccounts(mockUser);

      // Verificações
      expect(encryption.decrypt).toHaveBeenCalledWith('encrypted_fake_token');
      expect(http.get).toHaveBeenCalledWith(expect.stringContaining('access_token=fake_token'));
      expect(result).toEqual(mockFbResponse.data);
    });
  });
});