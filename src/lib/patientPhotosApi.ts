import { supabase } from './supabaseClient';

const BUCKET = 'patient-photos';
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function ensureClient() {
  if (!supabase) throw new Error('No se pudo iniciar la conexión segura.');
  return supabase;
}

function photoObjectPath(patientId: string) {
  return `${patientId}/photo.jpg`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

/** Reduce tamaño para uso en campo (máx. 800px, JPEG). */
export async function compressPatientPhoto(file: File): Promise<Blob> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error('Formato no admitido. Use JPG, PNG o WebP.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('La imagen supera 5 MB.');
  }

  const img = await loadImage(file);
  const maxSide = 800;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen.');
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.82);
  });
  if (!blob) throw new Error('No se pudo comprimir la imagen.');
  return blob;
}

export async function uploadPatientPhoto(patientId: string, file: File): Promise<string> {
  const client = ensureClient();
  const blob = await compressPatientPhoto(file);
  const path = photoObjectPath(patientId);
  const { error } = await client.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: 'image/jpeg',
    cacheControl: '3600',
  });
  if (error) throw error;
  return path;
}

export async function deletePatientPhoto(path: string | null | undefined): Promise<void> {
  if (!path) return;
  const client = ensureClient();
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export async function getPatientPhotoUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const client = ensureClient();
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
