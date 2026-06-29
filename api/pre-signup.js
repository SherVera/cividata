// Vercel Serverless — pre-registro público de personal médico.
// Guarda la solicitud y notifica al administrador por correo (SMTP).

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const APP_NAME = 'Cividata';

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function parseFullName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

function normalizePhone(value) {
  return String(value || '').trim().replace(/[\s()-]/g, '');
}

function validateBody(body) {
  const { first_name } = parseFullName(body?.fullName);
  if (first_name.length < 2) return 'Indique su nombre.';
  if (normalizePhone(body?.contactPhone).length < 10) return 'Indique un teléfono válido.';
  if (String(body?.specialty || '').trim().length < 2) return 'Indique su especialidad o cargo.';
  if (String(body?.workplace || '').trim().length < 2) return 'Indique su centro de trabajo.';
  return null;
}

function siteUrl() {
  const raw = (process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim();
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw.replace(/\/$/, '') : `https://${raw.replace(/\/$/, '')}`;
}

async function notifyAdmin(request) {
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();
  const to = (process.env.CONTACT_EMAIL || smtpUser).trim();
  const fullName = [request.first_name, request.last_name].filter(Boolean).join(' ').trim();
  const appLink = siteUrl();
  const summary = [
    `Nueva solicitud de acceso en ${APP_NAME}`,
    '',
    `Nombre: ${fullName}`,
    `Teléfono: ${request.contact_phone}`,
    `Especialidad: ${request.specialty}`,
    `Centro: ${request.workplace}`,
    `ID solicitud: ${request.id}`,
    '',
    'Debe aprobar o rechazar esta solicitud en el panel de administración.',
    appLink ? `Entrar: ${appLink}` : 'Entre a la app con su cuenta de administrador.',
    '',
    'Hasta que la apruebe, el solicitante no podrá acceder al sistema.',
  ].join('\n');

  if (smtpUser && smtpPass && to) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"${APP_NAME}" <${smtpUser}>`,
      to,
      subject: `[${APP_NAME}] Solicitud de acceso — requiere su aprobación`,
      text: summary,
    });
  }

  const callMeBotKey = (process.env.CALLMEBOT_API_KEY || '').trim();
  const adminWhatsApp = String(process.env.ADMIN_WHATSAPP_PHONE || process.env.CONTACT_PHONE || '').replace(/\D/g, '');
  if (callMeBotKey && adminWhatsApp) {
    try {
      await fetch(
        `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(adminWhatsApp)}&text=${encodeURIComponent(summary)}&apikey=${encodeURIComponent(callMeBotKey)}`,
      );
    } catch (err) {
      console.error('CallMeBot WhatsApp notify failed', err);
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Servicio no disponible.' });
  }

  const body = req.body || {};

  if (typeof body.website === 'string' && body.website.trim()) {
    return res.json({ ok: true });
  }

  const validationError = validateBody(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { first_name, last_name } = parseFullName(body.fullName);
  const contact_phone = normalizePhone(body.contactPhone);
  const specialty = String(body.specialty).trim();
  const workplace = String(body.workplace).trim();

  const { data, error } = await admin
    .from('staff_signup_requests')
    .insert({
      first_name,
      last_name,
      contact_phone,
      specialty,
      workplace,
      status: 'pending',
    })
    .select('id, first_name, last_name, contact_phone, specialty, workplace')
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya hay una solicitud pendiente con este teléfono.' });
    }
    console.error('pre-signup insert failed', error.message);
    return res.status(500).json({ error: 'No se pudo enviar la solicitud. Intente más tarde.' });
  }

  try {
    await notifyAdmin(data);
  } catch (err) {
    console.error('pre-signup notify failed', err);
  }

  return res.json({ ok: true });
}
