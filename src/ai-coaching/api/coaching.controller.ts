
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api-gateway/guards/jwt-auth.guard';

@Controller('ai-coaching')
export class CoachingController {
  constructor() {}

  @Post('session')
  @UseGuards(JwtAuthGuard)
  async startCoachingSession(@Body() body: any) {
    // Placeholder
  }
}
