import React, { useState } from "react";
import { ActivityIndicator, Pressable, Share, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import { ScreenShell } from "../components/ScreenShell";
import { BackButton } from "../components/BackButton";
import { Medallion } from "../components/Medallion";
import { PillButton } from "../components/PillButton";
import { SmallCaps } from "../components/SmallCaps";
import { useTheme } from "../theme/ThemeProvider";
import { roman } from "../lib/roman";
import { useSession } from "../lib/session";
import { saveActivePlan } from "../lib/activePlan";
import { planToMarkdown } from "../lib/planMarkdown";

export default function PlanScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { plan, saints, stage, error } = useSession();
  const [saving, setSaving] = useState(false);
  const noSession = stage === "idle" && !plan;

  const onBegin = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      await saveActivePlan(plan);
      router.push("/today");
    } finally {
      setSaving(false);
    }
  };

  const onShare = async () => {
    if (!plan) return;
    const md = planToMarkdown(plan);
    try {
      await Share.share({
        title: `Sancti — ${plan.total_days}-day plan`,
        message: md,
      });
    } catch {
      // Share dismissed or unavailable; silent is fine.
    }
  };

  if (noSession) {
    return (
      <ScreenShell pad={22}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <BackButton />
          <SmallCaps color={theme.inkMuted} size={10}>
            step 3 · 3
          </SmallCaps>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ marginTop: 80, gap: 16, alignItems: "center" }}>
          <SmallCaps color={theme.inkMuted} size={11}>
            no plan in progress
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
            Start an intake to generate a plan.
          </Text>
          <View style={{ height: 8 }} />
          <PillButton label="Start" onPress={() => router.push("/intake")} />
        </View>
      </ScreenShell>
    );
  }

  if (stage === "planning" || !plan) {
    return (
      <ScreenShell pad={22}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <BackButton />
          <SmallCaps color={theme.inkMuted} size={10}>
            step 3 · 3
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
            Composing your devotional plan…
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

  const leadSaint = (saints && saints[0]) ?? plan.saint_matches[0];
  const leadShort = leadSaint
    ? leadSaint.name.replace(/^(St\.?|Sts\.?|Bl\.?|Ven\.?)\s+/i, "").split(/\s+/)[0]
    : "the saints";

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
          step 3 · 3
        </SmallCaps>
        {leadSaint ? (
          <Medallion
            name={leadSaint.name}
            size={28}
            wikipediaTitle={leadSaint.wikipedia_title ?? null}
          />
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <View style={{ height: 22 }} />
      <SmallCaps color={theme.brass} size={10}>
        a plan with
      </SmallCaps>
      <View style={{ height: 4 }} />
      <Text
        style={{
          fontFamily: theme.fonts.display.regular,
          fontSize: 30,
          lineHeight: 33,
          color: theme.ink,
          letterSpacing: -0.4,
        }}
      >
        {plan.total_days} days with{" "}
        <Text style={{ fontFamily: theme.fonts.display.italic, color: theme.brass }}>
          {leadShort}
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
        {plan.situation_summary}
      </Text>

      {plan.safety_note ? (
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
            {plan.safety_note}
          </Text>
        </View>
      ) : null}

      <View style={{ height: 22 }} />

      {/* Day strip */}
      <View style={{ flexDirection: "row", gap: 6 }}>
        {plan.days.map((d, idx) => {
          const isFirst = idx === 0;
          return (
            <View
              key={d.day_index}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isFirst ? theme.brass : theme.hairline,
                backgroundColor: "transparent",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <Text
                style={{
                  fontFamily: theme.fonts.display.medium,
                  fontSize: 13,
                  color: isFirst ? theme.brass : theme.inkSoft,
                  letterSpacing: 1,
                }}
              >
                {roman(d.day_index + 1)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={{ height: 22 }} />

      {/* Day cards */}
      <View style={{ gap: 12 }}>
        {plan.days.map((d, idx) => {
          const isFirst = idx === 0;
          const firstPrompt = d.prompts[0];
          return (
            <View
              key={d.day_index}
              style={{
                backgroundColor: isFirst
                  ? theme.dark
                    ? theme.surface2
                    : theme.surface
                  : "transparent",
                borderWidth: 1,
                borderColor: isFirst ? theme.brass : theme.hairline,
                borderRadius: 14,
                padding: 14,
                position: "relative",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <Text
                  style={{
                    fontFamily: theme.fonts.display.medium,
                    fontSize: 22,
                    color: theme.brass,
                    letterSpacing: 1,
                    minWidth: 26,
                  }}
                >
                  {roman(d.day_index + 1)}
                </Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: theme.fonts.display.medium,
                        fontSize: 17,
                        color: theme.ink,
                        flex: 1,
                        paddingRight: 8,
                      }}
                    >
                      {d.theme}
                    </Text>
                    {firstPrompt ? (
                      <SmallCaps color={theme.inkMuted} size={9}>
                        {firstPrompt.type}
                      </SmallCaps>
                    ) : null}
                  </View>
                  {firstPrompt ? (
                    <Text
                      numberOfLines={3}
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        color: theme.inkSoft,
                        lineHeight: 20,
                        fontFamily: theme.fonts.body.regular,
                      }}
                    >
                      {firstPrompt.body}
                    </Text>
                  ) : null}
                  {d.liturgical_note ? (
                    <Text
                      style={{
                        marginTop: 6,
                        fontSize: 11.5,
                        color: theme.inkMuted,
                        fontFamily: theme.fonts.display.italic,
                      }}
                    >
                      {d.liturgical_note}
                    </Text>
                  ) : null}
                </View>
              </View>
              {isFirst ? (
                <View
                  style={{
                    position: "absolute",
                    top: -10,
                    right: 14,
                    backgroundColor: theme.brass,
                    paddingVertical: 2,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      color: theme.bg,
                      fontSize: 9.5,
                      letterSpacing: 1.4,
                      fontFamily: theme.fonts.body.bold,
                    }}
                  >
                    DAY I
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={{ height: 22 }} />

      <PillButton
        label={saving ? "Saving…" : "Begin day I"}
        onPress={saving ? undefined : onBegin}
        style={{ opacity: saving ? 0.6 : 1 }}
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

      <View style={{ height: 10 }} />
      <Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel="Share plan">
        <Text
          style={{
            textAlign: "center",
            color: theme.brass,
            fontFamily: theme.fonts.body.regular,
            fontSize: 12.5,
            textDecorationLine: "underline",
          }}
        >
          Share this plan
        </Text>
      </Pressable>

      <View style={{ height: 14 }} />
      <Text
        style={{
          fontSize: 11,
          color: theme.inkMuted,
          textAlign: "center",
          lineHeight: 18,
          paddingHorizontal: 18,
          fontFamily: theme.fonts.body.regular,
        }}
      >
        {plan.teaching_authority_note}
      </Text>
      <View style={{ height: 60 }} />
    </ScreenShell>
  );
}
