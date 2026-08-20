import { Schema } from "hast-util-sanitize";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export const strictSanitizeSchema: Schema = {
  clobberPrefix: "koe-",
  strip: ["script", "style", "iframe", "object", "embed", "form", "input"],
  tagNames: [
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "del",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "strong",
    "ul",
  ],
  attributes: {
    a: ["href", "title"],
    img: ["src", "alt", "title"],
  },
  protocols: {
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
};

export interface RenderMarkdownOptions {
  schema?: Schema;
}

const defaultProcessor = createProcessor(strictSanitizeSchema);

function createProcessor(schema: Schema) {
  return unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeSanitize, schema)
    .use(rehypeStringify);
}

export function renderMarkdown(
  markdown: string,
  options: RenderMarkdownOptions = {}
): string {
  const processor = options.schema
    ? createProcessor(options.schema)
    : defaultProcessor;
  return processor.processSync(markdown).toString();
}