import { createTransport, type Transporter } from 'nodemailer';

export interface MailerConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string } | undefined;
  from: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
}

export interface Mailer {
  sendMail(opts: SendMailOptions): Promise<void>;
  close(): void;
}

export function createMailer(config: MailerConfig): Mailer {
  const transporter: Transporter = createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.auth?.user ? { auth: config.auth } : {}),
  });

  return {
    async sendMail(opts: SendMailOptions): Promise<void> {
      await transporter.sendMail({
        from: config.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        headers: opts.headers,
      });
    },
    close() {
      transporter.close();
    },
  };
}
