import { useState, useRef } from "react";
import { Audio } from "expo-av";

interface UseAudioReturn {
  isRecording: boolean;
  recordingDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ uri: string; duration: number }>;
  isPlaying: boolean;
  playAudio: (uri: string, headers?: Record<string, string>) => Promise<void>;
  stopPlaying: () => Promise<void>;
}

export function useAudio(): UseAudioReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) throw new Error("需要麦克风权限");

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
    setIsRecording(true);
    setRecordingDuration(0);
    timerRef.current = setInterval(() => {
      setRecordingDuration((d) => d + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    if (!recordingRef.current) throw new Error("No recording");
    if (timerRef.current) clearInterval(timerRef.current);

    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI()!;
    const duration = recordingDuration;
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingDuration(0);

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    return { uri, duration };
  };

  const playAudio = async (uri: string, headers?: Record<string, string>) => {
    await stopPlaying();
    const { sound } = await Audio.Sound.createAsync(
      { uri, headers },
      { shouldPlay: true }
    );
    soundRef.current = sound;
    setIsPlaying(true);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setIsPlaying(false);
      }
    });
  };

  const stopPlaying = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsPlaying(false);
  };

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    isPlaying,
    playAudio,
    stopPlaying,
  };
}
