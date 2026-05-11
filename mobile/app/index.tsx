import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useRouter } from "expo-router";
import { ScreenShell } from "../components/ScreenShell";
import { Crest } from "../components/Crest";
import { Medallion } from "../components/Medallion";
import { OrnateRule } from "../components/OrnateRule";
import { PillButton } from "../components/PillButton";
import { SmallCaps } from "../components/SmallCaps";
import { useTheme } from "../theme/ThemeProvider";
import { isOnboarded } from "../lib/profile";
import { apiLiturgicalToday, apiListSaints, type LiturgicalToday, type SaintSummary } from "../lib/api";
import { loadActivePlan, type ActivePlan } from "../lib/activePlan";
import { listSavedSaints } from "../lib/savedSaints";
import { feastCountdown } from "../lib/feastDay";

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [today, setToday] = useState<LiturgicalToday | null>(null);
  const [active, setActive] = useState<ActivePlan | null>(null);
  const [upcomingFeast, setUpcomingFeast] = useState<{
    saint: SaintSummary;
    countdown: string;
  } | null>(null);

  // First-launch redirect to onboarding so plans are personalized from day 1.
  useEffect(() => {
    let cancelled = false;
    void isOnboarded().then((ok) => {
      if (!cancelled && !ok) router.replace("/onboarding");
    });
    void apiLiturgicalToday()
      .then((t) => {
        if (!cancelled) setToday(t);
      })
      .catch(() => {});
    void loadActivePlan()
      .then((a) => {
        if (!cancelled) setActive(a);
      })
      .catch(() => {});

    // Find the soonest feast day among the user's saved saints (within ~10 days).
    void (async () => {
      try {
        const [{ saints }, savedIds] = await Promise.all([apiListSaints(), listSavedSaints()]);
        if (cancelled) return;
        const idSet = new Set(savedIds);
        const candidates = saints
          .filter((s) => idSet.has(s.id))
          .map((s) => {
            const countdown = feastCountdown(s.feast_day);
            return countdown ? { saint: s, countdown } : null;
          })
          .filter(
            (
              x,
            ): x is { saint: SaintSummary; countdown: string } =>
              !!x && /^Feast (today|tomorrow|in [1-9]\s?(days|day)?$)/.test(x.countdown),
          );
        if (candidates.length > 0) setUpcomingFeast(candidates[0]);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const streakDays = active ? active.completed_days.length : 0;

  return (
    <ScreenShell scroll={false}>
      <View
        style={{
          flex: 1,
          justifyContent: "space-between",
          paddingBottom: 56,
        }}
      >
        {/* Top crest + era line + settings */}
        <View style={{ position: "relative", marginTop: 28 }}>
          <View style={{ alignItems: "center" }}>
            <Crest size={48} />
            <View style={{ height: 24 }} />
            <SmallCaps color={theme.inkMuted} size={10}>
              est. anno · MMXXVI
            </SmallCaps>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={{
              position: "absolute",
              right: 0,
              top: 4,
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: theme.hairline,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.surface,
            }}
          >
            <Svg width={16} height={16} viewBox="0 0 16 16">
              <Circle cx={8} cy={8} r={2} stroke={theme.inkSoft} strokeWidth={1.2} fill="none" />
              <Path
                d="M8 2v2 M8 12v2 M2 8h2 M12 8h2 M3.5 3.5l1.4 1.4 M11.1 11.1l1.4 1.4 M3.5 12.5l1.4-1.4 M11.1 4.9l1.4-1.4"
                stroke={theme.inkSoft}
                strokeWidth={1.2}
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
        </View>

        {/* Wordmark + tagline */}
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontFamily: theme.fonts.display.regular,
              fontSize: 72,
              // Tight serifs at 72px need ~120% line-height or the cap ascender
              // (the curl on the "S") clips above the line box on real devices.
              lineHeight: 86,
              color: theme.ink,
              letterSpacing: -1,
            }}
          >
            Sancti
          </Text>
          <View style={{ height: 14, alignSelf: "stretch" }} />
          <View style={{ alignSelf: "stretch", paddingHorizontal: 8 }}>
            <OrnateRule />
          </View>
          <View style={{ height: 18 }} />
          <Text
            style={{
              fontFamily: theme.fonts.display.italic,
              fontSize: 19,
              lineHeight: 28,
              color: theme.inkSoft,
              textAlign: "center",
              paddingHorizontal: 18,
            }}
          >
            A companion of saints{"\n"}for the season you are in.
          </Text>
        </View>

        {/* Upcoming feast banner (saved saints only) */}
        {upcomingFeast ? (
          <Pressable
            onPress={() => router.push(`/saint/${upcomingFeast.saint.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${upcomingFeast.saint.name}`}
            style={{
              backgroundColor: theme.dark ? "rgba(214,168,90,0.10)" : "rgba(168,130,58,0.08)",
              borderWidth: 1,
              borderColor: theme.brass,
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 14,
              marginHorizontal: 4,
              marginBottom: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <SmallCaps color={theme.brass} size={9}>
                upcoming feast
              </SmallCaps>
              <Text
                style={{
                  marginTop: 2,
                  fontFamily: theme.fonts.display.medium,
                  fontSize: 14,
                  color: theme.ink,
                }}
                numberOfLines={1}
              >
                {upcomingFeast.saint.name}
              </Text>
            </View>
            <SmallCaps color={theme.brass} size={10}>
              {upcomingFeast.countdown}
            </SmallCaps>
          </Pressable>
        ) : null}

        {/* Streak (when there's an active plan with progress) */}
        {streakDays > 0 ? (
          <Pressable
            onPress={() => router.push("/today")}
            accessibilityRole="button"
            style={{
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.hairline,
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 14,
              marginHorizontal: 4,
              marginBottom: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <SmallCaps color={theme.inkMuted} size={9}>
                on the way
              </SmallCaps>
              <Text
                style={{
                  marginTop: 2,
                  fontFamily: theme.fonts.display.medium,
                  fontSize: 14,
                  color: theme.ink,
                }}
              >
                {`Day ${streakDays + (active && streakDays < active.plan.total_days ? 1 : 0)} of ${active?.plan.total_days ?? 5}`}
              </Text>
            </View>
            <SmallCaps color={theme.brass} size={10}>
              {streakDays === 1 ? "1 day complete" : `${streakDays} days complete`}
            </SmallCaps>
          </Pressable>
        ) : null}

        {/* Saint of the day */}
        {today?.saint ? (
          <Pressable
            onPress={() => router.push(`/saint/${today.saint!.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${today.saint.name}`}
            style={{
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.hairline,
              borderRadius: 18,
              paddingVertical: 14,
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              marginHorizontal: 4,
            }}
          >
            <Medallion
              name={today.saint.name}
              size={52}
              ornate
              wikipediaTitle={today.saint.wikipedia_title ?? null}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <SmallCaps color={theme.brass} size={9}>
                saint of the day
              </SmallCaps>
              <Text
                style={{
                  marginTop: 4,
                  fontFamily: theme.fonts.display.medium,
                  fontSize: 17,
                  color: theme.ink,
                  lineHeight: 22,
                }}
                numberOfLines={1}
              >
                {today.saint.name}
              </Text>
              <Text
                style={{
                  marginTop: 3,
                  fontFamily: theme.fonts.display.italic,
                  fontSize: 12.5,
                  color: theme.inkMuted,
                  lineHeight: 18,
                }}
                numberOfLines={1}
              >
                {today.celebration}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {/* CTA + disclaimer */}
        <View>
          <PillButton label="Begin" onPress={() => router.push("/intake")} />
          <View style={{ height: 10 }} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PillButton
                label="Saints"
                variant="ghost"
                onPress={() => router.push("/saints")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PillButton
                label="Plans"
                variant="ghost"
                onPress={() => router.push("/plans")}
              />
            </View>
          </View>
          <View style={{ height: 14 }} />
          <Text
            style={{
              textAlign: "center",
              fontSize: 11,
              lineHeight: 18,
              color: theme.inkMuted,
              fontFamily: theme.fonts.body.regular,
              paddingHorizontal: 18,
            }}
          >
            Devotional reflection — not official Church teaching,{"\n"}
            not a substitute for a priest or counselor.
          </Text>
        </View>
      </View>
    </ScreenShell>
  );
}
