import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navigation } from "./navigation";

const route = vi.hoisted(() => ({ pathname: "/dashboard" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("@/components/install-button", () => ({ InstallButton: () => null }));

describe("Navigation", () => {
  beforeEach(() => { route.pathname = "/dashboard"; });

  it("provides the price notebook destination in desktop and mobile menus", () => {
    const html = renderToStaticMarkup(<Navigation />);
    expect(html.match(/href="\/price-notes"/g)).toHaveLength(2);
    expect(html.match(/底値帖/g)).toHaveLength(2);
    expect(html).toContain('href="/transactions/new"');
    expect(html).toContain('href="/settings"');
  });

  it.each(["/login", "/select-member"])("hides the menu on %s", (pathname) => {
    route.pathname = pathname;
    expect(renderToStaticMarkup(<Navigation />)).toBe("");
  });
});
