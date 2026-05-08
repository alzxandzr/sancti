import React from "react";
import { SafeAreaView, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function SaintProfileScreen() {
  const params = useLocalSearchParams() as { id?: string };
  const id = params.id ?? "unknown";

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Saint Profile</Text>
      <Text style={styles.body}>Saint ID: {id}</Text>
      <Text style={styles.body}>This screen will display biography, patronages, virtues, and source links.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  body: { fontSize: 16, marginBottom: 8 },
});
