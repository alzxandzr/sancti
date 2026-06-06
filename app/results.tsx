import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import { ScreenShell } from "../components/ScreenShell";
import { PillButton } from "../components/PillButton";
import { SmallCaps } from "../components/SmallCaps";
import { BackButton } from "../components/BackButton";
import { Medallion } from "../components/Medallion";
import { useTheme } from "../theme/ThemeProvider";
import { roman } from "../lib/roman";
import { useSession } from "../lib/session";
import type { RouteLabel } from "../lib/api";

const ROUTE_LABEL: Record<RouteLabel, string> = {
  VOCATION_DISCERNMENT: "Vocation & discernment",
  SUFFERING_HARDSHIP: "Suffering & hardship",
  RELATIONSHIPS_FAMILY: "Relationships & family",
  WORK_PURPOSE: "Work & purpose",
  GENERAL_GUIDANCE: "General guidance",
  SAFETY_REVIEW: "Safety review",
};

export default function ResultsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const {
    classification,
    saints,
    stage,
    error,
    safety,
    generatePlan,
    showMoreSaints,
  } = useSession();

  const isLoading = stage === "classifying" || stage === "matching";
  const planning = stage === "planning";
  const noSession = stage === "idle" && !classification;

  const onContinue = async () => {
    if (!saints || saints.length === 0) return;
    await generatePlan();
    router.push("/plan");
  };

  if (noSession) {
    return (
      <ScreenShell pad={22}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <BackButton />
          <SmallCaps color={theme.inkMuted} size={10}>
            step 2 · 3
          </SmallCaps>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ marginTop: 80, gap: 16, alignItems: "center" }}>
          <SmallCaps color={theme.inkMuted} size={11}>
            no session
          </SmallCaps>
          <Text
            style={{
              textAlign: "center",
              fontFamily: theme.fonts.display.italic,
              fontSize: 18,
              color: theme.inkSoft,
              paddingHorizontal: 24,
              lineHeight: 26,
            }}
          >
            Begin by telling Sancti what season you’re in.
          </Text>
          <View style={{ height: 8 }} />
          <PillButton label="Start" onPress={() => router.push("/intake")} />
        </View>
      </ScreenShell>
    );
  }

  if (isLoading || !saints) {
    return (
      <ScreenShell pad={22}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <BackButton />
          <SmallCaps color={theme.inkMuted} size={10}>
            step 2 · 3
          </SmallCaps>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ marginTop: 80, alignItems: "center", gap: 14 }}>
          <ActivityIndicator color={theme.brass} />
          <Text
            style={{
              fontFamily: theme.fonts.display.italic,
              color: theme.inkMuted,
              fontSize: 14,
            }}
          >
            {stage === "classifying"
              ? "Discerning your situation…"
              : "Calling the company of saints…"}
          </Text>
          {error ? (
            <Text style={{ color: theme.cardinal, marginTop: 12, textAlign: "center", paddingHorizontal: 24 }}>
              {error}
            </Text>
          ) : null}
        </View>
      </ScreenShell>
    );
  }

  const routeLabel = classification ? ROUTE_LABEL[classification.primary_route] : "";

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
          step 2 · 3
        </SmallCaps>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ height: 24 }} />
      <SmallCaps color={theme.brass} size={11}>
        {routeLabel}
      </SmallCaps>
      <View style={{ height: 10 }} />
      <Text
        style={{
          fontFamily: theme.fonts.display.regular,
          fontSize: 30,
          lineHeight: 34,
          color: theme.ink,
          letterSpacing: -0.4,
        }}
      >
        {saints.length === 1 ? "One saint" : `${saints.length} saints`}
        {"\n"}will{" "}
        <Text style={{ fontFamily: theme.fonts.display.italic, color: theme.brass }}>
          walk with you.
        </Text>
      </Text>
      <View style={{ height: 8 }} />
      <Text
        style={{
          fontSize: 13.5,
          color: theme.inkMuted,
          lineHeight: 21,
          fontFamily: theme.fonts.display.italic,
        }}
      >
        Drawn from your words and the company of the Church.
      </Text>

      {safety && safety.severity !== "none" ? (
        <View
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.cardinal,
            backgroundColor: theme.dark ? "rgba(180,85,90,0.08)" : "rgba(122,30,33,0.06)",
          }}
        >
          <SmallCaps color={theme.cardinal} size={10}>
            pastoral note
          </SmallCaps>
          <Text style={{ marginTop: 4, color: theme.inkSoft, fontSize: 13 }}>
            {safety.reason}
          </Text>
        </View>
      ) : null}

      <View style={{ height: 22 }} />

      <View style={{ gap: 12 }}>
        {saints.map((m, i) => (
          <Pressable
            key={m.id ?? m.name}
            onPress={() => m.id && router.push(`/saint/${m.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${m.name}`}
            style={{
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.hairline,
              borderRadius: 18,
              paddingVertical: 16,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            <Medallion name={m.name} size={60} ornate wikipediaTitle={m.wikipedia_title ?? null} />
            <View style={{ flex: 1, minWidth: 0, paddingRight: 22 }}>
              <Text
                style={{
                  fontFamily: theme.fonts.display.medium,
                  fontSize: 19,
                  color: theme.ink,
                  lineHeight: 24,
                }}
              >
                {m.name}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: theme.inkMuted,
                  fontFamily: theme.fonts.display.italic,
                  lineHeight: 18,
                }}
              >
                {`feast ${m.feast_day}`}
              </Text>
              <Text
                style={{
                  marginTop: 10,
                  fontSize: 13.5,
                  color: theme.inkSoft,
                  lineHeight: 20,
                  fontFamily: theme.fonts.body.regular,
                }}
              >
                {m.reason}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: theme.fonts.display.medium,
                color: theme.brass,
                fontSize: 14,
                letterSpacing: 1.2,
                position: "absolute",
                top: 14,
                right: 16,
              }}
            >
              {roman(i + 1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ height: 22 }} />

      {error && stage === "error" ? (
        <Text style={{ color: theme.cardinal, marginBottom: 12, fontSize: 13 }}>
          {error}
        </Text>
      ) : null}

      <PillButton
        label={planning ? "Composing your plan…" : "Walk with all three"}
        onPress={planning ? undefined : onContinue}
        style={{ opacity: planning ? 0.6 : 1 }}
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

      <View style={{ height: 14 }} />
      <Pressable
        onPress={planning ? undefined : () => void showMoreSaints()}
        accessibilityRole="button"
      >
        <Text
          style={{
            textAlign: "center",
            color: theme.inkMuted,
            fontFamily: theme.fonts.body.regular,
            fontSize: 13,
          }}
        >
          Or{" "}
          <Text style={{ color: theme.brass, textDecorationLine: "underline" }}>
            show me three more
          </Text>
        </Text>
      </Pressable>
      <View style={{ height: 8 }} />
      <Text
        style={{
          textAlign: "center",
          color: theme.inkFaint,
          fontSize: 11.5,
          fontFamily: theme.fonts.body.regular,
          paddingHorizontal: 20,
        }}
      >
        Or tap a saint to open their page and walk five days with just them.
      </Text>

      <View style={{ height: 60 }} />
    </ScreenShell>
  );
}
