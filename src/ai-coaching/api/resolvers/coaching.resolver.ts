
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api-gateway/guards/jwt-auth.guard';

@Resolver('Coaching')
export class CoachingResolver {
  constructor() {}

  @Query(() => String)
  async getCoachingSession(@Args('id') id: string) {
    return 'This is a placeholder for a coaching session.';
  }

  @Mutation(() => String)
  @UseGuards(JwtAuthGuard)
  async startCoachingSession(@Args('input') input: any, @Context() context: any) {
    return 'This is a placeholder for starting a coaching session.';
  }
}
