import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { OrnateRule } from "./OrnateRule";
import { SmallCaps } from "./SmallCaps";
import { fetchScripture, type ScripturePassage } from "../lib/scriptureLookup";
import type { Citation } from "../lib/types";

interface Props {
  citation: Citation | null;
  onClose: () => void;
}

const KIND_LABEL: Record<Citation["kind"], string> = {
  scripture: "scripture",
  catechism: "catechism",
  saint_writing: "saint writing",
  liturgy: "liturgy",
};

export const CitationSheet = ({ citation, onClose }: Props) => {
  const { theme } = useTheme();
  const [passage, setPassage] = useState<ScripturePassage | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!citation || citation.kind !== "scripture") {
      setPassage(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setPassage(null);
    void fetchScripture(citation.book, citation.chapter, citation.verse).then((p) => {
      if (!cancelled) {
        setPassage(p);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [citation]);

  if (!citation) return null;

  const externalLookup = (() => {
    switch (citation.kind) {
      case "scripture":
        return {
          href: `https://www.usccb.org/bible/${citation.book.toLowerCase()}/${citation.chapter}`,
          label: "Read on USCCB.org",
        };
      case "catechism":
        return {
          href: `https://www.vatican.va/archive/ENG0015/_INDEX.HTM`,
          label: `Open Catechism § ${citation.paragraph}`,
        };
      default:
        return null;
    }
  })();

  const openExternal = (href: string) => {
    void Linking.openURL(href).catch(() => {});
  };

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(20,12,6,0.45)" }}
        accessibilityRole="button"
        accessibilityLabel="Close citation"
      />
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "80%",
          backgroundColor: theme.bg,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderTopWidth: 1,
          borderColor: theme.hairline,
          paddingTop: 14,
          paddingBottom: 32,
          paddingHorizontal: 22,
        }}
      >
        {/* Handle */}
        <View
          style={{
            alignSelf: "center",
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.rule,
            marginBottom: 12,
          }}
        />

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <SmallCaps color={theme.brass} size={10}>
            {KIND_LABEL[citation.kind]}
          </SmallCaps>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Text
              style={{
                color: theme.inkMuted,
                fontFamily: theme.fonts.body.medium,
                fontSize: 13,
              }}
            >
              Close
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 10 }} />
        <Text
          style={{
            fontFamily: theme.fonts.display.medium,
            fontSize: 22,
            color: theme.ink,
            lineHeight: 28,
            letterSpacing: -0.2,
          }}
        >
          {citation.label}
        </Text>

        <View style={{ height: 14 }} />
        <OrnateRule />
        <View style={{ height: 14 }} />

        <ScrollView style={{ maxHeight: 320 }}>
          {citation.kind === "scripture" ? (
            loading ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <ActivityIndicator color={theme.brass} />
              </View>
            ) : passage ? (
              <>
                <Text
                  style={{
                    fontFamily: theme.fonts.display.regular,
                    fontSize: 16,
                    lineHeight: 26,
                    color: theme.inkSoft,
                  }}
                >
                  {passage.text}
                </Text>
                <Text
                  style={{
                    marginTop: 12,
                    fontFamily: theme.fonts.display.italic,
                    fontSize: 12,
                    color: theme.inkFaint,
                  }}
                >
                  — {passage.reference} · {passage.translation}
                </Text>
              </>
            ) : (
              <Text
                style={{
                  fontFamily: theme.fonts.display.italic,
                  fontSize: 14,
                  color: theme.inkMuted,
                  lineHeight: 22,
                }}
              >
                {`Look up ${citation.book} ${citation.chapter}:${citation.verse} in your Bible. ` +
                  "Deuterocanonical books may not be in the free public API used here; the official USCCB Bible covers the full Catholic canon."}
              </Text>
            )
          ) : citation.kind === "catechism" ? (
            <Text
              style={{
                fontFamily: theme.fonts.display.italic,
                fontSize: 14,
                color: theme.inkMuted,
                lineHeight: 22,
              }}
            >
              {`Catechism of the Catholic Church, paragraph ${citation.paragraph}. ` +
                "Open the Catechism to read the full text in context."}
            </Text>
          ) : citation.kind === "saint_writing" ? (
            <Text
              style={{
                fontFamily: theme.fonts.display.italic,
                fontSize: 14,
                color: theme.inkMuted,
                lineHeight: 22,
              }}
            >
              {`From ${citation.title}. Open the saint's works for the full passage.`}
            </Text>
          ) : (
            <Text
              style={{
                fontFamily: theme.fonts.display.italic,
                fontSize: 14,
                color: theme.inkMuted,
                lineHeight: 22,
              }}
            >
              From the {citation.source === "liturgy_of_the_hours" ? "Liturgy of the Hours" : "Roman Missal"}.
            </Text>
          )}
        </ScrollView>

        {externalLookup ? (
          <Pressable
            onPress={() => openExternal(externalLookup.href)}
            accessibilityRole="link"
            style={{ marginTop: 16, alignSelf: "center" }}
          >
            <Text
              style={{
                fontFamily: theme.fonts.body.medium,
                fontSize: 12.5,
                color: theme.brass,
                textDecorationLine: "underline",
              }}
            >
              {externalLookup.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
};
