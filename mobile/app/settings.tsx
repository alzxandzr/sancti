import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenShell } from "../components/ScreenShell";
import { BackButton } from "../components/BackButton";
import { OrnateRule } from "../components/OrnateRule";
import { PillButton } from "../components/PillButton";
import { SmallCaps } from "../components/SmallCaps";
import { useTheme, type ThemePreference } from "../theme/ThemeProvider";
import {
  loadPreferences,
  savePreferences,
  type PreferredTone,
  type PrayerDuration,
  type StateInLife,
  type UserPreferences,
} from "../lib/profile";
import { loadActivityStats, type ActivityStats } from "../lib/stats";
import {
  formatReminderTime,
  loadReminderPrefs,
  remindersSupported,
  updateReminder,
  type ReminderPrefs,
} from "../lib/reminders";
import { getAccountInfo, linkEmail, type AccountInfo } from "../lib/account";

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

const THEMES: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "system", label: "System", hint: "Match OS appearance" },
  { value: "cloister", label: "Cloister", hint: "Warm parchment" },
  { value: "vespers", label: "Vespers", hint: "Candlelit cathedral" },
];

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: theme.hairline,
        borderRadius: 14,
        padding: 12,
        backgroundColor: theme.surface,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontFamily: theme.fonts.display.medium,
          fontSize: 28,
          color: theme.ink,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: theme.fonts.body.regular,
          fontSize: 10,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: theme.inkMuted,
          marginTop: 4,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
      {accent ? (
        <Text
          style={{
            fontFamily: theme.fonts.display.italic,
            fontSize: 10.5,
            color: theme.brass,
            marginTop: 2,
          }}
        >
          {accent}
        </Text>
      ) : null}
    </View>
  );
}

export default function SettingsScreen() {
  const { theme, preference, setTheme } = useTheme();
  const router = useRouter();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [reminder, setReminder] = useState<ReminderPrefs | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkMessage, setLinkMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    void loadPreferences().then((p) =>
      setPrefs(
        p ?? {
          state_in_life: "other",
          preferred_tone: "gentle",
          prayer_duration_minutes: 10,
        },
      ),
    );
    void loadActivityStats().then(setStats);
    void loadReminderPrefs().then(setReminder);
    void getAccountInfo().then(setAccount);
  }, []);

  const onLinkEmail = async () => {
    if (linking) return;
    setLinking(true);
    setLinkMessage(null);
    try {
      await linkEmail(emailDraft);
      setLinkMessage({
        kind: "ok",
        text: "Check your inbox for a confirmation link. Your plans and saved saints will follow.",
      });
    } catch (e) {
      setLinkMessage({
        kind: "err",
        text: e instanceof Error ? e.message : "Could not send the link.",
      });
    } finally {
      setLinking(false);
    }
  };

  const applyReminder = async (next: ReminderPrefs) => {
    if (reminderBusy) return;
    setReminderBusy(true);
    try {
      const effective = await updateReminder(next);
      setReminder(effective);
    } finally {
      setReminderBusy(false);
    }
  };

  const onSavePrefs = async () => {
    if (!prefs || saving) return;
    setSaving(true);
    try {
      await savePreferences(prefs);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell pad={22}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <BackButton />
          <SmallCaps color={theme.inkMuted} size={10}>
            settings
          </SmallCaps>
          <View style={{ width: 36 }} />
        </View>

        <View style={{ height: 18 }} />
        <Text
          style={{
            fontFamily: theme.fonts.display.regular,
            fontSize: 30,
            lineHeight: 34,
            color: theme.ink,
            letterSpacing: -0.4,
          }}
        >
          How Sancti{"\n"}
          <Text style={{ fontFamily: theme.fonts.display.italic, color: theme.brass }}>
            walks with you.
          </Text>
        </Text>

        {/* ── Activity ── */}
        {stats ? (
          <>
            <View style={{ height: 24 }} />
            <OrnateRule label="your walk" />
            <View style={{ height: 14 }} />
            <View
              style={{
                flexDirection: "row",
                gap: 10,
              }}
            >
              <StatCell label="saints saved" value={stats.saved_saints} />
              <StatCell
                label="plans walked"
                value={stats.plans_started}
                accent={stats.plans_completed > 0 ? `${stats.plans_completed} complete` : undefined}
              />
              <StatCell label="reflections" value={stats.reflections_written} />
            </View>
          </>
        ) : null}

        {/* ── Theme ── */}
        <View style={{ height: 24 }} />
        <OrnateRule label="appearance" />
        <View style={{ height: 14 }} />
        <View style={{ gap: 8 }}>
          {THEMES.map((opt) => {
            const active = preference === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setTheme(opt.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
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
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text
                    style={{
                      fontFamily: theme.fonts.display.medium,
                      fontSize: 16,
                      color: active ? theme.brass : theme.ink,
                    }}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={{
                      marginTop: 2,
                      fontFamily: theme.fonts.display.italic,
                      fontSize: 12,
                      color: theme.inkMuted,
                    }}
                  >
                    {opt.hint}
                  </Text>
                </View>
                {active ? (
                  <SmallCaps color={theme.brass} size={10}>
                    in use
                  </SmallCaps>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* ── Preferences ── */}
        <View style={{ height: 28 }} />
        <OrnateRule label="preferences" />
        <View style={{ height: 14 }} />

        {prefs ? (
          <>
            <SmallCaps color={theme.inkMuted} size={10}>
              state in life
            </SmallCaps>
            <View style={{ height: 8 }} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {STATES.map((opt) => {
                const active = prefs.state_in_life === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setPrefs({ ...prefs, state_in_life: opt.value })}
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
                        fontSize: 13,
                        fontFamily: theme.fonts.body.medium,
                        color: active ? theme.brass : theme.inkSoft,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: 18 }} />
            <SmallCaps color={theme.inkMuted} size={10}>
              tone
            </SmallCaps>
            <View style={{ height: 8 }} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {TONES.map((opt) => {
                const active = prefs.preferred_tone === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setPrefs({ ...prefs, preferred_tone: opt.value })}
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
                        fontSize: 13,
                        fontFamily: theme.fonts.body.medium,
                        color: active ? theme.brass : theme.inkSoft,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: 18 }} />
            <SmallCaps color={theme.inkMuted} size={10}>
              daily duration
            </SmallCaps>
            <View style={{ height: 8 }} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {DURATIONS.map((mins) => {
                const active = prefs.prayer_duration_minutes === mins;
                return (
                  <Pressable
                    key={mins}
                    onPress={() => setPrefs({ ...prefs, prayer_duration_minutes: mins })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
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
                        fontSize: 18,
                        color: active ? theme.brass : theme.ink,
                      }}
                    >
                      {mins}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: active ? theme.brass : theme.inkMuted,
                        fontFamily: theme.fonts.body.regular,
                      }}
                    >
                      min
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: 22 }} />
            <PillButton
              label={saving ? "Saving…" : savedFlash ? "Saved" : "Save preferences"}
              onPress={saving ? undefined : onSavePrefs}
              style={{ opacity: saving ? 0.6 : 1 }}
            />
          </>
        ) : null}

        {/* ── Account ── */}
        {account ? (
          <>
            <View style={{ height: 28 }} />
            <OrnateRule label="account" />
            <View style={{ height: 14 }} />
            <View
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.hairline,
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 14,
              }}
            >
              {account.email ? (
                <>
                  <SmallCaps color={theme.brass} size={10}>
                    signed in
                  </SmallCaps>
                  <Text
                    style={{
                      marginTop: 6,
                      fontFamily: theme.fonts.display.medium,
                      fontSize: 16,
                      color: theme.ink,
                    }}
                  >
                    {account.email}
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      fontFamily: theme.fonts.body.regular,
                      fontSize: 12,
                      color: theme.inkMuted,
                      lineHeight: 18,
                    }}
                  >
                    Your plans, saved saints, and reflections will follow you across devices.
                  </Text>
                </>
              ) : (
                <>
                  <SmallCaps color={theme.inkMuted} size={10}>
                    save across devices
                  </SmallCaps>
                  <Text
                    style={{
                      marginTop: 6,
                      fontFamily: theme.fonts.display.italic,
                      fontSize: 14,
                      color: theme.inkSoft,
                      lineHeight: 22,
                    }}
                  >
                    Right now your walk lives only on this device. Link an email and Sancti will
                    keep your plans, saints, and journals if you reinstall or switch phones.
                  </Text>
                  <View style={{ height: 12 }} />
                  <TextInput
                    value={emailDraft}
                    onChangeText={setEmailDraft}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.inkFaint}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!linking}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.hairline,
                      borderRadius: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      fontFamily: theme.fonts.body.regular,
                      fontSize: 15,
                      color: theme.ink,
                      backgroundColor: theme.bg,
                    }}
                  />
                  <View style={{ height: 10 }} />
                  <Pressable
                    onPress={
                      linking || emailDraft.trim().length === 0 ? undefined : onLinkEmail
                    }
                    accessibilityRole="button"
                    style={{
                      alignSelf: "flex-start",
                      paddingVertical: 10,
                      paddingHorizontal: 18,
                      borderRadius: 999,
                      backgroundColor: theme.ink,
                      opacity: linking || emailDraft.trim().length === 0 ? 0.5 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.bg,
                        fontFamily: theme.fonts.body.medium,
                        fontSize: 13,
                      }}
                    >
                      {linking ? "Sending…" : "Send link"}
                    </Text>
                  </Pressable>
                  {linkMessage ? (
                    <Text
                      style={{
                        marginTop: 10,
                        fontFamily: theme.fonts.body.regular,
                        fontSize: 12,
                        color: linkMessage.kind === "ok" ? theme.olive : theme.cardinal,
                        lineHeight: 18,
                      }}
                    >
                      {linkMessage.text}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          </>
        ) : null}

        {/* ── Daily reminder ── */}
        {reminder ? (
          <>
            <View style={{ height: 28 }} />
            <OrnateRule label="reminder" />
            <View style={{ height: 14 }} />
            <View
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.hairline,
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 14,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text
                    style={{
                      fontFamily: theme.fonts.display.medium,
                      fontSize: 15,
                      color: theme.ink,
                    }}
                  >
                    Daily reflection nudge
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      fontFamily: theme.fonts.body.regular,
                      fontSize: 12,
                      color: theme.inkMuted,
                      lineHeight: 18,
                    }}
                  >
                    {remindersSupported()
                      ? reminder.enabled
                        ? `Pings each day at ${formatReminderTime(reminder.hour, reminder.minute)}.`
                        : "Local notification only — never shared."
                      : "Not available on web; try the iOS or Android build."}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    void applyReminder({ ...reminder, enabled: !reminder.enabled })
                  }
                  accessibilityRole="switch"
                  accessibilityState={{ checked: reminder.enabled }}
                  disabled={reminderBusy || !remindersSupported()}
                  style={{
                    width: 48,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: reminder.enabled ? theme.brass : theme.surface2,
                    padding: 3,
                    opacity: reminderBusy || !remindersSupported() ? 0.5 : 1,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: theme.bg,
                      transform: [{ translateX: reminder.enabled ? 20 : 0 }],
                    }}
                  />
                </Pressable>
              </View>

              {reminder.enabled && remindersSupported() ? (
                <>
                  <View style={{ height: 14 }} />
                  <SmallCaps color={theme.inkMuted} size={10}>
                    time
                  </SmallCaps>
                  <View style={{ height: 8 }} />
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {[6, 7, 8, 9, 12, 17, 20, 21].map((h) => {
                      const active = reminder.hour === h && reminder.minute === 0;
                      return (
                        <Pressable
                          key={h}
                          onPress={() =>
                            void applyReminder({ ...reminder, hour: h, minute: 0 })
                          }
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          disabled={reminderBusy}
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
                              fontSize: 12.5,
                              fontFamily: theme.fonts.body.medium,
                              color: active ? theme.brass : theme.inkSoft,
                            }}
                          >
                            {formatReminderTime(h, 0)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </View>
          </>
        ) : null}

        {/* ── Disclaimer / start over ── */}
        <View style={{ height: 28 }} />
        <OrnateRule />
        <View style={{ height: 14 }} />
        <Text
          style={{
            textAlign: "center",
            fontFamily: theme.fonts.body.regular,
            fontSize: 11,
            color: theme.inkMuted,
            lineHeight: 18,
            paddingHorizontal: 18,
          }}
        >
          Devotional reflection. Not the sacrament of reconciliation, not{"\n"}
          spiritual direction. For weighty decisions, seek a priest.
        </Text>
      </ScrollView>
    </ScreenShell>
  );
}
