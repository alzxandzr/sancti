import React from "react";
import { SafeAreaView, Text, StyleSheet } from "react-native";

export default function TodayScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Today</Text>
      <Text style={styles.body}>Track your daily prayer habit and review your current devotion prompt.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  body: { fontSize: 16 },
});
