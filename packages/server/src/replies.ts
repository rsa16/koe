import { COMMENT_DEPTH_CAP } from "@koe/core";

export interface ReplyParent {
  id: string;
  depth: number;
  path: string;
}

export interface ReplyPosition {
  parentId: string | null;
  depth: number;
  path: string;
}

export function computeReplyPosition(
  parent: ReplyParent | null,
  depthCap = COMMENT_DEPTH_CAP
): ReplyPosition {
  if (parent === null) {
    return { parentId: null, depth: 0, path: "" };
  }

  if (parent.depth < depthCap) {
    return {
      parentId: parent.id,
      depth: parent.depth + 1,
      path: joinPath(parent.path, parent.id),
    };
  }

  const ancestorId = lastPathSegment(parent.path);
  const ancestorPath = parent.path.slice(0, parent.path.lastIndexOf("/"));
  return {
    parentId: ancestorId,
    depth: depthCap,
    path: joinPath(ancestorPath, ancestorId),
  };
}

function joinPath(currentPath: string, id: string): string {
  return currentPath === "" ? `/${id}` : `${currentPath}/${id}`;
}

function lastPathSegment(path: string): string {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1];
}