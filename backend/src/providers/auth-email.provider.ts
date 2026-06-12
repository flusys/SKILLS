import { AUTH_EMAIL_PROVIDER, IAuthEmailProvider } from '@flusys/nestjs-auth/interfaces';
import { EmailSendService } from '@flusys/nestjs-email/services';
import { Provider } from '@nestjs/common';

// Template Configuration - set these to use specific templates (optional)
// Email config is resolved automatically using isDefault=true from database
const DEFAULT_PASSWORD_RESET_TEMPLATE_ID: string | undefined = undefined;
const DEFAULT_EMAIL_VERIFICATION_TEMPLATE_ID: string | undefined = undefined;

/** Auth Email Provider - connects email module with auth module */
export const authEmailProvider: Provider = {
  provide: AUTH_EMAIL_PROVIDER,
  useFactory: (emailSendService: EmailSendService): IAuthEmailProvider => ({
    async sendPasswordResetEmail(email: string, token: string, resetUrl: string): Promise<void> {
      try {
        // Uses default email config (isDefault=true) when emailConfigId is not provided
        await emailSendService.sendTemplateEmail({
          templateId: DEFAULT_PASSWORD_RESET_TEMPLATE_ID,
          templateSlug: DEFAULT_PASSWORD_RESET_TEMPLATE_ID ? undefined : 'password-reset',
          to: email,
          variables: {
            resetUrl,
            token,
            expiryHours: '1',
          },
        });
      } catch {
        // Fallback to direct email send using default config
        await emailSendService.sendEmail({
          to: email,
          subject: 'Reset Your Password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Password Reset Request</h1>
              <p>You requested to reset your password. Click the button below to proceed:</p>
              <p style="margin: 20px 0;">
                <a href="${resetUrl}"
                   style="background-color: #007bff; color: white; padding: 12px 24px;
                          text-decoration: none; border-radius: 4px; display: inline-block;">
                  Reset Password
                </a>
              </p>
              <p style="color: #666; font-size: 14px;">
                This link will expire in 1 hour. If you didn't request this, please ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">
                If the button doesn't work, copy and paste this URL into your browser:<br>
                <a href="${resetUrl}" style="color: #007bff;">${resetUrl}</a>
              </p>
            </div>
          `,
          text: `
            Password Reset Request

            You requested to reset your password. Click the link below to proceed:
            ${resetUrl}

            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          `,
        });
      }
    },

    async sendVerificationEmail(email: string, token: string, verifyUrl: string): Promise<void> {
      // Try to send using template, fallback to direct send
      // Uses default email config (isDefault=true) when emailConfigId is not provided
      try {
        await emailSendService.sendTemplateEmail({
          templateId: DEFAULT_EMAIL_VERIFICATION_TEMPLATE_ID,
          templateSlug: DEFAULT_EMAIL_VERIFICATION_TEMPLATE_ID ? undefined : 'email-verification',
          to: email,
          variables: {
            verifyUrl,
            token,
            expiryHours: '24',
          },
        });
      } catch {
        // Fallback to direct email send using default config
        await emailSendService.sendEmail({
          to: email,
          subject: 'Verify Your Email Address',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Verify Your Email Address</h1>
              <p>Thank you for registering! Please click the button below to verify your email address:</p>
              <p style="margin: 20px 0;">
                <a href="${verifyUrl}"
                   style="background-color: #28a745; color: white; padding: 12px 24px;
                          text-decoration: none; border-radius: 4px; display: inline-block;">
                  Verify Email
                </a>
              </p>
              <p style="color: #666; font-size: 14px;">
                This link will expire in 24 hours.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">
                If the button doesn't work, copy and paste this URL into your browser:<br>
                <a href="${verifyUrl}" style="color: #28a745;">${verifyUrl}</a>
              </p>
            </div>
          `,
          text: `
            Verify Your Email Address

            Thank you for registering! Please click the link below to verify your email address:
            ${verifyUrl}

            This link will expire in 24 hours.
          `,
        });
      }
    },
  }),
  inject: [EmailSendService],
};
