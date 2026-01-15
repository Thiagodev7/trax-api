import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateImageDto {
  @ApiProperty({ 
    example: 'Cinematic shot of a futuristic running shoe with neon lights, hyper-realistic, 8k resolution',
    description: 'Descrição detalhada da imagem em inglês'
  })
  @IsString()
  @IsNotEmpty()
  prompt!: string;
}