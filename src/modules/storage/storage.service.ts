import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { ConfigService } from '@nestjs/config';
// ALTERAÇÃO: Import de interoperabilidade para evitar ERR_REQUIRE_ESM
import * as uuid from 'uuid'; 

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.getOrThrow<string>('R2_BUCKET_NAME');

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.configService.getOrThrow<string>('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  /**
   * Realiza o upload de assets para o Cloudflare R2.
   * @param fileBuffer Buffer do arquivo
   * @param fileName Nome original
   * @param mimeType Tipo do arquivo (image/png, etc)
   */
  async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    // Sanitização básica do nome do arquivo para evitar problemas de URL
    const sanitizedName = fileName.replace(/\s+/g, '-').toLowerCase();
    const uniqueFileName = `${uuid.v4()}-${sanitizedName}`;

    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: uniqueFileName,
          Body: fileBuffer,
          ContentType: mimeType,
        },
        // Otimização: Define tamanho das partes para 5MB (padrão S3)
        partSize: 5 * 1024 * 1024, 
        queueSize: 4,
      });

      await upload.done();

      const baseUrl = this.configService.getOrThrow<string>('R2_PUBLIC_URL');
      const publicUrl = `${baseUrl.replace(/\/$/, '')}/${uniqueFileName}`;
      
      this.logger.log(`Asset Trax armazenado: ${uniqueFileName}`);
      return publicUrl;
    } catch (error: unknown) {
      // Type Guard para garantir que acessamos propriedades de um Error real
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : '';
  
      this.logger.error(
        `Falha crítica de Storage [R2]: ${errorMessage}`,
        errorStack
      );
  
      throw new InternalServerErrorException('Não foi possível processar o upload do asset.');
    }
  }
}