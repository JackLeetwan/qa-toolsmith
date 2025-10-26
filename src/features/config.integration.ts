import type { FeatureFlags } from "./types";

export const flags: FeatureFlags = {
  auth: {
    passwordReset: true,
    emailVerification: true,
    socialLogin: false,
  },
  collections: {
    generators: true,
    charters: true,
    templates: true,
    knowledgeBase: true,
    export: false,
  },
};
