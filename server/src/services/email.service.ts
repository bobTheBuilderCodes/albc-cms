import { env } from "../config/env";

type EmailPayload = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

class EmailService {
  private transporter: any = null;
  private available = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      console.warn("Email service disabled: SMTP credentials are not configured.");
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
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      this.available = true;
    } catch (error) {
      console.warn("Email service disabled: nodemailer is unavailable.", error);
      this.available = false;
    }
  }

  isEnabled(): boolean {
    return this.available;
  }

  async send(payload: EmailPayload): Promise<void> {
    if (!this.available || !this.transporter) {
      console.log(`Email skipped (service disabled): ${payload.subject}`);
      return;
    }

    const recipients = Array.isArray(payload.to) ? payload.to.filter(Boolean) : [payload.to];
    if (recipients.length === 0) return;

    await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to: recipients.join(","),
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  }
}

export const emailService = new EmailService();
