import type { GeneratorMeta } from "@/types/types";

/**
 * Metadata for all available generators
 * Used to populate the Generators Hub grid
 */
export const generatorsMeta: GeneratorMeta[] = [
  {
    kind: "iban",
    name: "IBAN Generator",
    description:
      "Generate and validate IBAN numbers for Germany, Austria, and Poland with optional deterministic seed.",
    href: "/generators/iban",
    icon: "CreditCard",
    example: "DE89370400440532013000",
  },
  {
    kind: "phone",
    name: "Phone Number",
    description:
      "Generate realistic phone numbers (mobile or landline) for Poland, Germany, and Austria.",
    href: "/generators/phone",
    icon: "Phone",
    example: "+48 123 456 789",
  },
  {
    kind: "address",
    name: "Address",
    description:
      "Generate realistic addresses (home or business) with street, city, and postal code.",
    href: "/generators/address",
    icon: "MapPin",
    example: "ul. Kwiatowa 15, 00-001 Warszawa",
  },
  {
    kind: "plates",
    name: "License Plate",
    description:
      "Generate valid license plate numbers in country-specific formats.",
    href: "/generators/plates",
    icon: "Car",
    example: "WA 12345",
  },
  {
    kind: "email",
    name: "Email Address",
    description: "Generate realistic email addresses for testing purposes.",
    href: "/generators/email",
    icon: "Mail",
    example: "jan.kowalski@example.com",
  },
  {
    kind: "company",
    name: "Company Name",
    description: "Generate realistic company names and registration details.",
    href: "/generators/company",
    icon: "Building2",
    example: "TechSoft Solutions Sp. z o.o.",
  },
  {
    kind: "card",
    name: "Payment Card",
    description:
      "Generate valid test payment card numbers (Visa, Mastercard) with Luhn checksum.",
    href: "/generators/card",
    icon: "Wallet",
    example: "4532 1234 5678 9010",
  },
  {
    kind: "guid",
    name: "GUID/UUID",
    description: "Generate UUIDs/GUIDs (v4) for testing and development.",
    href: "/generators/guid",
    icon: "Hash",
    example: "550e8400-e29b-41d4-a716-446655440000",
  },
  {
    kind: "string",
    name: "Random String",
    description:
      "Generate random strings with configurable length and character sets.",
    href: "/generators/string",
    icon: "Type",
    example: "aB3xY9mK2pQ7",
  },
];
