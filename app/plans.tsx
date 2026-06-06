import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenShell } from "../components/ScreenShell";
import { BackButton } from "../components/BackButton";
import { Medallion } from "../components/Medallion";
import { OrnateRule } from "../components/OrnateRule";
import { PillButton } from "../components/PillButton";
import { SmallCaps } from "../components/SmallCaps";
import { useTheme } from "../theme/ThemeProvider";
import { listPlanHistory, type PlanHistoryEntry } from "../lib/activePlan";
import { roman } from "../lib/roman";

const ROUTE_LABEL: Record<string, string> = {
  VOCATION_DISCERNMENT: "Vocation & discernment",
  SUFFERING_HARDSHIP: "Suffering & hardship",
  RELATIONSHIPS_FAMILY: "Relationships & family",
  WORK_PURPOSE: "Work & purpose",
  GENERAL_GUIDANCE: "General guidance",
  SAFETY_REVIEW: "Safety review",
};

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

export default function PlansHistoryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [plans, setPlans] = useState<PlanHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await listPlanHistory();
      setPlans(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load plans.");
    }
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
          your plans
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
        The seasons{"\n"}
        you have{" "}
        <Text style={{ fontFamily: theme.fonts.display.italic, color: theme.brass }}>
          walked.
        </Text>
      </Text>

      <View style={{ height: 14 }} />
      <OrnateRule />
      <View style={{ height: 14 }} />

      {error ? (
        <Text style={{ color: theme.cardinal }}>{error}</Text>
      ) : !plans ? (
        <View style={{ marginTop: 40, alignItems: "center" }}>
          <ActivityIndicator color={theme.brass} />
        </View>
      ) : plans.length === 0 ? (
        <View style={{ marginTop: 40, alignItems: "center", gap: 14 }}>
          <SmallCaps color={theme.inkMuted} size={11}>
            no plans yet
          </SmallCaps>
          <Text
            style={{
              textAlign: "center",
              fontFamily: theme.fonts.display.italic,
              fontSize: 16,
              color: theme.inkSoft,
              paddingHorizontal: 24,
              lineHeight: 26,
            }}
          >
            Begin an intake and Sancti will compose a 5–7 day reflection. Past plans live here.
          </Text>
          <PillButton label="Start a plan" onPress={() => router.push("/intake")} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {plans.map((p) => {
            const isComplete = !!p.completed_at;
            const progress = isComplete
              ? "Complete"
              : `Day ${roman(p.current_day_index + 1)} of ${roman(p.total_days)}`;
            return (
              <Pressable
                key={p.plan_id}
                onPress={() => router.push("/today")}
                accessibilityRole="button"
                accessibilityLabel={`Open ${p.saint_name ?? "plan"}`}
                style={{
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.hairline,
                  borderRadius: 16,
                  paddingVertical: 16,
                  paddingHorizontal: 14,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 14,
                  opacity: isComplete ? 0.78 : 1,
                }}
              >
                {p.saint_name ? (
                  <Medallion
                    name={p.saint_name}
                    size={52}
                    wikipediaTitle={p.saint_wikipedia_title ?? null}
                  />
                ) : (
                  <View style={{ width: 52, height: 52 }} />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <SmallCaps color={theme.brass} size={9}>
                    {ROUTE_LABEL[p.route] ?? p.route}
                  </SmallCaps>
                  <Text
                    style={{
                      marginTop: 6,
                      fontFamily: theme.fonts.display.medium,
                      fontSize: 18,
                      color: theme.ink,
                      lineHeight: 23,
                    }}
                    numberOfLines={2}
                  >
                    {p.saint_name
                      ? `${p.total_days} days with ${p.saint_name}`
                      : `${p.total_days}-day plan`}
                  </Text>
                  {p.situation_summary ? (
                    <Text
                      numberOfLines={2}
                      style={{
                        marginTop: 6,
                        fontFamily: theme.fonts.display.italic,
                        fontSize: 13,
                        color: theme.inkMuted,
                        lineHeight: 20,
                      }}
                    >
                      {p.situation_summary}
                    </Text>
                  ) : null}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 10,
                    }}
                  >
                    <SmallCaps color={theme.inkMuted} size={9}>
                      {formatDate(p.saved_at)}
                    </SmallCaps>
                    <SmallCaps
                      color={isComplete ? theme.olive : theme.brass}
                      size={9}
                    >
                      {progress}
                    </SmallCaps>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScreenShell>
  );
}
