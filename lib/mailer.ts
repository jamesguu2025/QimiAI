import nodemailer from 'nodemailer';

type SendMailInput = {
  subject: string;
  text: string;
  html?: string;
  to?: string;
};

function requireMailEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export async function sendInternalEmail({ subject, text, html, to }: SendMailInput) {
  const host = requireMailEnv('SMTP_HOST');
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = (process.env.SMTP_SECURE || 'true') !== 'false';
  const user = requireMailEnv('SMTP_USER');
  const pass = requireMailEnv('SMTP_PASSWORD');
  const from = process.env.MAIL_FROM || user;
  const recipients = to || requireMailEnv('ADMIN_EMAIL');

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to: recipients,
    subject,
    text,
    html,
  });
}
