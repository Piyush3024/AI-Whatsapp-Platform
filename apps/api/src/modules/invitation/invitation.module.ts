// MailModule @Global() hai — import karna zaruri nahi.
// JwtModule AppModule mein global registered hai.

import { Module } from '@nestjs/common';
import { InvitationService } from './invitation.service.js';
import { InvitationController } from './invitation.controller.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
