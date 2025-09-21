import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Missing or invalid email" }, { status: 400 });
    }

    const adminBcc = process.env.NEWSLETTER_TO || "";

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      // If SMTP is not configured, respond gracefully so the UI can still behave
      console.warn("SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS to enable email sending.");
      return NextResponse.json({
        ok: true,
        message: "SMTP not configured on server. Configure SMTP_* env vars to actually send emails.",
        received: { email },
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `Skill Swap <${user}>`,
      to: email, // send to the subscriber directly
      bcc: adminBcc || undefined, // optional admin copy
      subject: "Welcome to Skill Swap Newsletter",
      text: `Thanks for subscribing to Skill Swap! We'll keep you updated.`,
      html: `<p>Thanks for subscribing to <strong>Skill Swap</strong>! We'll keep you updated with the latest news.</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Newsletter send error:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
