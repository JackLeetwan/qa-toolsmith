import { useReducer, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import IBANGeneratorForm from "./IBANGeneratorForm";
import IBANValidatorForm from "./IBANValidatorForm";
import GeneratorHistory from "./GeneratorHistory";
import { useLocalHistory } from "@/lib/hooks/useLocalHistory";
import type { IbanViewState, IbanGeneratorResponse } from "@/types/types";

type IbanAction =
  | { type: "SET_MODE"; payload: "generate" | "validate" }
  | { type: "SET_COUNTRY"; payload: IbanViewState["country"] }
  | { type: "SET_SEED"; payload: string | undefined }
  | { type: "SET_FORMAT"; payload: IbanViewState["format"] }
  | { type: "SET_RESULT"; payload: IbanGeneratorResponse }
  | { type: "SET_VALIDATION"; payload: IbanViewState["validation"] }
  | { type: "SET_INPUT_IBAN"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: IbanViewState["error"] }
  | { type: "CLEAR_ERROR" }
  | { type: "REHYDRATE_RESULT"; payload: IbanGeneratorResponse };

function ibanViewReducer(state: IbanViewState, action: IbanAction): IbanViewState {
  switch (action.type) {
    case "SET_MODE":
      return { ...state, mode: action.payload, error: undefined };
    case "SET_COUNTRY":
      return { ...state, country: action.payload };
    case "SET_SEED":
      return { ...state, seed: action.payload };
    case "SET_FORMAT":
      return { ...state, format: action.payload };
    case "SET_RESULT":
      return { ...state, result: action.payload, error: undefined };
    case "SET_VALIDATION":
      return { ...state, validation: action.payload, error: undefined };
    case "SET_INPUT_IBAN":
      return { ...state, inputIban: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    case "CLEAR_ERROR":
      return { ...state, error: undefined };
    case "REHYDRATE_RESULT":
      return {
        ...state,
        result: action.payload,
        country: action.payload.country,
        seed: action.payload.seed,
        mode: "generate",
      };
    default:
      return state;
  }
}

const initialState: IbanViewState = {
  mode: "generate",
  country: "DE",
  format: "text",
  history: [],
  isLoading: false,
};

export default function IBANGeneratorView() {
  const [state, dispatch] = useReducer(ibanViewReducer, initialState);
  const {
    items: history,
    addItem: addToHistory,
    clearHistory,
  } = useLocalHistory<IbanGeneratorResponse>("gen_history_iban");

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const prefs = localStorage.getItem("gen_pref_iban");
      if (prefs) {
        const parsed = JSON.parse(prefs);
        if (parsed.country) dispatch({ type: "SET_COUNTRY", payload: parsed.country });
        if (parsed.format) dispatch({ type: "SET_FORMAT", payload: parsed.format });
        if (parsed.mode) dispatch({ type: "SET_MODE", payload: parsed.mode });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to load preferences:", error);
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    try {
      const prefs = {
        country: state.country,
        format: state.format,
        mode: state.mode,
      };
      localStorage.setItem("gen_pref_iban", JSON.stringify(prefs));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to save preferences:", error);
    }
  }, [state.country, state.format, state.mode]);

  const handleGenerated = (result: IbanGeneratorResponse) => {
    dispatch({ type: "SET_RESULT", payload: result });
    addToHistory(result);
  };

  const handleHistorySelect = (item: IbanGeneratorResponse) => {
    dispatch({ type: "REHYDRATE_RESULT", payload: item });
  };

  const handleCountryChange = (country: IbanViewState["country"]) => {
    dispatch({ type: "SET_COUNTRY", payload: country });
  };

  const handleSeedChange = (seed: string | undefined) => {
    dispatch({ type: "SET_SEED", payload: seed });
  };

  const handleFormatChange = (format: IbanViewState["format"]) => {
    dispatch({ type: "SET_FORMAT", payload: format });
  };

  const handleLoadingChange = (loading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: loading });
  };

  const handleError = (error: IbanViewState["error"]) => {
    dispatch({ type: "SET_ERROR", payload: error });
  };

  const handleInputChange = (iban: string) => {
    dispatch({ type: "SET_INPUT_IBAN", payload: iban });
  };

  const handleValidated = (result: IbanViewState["validation"]) => {
    dispatch({ type: "SET_VALIDATION", payload: result });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <Tabs
          value={state.mode}
          onValueChange={(value) => dispatch({ type: "SET_MODE", payload: value as "generate" | "validate" })}
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="validate">Validate</TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            <IBANGeneratorForm
              country={state.country}
              seed={state.seed}
              format={state.format}
              result={state.result}
              isLoading={state.isLoading}
              error={state.error}
              onCountryChange={handleCountryChange}
              onSeedChange={handleSeedChange}
              onFormatChange={handleFormatChange}
              onGenerated={handleGenerated}
              onLoadingChange={handleLoadingChange}
              onError={handleError}
            />
          </TabsContent>

          <TabsContent value="validate">
            <IBANValidatorForm
              inputIban={state.inputIban}
              validation={state.validation}
              isLoading={state.isLoading}
              error={state.error}
              onInputChange={handleInputChange}
              onValidated={handleValidated}
              onLoadingChange={handleLoadingChange}
              onError={handleError}
            />
          </TabsContent>
        </Tabs>
      </div>

      <aside className="lg:w-80">
        <GeneratorHistory items={history} onSelect={handleHistorySelect} onClear={clearHistory} />
      </aside>

      <Toaster />
    </div>
  );
}
