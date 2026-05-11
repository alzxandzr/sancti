import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BackButton } from "../../components/BackButton";
import { FeatureMedallion } from "../../components/Medallion";
import { OrnateRule } from "../../components/OrnateRule";
import { PillButton } from "../../components/PillButton";
import { SmallCaps } from "../../components/SmallCaps";
import { useTheme } from "../../theme/ThemeProvider";
import { apiFetchSaint, type Saint, type SaintMatch } from "../../lib/api";
import { useSession } from "../../lib/session";
import { useWikipediaSummary } from "../../lib/wikipediaImage";
import { isSaintSaved, saveSaint, unsaveSaint } from "../../lib/savedSaints";
import { feastCountdown } from "../../lib/feastDay";
import { prayerFor } from "../../lib/saintPrayer";

const StarIcon = ({ color, filled }: { color: string; filled: boolean }) => (
  <Svg width={14} height={14} viewBox="0 0 14 14">
    <Path
      d="M7 1l1.8 4 4.2.4-3 3 1 4.2L7 10.4 3 12.6l1-4.2-3-3L5.2 5z"
      stroke={color}
      strokeWidth={1.2}
      fill={filled ? color : "none"}
      strokeLinejoin="round"
    />
  </Svg>
);

// "St. Ignatius of Loyola" → "St. Ignatius"
const shortName = (full: string): string => {
  const m = full.match(/^(St\.?|Sts\.?|Bl\.?|Ven\.?)\s+(\S+)/i);
  return m ? `${m[1]} ${m[2]}` : full;
};

export default function SaintProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams() as { id?: string };
  const id = params.id ?? "";
  const { classification, generatePlan, seedFromSaint, stage } = useSession();

  // Applied to every top-level container instead of wrapping in SafeAreaView.
  const shellStyle = {
    flex: 1,
    backgroundColor: theme.bg,
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  } as const;

  const [saint, setSaint] = useState<Saint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [savedBusy, setSavedBusy] = useState(false);
  const { data: wiki } = useWikipediaSummary(saint?.wikipedia_title ?? null);

  useEffect(() => {
    if (!saint?.id) return;
    let cancelled = false;
    void isSaintSaved(saint.id).then((v) => {
      if (!cancelled) setSaved(v);
    });
    return () => {
      cancelled = true;
    };
  }, [saint?.id]);

  const onToggleSaved = async () => {
    if (!saint?.id || savedBusy) return;
    setSavedBusy(true);
    const next = !saved;
    setSaved(next); // optimistic
    try {
      if (next) await saveSaint(saint.id);
      else await unsaveSaint(saint.id);
    } catch {
      setSaved(!next); // rollback
    } finally {
      setSavedBusy(false);
    }
  };

  const onWalkWithSaint = async () => {
    if (!saint) return;
    const themesForPlan =
      classification?.themes && classification.themes.length > 0
        ? classification.themes
        : saint.suggested_themes && saint.suggested_themes.length > 0
          ? saint.suggested_themes
          : saint.themes.slice(0, 3);
    const asMatch: SaintMatch = {
      id: saint.id,
      name: saint.name,
      reason: `Walking with ${saint.name} through ${themesForPlan[0] ?? "this season"}.`,
      themes: themesForPlan,
      feast_day: saint.feast_day,
      prayer_reference: `Ask ${saint.name} to intercede for this intention.`,
      ...(saint.wikipedia_title ? { wikipedia_title: saint.wikipedia_title } : {}),
    };

    // No prior intake → seed session from this saint's strongest mapping.
    if (!classification) {
      const route = saint.suggested_route ?? "GENERAL_GUIDANCE";
      seedFromSaint(asMatch, route, themesForPlan);
    }

    await generatePlan([asMatch]);
    router.push("/plan");
  };

  const planning = stage === "planning";
  const canWalk = !planning && !!saint && (!!classification || !!saint?.suggested_route);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetchSaint(id)
      .then((s) => {
        if (!cancelled) setSaint(s);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load saint.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={shellStyle}>
        <View style={{ padding: 22 }}>
          <BackButton />
        </View>
        <View style={{ marginTop: 80, alignItems: "center" }}>
          <ActivityIndicator color={theme.brass} />
        </View>
      </View>
    );
  }

  if (error || !saint) {
    return (
      <View style={shellStyle}>
        <View style={{ padding: 22 }}>
          <BackButton />
        </View>
        <View style={{ marginTop: 60, paddingHorizontal: 22, gap: 12, alignItems: "center" }}>
          <SmallCaps color={theme.cardinal} size={11}>
            unable to load
          </SmallCaps>
          <Text
            style={{
              textAlign: "center",
              color: theme.inkSoft,
              fontFamily: theme.fonts.body.regular,
              fontSize: 14,
            }}
          >
            {error ?? `Saint '${id}' not found.`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={shellStyle}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            backgroundColor: theme.surface2,
            paddingTop: 14,
            paddingBottom: 22,
            borderBottomWidth: 1,
            borderBottomColor: theme.hairline,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 22,
            }}
          >
            <BackButton raised />
            <Pressable
              onPress={onToggleSaved}
              accessibilityRole="button"
              accessibilityLabel={saved ? "Remove saint from saved" : "Save this saint"}
              accessibilityState={{ selected: saved }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: saved ? theme.brass : theme.hairline,
                backgroundColor: saved
                  ? theme.dark
                    ? "rgba(214,168,90,0.16)"
                    : "rgba(168,130,58,0.12)"
                  : theme.surface,
                alignItems: "center",
                justifyContent: "center",
                opacity: savedBusy ? 0.6 : 1,
              }}
            >
              <StarIcon color={saved ? theme.brass : theme.inkSoft} filled={saved} />
            </Pressable>
          </View>

          <View style={{ height: 14 }} />
          <View style={{ alignItems: "center" }}>
            <FeatureMedallion name={saint.name} size={146} wikipediaTitle={saint.wikipedia_title ?? null} />
          </View>
          <View style={{ height: 14 }} />

          <View style={{ alignItems: "center", paddingHorizontal: 22 }}>
            <SmallCaps color={theme.brass} size={10}>
              {saint.title}
            </SmallCaps>
            <View style={{ height: 6 }} />
            <Text
              style={{
                fontFamily: theme.fonts.display.medium,
                fontSize: 28,
                lineHeight: 31,
                color: theme.ink,
                letterSpacing: -0.3,
                textAlign: "center",
              }}
            >
              {saint.name}
            </Text>
            <View style={{ height: 8 }} />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                gap: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: theme.inkMuted,
                  fontFamily: theme.fonts.display.italic,
                }}
              >
                feast · {saint.feast_day}
              </Text>
              <Text style={{ color: theme.inkMuted, opacity: 0.5 }}>·</Text>
              <Text
                style={{
                  fontSize: 12,
                  color: theme.inkMuted,
                  fontFamily: theme.fonts.display.italic,
                }}
              >
                {saint.era}
              </Text>
            </View>
            {(() => {
              const countdown = feastCountdown(saint.feast_day);
              if (!countdown) return null;
              return (
                <View
                  style={{
                    marginTop: 10,
                    paddingVertical: 5,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.brass,
                    backgroundColor: theme.dark
                      ? "rgba(214,168,90,0.12)"
                      : "rgba(168,130,58,0.08)",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: theme.fonts.body.medium,
                      fontSize: 10.5,
                      letterSpacing: 1.4,
                      textTransform: "uppercase",
                      color: theme.brass,
                    }}
                  >
                    {countdown}
                  </Text>
                </View>
              );
            })()}
          </View>
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 24 }}>
          {/* Drop-cap intro from our seed bio (always present). */}
          <View style={{ flexDirection: "row" }}>
            <Text
              style={{
                fontFamily: theme.fonts.display.medium,
                fontSize: 52,
                // lineHeight must be >= fontSize or the top of the drop cap
                // clips. 56 keeps the cap visually aligned with the first body
                // line without truncating the glyph.
                lineHeight: 56,
                color: theme.brass,
                paddingRight: 10,
                paddingTop: 2,
              }}
            >
              {saint.short_bio[0]}
            </Text>
            <Text
              style={{
                flex: 1,
                fontFamily: theme.fonts.display.regular,
                fontSize: 17,
                lineHeight: 27,
                color: theme.inkSoft,
              }}
            >
              {saint.short_bio.slice(1)}
            </Text>
          </View>

          {/* Longer biography from Wikipedia. */}
          {wiki?.extract && wiki.extract.length > saint.short_bio.length + 20 ? (
            <>
              <View style={{ height: 22 }} />
              <OrnateRule label="life" />
              <View style={{ height: 14 }} />
              <Text
                style={{
                  fontFamily: theme.fonts.display.regular,
                  fontSize: 16,
                  lineHeight: 25,
                  color: theme.inkSoft,
                }}
              >
                {wiki.extract}
              </Text>
            </>
          ) : null}

          <View style={{ height: 26 }} />
          <OrnateRule label="virtues" />
          <View style={{ height: 14 }} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {saint.virtues.map((v) => (
              <View
                key={v}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 13,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.hairline,
                }}
              >
                <Text
                  style={{
                    fontSize: 12.5,
                    color: theme.inkSoft,
                    fontFamily: theme.fonts.body.medium,
                  }}
                >
                  {v}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ height: 22 }} />
          <OrnateRule label="patron of" />
          <View style={{ height: 14 }} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4 }}>
            {saint.patronages.map((p) => (
              <Text
                key={p}
                style={{
                  fontSize: 13,
                  color: theme.inkSoft,
                  fontFamily: theme.fonts.display.italic,
                  lineHeight: 22,
                }}
              >
                · {p}
              </Text>
            ))}
          </View>

          {/* ── Prayer ── */}
          <View style={{ height: 22 }} />
          <OrnateRule label="prayer" />
          <View style={{ height: 14 }} />
          {(() => {
            const p = prayerFor(saint.id, saint.name);
            return (
              <View
                style={{
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.hairline,
                  borderLeftWidth: 2,
                  borderLeftColor: theme.brass,
                  borderRadius: 14,
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                }}
              >
                <SmallCaps color={theme.brass} size={9}>
                  {p.title}
                </SmallCaps>
                <View style={{ height: 8 }} />
                <Text
                  style={{
                    fontFamily: theme.fonts.display.italic,
                    fontSize: 15,
                    lineHeight: 25,
                    color: theme.inkSoft,
                  }}
                >
                  {p.body}
                </Text>
              </View>
            );
          })()}

          <View style={{ height: 22 }} />
          <OrnateRule label="themes" />
          <View style={{ height: 14 }} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4 }}>
            {saint.themes.map((t) => (
              <Text
                key={t}
                style={{
                  fontSize: 13,
                  color: theme.inkSoft,
                  fontFamily: theme.fonts.display.italic,
                  lineHeight: 22,
                }}
              >
                {t}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 22,
          paddingTop: 14,
          paddingBottom: 32,
          backgroundColor: theme.bg,
          borderTopWidth: 1,
          borderTopColor: theme.hairline,
        }}
      >
        <PillButton
          label={
            planning
              ? "Composing your plan…"
              : `Walk five days with ${shortName(saint.name)}`
          }
          onPress={canWalk ? onWalkWithSaint : () => router.push("/intake")}
          style={{ opacity: planning ? 0.6 : 1 }}
        />
      </View>
    </View>
  );
}
