import React from "react";
import { SafeAreaView, Text, StyleSheet } from "react-native";

export default function PlanScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>5–7 Day Devotion Plan</Text>
      <Text style={styles.body}>Day 1: Reflection • Day 2: Journal • Day 3: Prayer • Day 4: Action</Text>
      <Text style={styles.body}>Each prompt is devotional reflection, not official Church teaching.</Text>
      <Text style={styles.body}>For sensitive situations, seek support from a priest or your local parish.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  body: { fontSize: 16, marginBottom: 8 },
});
