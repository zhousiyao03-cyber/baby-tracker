import test from "node:test";
import assert from "node:assert/strict";
import { extractExpoHost, resolveApiBaseUrl } from "./api-base-url";

test("uses the production API URL outside development", () => {
  assert.equal(
    resolveApiBaseUrl({
      isDev: false,
      envUrl: "http://192.168.0.105:3001/",
      expoHostUri: "192.168.0.105:8081",
    }),
    "https://api.baby-tracker.com"
  );
});

test("prefers EXPO_PUBLIC_API_BASE_URL when provided", () => {
  assert.equal(
    resolveApiBaseUrl({
      isDev: true,
      envUrl: " http://192.168.0.105:3001/ ",
      expoHostUri: "10.0.0.8:8081",
    }),
    "http://192.168.0.105:3001"
  );
});

test("derives the API host from Expo hostUri during development", () => {
  assert.equal(
    resolveApiBaseUrl({
      isDev: true,
      envUrl: "",
      expoHostUri: "192.168.0.105:8081",
    }),
    "http://192.168.0.105:3001"
  );
});

test("extractExpoHost accepts host URIs with a protocol", () => {
  assert.equal(extractExpoHost("http://10.0.0.8:8081"), "10.0.0.8");
});

test("falls back to localhost when Expo host data is unavailable", () => {
  assert.equal(
    resolveApiBaseUrl({
      isDev: true,
      envUrl: undefined,
      expoHostUri: undefined,
    }),
    "http://localhost:3001"
  );
});
