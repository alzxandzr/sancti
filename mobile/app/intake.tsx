import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import { ScreenShell } from "../components/ScreenShell";
import { BackButton } from "../components/BackButton";
import { PillButton } from "../components/PillButton";
import { SmallCaps } from "../components/SmallCaps";
import { useTheme } from "../theme/ThemeProvider";
import { useSession } from "../lib/session";

const CHIPS = [
  "Grieving",
  "Discernment",
  "Burned out",
  "Family tension",
  "Doubt",
  "New role",
];
const MAX_CHARS = 600;

export default function IntakeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { classifyAndMatch, stage, error } = useSession();
  const [text, setText] = useState("");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  const onChipPress = (chip: string) => {
    setSelectedChip((cur) => (cur === chip ? null : chip));
  };

  const trimmed = text.trim();
  const submission = trimmed.length > 0 ? trimmed : (selectedChip ?? "");
  const ready = submission.length > 0;
  const working = stage === "classifying" || stage === "matching";

  const onSubmit = async () => {
    if (!ready || working) return;
    await classifyAndMatch(submission);
    router.push("/results");
  };

  return (
    <ScreenShell pad={22}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <BackButton />
        <SmallCaps color={theme.inkMuted} size={10}>
          step 1 · 3
        </SmallCaps>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ height: 22 }} />

      <Text
        style={{
          fontFamily: theme.fonts.display.regular,
          fontSize: 32,
          lineHeight: 36,
          color: theme.ink,
          letterSpacing: -0.4,
        }}
      >
        What are you{"\n"}
        <Text style={{ fontFamily: theme.fonts.display.italic, color: theme.brass }}>
          carrying
        </Text>{" "}
        today?
      </Text>
      <View style={{ height: 10 }} />
      <Text
        style={{
          fontSize: 14,
          color: theme.inkMuted,
          fontFamily: theme.fonts.body.regular,
          lineHeight: 22,
        }}
      >
        A few sentences is enough. You can also choose from the list below.
      </Text>

      <View style={{ height: 20 }} />

      <View
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.hairline,
          borderRadius: 18,
          paddingVertical: 18,
          paddingHorizontal: 18,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="A few sentences about your situation…"
          placeholderTextColor={theme.inkFaint}
          multiline
          maxLength={MAX_CHARS}
          editable={!working}
          style={{
            fontFamily: theme.fonts.display.italic,
            fontSize: 18,
            lineHeight: 28,
            color: theme.ink,
            minHeight: 120,
            padding: 0,
            textAlignVertical: "top",
          }}
        />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <SmallCaps color={theme.inkFaint} size={9}>
            {`${text.length} / ${MAX_CHARS}`}
          </SmallCaps>
          <SmallCaps color={theme.inkMuted} size={9}>
            private to you
          </SmallCaps>
        </View>
      </View>

      <View style={{ height: 22 }} />
      <SmallCaps color={theme.inkMuted} size={10}>
        or pick a season
      </SmallCaps>
      <View style={{ height: 10 }} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {CHIPS.map((chip) => {
          const active = chip === selectedChip;
          return (
            <Pressable
              key={chip}
              onPress={() => onChipPress(chip)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? theme.brass : theme.hairline,
                backgroundColor: active
                  ? theme.dark
                    ? "rgba(214,168,90,0.12)"
                    : "rgba(168,130,58,0.08)"
                  : "transparent",
              }}
            >
              <Text
                style={{
                  color: active ? theme.brass : theme.inkSoft,
                  fontSize: 13,
                  fontFamily: theme.fonts.body.medium,
                }}
              >
                {chip}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 24 }} />

      {error && stage === "error" ? (
        <Text
          style={{
            color: theme.cardinal,
            fontFamily: theme.fonts.body.regular,
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {error}
        </Text>
      ) : null}

      <PillButton
        label={working ? "Discerning…" : "Find saints"}
        onPress={ready && !working ? onSubmit : undefined}
        style={{ opacity: ready && !working ? 1 : 0.5 }}
        trailingIcon={
          <Svg width={14} height={14} viewBox="0 0 14 14">
            <Path
              d="M1 7h12M8 2l5 5-5 5"
              stroke={theme.bg}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        }
      />
    </ScreenShell>
  );
}
