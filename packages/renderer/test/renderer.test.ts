import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../src/index.js";

describe("renderMarkdown", () => {
  it("renders basic markdown formatting", () => {
    expect(renderMarkdown("**Hello** *world*")).toBe(
      "<p><strong>Hello</strong> <em>world</em></p>"
    );
  });

  it("renders headings, lists, and inline code", () => {
    const html = renderMarkdown("# Title\n\n- one\n- two\n\n`code`");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<code>code</code>");
  });

  it("allows links with http/https/mailto hrefs", () => {
    expect(renderMarkdown("[koe](https://koe.dev)")).toBe(
      '<p><a href="https://koe.dev">koe</a></p>'
    );
    expect(renderMarkdown("[mail](mailto:a@b.dev)")).toBe(
      '<p><a href="mailto:a@b.dev">mail</a></p>'
    );
  });

  it("allows images with http/https sources", () => {
    expect(renderMarkdown("![pic](https://example.com/pic.png)")).toBe(
      '<p><img src="https://example.com/pic.png" alt="pic"></p>'
    );
  });

  it("blocks raw HTML and scripts", () => {
    const html = renderMarkdown("<script>alert(1)</script>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
  });

  it("strips event-handler attributes from raw HTML", () => {
    const html = renderMarkdown('<a href="https://x.dev" onclick="evil()">x</a>');
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("evil()");
  });

  it("removes dangerous javascript: URLs", () => {
    const html = renderMarkdown("[x](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("drops block-level raw HTML entirely", () => {
    expect(renderMarkdown("<div>raw <b>text</b></div>")).toBe("");
  });

  it("strips inline raw HTML tags but keeps their text", () => {
    expect(renderMarkdown("before <div>raw</div> after")).toBe(
      "<p>before raw after</p>"
    );
  });

  it("renders an empty string as empty paragraph-free output", () => {
    expect(renderMarkdown("")).toBe("");
  });
});