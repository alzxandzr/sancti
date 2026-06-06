import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { ScreenShell } from "../components/ScreenShell";
import { BackButton } from "../components/BackButton";
import { OrnateRule } from "../components/OrnateRule";
import { SmallCaps } from "../components/SmallCaps";
import { useTheme } from "../theme/ThemeProvider";
import { listAllEntries, type JournalEntryWithContext } from "../lib/journal";

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

export default function JournalHistoryScreen() {
  const { theme } = useTheme();
  const [entries, setEntries] = useState<JournalEntryWithContext[] | null>(null);

  const refresh = useCallback(async () => {
    const data = await listAllEntries();
    setEntries(data);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

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
          your journal
        </SmallCaps>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ height: 18 }} />
      <Text
        style={{
          fontFamily: theme.fonts.display.regular,
          fontSize: 32,
          lineHeight: 36,
          color: theme.ink,
          letterSpacing: -0.4,
        }}
      >
        What you have{"\n"}
        <Text style={{ fontFamily: theme.fonts.display.italic, color: theme.brass }}>
          written.
        </Text>
      </Text>

      <View style={{ height: 14 }} />
      <OrnateRule />
      <View style={{ height: 14 }} />

      {!entries ? (
        <View style={{ marginTop: 40, alignItems: "center" }}>
          <ActivityIndicator color={theme.brass} />
        </View>
      ) : entries.length === 0 ? (
        <View style={{ marginTop: 40, alignItems: "center", gap: 12 }}>
          <SmallCaps color={theme.inkMuted} size={11}>
            nothing yet
          </SmallCaps>
          <Text
            style={{
              textAlign: "center",
              fontFamily: theme.fonts.display.italic,
              fontSize: 15,
              color: theme.inkSoft,
              paddingHorizontal: 24,
              lineHeight: 24,
            }}
          >
            Reflections you write on today’s screen will gather here.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {entries.map((e) => (
            <View
              key={e.id}
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.hairline,
                borderLeftWidth: 2,
                borderLeftColor: theme.brass,
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <SmallCaps color={theme.inkMuted} size={9}>
                  {e.day_index !== null ? `day ${e.day_index + 1}` : "reflection"}
                </SmallCaps>
                <SmallCaps color={theme.inkFaint} size={9}>
                  {formatDate(e.created_at)}
                </SmallCaps>
              </View>
              {e.prompt_title ? (
                <Text
                  style={{
                    fontFamily: theme.fonts.display.medium,
                    fontSize: 15,
                    color: theme.ink,
                    marginBottom: 8,
                    lineHeight: 20,
                  }}
                  numberOfLines={2}
                >
                  {e.prompt_title}
                </Text>
              ) : null}
              <Text
                style={{
                  fontFamily: theme.fonts.display.italic,
                  fontSize: 15,
                  lineHeight: 24,
                  color: theme.inkSoft,
                }}
              >
                {e.body}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 60 }} />
    </ScreenShell>
  );
}
