import React from "react";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";

/**
 * Render helper for LoginForm component
 * Returns container, user event setup, screen utility, and render utilities (rerender, unmount)
 */
export async function renderLoginForm(component: React.ReactElement) {
  const renderResult = render(component);
  const user = userEvent.setup();

  return {
    ...renderResult,
    user,
    screen,
  };
}

/**
 * Type for render helper return value
 */
export type LoginFormRenderResult = Awaited<ReturnType<typeof renderLoginForm>>;
