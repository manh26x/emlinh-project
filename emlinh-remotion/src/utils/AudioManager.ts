/**
 * AudioManager - Quản lý audio cho avatar lip-sync
 * Cung cấp các phương thức để quản lý audio element cho TTS
 */

class AudioManager {
  private static instance: AudioManager;
  private ttsAudioElement: HTMLAudioElement | null = null;

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Lấy audio element hiện tại hoặc tạo mới nếu chưa tồn tại
   */
  getTTSAudioElement(): HTMLAudioElement {
    if (!this.ttsAudioElement) {
      // Trong môi trường browser
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        this.ttsAudioElement = new Audio();
      } else {
        // Trong môi trường Remotion/SSR, tạo mock object
        this.ttsAudioElement = {
          paused: true,
          currentTime: 0,
          pause: () => {},
          play: () => Promise.resolve(),
          addEventListener: () => {},
          removeEventListener: () => {},
        } as unknown as HTMLAudioElement;
      }
    }
    return this.ttsAudioElement;
  }

  /**
   * Phát audio từ URL hoặc dữ liệu Blob
   */
  playAudio(audioSource: string | Blob): Promise<void> {
    const audio = this.getTTSAudioElement();
    
    return new Promise((resolve, reject) => {
      const handleSuccess = () => {
        audio.removeEventListener('canplaythrough', handleSuccess);
        audio.removeEventListener('error', handleError);
        audio.play().catch(reject);
        resolve();
      };

      const handleError = (error: Event) => {
        audio.removeEventListener('canplaythrough', handleSuccess);
        audio.removeEventListener('error', handleError);
        reject(error);
      };

      audio.addEventListener('canplaythrough', handleSuccess);
      audio.addEventListener('error', handleError);

      if (typeof audioSource === 'string') {
        audio.src = audioSource;
      } else if (audioSource instanceof Blob) {
        audio.src = URL.createObjectURL(audioSource);
      }

      audio.load();
    });
  }

  /**
   * Dừng audio đang phát
   */
  stopAudio(): void {
    const audio = this.getTTSAudioElement();
    if (audio && !audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
}

// Export single instance
export default AudioManager.getInstance();
