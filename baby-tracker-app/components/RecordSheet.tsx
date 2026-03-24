import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSpeech } from "@/hooks/use-speech";
import { useAuthStore } from "@/stores/auth-store";
import { useRecordStore } from "@/stores/record-store";
import * as recordApi from "@/services/record-api";
import VoiceButton from "./VoiceButton";
import QuickButtons from "./QuickButtons";
import { RecordType } from "@/types";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";
import * as ImagePicker from "expo-image-picker";
import * as photoApi from "@/services/photo-api";

interface RecordSheetProps {
  onClose: () => void;
}

export default function RecordSheet({ onClose }: RecordSheetProps) {
  const [textInput, setTextInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const { isListening, transcript, start, stop, reset } = useSpeech();
  const { currentBaby } = useAuthStore();
  const { setParsedRecords } = useRecordStore();
  const router = useRouter();

  const babyId = currentBaby?.id;

  const handleVoicePressIn = async () => {
    try {
      await start();
    } catch {
      Alert.alert("提示", "无法启动语音识别，请检查权限设置");
    }
  };

  const handleVoicePressOut = async () => {
    stop();
    setTimeout(() => {
      const text = transcript;
      if (text.trim()) {
        handleParseText(text);
      }
    }, 500);
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      handleParseText(textInput.trim());
    }
  };

  const handleParseText = async (text: string) => {
    if (!babyId) return;
    setIsParsing(true);
    try {
      const parsed = await recordApi.parseVoiceText(babyId, text);
      if (parsed.length === 0) {
        Alert.alert("提示", "未能识别出记录内容，请重试或手动输入");
        return;
      }
      setParsedRecords(parsed, text);
      reset();
      setTextInput("");
      onClose();
      router.push("/record/confirm");
    } catch {
      Alert.alert("解析失败", "请重试或使用手动输入");
    } finally {
      setIsParsing(false);
    }
  };

  const handleQuickPress = (type: RecordType | "photo") => {
    if (type === "photo") {
      handleTakePhoto();
      return;
    }
    onClose();
    router.push({ pathname: "/record/manual", params: { type } });
  };

  const handleTakePhoto = async () => {
    if (!babyId) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        await photoApi.uploadPhoto(babyId, result.assets[0].uri);
        Alert.alert("上传成功", "照片已保存");
        onClose();
      } catch {
        Alert.alert("上传失败", "请重试");
      }
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.voiceSection}>
            <VoiceButton
              isListening={isListening}
              onPressIn={handleVoicePressIn}
              onPressOut={handleVoicePressOut}
              transcript={transcript}
            />
          </View>

          {isParsing && (
            <View style={styles.parsingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.parsingText}>正在解析...</Text>
            </View>
          )}

          <View style={styles.textSection}>
            <Text style={styles.textHint}>不方便说话？</Text>
            <View style={styles.textInputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="输入记录内容..."
                value={textInput}
                onChangeText={setTextInput}
                returnKeyType="send"
                onSubmitEditing={handleTextSubmit}
              />
              <TouchableOpacity
                style={[styles.sendButton, !textInput.trim() && styles.sendButtonDisabled]}
                onPress={handleTextSubmit}
                disabled={!textInput.trim() || isParsing}
              >
                <MaterialCommunityIcons name="send" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.quickSection}>
            <QuickButtons onPress={handleQuickPress} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: 40,
    paddingHorizontal: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  closeButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.md,
    padding: Spacing.xs,
    zIndex: 10,
  },
  voiceSection: { alignItems: "center", paddingVertical: Spacing.lg },
  parsingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  parsingText: { fontSize: FontSize.sm, color: Colors.primary },
  textSection: { marginBottom: Spacing.lg },
  textHint: { fontSize: FontSize.sm, color: Colors.textLight, marginBottom: Spacing.sm },
  textInputRow: { flexDirection: "row", gap: Spacing.sm },
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
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: Colors.textLight },
  quickSection: { paddingTop: Spacing.sm },
});
