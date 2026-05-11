import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenShell } from "../components/ScreenShell";
import { Crest } from "../components/Crest";
import { OrnateRule } from "../components/OrnateRule";
import { PillButton } from "../components/PillButton";
import { SmallCaps } from "../components/SmallCaps";
import { useTheme } from "../theme/ThemeProvider";
import {
  markOnboarded,
  savePreferences,
  type PreferredTone,
  type PrayerDuration,
  type StateInLife,
  type UserPreferences,
} from "../lib/profile";

const STATES: { value: StateInLife; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "dating_engaged", label: "Dating / engaged" },
  { value: "married", label: "Married" },
  { value: "parent", label: "Parent" },
  { value: "religious", label: "Religious life" },
  { value: "clergy", label: "Clergy" },
  { value: "student", label: "Student" },
  { value: "other", label: "Prefer not to say" },
];

const TONES: { value: PreferredTone; label: string }[] = [
  { value: "gentle", label: "Gentle" },
  { value: "direct", label: "Direct" },
  { value: "encouraging", label: "Encouraging" },
  { value: "contemplative", label: "Contemplative" },
];

const DURATIONS: PrayerDuration[] = [5, 10, 15, 20, 30];

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<UserPreferences>({
    state_in_life: "other",
    preferred_tone: "gentle",
    prayer_duration_minutes: 10,
  });
  const [saving, setSaving] = useState(false);

  const total = 3;

  const onNext = async () => {
    if (step < total - 1) {
      setStep((s) => s + 1);
      return;
    }
    setSaving(true);
    try {
      await savePreferences(prefs);
    } finally {
      setSaving(false);
      router.replace("/");
    }
  };

  const onSkip = async () => {
    await markOnboarded();
    router.replace("/");
  };

  return (
    <ScreenShell pad={22}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <Crest size={44} />
          <View style={{ height: 14 }} />
          <SmallCaps color={theme.inkMuted} size={10}>
            {`question ${step + 1} of ${total}`}
          </SmallCaps>
        </View>

        <View style={{ height: 24 }} />
        <View style={{ paddingHorizontal: 4 }}>
          <OrnateRule />
        </View>
        <View style={{ height: 24 }} />

        {step === 0 ? (
          <>
            <Text style={headingStyle(theme)}>
              Where are you,{" "}
              <Text style={italicBrass(theme)}>in life,</Text> at the moment?
            </Text>
            <View style={{ height: 8 }} />
            <Text style={subStyle(theme)}>So saints can meet you where you are.</Text>
            <View style={{ height: 18 }} />
            <View style={{ gap: 8 }}>
              {STATES.map((opt) => {
                const active = prefs.state_in_life === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setPrefs((p) => ({ ...p, state_in_life: opt.value }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={rowStyle(theme, active)}
                  >
                    <Text style={rowTextStyle(theme, active)}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={headingStyle(theme)}>
              What{" "}
              <Text style={italicBrass(theme)}>tone</Text> serves you?
            </Text>
            <View style={{ height: 8 }} />
            <Text style={subStyle(theme)}>How the daily reflections should speak to you.</Text>
            <View style={{ height: 18 }} />
            <View style={{ gap: 8 }}>
              {TONES.map((opt) => {
                const active = prefs.preferred_tone === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setPrefs((p) => ({ ...p, preferred_tone: opt.value }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={rowStyle(theme, active)}
                  >
                    <Text style={rowTextStyle(theme, active)}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={headingStyle(theme)}>
              How much{" "}
              <Text style={italicBrass(theme)}>time</Text> can you give a day?
            </Text>
            <View style={{ height: 8 }} />
            <Text style={subStyle(theme)}>Across all prompts combined. You can change this later.</Text>
            <View style={{ height: 22 }} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {DURATIONS.map((mins) => {
                const active = prefs.prayer_duration_minutes === mins;
                return (
                  <Pressable
                    key={mins}
                    onPress={() => setPrefs((p) => ({ ...p, prayer_duration_minutes: mins }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: 38,
                      borderWidth: 1,
                      borderColor: active ? theme.brass : theme.hairline,
                      backgroundColor: active
                        ? theme.dark
                          ? "rgba(214,168,90,0.14)"
                          : "rgba(168,130,58,0.10)"
                        : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: theme.fonts.display.medium,
                        fontSize: 24,
                        color: active ? theme.brass : theme.ink,
                        letterSpacing: -0.5,
                      }}
                    >
                      {mins}
                    </Text>
                    <Text
                      style={{
                        fontFamily: theme.fonts.body.regular,
                        fontSize: 11,
                        color: active ? theme.brass : theme.inkMuted,
                        marginTop: -2,
                      }}
                    >
                      min
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <View style={{ height: 28 }} />
        <PillButton
          label={saving ? "Saving…" : step < total - 1 ? "Continue" : "Begin"}
          onPress={saving ? undefined : onNext}
          style={{ opacity: saving ? 0.6 : 1 }}
        />
        <View style={{ height: 10 }} />
        <Pressable onPress={onSkip} accessibilityRole="button">
          <Text
            style={{
              textAlign: "center",
              fontFamily: theme.fonts.body.regular,
              fontSize: 12.5,
              color: theme.inkMuted,
            }}
          >
            Skip for now
          </Text>
        </Pressable>
        <View style={{ height: 60 }} />
      </ScrollView>
    </ScreenShell>
  );
}

const headingStyle = (theme: ReturnType<typeof useTheme>["theme"]) => ({
  fontFamily: theme.fonts.display.regular,
  fontSize: 30,
  lineHeight: 34,
  color: theme.ink,
  letterSpacing: -0.4,
});

const italicBrass = (theme: ReturnType<typeof useTheme>["theme"]) => ({
  fontFamily: theme.fonts.display.italic,
  color: theme.brass,
});

const subStyle = (theme: ReturnType<typeof useTheme>["theme"]) => ({
  fontFamily: theme.fonts.display.italic,
  fontSize: 14,
  color: theme.inkMuted,
  lineHeight: 22,
});

const rowStyle = (
  theme: ReturnType<typeof useTheme>["theme"],
  active: boolean,
) => ({
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: active ? theme.brass : theme.hairline,
  backgroundColor: active
    ? theme.dark
      ? "rgba(214,168,90,0.12)"
      : "rgba(168,130,58,0.08)"
    : theme.surface,
});

const rowTextStyle = (
  theme: ReturnType<typeof useTheme>["theme"],
  active: boolean,
) => ({
  fontFamily: theme.fonts.display.medium,
  fontSize: 16,
  color: active ? theme.brass : theme.ink,
});
