import { useState, useEffect } from 'react';
import { delayRender, continueRender } from 'remotion';
import { MouthCue } from './types';

const LOG_PREFIX = "[useMouthCues]";

export const useMouthCues = (mouthCuesUrl: string | null) => {
  const [cues, setCues] = useState<MouthCue[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchMouthCues = async () => {
      if (!mouthCuesUrl) {
        setCues([]);
        setIsLoading(false);
        return;
      }

      // Tạo delayRender handle chỉ khi cần
      let cuesLoadHandle: number | null = null;
      try {
        cuesLoadHandle = delayRender(`Loading mouth cues from ${mouthCuesUrl}`, { timeoutInMilliseconds: 15000 });
        
        // Set timeout để force continue nếu load quá lâu
        const forceTimeout = setTimeout(() => {
          if (!signal.aborted && cuesLoadHandle) {
            console.warn(LOG_PREFIX, 'Force continuing due to timeout, using empty cues');
            setCues([]);
            setIsLoading(false);
            continueRender(cuesLoadHandle);
          }
        }, 10000);

        const response = await fetch(mouthCuesUrl, { signal });
        clearTimeout(forceTimeout);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch mouth cues: ${response.statusText}`);
        }
        
        const jsonData = await response.json();
        
        if (!signal.aborted) {
          setCues(jsonData.mouthCues || []);
          setIsLoading(false);
          if (cuesLoadHandle) {
            continueRender(cuesLoadHandle);
          }
        }
      } catch (err) {
        if (!signal.aborted) {
          console.error(LOG_PREFIX, 'Error loading mouth cues:', err);
          setError(err as Error);
          setCues([]);
          setIsLoading(false);
          if (cuesLoadHandle) {
            continueRender(cuesLoadHandle);
          }
        }
      }
    };

    fetchMouthCues();

    return () => {
      abortController.abort();
    };
  }, [mouthCuesUrl]);

  return { cues, error, isLoading };
}; 