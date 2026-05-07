import React from "react";
import { SafeAreaView, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function IntakeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>What are you carrying today?</Text>
      <TextInput
        placeholder="Share your situation in a few sentences..."
        multiline
        numberOfLines={6}
        style={styles.input}
      />
      <Link href="/results" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Find Saints</Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  input: { minHeight: 140, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 12, marginBottom: 16 },
  button: { backgroundColor: "#1d4ed8", padding: 14, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600" },
});
