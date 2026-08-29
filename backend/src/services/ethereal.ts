import nodemailer, { Transporter } from 'nodemailer';

let transporterPromise: Promise<Transporter> | null = null;

/**
 * Gets or initializes a Nodemailer transporter.
 * Tries Ethereal test account first, and falls back to jsonTransport if offline/unreachable.
 */
export async function getEtherealTransporter(): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      try {
        const testAccount = await nodemailer.createTestAccount();
        console.log(`✉️ Ethereal SMTP test account created: ${testAccount.user}`);

        return nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      } catch (err: any) {
        console.warn(`⚠️ Ethereal API lookup failed (${err.message}). Falling back to Nodemailer JSON transport.`);
        return nodemailer.createTransport({
          jsonTransport: true,
        });
      }
    })();
  }

  return transporterPromise;
}

/**
 * Sends an email using Ethereal SMTP or JSON transport fallback.
 */
export async function sendEmailViaEthereal(options: {
  from: string;
  to: string;
  subject: string;
  body: string;
}): Promise<{ messageId: string; previewUrl: string | false }> {
  const transporter = await getEtherealTransporter();

  const info = await transporter.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    text: options.body,
    html: `<div style="font-family: sans-serif; line-height: 1.6;">${options.body.replace(/\n/g, '<br/>')}</div>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`📫 Email sent to ${options.to}. Ethereal Preview URL: ${previewUrl}`);
  } else {
    console.log(`📫 Email sent to ${options.to} (JSON transport fallback). Message ID: ${info.messageId}`);
  }

  return {
    messageId: info.messageId || 'local-msg-id',
    previewUrl,
  };
}
