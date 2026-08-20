import { describe, it, expect } from "vitest";
import {
  computeReplyPosition,
  ReplyParent,
} from "../src/replies.js";

describe("computeReplyPosition", () => {
  const root: ReplyParent = { id: "r0", depth: 0, path: "" };

  it("places a top-level comment at depth 0 with an empty path", () => {
    expect(computeReplyPosition(null)).toEqual({
      parentId: null,
      depth: 0,
      path: "",
    });
  });

  it("places a reply to a root comment at depth 1 with the root in its path", () => {
    expect(computeReplyPosition(root)).toEqual({
      parentId: "r0",
      depth: 1,
      path: "/r0",
    });
  });

  it("appends each ancestor to the materialized path", () => {
    const parent: ReplyParent = {
      id: "r2",
      depth: 2,
      path: "/r0/r1",
    };
    expect(computeReplyPosition(parent)).toEqual({
      parentId: "r2",
      depth: 3,
      path: "/r0/r1/r2",
    });
  });

  it("allows a reply at exactly the depth cap", () => {
    const parent: ReplyParent = {
      id: "r3",
      depth: 3,
      path: "/r0/r1/r2",
    };
    expect(computeReplyPosition(parent)).toEqual({
      parentId: "r3",
      depth: 4,
      path: "/r0/r1/r2/r3",
    });
  });

  it("flattens a reply to a comment at the depth cap onto the depth-3 ancestor", () => {
    const parent: ReplyParent = {
      id: "r4",
      depth: 4,
      path: "/r0/r1/r2/r3",
    };
    expect(computeReplyPosition(parent)).toEqual({
      parentId: "r3",
      depth: 4,
      path: "/r0/r1/r2/r3",
    });
  });

  it("respects a custom depth cap", () => {
    const atCap: ReplyParent = { id: "c1", depth: 2, path: "/c0" };
    expect(computeReplyPosition(atCap, 2)).toEqual({
      parentId: "c0",
      depth: 2,
      path: "/c0",
    });
  });
});