import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};

export type UseSpeechRecognitionOptions = {
  /** Segundos máximos de dictado. 0 = sin límite. */
  maxSeconds?: number;
};

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function useSpeechRecognition(lang = 'es-VE', options: UseSpeechRecognitionOptions = {}) {
  const maxSeconds = options.maxSeconds ?? 0;
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const limitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supported = isSpeechRecognitionSupported();

  const clearTimers = useCallback(() => {
    if (limitTimerRef.current) {
      clearTimeout(limitTimerRef.current);
      limitTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setRemainingSeconds(null);
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    recognitionRef.current?.stop();
    setListening(false);
  }, [clearTimers]);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('Su navegador no admite dictado por voz. Use Chrome en Android o escriba el texto.');
      return;
    }

    setError('');
    setLimitReached(false);
    clearTimers();

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let interim = '';
      let finalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) finalChunk += piece;
        else interim += piece;
      }

      if (finalChunk) {
        setTranscript((prev) => {
          const base = prev.trimEnd();
          const chunk = finalChunk.trim();
          if (!chunk) return prev;
          return base ? `${base} ${chunk}` : chunk;
        });
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted') return;
      setError('No se pudo capturar la voz. Verifique el micrófono e intente de nuevo.');
      clearTimers();
      setListening(false);
    };

    recognition.onend = () => {
      clearTimers();
      setListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();

    if (maxSeconds > 0) {
      setRemainingSeconds(maxSeconds);
      countdownRef.current = setInterval(() => {
        setRemainingSeconds((prev) => (prev === null || prev <= 1 ? 0 : prev - 1));
      }, 1000);

      limitTimerRef.current = setTimeout(() => {
        setLimitReached(true);
        recognitionRef.current?.stop();
        clearTimers();
        setListening(false);
      }, maxSeconds * 1000);
    }
  }, [lang, maxSeconds, clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers();
      recognitionRef.current?.abort();
    };
  }, [clearTimers]);

  return {
    supported,
    listening,
    transcript,
    interimTranscript,
    error,
    remainingSeconds,
    limitReached,
    setTranscript,
    start,
    stop,
  };
}
