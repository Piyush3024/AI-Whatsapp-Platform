// apps/api/src/modules/mail/mail.service.ts
//
// Global MailService — Resend SDK wrapper
//
// Pattern: typed methods per email type (sendInvitation, sendWelcome, etc.)
// No raw resend.emails.send() calls outside this service — all email logic here.
//
// Resend v6 usage:
//   const resend = new Resend(apiKey);
//   const { data, error } = await resend.emails.send({ ... });
//
// Error handling: Resend returns { data, error } — never throws.
// We log + throw InternalServerErrorException on error.

import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(MailService.name);
  private readonly fromAddress: string;
  private readonly appName: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(
      this.config.getOrThrow<string>('mail.resendApiKey'),
    );
    this.fromAddress = this.config.getOrThrow<string>('mail.fromAddress');
    this.appName =
      this.config.get<string>('mail.appName') ?? 'WhatsApp AI Platform';
    this.appUrl = this.config.getOrThrow<string>('mail.appUrl');
  }

  // ── Send Team Invitation ─────────────────────────────────────────────────
  //
  // Sent when OWNER/ADMIN invites a new team member.
  // Token-based — recipient clicks link → accept endpoint → account created.

  async sendInvitation(opts: {
    toEmail: string;
    tenantName: string;
    inviterName: string;
    role: string;
    inviteToken: string;
    expiresAt: Date;
  }): Promise<void> {
    const acceptUrl = `${this.appUrl}/invitations/accept?token=${opts.inviteToken}`;
    const expiryStr = opts.expiresAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.buildInvitationHtml({
      tenantName: opts.tenantName,
      inviterName: opts.inviterName,
      role: opts.role,
      acceptUrl,
      expiryStr,
      appName: this.appName,
    });

    await this.send({
      to: opts.toEmail,
      subject: `${opts.inviterName} ne aapko ${opts.tenantName} mein invite kiya hai`,
      html,
    });

    this.logger.log(
      { to: opts.toEmail, tenantName: opts.tenantName },
      'Invitation email sent',
    );
  }

  // ── Send Welcome Email ───────────────────────────────────────────────────
  //
  // Sent after invitation accepted + account created.

  async sendWelcome(opts: {
    toEmail: string;
    name: string;
    tenantName: string;
  }): Promise<void> {
    const html = this.buildWelcomeHtml({
      name: opts.name,
      tenantName: opts.tenantName,
      loginUrl: `${this.appUrl}/login`,
      appName: this.appName,
    });

    await this.send({
      to: opts.toEmail,
      subject: `Welcome to ${opts.tenantName} on ${this.appName}!`,
      html,
    });

    this.logger.log({ to: opts.toEmail }, 'Welcome email sent');
  }

  // ── Core Send ────────────────────────────────────────────────────────────

  private async send(opts: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const { data, error } = await this.resend.emails.send({
      from: this.fromAddress,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    if (error) {
      this.logger.error(
        { to: opts.to, subject: opts.subject, error },
        'Resend email send failed',
      );
      throw new InternalServerErrorException(
        `Email send failed: ${error.message}`,
      );
    }

    this.logger.log(
      { emailId: data?.id, to: opts.to },
      'Email sent via Resend',
    );
  }

  // ── HTML Builders ─────────────────────────────────────────────────────────
  // Plain HTML strings — no template engine dependency.
  // Production: replace with React Email components if needed.

  private buildInvitationHtml(opts: {
    tenantName: string;
    inviterName: string;
    role: string;
    acceptUrl: string;
    expiryStr: string;
    appName: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Team Invitation</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#16a34a;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">${opts.appName}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">You've been invited!</h2>
              <p style="color:#374151;margin:0 0 8px;line-height:1.6;">
                <strong>${opts.inviterName}</strong> ne aapko <strong>${opts.tenantName}</strong> ke team mein <strong>${opts.role}</strong> ke role ke saath invite kiya hai.
              </p>
              <p style="color:#6b7280;margin:0 0 32px;font-size:14px;">
                Ye invite <strong>${opts.expiryStr}</strong> tak valid hai.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#16a34a;">
                    <a href="${opts.acceptUrl}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;border-radius:8px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#9ca3af;margin:24px 0 0;font-size:13px;">
                Ya is link pe jaayein:<br/>
                <a href="${opts.acceptUrl}" style="color:#16a34a;word-break:break-all;">${opts.acceptUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f3f4f6;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                Agar aapne ye invite expect nahi kiya tha, is email ko ignore kar sakte hain.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildWelcomeHtml(opts: {
    name: string;
    tenantName: string;
    loginUrl: string;
    appName: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Welcome</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#16a34a;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">${opts.appName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#111827;margin:0 0 16px;">Welcome, ${opts.name}! 🎉</h2>
              <p style="color:#374151;margin:0 0 24px;line-height:1.6;">
                Aap ab <strong>${opts.tenantName}</strong> ke team member hain. Dashboard access karne ke liye login karein.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#16a34a;">
                    <a href="${opts.loginUrl}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;border-radius:8px;">
                      Dashboard Login
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f3f4f6;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">${opts.appName} — Automated WhatsApp Business Platform</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
