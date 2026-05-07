import React from "react";
import { SafeAreaView, Text, View, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";

const preview = ["St. Joseph", "St. Monica", "St. Ignatius of Loyola"];

export default function ResultsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Top Saint Matches</Text>
      {preview.map((name, index) => (
        <Link key={name} href={`/saint/${index + 1}`} asChild>
          <Pressable style={styles.card}>
            <Text style={styles.cardTitle}>{name}</Text>
            <Text style={styles.cardBody}>Tap to view profile and devotional connection.</Text>
          </Pressable>
        </Link>
      ))}
      <Link href="/plan" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Generate Devotion Plan</Text>
        </Pressable>
      </Link>
      <View style={{ height: 8 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: "600" },
  cardBody: { color: "#4b5563", marginTop: 4 },
  button: { marginTop: 16, backgroundColor: "#166534", padding: 14, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600" },
});
