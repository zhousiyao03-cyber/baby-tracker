import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Message } from "@/types";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";
import { format } from "date-fns";
import { getAudioUrl } from "@/services/message-api";
import * as SecureStore from "expo-secure-store";

interface Props {
  message: Message;
  isPlaying: boolean;
  onPlayAudio: (uri: string, headers: Record<string, string>) => void;
  onStopAudio: () => void;
}

export default function MessageItem({
  message,
  isPlaying,
  onPlayAudio,
  onStopAudio,
}: Props) {
  const date = format(new Date(message.recordedAt), "M月d日 HH:mm");
  const nickname = message.user?.nickname || "未知";

  const handlePlayAudio = async () => {
    if (isPlaying) {
      onStopAudio();
      return;
    }
    const token = await SecureStore.getItemAsync("accessToken");
    const audioUrl = getAudioUrl(message.id);
    onPlayAudio(audioUrl, { Authorization: `Bearer ${token || ""}` });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.author}>{nickname}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>

      {message.textContent && (
        <Text style={styles.text}>{message.textContent}</Text>
      )}

      {message.audioUrl && (
        <TouchableOpacity style={styles.audioRow} onPress={handlePlayAudio}>
          <MaterialCommunityIcons
            name={isPlaying ? "pause-circle" : "play-circle"}
            size={36}
            color={Colors.primary}
          />
          <Text style={styles.audioDuration}>
            {message.audioDurationSeconds
              ? `${Math.round(message.audioDurationSeconds)}秒`
              : "语音"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  author: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.primary,
  },
  date: { fontSize: FontSize.sm, color: Colors.textSecondary },
  text: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  audioDuration: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
