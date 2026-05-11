// Mobile-side any-shims kept until the mobile slice lands and replaces them
// with real react-native + expo-router types. Server-side typing now uses
// @types/node + the real @anthropic-ai/sdk types.

declare module "react" {
  const React: any;
  export default React;
}

declare module "react-native" {
  export const SafeAreaView: any;
  export const ScrollView: any;
  export const View: any;
  export const Text: any;
  export const TextInput: any;
  export const Button: any;
  export const Pressable: any;
  export const StyleSheet: any;
}

declare module "expo-router" {
  export const Link: any;
  export const useLocalSearchParams: any;
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
