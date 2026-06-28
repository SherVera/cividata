export type ContactPayload = {
  name?: string;
  message: string;
  website?: string;
};

export async function sendContactEmail(payload: ContactPayload): Promise<void> {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo enviar el correo.');
  }
}
