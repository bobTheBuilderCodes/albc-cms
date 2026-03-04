import { env } from "../config/env";

type EmailPayload = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

type BrandedEmailOptions = {
  churchName: string;
  title: string;
  message: string;
  previewText?: string;
  footerNote?: string;
};

const escapeHtml = (value: string): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toHtmlMessage = (message: string): string =>
  escapeHtml(message)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p style="margin:0 0 12px;line-height:1.65;color:#334155;">${line}</p>`)
    .join("");

export const buildBrandedEmail = (options: BrandedEmailOptions): string => {
  const churchName = options.churchName?.trim() || "Church";
  const previewText = options.previewText || `${churchName} notification`;
  const footerNote =
    options.footerNote ||
    "This message was sent automatically by your church management system.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(options.title)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#eef2ff;font-family:Arial,'Segoe UI',sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(previewText)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(15,23,42,0.12);">
      <tr>
        <td style="padding:0;background:linear-gradient(120deg,#1d4ed8 0%,#0e7490 100%);">
          <div style="padding:28px 32px;">
            <p style="margin:0 0 8px;color:#bfdbfe;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;">${escapeHtml(churchName)}</p>
            <h1 style="margin:0;color:#ffffff;font-size:24px;line-height:1.3;font-weight:700;">${escapeHtml(options.title)}</h1>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px 20px;background:#ffffff;">
          ${toHtmlMessage(options.message)}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 6px;color:#475569;font-size:13px;">Regards,</p>
          <p style="margin:0;color:#0f172a;font-size:14px;font-weight:700;">${escapeHtml(churchName)}</p>
          <p style="margin:10px 0 0;color:#64748b;font-size:12px;line-height:1.6;">${escapeHtml(footerNote)}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

class EmailService {
  private transporter: any = null;
  private available = false;
  private senderEmail = "";
  private disabledReason = "Email service is not initialized.";

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      this.disabledReason = "SMTP credentials are not configured.";
      console.warn(`Email service disabled: ${this.disabledReason}`);
      this.available = false;
      return;
    }

    const isGmail = env.SMTP_HOST.toLowerCase().includes("gmail");
    const sanitizedPassword = isGmail ? env.SMTP_PASS.replace(/\s+/g, "") : env.SMTP_PASS;
    const smtpUser = env.SMTP_USER.trim();
    const sender = (env.EMAIL_FROM || smtpUser).trim();

    if (isGmail && !smtpUser.includes("@")) {
      this.disabledReason = "Gmail SMTP requires SMTP_USER to be your full Gmail address.";
      console.warn(
        `Email service disabled: ${this.disabledReason}`
      );
      this.available = false;
      return;
    }

    if (!sender.includes("@")) {
      this.disabledReason = "EMAIL_FROM must be a valid email address.";
      console.warn(`Email service disabled: ${this.disabledReason}`);
      this.available = false;
      return;
    }

    try {
      // Optional runtime dependency: app keeps running even if nodemailer is unavailable.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require("nodemailer");
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: smtpUser,
          pass: sanitizedPassword,
        },
      });
      this.senderEmail = sender;
      this.available = true;
      this.disabledReason = "";
      this.transporter
        .verify()
        .then(() => {
          console.log(`Email service ready via ${env.SMTP_HOST}:${env.SMTP_PORT} as ${smtpUser}`);
        })
        .catch((error: unknown) => {
          this.disabledReason = error instanceof Error ? error.message : "SMTP verification failed.";
          console.error("Email service warning: SMTP verification failed.", error);
        });
    } catch (error) {
      this.disabledReason = "nodemailer is unavailable.";
      console.warn("Email service disabled: nodemailer is unavailable.", error);
      this.available = false;
    }
  }

  isEnabled(): boolean {
    return this.available;
  }

  getStatus(): { enabled: boolean; reason: string } {
    return {
      enabled: this.available,
      reason: this.disabledReason,
    };
  }

  async send(payload: EmailPayload): Promise<void> {
    if (!this.available || !this.transporter) {
      throw new Error(
        `Email service is disabled. ${this.disabledReason || "Check SMTP configuration and server logs."}`
      );
    }

    const recipients = Array.isArray(payload.to) ? payload.to.filter(Boolean) : [payload.to];
    if (recipients.length === 0) return;

    try {
      await this.transporter.sendMail({
        from: this.senderEmail,
        to: recipients.join(","),
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
    } catch (error) {
      this.disabledReason = error instanceof Error ? error.message : "SMTP send failed.";
      console.error("Email send failed.", error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
