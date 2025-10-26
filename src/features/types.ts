export type EnvName = "local" | "integration" | "production";

export interface AuthFeatureFlags {
  passwordReset: boolean;
  emailVerification: boolean;
  socialLogin: boolean;
}

export interface CollectionsFeatureFlags {
  generators: boolean;
  charters: boolean;
  templates: boolean;
  knowledgeBase: boolean;
  export: boolean;
}

export interface FeatureFlags {
  auth: AuthFeatureFlags;
  collections: CollectionsFeatureFlags;
}

export type FeatureNamespace = keyof FeatureFlags;
export type FeaturePath = `${FeatureNamespace}.${string}`;
