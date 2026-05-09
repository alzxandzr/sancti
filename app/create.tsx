import React, { useState } from "react";
import { SafeAreaView, Text, TextInput, Pressable, StyleSheet, ScrollView, View } from "react-native";
import { Link } from "expo-router";

type BuilderStep = "setup" | "review" | "confirm";

export default function CreatePlanScreen() {
  const [step, setStep] = useState<BuilderStep>("setup");
  const [title, setTitle] = useState("");
  const [saintId, setSaintId] = useState("1");
  const [durationDays, setDurationDays] = useState(5);
  const [tone, setTone] = useState("gentle");

  const handleCreatePlan = () => {
    if (title.length < 3) {
      alert("Plan title must be at least 3 characters");
      return;
    }
    setStep("review");
  };

  const handlePublish = () => {
    setStep("confirm");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {step === "setup" && (
          <>
            <Text style={styles.title}>Create Your Devotion Plan</Text>
            <Text style={styles.label}>Plan Title</Text>
            <TextInput
              placeholder="e.g., Healing and Trust"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />

            <Text style={styles.label}>Saint (placeholder)</Text>
            <Text style={styles.body}>{saintId === "1" ? "St. Joseph" : saintId}</Text>

            <Text style={styles.label}>Duration</Text>
            <Text style={styles.body}>{durationDays} days</Text>

            <Text style={styles.label}>Tone</Text>
            <Text style={styles.body}>{tone}</Text>

            <Pressable style={styles.button} onPress={handleCreatePlan}>
              <Text style={styles.buttonText}>Next: Review Plan</Text>
            </Pressable>
          </>
        )}

        {step === "review" && (
          <>
            <Text style={styles.title}>Review Your Plan</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardBody}>Duration: {durationDays} days</Text>
              <Text style={styles.cardBody}>Tone: {tone}</Text>
              <Text style={styles.disclaimer}>
                Devotional reflection only. Not official Church teaching.
              </Text>
              <Text style={styles.disclaimer}>
                For sensitive topics, please speak with a priest or contact your local parish.
              </Text>
            </View>

            <Pressable style={styles.button} onPress={handlePublish}>
              <Text style={styles.buttonText}>Publish Plan</Text>
            </Pressable>

            <Pressable
              style={[styles.button, { backgroundColor: "#666" }]}
              onPress={() => setStep("setup")}
            >
              <Text style={styles.buttonText}>Back</Text>
            </Pressable>
          </>
        )}

        {step === "confirm" && (
          <>
            <Text style={styles.title}>Plan Created!</Text>
            <Text style={styles.body}>Your plan "{title}" is ready to start.</Text>

            <Link href="/today" asChild>
              <Pressable style={styles.button}>
                <Text style={styles.buttonText}>Start Today</Text>
              </Pressable>
            </Link>

            <Link href="/profile" asChild>
              <Pressable style={[styles.button, { backgroundColor: "#666" }]}>
                <Text style={styles.buttonText}>Go to Profile</Text>
              </Pressable>
            </Link>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 12, marginBottom: 16 },
  body: { fontSize: 16, marginBottom: 12 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  cardBody: { fontSize: 14, marginBottom: 4 },
  disclaimer: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#666",
    marginTop: 8,
  },
  button: { backgroundColor: "#1d4ed8", padding: 14, borderRadius: 10, alignItems: "center", marginBottom: 8 },
  buttonText: { color: "white", fontWeight: "600" },
});
