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
