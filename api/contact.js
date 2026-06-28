// Vercel Serverless — formulario de contacto público (opcional, sin auth).
// Solo se usa si configuras SMTP_USER + SMTP_PASS (+ CONTACT_EMAIL) en Vercel.

import nodemailer from 'nodemailer';

const APP_NAME = 'Cividata';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();
  const to = (process.env.CONTACT_EMAIL || smtpUser).trim();

  if (!smtpUser || !smtpPass || !to) {
    return res.status(503).json({
      error: 'El envío por correo no está configurado (SMTP_USER, SMTP_PASS, CONTACT_EMAIL).',
    });
  }

  const { name, message, website } = req.body || {};

  if (typeof website === 'string' && website.trim()) {
    return res.json({ ok: true });
  }

  const text = typeof message === 'string' ? message.trim() : '';
  if (text.length < 10) {
    return res.status(400).json({ error: 'El mensaje debe tener al menos 10 caracteres.' });
  }

  const displayName = typeof name === 'string' ? name.trim() : '';
  const body = [displayName ? `Nombre: ${displayName}` : null, '', text]
    .filter((line) => line !== null)
    .join('\n');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${smtpUser}>`,
      to,
      subject: `Consulta sobre ${APP_NAME}`,
      text: body,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Contact SMTP failed', err);
    return res.status(502).json({
      error: 'No se pudo enviar el correo. Intente más tarde o use WhatsApp.',
    });
  }
}
