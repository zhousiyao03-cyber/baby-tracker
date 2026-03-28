import { useState } from "react";
import { Alert } from "react-native";

// TODO: expo-av 与 SDK 55 存在兼容性问题（EXEventEmitter.h 缺失），
// 暂时使用 stub 实现，待 expo-av 更新后恢复

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
  const [isRecording] = useState(false);
  const [recordingDuration] = useState(0);
  const [isPlaying] = useState(false);

  const startRecording = async () => {
    Alert.alert("提示", "音频录制功能即将上线");
  };

  const stopRecording = async (): Promise<{ uri: string; duration: number }> => {
    return { uri: "", duration: 0 };
  };

  const playAudio = async () => {
    Alert.alert("提示", "音频播放功能即将上线");
  };

  const stopPlaying = async () => {};

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
