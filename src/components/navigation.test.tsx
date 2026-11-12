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

  it("places the price notebook immediately to the right of input in both menus", () => {
    const html = renderToStaticMarkup(<Navigation />);
    const navs = html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/g) ?? [];
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      const links = [...nav.matchAll(/href="([^"]*)"/g)].map(match => match[1]);
      const input = links.indexOf("/transactions/new");
      expect(links[input + 1]).toBe("/price-notes");
      expect(links[input + 2]).toBe("/import");
    }
  });

  it.each(["/login", "/select-member"])("hides the menu on %s", (pathname) => {
    route.pathname = pathname;
    expect(renderToStaticMarkup(<Navigation />)).toBe("");
  });
});
