import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadVideoDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9._-]+\.(mp4|avi|mov|mkv|webm|wmv|flv)$/i, {
    message:
      'Filename must have a valid video extension (mp4, avi, mov, mkv, webm, wmv, flv)',
  })
  filename: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^video\/(mp4|avi|quicktime|x-msvideo|webm|x-ms-wmv|x-flv)$/i, {
    message: 'Invalid video MIME type',
  })
  mimeType: string;

  @IsNumber()
  @Min(1, { message: 'File size must be greater than 0' })
  @Max(10 * 1024 * 1024 * 1024, { message: 'File size cannot exceed 10GB' })
  @Transform(({ value }) => parseInt(value))
  size: number;

  @IsString()
  @IsNotEmpty()
  uploadedBy: string;

  @IsOptional()
  @IsString()
  matchId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ResumeUploadDto {
  @IsString()
  @IsNotEmpty()
  uploadId: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  offset: number;
}

export class GetUploadProgressDto {
  @IsString()
  @IsNotEmpty()
  uploadId: string;
}
