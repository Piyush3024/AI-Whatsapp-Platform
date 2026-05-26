// apps/api/src/modules/mail/mail.module.ts
//
// @Global() — MailService poore app mein inject kar sako
// without importing MailModule har jagah.
// Pattern: shared infrastructure modules always @Global().

import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service.js';

@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
