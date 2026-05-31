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
      subject: `${opts.inviterName} has invited you to ${opts.tenantName}`,
      html,
    });

    this.logger.log(
      { to: opts.toEmail, tenantName: opts.tenantName },
      'Invitation email sent',
    );
  }

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

  async sendPasswordReset(opts: {
    toEmail: string;
    name: string;
    resetUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    const expiryStr = opts.expiresAt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const html = this.buildPasswordResetHtml({
      name: opts.name,
      resetUrl: opts.resetUrl,
      expiryStr,
      appName: this.appName,
    });

    await this.send({
      to: opts.toEmail,
      subject: `Reset Password Request - ${this.appName}`,
      html,
    });

    this.logger.log({ to: opts.toEmail }, 'Password reset email sent');
  }

  async sendEmailVerification(opts: {
    toEmail: string;
    name: string;
    verifyUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    const expiryStr = opts.expiresAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.buildEmailVerificationHtml({
      name: opts.name,
      verifyUrl: opts.verifyUrl,
      expiryStr,
      appName: this.appName,
    });

    await this.send({
      to: opts.toEmail,
      subject: `Verify your email — ${this.appName}`,
      html,
    });

    this.logger.log({ to: opts.toEmail }, 'Email verification mail sent');
  }

  private buildEmailVerificationHtml(opts: {
    name: string;
    verifyUrl: string;
    expiryStr: string;
    appName: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify Your Email</title>
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
              <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Verify your email address</h2>
              <p style="color:#374151;margin:0 0 8px;line-height:1.6;">
                Hello <strong>${opts.name}</strong>,
              </p>
              <p style="color:#374151;margin:0 0 8px;line-height:1.6;">
                Thank you for registering. Please verify your email address to activate all features.
              </p>
              <p style="color:#6b7280;margin:0 0 32px;font-size:14px;">
                This link is valid until <strong>${opts.expiryStr}</strong> (24 hours).
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#16a34a;">
                    <a href="${opts.verifyUrl}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;border-radius:8px;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#9ca3af;margin:24px 0 0;font-size:13px;">
                Or copy this link:<br/>
                <a href="${opts.verifyUrl}" style="color:#16a34a;word-break:break-all;">${opts.verifyUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Security Notice -->
          <tr>
            <td style="padding:0 40px 24px;">
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;">
                <p style="color:#166534;margin:0;font-size:13px;line-height:1.5;">
                  If you did not create an account, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f3f4f6;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                ${opts.appName} — Automated WhatsApp Business Platform
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

  private buildPasswordResetHtml(opts: {
    name: string;
    resetUrl: string;
    expiryStr: string;
    appName: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset</title>
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
              <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">Password Reset Request</h2>
              <p style="color:#374151;margin:0 0 8px;line-height:1.6;">
                Hello <strong>${opts.name}</strong>,
              </p>
              <p style="color:#374151;margin:0 0 8px;line-height:1.6;">
                You requested to reset your password. Click the button below to reset it.
              </p>
              <p style="color:#6b7280;margin:0 0 32px;font-size:14px;">
                This link is valid until <strong>${opts.expiryStr}</strong> (1 hour).
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#16a34a;">
                    <a href="${opts.resetUrl}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;border-radius:8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#9ca3af;margin:24px 0 0;font-size:13px;">
                Click on the link below to reset your password<br/>
                <a href="${opts.resetUrl}" style="color:#16a34a;word-break:break-all;">${opts.resetUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Security Notice -->
          <tr>
            <td style="padding:0 40px 24px;">
              <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:16px;">
                <p style="color:#854d0e;margin:0;font-size:13px;line-height:1.5;">
                  ⚠️ <strong>Security Notice:</strong> If you did not request this reset, please ignore this email. Your password is safe.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f3f4f6;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                ${opts.appName} — AI-Powered WhatsApp Business Platform
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
                <strong>${opts.inviterName}</strong> has invited you to join the <strong>${opts.tenantName}</strong> team as a <strong>${opts.role}</strong>.
              </p>
              <p style="color:#6b7280;margin:0 0 32px;font-size:14px;">
                This invitation is valid until <strong>${opts.expiryStr}</strong>.
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
                Or copy and paste this URL into your browser:<br/>
                <a href="${opts.acceptUrl}" style="color:#16a34a;word-break:break-all;">${opts.acceptUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f3f4f6;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                If you were not expecting this invitation, you can safely ignore this email.
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
                You are now a team member of <strong>${opts.tenantName}</strong>. Login to access your dashboard.
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
