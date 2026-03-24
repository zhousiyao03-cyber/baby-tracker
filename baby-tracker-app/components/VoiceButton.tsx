import { useRef } from "react";
import {
  Animated,
  TouchableWithoutFeedback,
  Text,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, FontSize } from "@/constants/theme";

interface VoiceButtonProps {
  isListening: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  transcript: string;
}

export default function VoiceButton({
  isListening,
  onPressIn,
  onPressOut,
  transcript,
}: VoiceButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
    onPressIn();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    onPressOut();
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.button,
            isListening && styles.buttonActive,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <MaterialCommunityIcons
            name={isListening ? "microphone" : "microphone-outline"}
            size={40}
            color="#FFFFFF"
          />
        </Animated.View>
      </TouchableWithoutFeedback>
      <Text style={styles.hint}>
        {isListening
          ? transcript || "正在聆听..."
          : "按住说话，松手识别"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  button: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonActive: {
    backgroundColor: Colors.primaryDark,
  },
  hint: {
    marginTop: 12,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
});
