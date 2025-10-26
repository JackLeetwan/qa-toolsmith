import type { FeatureFlags } from "./types";

export const flags: FeatureFlags = {
  auth: {
    passwordReset: true,
    emailVerification: true,
    socialLogin: true,
  },
  collections: {
    generators: true, // Wyłączone - link zniknie z nawigacji
    charters: true, // Wyłączone - link zniknie z nawigacji
    templates: true, // Wyłączone - link zniknie z nawigacji
    knowledgeBase: true,
    export: true,
  },
};
