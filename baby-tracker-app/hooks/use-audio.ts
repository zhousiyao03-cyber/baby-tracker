import { useState, useRef, useEffect, useCallback } from "react";
import {
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  useAudioPlayerStatus,
  RecordingPresets,
  AudioModule,
} from "expo-audio";

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
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  const [isPlaying, setIsPlaying] = useState(false);
  const recordStartTime = useRef<number>(0);

  useEffect(() => {
    if (isPlaying && !playerStatus.playing && playerStatus.currentTime > 0) {
      setIsPlaying(false);
    }
  }, [playerStatus.playing, playerStatus.currentTime, isPlaying]);

  const startRecording = useCallback(async () => {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      throw new Error("未获得录音权限");
    }
    recorder.prepareToRecordAsync();
    recorder.record();
    recordStartTime.current = Date.now();
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<{
    uri: string;
    duration: number;
  }> => {
    await recorder.stop();
    const uri = recorder.uri ?? "";
    const duration = Math.round((Date.now() - recordStartTime.current) / 1000);
    return { uri, duration };
  }, [recorder]);

  const playAudio = useCallback(
    async (uri: string, _headers?: Record<string, string>) => {
      player.replace({ uri });
      player.play();
      setIsPlaying(true);
    },
    [player]
  );

  const stopPlaying = useCallback(async () => {
    player.pause();
    setIsPlaying(false);
  }, [player]);

  return {
    isRecording: recorderState.isRecording,
    recordingDuration: Math.round(recorderState.durationMillis / 1000),
    startRecording,
    stopRecording,
    isPlaying,
    playAudio,
    stopPlaying,
  };
}
