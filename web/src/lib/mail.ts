import nodemailer from "nodemailer";

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type SendMailResult = { sent: boolean; reason?: string; provider?: string };

function gmailConfig(): { user: string; pass: string; from: string } | null {
  const user =
    process.env.GMAIL_USER?.trim() ||
    process.env.GOOGLE_SMTP_USER?.trim() ||
    "";
  const pass = (
    process.env.GMAIL_APP_PASSWORD?.trim() ||
    process.env.GOOGLE_SMTP_PASS?.trim() ||
    ""
  ).replace(/\s+/g, "");
  if (!user || !pass) return null;
  const from =
    process.env.EMAIL_FROM?.trim() ||
    process.env.GMAIL_FROM?.trim() ||
    `NECS <${user}>`;
  return { user, pass, from };
}

/** Envoi prioritaire via Google SMTP (Gmail + mot de passe d’application). */
export async function sendMailViaGmail(
  input: SendMailInput,
): Promise<SendMailResult> {
  const cfg = gmailConfig();
  if (!cfg) {
    return { sent: false, reason: "GMAIL_USER / GMAIL_APP_PASSWORD manquants" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
    });

    await transporter.sendMail({
      from: cfg.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { sent: true, provider: "gmail" };
  } catch (error) {
    console.error("[mail:gmail]", error);
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "gmail_send_failed",
      provider: "gmail",
    };
  }
}

/** Fallback Resend si Google n’est pas configuré. */
export async function sendMailViaResend(
  input: SendMailInput,
): Promise<SendMailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY manquant" };
  }

  const from =
    process.env.RESEND_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "NECS <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[mail:resend]", res.status, body);
      return { sent: false, reason: `Resend ${res.status}`, provider: "resend" };
    }
    return { sent: true, provider: "resend" };
  } catch (error) {
    console.error("[mail:resend]", error);
    return { sent: false, reason: "resend_send_failed", provider: "resend" };
  }
}

/** Google d’abord, puis Resend en secours. */
export async function sendAppMail(
  input: SendMailInput,
): Promise<SendMailResult> {
  const gmail = await sendMailViaGmail(input);
  if (gmail.sent) return gmail;
  if (gmail.reason && !gmail.reason.includes("manquants")) {
    // Identifiants présents mais échec SMTP → ne pas masquer l’erreur via Resend
    // sauf si Resend est aussi configuré.
    const resend = await sendMailViaResend(input);
    if (resend.sent) return resend;
    return gmail;
  }
  return sendMailViaResend(input);
}

/**
 * Envoi marketing / commercial : refuse si le contact a retiré la préférence
 * e-mail pour la finalité donnée (DIG-06).
 * Les e-mails transactionnels (reset MDP, notifs internes) restent sur sendAppMail.
 */
export async function sendMarketingMail(
  input: SendMailInput & {
    purpose?: "marketing" | "commercial";
  },
): Promise<SendMailResult & { blockedByConsent?: boolean }> {
  const { assertCanTarget } = await import("@/lib/consent-preferences-crm");
  const purpose = input.purpose ?? "marketing";
  const check = await assertCanTarget(input.to, "email", purpose);
  if (!check.ok) {
    return {
      sent: false,
      reason: check.reason,
      blockedByConsent: true,
    };
  }
  return sendAppMail(input);
}

export function isMailConfigured(): boolean {
  return Boolean(gmailConfig() || process.env.RESEND_API_KEY?.trim());
}
