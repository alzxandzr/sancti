import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenShell } from "../components/ScreenShell";
import { Medallion } from "../components/Medallion";
import { OrnateRule } from "../components/OrnateRule";
import { PillButton } from "../components/PillButton";
import { SmallCaps } from "../components/SmallCaps";
import { useTheme } from "../theme/ThemeProvider";
import { roman } from "../lib/roman";
import {
  loadActivePlan,
  markCurrentDayDone,
  clearActivePlan,
  type ActivePlan,
} from "../lib/activePlan";
import {
  loadEntryForDay,
  saveEntryForDay,
  type JournalEntry,
} from "../lib/journal";
import { CitationSheet } from "../components/CitationSheet";
import type { Citation } from "../lib/types";
import { apiLiturgicalToday, type LiturgicalToday } from "../lib/api";

const Flame = ({ color, bg }: { color: string; bg: string }) => (
  <Svg width={10} height={14} viewBox="0 0 10 14">
    <Path
      d="M5 1 C 7 4, 8 6, 8 9 a 3 3 0 0 1 -6 0 c 0 -3 1 -5 3 -8 z"
      fill={color}
    />
    <Path
      d="M5 4 C 6 6, 6.5 7, 6.5 9 a 1.5 1.5 0 0 1 -3 0 c 0 -2 0.5 -3 1.5 -5 z"
      fill={bg}
      opacity={0.7}
    />
  </Svg>
);

const CornerOrnament = ({ color }: { color: string }) => (
  <Svg width={56} height={56} viewBox="0 0 56 56">
    <Circle cx={28} cy={28} r={20} fill="none" stroke={color} strokeWidth={0.4} strokeDasharray="1 3" />
    <Circle cx={28} cy={28} r={10} fill="none" stroke={color} strokeWidth={0.5} />
  </Svg>
);

const CheckIcon = ({ color }: { color: string }) => (
  <Svg width={12} height={12} viewBox="0 0 12 12">
    <Path
      d="M1 6.5L4.5 10 11 2"
      stroke={color}
      strokeWidth={1.8}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const todayLabel = (): string =>
  new Date()
    .toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })
    .toLowerCase();

export default function TodayScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [active, setActive] = useState<ActivePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [journalDraft, setJournalDraft] = useState("");
  const [journalEditing, setJournalEditing] = useState(false);
  const [journalSaving, setJournalSaving] = useState(false);
  const [openCitation, setOpenCitation] = useState<Citation | null>(null);
  const [litToday, setLitToday] = useState<LiturgicalToday | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const cur = await loadActivePlan();
    setActive(cur);
    if (cur) {
      const day = cur.plan.days[cur.current_day_index] ?? cur.plan.days[0];
      const promptId = day?.prompts[0]?.id ?? null;
      const e = await loadEntryForDay(cur.plan_id, cur.current_day_index, promptId);
      setEntry(e);
      setJournalDraft(e?.body ?? "");
      setJournalEditing(false);
    } else {
      setEntry(null);
      setJournalDraft("");
    }
    setLoading(false);
  }, []);

  // Re-read storage every time the screen comes into focus so we pick up
  // a freshly-saved plan immediately after the user taps "Begin day I".
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  // Initial mount.
  useEffect(() => {
    void refresh();
    void apiLiturgicalToday()
      .then(setLitToday)
      .catch(() => {});
  }, [refresh]);

  const onMarkDone = async () => {
    if (!active || marking) return;
    setMarking(true);
    try {
      const next = await markCurrentDayDone();
      if (next) setActive(next);
    } finally {
      setMarking(false);
    }
  };

  const onRestart = async () => {
    if (!active) return;
    await clearActivePlan();
    router.replace("/intake");
  };

  const onSaveJournal = async () => {
    if (!active || journalSaving) return;
    const day = active.plan.days[active.current_day_index] ?? active.plan.days[0];
    const promptId = day?.prompts[0]?.id ?? null;
    setJournalSaving(true);
    try {
      const saved = await saveEntryForDay(
        active.plan_id,
        active.current_day_index,
        promptId,
        journalDraft,
      );
      setEntry(saved);
      setJournalEditing(false);
    } finally {
      setJournalSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenShell pad={22}>
        <View style={{ marginTop: 80, alignItems: "center" }}>
          <ActivityIndicator color={theme.brass} />
        </View>
      </ScreenShell>
    );
  }

  if (!active) {
    return (
      <ScreenShell pad={22}>
        <View style={{ marginTop: 80, gap: 16, alignItems: "center" }}>
          <SmallCaps color={theme.inkMuted} size={11}>
            no active plan
          </SmallCaps>
          <Text
            style={{
              textAlign: "center",
              fontFamily: theme.fonts.display.italic,
              fontSize: 20,
              color: theme.inkSoft,
              paddingHorizontal: 24,
              lineHeight: 28,
            }}
          >
            Begin by telling Sancti what season you’re in.
          </Text>
          <View style={{ height: 8 }} />
          <PillButton label="Start a plan" onPress={() => router.push("/intake")} />
        </View>
      </ScreenShell>
    );
  }

  const { plan, current_day_index, completed_days } = active;
  const day = plan.days[current_day_index] ?? plan.days[0];
  const heroPrompt = day.prompts[0];
  const extraPrompts = day.prompts.slice(1);
  const isDone = completed_days.includes(current_day_index);
  const isLastDay = current_day_index >= plan.total_days - 1;
  const allDone = completed_days.length >= plan.total_days;
  const lead = plan.saint_matches[0];

  return (
    <ScreenShell pad={22}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <SmallCaps color={theme.inkMuted} size={10}>
            {todayLabel()}
          </SmallCaps>
          {litToday?.celebration ? (
            <>
              <View style={{ height: 4 }} />
              <Text
                style={{
                  fontFamily: theme.fonts.display.italic,
                  fontSize: 13,
                  color: theme.brass,
                  maxWidth: 240,
                }}
                numberOfLines={2}
              >
                {litToday.celebration}
              </Text>
            </>
          ) : day.liturgical_note ? (
            <>
              <View style={{ height: 4 }} />
              <Text
                style={{
                  fontFamily: theme.fonts.display.italic,
                  fontSize: 13,
                  color: theme.brass,
                }}
              >
                {day.liturgical_note}
              </Text>
            </>
          ) : null}
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: theme.hairline,
            backgroundColor: theme.surface,
          }}
        >
          <Flame color={theme.brass} bg={theme.bg} />
          <SmallCaps color={theme.inkSoft} size={10}>
            {`day ${roman(current_day_index + 1)} · ${roman(plan.total_days)}`}
          </SmallCaps>
        </View>
      </View>

      <View style={{ height: 28 }} />

      <View
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.hairline,
          borderRadius: 22,
          padding: 22,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            top: -12,
            right: -12,
            opacity: 0.5,
          }}
          pointerEvents="none"
        >
          <CornerOrnament color={theme.brass} />
        </View>

        {lead ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Medallion name={lead.name} size={44} wikipediaTitle={lead.wikipedia_title ?? null} />
            <View style={{ flex: 1 }}>
              <SmallCaps color={theme.inkMuted} size={10}>
                walking with
              </SmallCaps>
              <Text
                style={{
                  fontFamily: theme.fonts.display.medium,
                  fontSize: 18,
                  color: theme.ink,
                  marginTop: 2,
                }}
              >
                {lead.name}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ height: 20 }} />
        <OrnateRule />
        <View style={{ height: 20 }} />

        <SmallCaps color={theme.brass} size={10}>
          {`day ${roman(current_day_index + 1)} · ${day.theme}`}
        </SmallCaps>
        <View style={{ height: 10 }} />
        {heroPrompt ? (
          <Text
            style={{
              fontFamily: theme.fonts.display.medium,
              fontSize: 24,
              lineHeight: 31,
              color: theme.ink,
              letterSpacing: -0.3,
            }}
          >
            {heroPrompt.title}
          </Text>
        ) : null}

        {heroPrompt ? (
          <>
            <View style={{ height: 14 }} />
            <Text
              style={{
                fontFamily: theme.fonts.body.regular,
                fontSize: 15,
                color: theme.inkSoft,
                lineHeight: 24,
              }}
            >
              {heroPrompt.body}
            </Text>
            {heroPrompt.citations.length > 0 ? (
              <>
                <View style={{ height: 14 }} />
                <View
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: theme.dark
                      ? "rgba(214,168,90,0.06)"
                      : "rgba(168,130,58,0.07)",
                    borderRadius: 10,
                    borderLeftWidth: 2,
                    borderLeftColor: theme.brass,
                  }}
                >
                  {heroPrompt.citations.map((c, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setOpenCitation(c)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open citation ${c.label}`}
                    >
                      <Text
                        style={{
                          fontFamily: theme.fonts.display.italic,
                          fontSize: 13,
                          color: theme.inkSoft,
                          lineHeight: 20,
                          textDecorationLine: "underline",
                        }}
                      >
                        {c.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}

        <View style={{ height: 14 }} />

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={isDone || allDone ? undefined : onMarkDone}
            accessibilityRole="button"
            accessibilityLabel={isDone ? "Day marked done" : "Mark today done"}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 22,
              backgroundColor: isDone || allDone ? theme.surface2 : theme.ink,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderWidth: isDone || allDone ? 1 : 0,
              borderColor: theme.hairline,
            }}
          >
            <CheckIcon color={isDone || allDone ? theme.brass : theme.bg} />
            <Text
              style={{
                color: isDone || allDone ? theme.inkSoft : theme.bg,
                fontSize: 14,
                fontFamily: theme.fonts.body.medium,
              }}
            >
              {allDone
                ? "Plan complete"
                : isDone
                  ? isLastDay
                    ? "Last day marked"
                    : "Day done · tap streak below"
                  : marking
                    ? "Saving…"
                    : "Mark today done"}
            </Text>
          </Pressable>
        </View>
      </View>

      {extraPrompts.length > 0 ? (
        <>
          <View style={{ height: 28 }} />
          <SmallCaps color={theme.inkMuted} size={10}>
            also today
          </SmallCaps>
          <View style={{ height: 12 }} />
          <View style={{ gap: 12 }}>
            {extraPrompts.map((p, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: "transparent",
                  borderWidth: 1,
                  borderColor: theme.hairline,
                  borderRadius: 14,
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                }}
              >
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
                      fontSize: 15,
                      color: theme.ink,
                      flex: 1,
                      paddingRight: 8,
                    }}
                  >
                    {p.title}
                  </Text>
                  <SmallCaps color={theme.inkMuted} size={9}>
                    {`${p.type} · ${p.estimated_minutes}m`}
                  </SmallCaps>
                </View>
                <View style={{ height: 6 }} />
                <Text
                  style={{
                    fontFamily: theme.fonts.body.regular,
                    fontSize: 13.5,
                    color: theme.inkSoft,
                    lineHeight: 20,
                  }}
                >
                  {p.body}
                </Text>
                {p.citations.length > 0 ? (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      columnGap: 8,
                      rowGap: 2,
                      marginTop: 8,
                    }}
                  >
                    {p.citations.map((c, ci) => (
                      <Pressable
                        key={ci}
                        onPress={() => setOpenCitation(c)}
                        accessibilityRole="button"
                        accessibilityLabel={`Open citation ${c.label}`}
                      >
                        <Text
                          style={{
                            fontFamily: theme.fonts.display.italic,
                            fontSize: 11.5,
                            color: theme.inkMuted,
                            textDecorationLine: "underline",
                          }}
                        >
                          {c.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                {p.type === "journal" && p.id ? (
                  <JournalSlot
                    planId={active.plan_id}
                    dayIndex={current_day_index}
                    promptId={p.id}
                  />
                ) : null}
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* Reflection / journal */}
      <View style={{ height: 28 }} />
      <SmallCaps color={theme.inkMuted} size={10}>
        your reflection
      </SmallCaps>
      <View style={{ height: 12 }} />
      <View
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.hairline,
          borderRadius: 16,
          paddingVertical: 16,
          paddingHorizontal: 16,
        }}
      >
        {journalEditing || (!entry && journalDraft.length === 0) ? (
          <>
            <TextInput
              value={journalDraft}
              onChangeText={setJournalDraft}
              placeholder="What stirred in you today?"
              placeholderTextColor={theme.inkFaint}
              multiline
              editable={!journalSaving}
              style={{
                fontFamily: theme.fonts.display.italic,
                fontSize: 16,
                lineHeight: 25,
                color: theme.ink,
                minHeight: 110,
                padding: 0,
                textAlignVertical: "top",
              }}
            />
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 12,
                justifyContent: "flex-end",
              }}
            >
              {entry ? (
                <Pressable
                  onPress={() => {
                    setJournalDraft(entry.body);
                    setJournalEditing(false);
                  }}
                  accessibilityRole="button"
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.rule,
                  }}
                >
                  <Text
                    style={{
                      color: theme.inkSoft,
                      fontFamily: theme.fonts.body.medium,
                      fontSize: 13,
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={
                  journalSaving || journalDraft.trim().length === 0 ? undefined : onSaveJournal
                }
                accessibilityRole="button"
                accessibilityLabel="Save reflection"
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  backgroundColor: theme.ink,
                  opacity:
                    journalSaving || journalDraft.trim().length === 0 ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    color: theme.bg,
                    fontFamily: theme.fonts.body.medium,
                    fontSize: 13,
                  }}
                >
                  {journalSaving ? "Saving…" : entry ? "Update" : "Save reflection"}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text
              style={{
                fontFamily: theme.fonts.display.italic,
                fontSize: 15,
                lineHeight: 24,
                color: theme.inkSoft,
              }}
            >
              {entry?.body}
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <SmallCaps color={theme.inkFaint} size={9}>
                {entry
                  ? `saved ${new Date(entry.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}`
                  : ""}
              </SmallCaps>
              <Pressable
                onPress={() => setJournalEditing(true)}
                accessibilityRole="button"
                accessibilityLabel="Edit reflection"
              >
                <Text
                  style={{
                    color: theme.brass,
                    fontFamily: theme.fonts.body.medium,
                    fontSize: 12.5,
                    textDecorationLine: "underline",
                  }}
                >
                  Edit
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <View style={{ height: 18 }} />

      {/* Streak dots */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {plan.days.map((d) => {
          const filled = completed_days.includes(d.day_index);
          const current = d.day_index === current_day_index && !isDone;
          return (
            <View
              key={d.day_index}
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: filled ? theme.brass : "transparent",
                borderWidth: 1,
                borderColor: filled || current ? theme.brass : theme.rule,
              }}
            />
          );
        })}
        <View style={{ width: 8 }} />
        <SmallCaps color={theme.inkMuted} size={10}>
          {`day ${current_day_index + 1} of ${plan.total_days}`}
        </SmallCaps>
      </View>

      <View style={{ height: 22 }} />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
        <Pressable
          onPress={() => router.push("/plans")}
          accessibilityRole="button"
          accessibilityLabel="View past plans"
        >
          <Text
            style={{
              color: theme.brass,
              fontFamily: theme.fonts.body.regular,
              fontSize: 12.5,
              textDecorationLine: "underline",
            }}
          >
            past plans
          </Text>
        </Pressable>
        <Text style={{ color: theme.inkFaint }}>·</Text>
        <Pressable
          onPress={() => router.push("/journal")}
          accessibilityRole="button"
          accessibilityLabel="View journal"
        >
          <Text
            style={{
              color: theme.brass,
              fontFamily: theme.fonts.body.regular,
              fontSize: 12.5,
              textDecorationLine: "underline",
            }}
          >
            journal
          </Text>
        </Pressable>
        <Text style={{ color: theme.inkFaint }}>·</Text>
        <Pressable
          onPress={onRestart}
          accessibilityRole="button"
          accessibilityLabel="Start a new plan"
        >
          <Text
            style={{
              color: theme.inkMuted,
              fontFamily: theme.fonts.body.regular,
              fontSize: 12.5,
              textDecorationLine: "underline",
            }}
          >
            start a new plan
          </Text>
        </Pressable>
      </View>
      <View style={{ height: 80 }} />
      <CitationSheet citation={openCitation} onClose={() => setOpenCitation(null)} />
    </ScreenShell>
  );
}

// Per-prompt inline reflection composer. Used on journal-type prompts in
// the "also today" list, anchored to the prompt's id so each one is a
// distinct row in journal_entries.
function JournalSlot({
  planId,
  dayIndex,
  promptId,
}: {
  planId: string;
  dayIndex: number;
  promptId: string;
}) {
  const { theme } = useTheme();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadEntryForDay(planId, dayIndex, promptId).then((e) => {
      if (cancelled) return;
      setEntry(e);
      setDraft(e?.body ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [planId, dayIndex, promptId]);

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await saveEntryForDay(planId, dayIndex, promptId, draft);
      setEntry(saved);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing && entry) {
    return (
      <View
        style={{
          marginTop: 10,
          borderTopWidth: 1,
          borderTopColor: theme.hairline,
          paddingTop: 10,
        }}
      >
        <Text
          style={{
            fontFamily: theme.fonts.display.italic,
            fontSize: 13.5,
            lineHeight: 21,
            color: theme.inkSoft,
          }}
        >
          {entry.body}
        </Text>
        <Pressable
          onPress={() => setEditing(true)}
          accessibilityRole="button"
          style={{ marginTop: 6, alignSelf: "flex-start" }}
        >
          <Text
            style={{
              fontFamily: theme.fonts.body.medium,
              fontSize: 12,
              color: theme.brass,
              textDecorationLine: "underline",
            }}
          >
            Edit
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!editing) {
    return (
      <Pressable
        onPress={() => setEditing(true)}
        accessibilityRole="button"
        style={{ marginTop: 10, alignSelf: "flex-start" }}
      >
        <Text
          style={{
            fontFamily: theme.fonts.body.medium,
            fontSize: 12.5,
            color: theme.brass,
            textDecorationLine: "underline",
          }}
        >
          Write a response
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: theme.hairline,
        paddingTop: 10,
      }}
    >
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Write here…"
        placeholderTextColor={theme.inkFaint}
        multiline
        editable={!saving}
        style={{
          fontFamily: theme.fonts.display.italic,
          fontSize: 14,
          lineHeight: 22,
          color: theme.ink,
          minHeight: 70,
          padding: 0,
          textAlignVertical: "top",
        }}
      />
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 10,
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={() => {
            setDraft(entry?.body ?? "");
            setEditing(false);
          }}
          accessibilityRole="button"
          style={{
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: theme.rule,
          }}
        >
          <Text
            style={{ color: theme.inkSoft, fontFamily: theme.fonts.body.medium, fontSize: 12 }}
          >
            Cancel
          </Text>
        </Pressable>
        <Pressable
          onPress={saving || draft.trim().length === 0 ? undefined : onSave}
          accessibilityRole="button"
          style={{
            paddingVertical: 6,
            paddingHorizontal: 14,
            borderRadius: 999,
            backgroundColor: theme.ink,
            opacity: saving || draft.trim().length === 0 ? 0.5 : 1,
          }}
        >
          <Text style={{ color: theme.bg, fontFamily: theme.fonts.body.medium, fontSize: 12 }}>
            {saving ? "Saving…" : entry ? "Update" : "Save"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
