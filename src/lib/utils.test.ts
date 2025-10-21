import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("Utils", () => {
  describe("cn (className utility)", () => {
    describe("basic functionality", () => {
      it("should return single class name", () => {
        expect(cn("bg-red-500")).toBe("bg-red-500");
      });

      it("should combine multiple class names", () => {
        expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
      });

      it("should handle empty input", () => {
        expect(cn()).toBe("");
      });

      it("should handle single empty string", () => {
        expect(cn("")).toBe("");
      });
    });

    describe("conditional classes", () => {
      it("should handle conditional classes with arrays", () => {
        const condition = true;
        expect(cn("base-class", condition && "conditional-class")).toBe(
          "base-class conditional-class",
        );
      });

      it("should filter out falsy conditional classes", () => {
        const condition = false;
        expect(cn("base-class", condition && "conditional-class")).toBe(
          "base-class",
        );
      });

      it("should handle multiple conditional classes", () => {
        const isActive = true;
        const isDisabled = false;
        const isLarge = true;

        expect(
          cn(
            "button",
            isActive && "active",
            isDisabled && "disabled",
            isLarge && "large",
          ),
        ).toBe("button active large");
      });

      it("should handle array of classes", () => {
        expect(cn(["bg-red-500", "text-white", "p-4"])).toBe(
          "bg-red-500 text-white p-4",
        );
      });

      it("should handle nested arrays", () => {
        expect(cn(["bg-red-500", ["text-white", "p-4"]])).toBe(
          "bg-red-500 text-white p-4",
        );
      });
    });

    describe("object syntax", () => {
      it("should handle object with truthy values", () => {
        expect(
          cn({
            "bg-red-500": true,
            "text-white": true,
            hidden: false,
          }),
        ).toBe("bg-red-500 text-white");
      });

      it("should handle object with falsy values", () => {
        expect(
          cn({
            "bg-red-500": false,
            "text-white": true,
            "p-4": null,
            "m-2": undefined,
          }),
        ).toBe("text-white");
      });

      it("should handle mixed object and string inputs", () => {
        expect(
          cn("base-class", {
            active: true,
            disabled: false,
          }),
        ).toBe("base-class active");
      });
    });

    describe("Tailwind CSS merging", () => {
      it("should merge conflicting background colors (last wins)", () => {
        expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
      });

      it("should merge conflicting text colors", () => {
        expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
      });

      it("should merge conflicting padding", () => {
        expect(cn("p-2", "p-4")).toBe("p-4");
      });

      it("should merge conflicting margin", () => {
        expect(cn("m-2", "m-4")).toBe("m-4");
      });

      it("should merge responsive variants", () => {
        expect(cn("p-2", "md:p-4")).toBe("p-2 md:p-4");
      });

      it("should merge hover states", () => {
        expect(cn("bg-red-500", "hover:bg-blue-500")).toBe(
          "bg-red-500 hover:bg-blue-500",
        );
      });

      it("should merge focus states", () => {
        expect(cn("ring-2", "focus:ring-4")).toBe("ring-2 focus:ring-4");
      });

      it("should handle complex Tailwind merging", () => {
        expect(
          cn(
            "px-2 py-1 bg-red-500 text-sm rounded",
            "px-4 bg-blue-500 text-lg",
          ),
        ).toBe("py-1 rounded px-4 bg-blue-500 text-lg");
      });

      it("should preserve non-conflicting classes", () => {
        expect(cn("bg-red-500 text-white", "border border-gray-300")).toBe(
          "bg-red-500 text-white border border-gray-300",
        );
      });
    });

    describe("edge cases", () => {
      it("should handle null and undefined inputs", () => {
        expect(cn("class1", null, "class2", undefined)).toBe("class1 class2");
      });

      it("should handle number inputs", () => {
        expect(cn("class", 123)).toBe("class 123");
      });

      it("should handle boolean inputs", () => {
        expect(cn("class", true, false)).toBe("class");
      });

      it("should handle empty array", () => {
        expect(cn([])).toBe("");
      });

      it("should handle array with empty strings", () => {
        expect(cn(["", "class1", "", "class2"])).toBe("class1 class2");
      });

      it("should handle deeply nested arrays", () => {
        expect(cn([["class1"], ["class2", ["class3"]]])).toBe(
          "class1 class2 class3",
        );
      });

      it("should handle empty object", () => {
        expect(cn({})).toBe("");
      });

      it("should handle object with numeric keys", () => {
        expect(cn({ 0: "class1", 1: "class2" })).toBe("0 1");
      });

      it("should handle mixed complex inputs", () => {
        expect(
          cn(
            "base",
            ["array1", "array2"],
            { obj1: true, obj2: false },
            null,
            "string1",
            undefined,
            ["nested", ["deeply"]],
          ),
        ).toBe("base array1 array2 obj1 string1 nested deeply");
      });
    });

    describe("clsx compatibility", () => {
      it("should handle clsx-style conditional arrays", () => {
        const isActive = true;
        const isDisabled = false;
        const size = "large";

        expect(
          cn([
            "button",
            isActive && "active",
            isDisabled && "disabled",
            size === "large" && "text-lg",
            "base-styles",
          ]),
        ).toBe("button active text-lg base-styles");
      });

      it("should handle clsx-style mixed arrays and objects", () => {
        expect(
          cn([
            "button",
            {
              "bg-blue-500": true,
              "text-white": true,
              "opacity-50": false,
            },
            "rounded",
          ]),
        ).toBe("button bg-blue-500 text-white rounded");
      });
    });

    describe("whitespace handling", () => {
      it("should trim extra whitespace", () => {
        expect(cn("  class1  ", "  class2  ")).toBe("class1 class2");
      });

      it("should collapse multiple spaces", () => {
        expect(cn("class1    class2", "class3")).toBe("class1 class2 class3");
      });

      it("should handle classes with internal spaces", () => {
        // Note: classes with spaces are not valid CSS, but testing robustness
        expect(cn("class with spaces", "normal-class")).toBe(
          "class with spaces normal-class",
        );
      });
    });

    describe("integration patterns", () => {
      it("should work with React-style conditional rendering", () => {
        const isPrimary = true;
        const isLarge = true;
        const disabled = false;

        const result = cn("button", {
          "bg-blue-500": isPrimary,
          "bg-gray-500": !isPrimary,
          "text-white": true,
          "px-4 py-2": isLarge,
          "px-2 py-1": !isLarge,
          "opacity-50 cursor-not-allowed": disabled,
        });

        expect(result).toBe("button bg-blue-500 text-white px-4 py-2");
      });

      it("should work with different variant and size combinations", () => {
        const isPrimary = false;
        const isLarge = false;
        const disabled = true;

        const result = cn("button", {
          "bg-blue-500": isPrimary,
          "bg-gray-500": !isPrimary,
          "text-white": true,
          "px-4 py-2": isLarge,
          "px-2 py-1": !isLarge,
          "opacity-50 cursor-not-allowed": disabled,
        });

        expect(result).toBe(
          "button bg-gray-500 text-white px-2 py-1 opacity-50 cursor-not-allowed",
        );
      });

      it("should work with component variants pattern", () => {
        const getButtonClasses = (props: {
          variant?: string;
          size?: string;
        }) => {
          return cn("button", {
            "bg-blue-500": props.variant === "primary",
            "bg-red-500": props.variant === "danger",
            "bg-gray-500": !props.variant || props.variant === "default",
            "px-4 py-2": props.size === "lg",
            "px-2 py-1": props.size === "sm",
            "px-3 py-1.5": !props.size || props.size === "md",
          });
        };

        expect(getButtonClasses({ variant: "primary", size: "lg" })).toBe(
          "button bg-blue-500 px-4 py-2",
        );
        expect(getButtonClasses({ variant: "danger", size: "sm" })).toBe(
          "button bg-red-500 px-2 py-1",
        );
        expect(getButtonClasses({})).toBe("button bg-gray-500 px-3 py-1.5");
      });

      it("should handle dynamic class generation", () => {
        const colorMap = {
          red: "bg-red-500",
          blue: "bg-blue-500",
          green: "bg-green-500",
        };

        const getColoredBox = (color: keyof typeof colorMap) => {
          return cn("box", "p-4", "rounded", colorMap[color]);
        };

        expect(getColoredBox("red")).toBe("box p-4 rounded bg-red-500");
        expect(getColoredBox("blue")).toBe("box p-4 rounded bg-blue-500");
        expect(getColoredBox("green")).toBe("box p-4 rounded bg-green-500");
      });
    });
  });
});
