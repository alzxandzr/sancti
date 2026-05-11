import React from "react";
import { SafeAreaView, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function OnboardingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Sancti</Text>
      <Text style={styles.body}>
        Discover saints connected to your current season of life and begin a 5–7 day devotional rhythm.
      </Text>
      <Link href="/intake" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Begin</Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 16 },
  body: { fontSize: 16, textAlign: "center", marginBottom: 24 },
  button: { backgroundColor: "#1d4ed8", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  buttonText: { color: "white", fontWeight: "600" },
});
