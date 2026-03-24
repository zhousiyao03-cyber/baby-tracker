import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { useAudio } from "@/hooks/use-audio";
import * as messageApi from "@/services/message-api";
import { Message } from "@/types";
import MessageItem from "@/components/MessageItem";
import EmptyState from "@/components/EmptyState";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

export default function MessagesScreen() {
  const { currentBaby } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [sending, setSending] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    playAudio,
    stopPlaying,
  } = useAudio();

  const loadMessages = useCallback(async () => {
    if (!currentBaby) return;
    try {
      const data = await messageApi.getMessages(currentBaby.id);
      setMessages(data);
    } catch (err) {
      console.error("加载寄语失败:", err);
    }
  }, [currentBaby]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  const handleSendText = async () => {
    if (!currentBaby || !textInput.trim()) return;
    setSending(true);
    try {
      await messageApi.createMessage(currentBaby.id, {
        textContent: textInput.trim(),
      });
      setTextInput("");
      await loadMessages();
    } catch {
      Alert.alert("发送失败", "请重试");
    } finally {
      setSending(false);
    }
  };

  const handleRecordToggle = async () => {
    if (!currentBaby) return;
    if (isRecording) {
      try {
        const { uri, duration } = await stopRecording();
        setSending(true);
        await messageApi.createMessage(currentBaby.id, {
          audioUri: uri,
          audioDurationSeconds: duration,
        });
        await loadMessages();
      } catch {
        Alert.alert("发送失败", "请重试");
      } finally {
        setSending(false);
      }
    } else {
      try {
        await startRecording();
      } catch {
        Alert.alert("提示", "无法录音，请检查权限");
      }
    }
  };

  const handlePlayAudio = (uri: string, headers: Record<string, string>) => {
    playAudio(uri, headers);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={88}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageItem
            message={item}
            isPlaying={playingId === item.id}
            onPlayAudio={(uri, headers) => {
              setPlayingId(item.id);
              handlePlayAudio(uri, headers);
            }}
            onStopAudio={() => {
              setPlayingId(null);
              stopPlaying();
            }}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="还没有寄语"
            subtitle="在下方写下对宝宝说的话"
          />
        }
      />

      <View style={styles.inputBar}>
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonActive]}
          onPress={handleRecordToggle}
        >
          <MaterialCommunityIcons
            name={isRecording ? "stop" : "microphone"}
            size={24}
            color={isRecording ? "#FFF" : Colors.primary}
          />
        </TouchableOpacity>

        {isRecording ? (
          <Text style={styles.recordingText}>
            录音中... {recordingDuration}秒
          </Text>
        ) : (
          <>
            <TextInput
              style={styles.textInput}
              placeholder="写给宝宝的话..."
              value={textInput}
              onChangeText={setTextInput}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!textInput.trim() || sending) && styles.sendDisabled,
              ]}
              onPress={handleSendText}
              disabled={!textInput.trim() || sending}
            >
              <MaterialCommunityIcons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md, flexGrow: 1 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: Colors.error,
  },
  recordingText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.error,
    fontWeight: "500",
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { backgroundColor: Colors.textLight },
});
