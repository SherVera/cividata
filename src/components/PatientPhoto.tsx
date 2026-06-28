import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { getPatientPhotoUrl } from '../lib/patientPhotosApi';

interface PatientPhotoProps {
  fotoPath?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export default function PatientPhoto({
  fotoPath,
  alt,
  className = 'h-16 w-16 rounded-2xl object-cover',
  fallbackClassName = 'h-16 w-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center',
}: PatientPhotoProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    if (!fotoPath) return () => { active = false; };

    getPatientPhotoUrl(fotoPath)
      .then((signed) => {
        if (active) setUrl(signed);
      })
      .catch(() => {
        if (active) setUrl(null);
      });

    return () => { active = false; };
  }, [fotoPath]);

  if (!url) {
    return (
      <div className={fallbackClassName} aria-hidden>
        <User className="h-6 w-6" />
      </div>
    );
  }

  return <img src={url} alt={alt} className={className} />;
}
