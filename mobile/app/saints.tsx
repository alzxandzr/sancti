import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenShell } from "../components/ScreenShell";
import { BackButton } from "../components/BackButton";
import { Medallion } from "../components/Medallion";
import { OrnateRule } from "../components/OrnateRule";
import { SmallCaps } from "../components/SmallCaps";
import { useTheme } from "../theme/ThemeProvider";
import { apiListSaints, type SaintSummary } from "../lib/api";
import { listSavedSaints } from "../lib/savedSaints";

type Filter = "all" | "saved";

export default function SaintsBrowseScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [saints, setSaints] = useState<SaintSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    apiListSaints()
      .then(({ saints }) => {
        if (!cancelled) setSaints(saints);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load saints.");
      });
    void listSavedSaints().then((ids) => {
      if (!cancelled) setSavedIds(new Set(ids));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!saints) return [];
    const needle = q.trim().toLowerCase();
    const base =
      filter === "saved" ? saints.filter((s) => savedIds.has(s.id)) : saints;
    if (needle.length === 0) return base;
    return base.filter((s) =>
      [s.name, s.title, s.era, s.feast_day, ...s.themes]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [saints, q, filter, savedIds]);

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
          the company of saints
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
        The{" "}
        <Text style={{ fontFamily: theme.fonts.display.italic, color: theme.brass }}>
          communion
        </Text>{" "}
        of saints
      </Text>
      <View style={{ height: 6 }} />
      <Text
        style={{
          fontFamily: theme.fonts.display.italic,
          fontSize: 14,
          color: theme.inkMuted,
          lineHeight: 22,
        }}
      >
        {saints ? `${saints.length} canonized companions, alphabetized.` : "Loading the chorus…"}
      </Text>

      <View style={{ height: 18 }} />

      <View
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.hairline,
          borderRadius: 14,
          paddingHorizontal: 14,
        }}
      >
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by name, theme, feast day…"
          placeholderTextColor={theme.inkFaint}
          style={{
            fontFamily: theme.fonts.body.regular,
            fontSize: 15,
            color: theme.ink,
            paddingVertical: 12,
          }}
        />
      </View>

      <View style={{ height: 12 }} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["all", "saved"] as const).map((opt) => {
          const active = filter === opt;
          const label = opt === "all" ? `All · ${saints?.length ?? 0}` : `Saved · ${savedIds.size}`;
          return (
            <Pressable
              key={opt}
              onPress={() => setFilter(opt)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                paddingVertical: 7,
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
                  fontSize: 12,
                  fontFamily: theme.fonts.body.medium,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 14 }} />
      <OrnateRule />
      <View style={{ height: 14 }} />

      {error ? (
        <Text style={{ color: theme.cardinal, marginTop: 12 }}>{error}</Text>
      ) : !saints ? (
        <View style={{ marginTop: 40, alignItems: "center" }}>
          <ActivityIndicator color={theme.brass} />
        </View>
      ) : filtered.length === 0 ? (
        <Text
          style={{
            textAlign: "center",
            marginTop: 30,
            color: theme.inkMuted,
            fontFamily: theme.fonts.display.italic,
            fontSize: 14,
            paddingHorizontal: 24,
            lineHeight: 22,
          }}
        >
          {filter === "saved" && q.trim().length === 0
            ? "Nothing saved yet. Open a saint and tap the star to save them."
            : `No saints match "${q}".`}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push(`/saint/${s.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${s.name}`}
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.hairline,
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <Medallion name={s.name} size={52} wikipediaTitle={s.wikipedia_title ?? null} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontFamily: theme.fonts.display.medium,
                    fontSize: 17,
                    color: theme.ink,
                    lineHeight: 22,
                  }}
                  numberOfLines={1}
                >
                  {s.name}
                </Text>
                <Text
                  style={{
                    fontFamily: theme.fonts.display.italic,
                    fontSize: 12.5,
                    color: theme.inkMuted,
                    marginTop: 3,
                    lineHeight: 18,
                  }}
                  numberOfLines={1}
                >
                  {`${s.title} · ${s.era}`}
                </Text>
                <Text
                  style={{
                    fontFamily: theme.fonts.body.regular,
                    fontSize: 11,
                    letterSpacing: 0.4,
                    color: theme.inkFaint,
                    marginTop: 6,
                  }}
                  numberOfLines={1}
                >
                  feast · {s.feast_day}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScreenShell>
  );
}
