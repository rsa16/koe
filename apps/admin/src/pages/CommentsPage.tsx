import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import type {
  AdminCommentBulkActionVerb,
  AdminCommentItem,
  AdminCommentThread,
  CommentStatus,
} from "@koe/core";
import {
  bulkModerateComments,
  describeAdminError,
  fetchAdminComments,
  fetchAdminCommentThreads,
  isUnauthorizedError,
  type CommentListParams,
} from "../api/client";

const STATUS_OPTIONS: CommentStatus[] = [
  "pending",
  "published",
  "spam",
  "deleted",
];

const STATUS_COLOR: Record<
  CommentStatus,
  "warning" | "success" | "error" | "default"
> = {
  pending: "warning",
  published: "success",
  spam: "error",
  deleted: "default",
};

function bodySnippet(comment: AdminCommentItem): string {
  if (comment.status === "deleted" && comment.bodyHtml.length === 0) {
    return "(deleted)";
  }
  const text = comment.bodyHtml
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length === 0) {
    return "(empty)";
  }
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

export default function CommentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [comments, setComments] = useState<AdminCommentItem[]>([]);
  const [threads, setThreads] = useState<AdminCommentThread[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<CommentStatus | "">("");
  const [threadId, setThreadId] = useState("");
  const [authorId, setAuthorId] = useState(searchParams.get("authorId") ?? "");
  const [authorLabel, setAuthorLabel] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (err: unknown, fallback: string) => {
      if (isUnauthorizedError(err)) {
        navigate("/login", { replace: true });
        return;
      }
      setError(describeAdminError(err, fallback));
    },
    [navigate]
  );

  const loadComments = useCallback(async () => {
    const params: CommentListParams = {
      page: page + 1,
      pageSize,
      ...(status ? { status } : {}),
      ...(threadId ? { threadId } : {}),
      ...(authorId ? { authorId } : {}),
      ...(search ? { search } : {}),
    };
    return fetchAdminComments(params);
  }, [page, pageSize, status, threadId, authorId, search]);

  useEffect(() => {
    let cancelled = false;
    fetchAdminCommentThreads()
      .then((result) => {
        if (!cancelled) {
          setThreads(result);
        }
      })
      .catch(() => {
        // The page filter is a convenience; ignore load failures here.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelected(new Set());
    loadComments()
      .then((result) => {
        if (cancelled) {
          return;
        }
        setComments(result.comments);
        setTotal(result.total);
      })
      .catch((err) => {
        if (!cancelled) {
          handleError(err, "Unable to load comments");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadComments, handleError]);

  function applyAuthorFilter(id: string, label: string | null) {
    setPage(0);
    setAuthorId(id);
    setAuthorLabel(label);
    const next = new URLSearchParams(searchParams);
    if (id) {
      next.set("authorId", id);
    } else {
      next.delete("authorId");
    }
    setSearchParams(next, { replace: true });
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  function toggleRow(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) =>
      current.size === comments.length
        ? new Set()
        : new Set(comments.map((comment) => comment.id))
    );
  }

  async function runAction(
    ids: string[],
    action: AdminCommentBulkActionVerb,
    confirmMessage?: string
  ) {
    if (ids.length === 0) {
      return;
    }
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await bulkModerateComments({ commentIds: ids, action });
      setSelected(new Set());
      await loadComments();
    } catch (err) {
      handleError(err, "The comment action failed");
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    setBusy(true);
    setError(null);
    try {
      const result = await loadComments();
      setComments(result.comments);
      setTotal(result.total);
    } catch (err) {
      handleError(err, "Unable to refresh comments");
    } finally {
      setBusy(false);
    }
  }

  const selectedIds = Array.from(selected);
  const allSelected = comments.length > 0 && selected.size === comments.length;
  const someSelected = selected.size > 0 && selected.size < comments.length;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        Comments
      </Typography>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        component="form"
        onSubmit={handleSearchSubmit}
      >
        <TextField
          label="Search comment text"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          size="small"
          fullWidth
        />
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="thread-filter-label">Thread / page</InputLabel>
          <Select
            labelId="thread-filter-label"
            label="Thread / page"
            value={threadId}
            onChange={(event) => {
              setPage(0);
              setThreadId(event.target.value);
            }}
          >
            <MenuItem value="">All threads</MenuItem>
            {threads.map((thread) => (
              <MenuItem key={thread.id} value={thread.id}>
                {thread.title ?? thread.externalRef} ({thread.commentCount})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="comment-status-filter-label">Status</InputLabel>
          <Select
            labelId="comment-status-filter-label"
            label="Status"
            value={status}
            onChange={(event) => {
              setPage(0);
              setStatus(event.target.value as CommentStatus | "");
            }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button type="submit" variant="contained">
          Search
        </Button>
      </Stack>

      {authorId ? (
        <Box>
          <Chip
            color="primary"
            variant="outlined"
            label={`Author: ${authorLabel ?? authorId}`}
            onDelete={() => applyAuthorFilter("", null)}
          />
        </Box>
      ) : null}

      {selected.size > 0 ? (
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ flexWrap: "wrap" }}
          >
            <Typography variant="body2" sx={{ mr: 1 }}>
              {selected.size} selected
            </Typography>
            <Button
              size="small"
              color="success"
              disabled={busy}
              onClick={() => runAction(selectedIds, "approve")}
            >
              Approve
            </Button>
            <Button
              size="small"
              color="warning"
              disabled={busy}
              onClick={() => runAction(selectedIds, "reject")}
            >
              Reject
            </Button>
            <Button
              size="small"
              color="warning"
              disabled={busy}
              onClick={() => runAction(selectedIds, "spam")}
            >
              Spam
            </Button>
            <Button
              size="small"
              color="error"
              disabled={busy}
              onClick={() =>
                runAction(
                  selectedIds,
                  "delete",
                  `Delete ${selected.size} selected comment(s)?`
                )
              }
            >
              Delete
            </Button>
            <Button
              size="small"
              disabled={busy}
              onClick={() => runAction(selectedIds, "pin")}
            >
              Pin
            </Button>
            <Button
              size="small"
              disabled={busy}
              onClick={() => runAction(selectedIds, "unpin")}
            >
              Unpin
            </Button>
            <Button
              size="small"
              disabled={busy}
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </Stack>
        </Paper>
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer sx={{ bgcolor: "background.paper" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleAll}
                      inputProps={{ "aria-label": "Select all comments" }}
                    />
                  </TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Author</TableCell>
                  <TableCell>Thread</TableCell>
                  <TableCell>Comment</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell>Pinned</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {comments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No comments match the current filters.
                    </TableCell>
                  </TableRow>
                ) : null}
                {comments.map((comment) => (
                  <TableRow key={comment.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.has(comment.id)}
                        onChange={() => toggleRow(comment.id)}
                        inputProps={{
                          "aria-label": `Select comment by ${
                            comment.authorName ?? "guest"
                          }`,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={comment.status}
                        color={STATUS_COLOR[comment.status]}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() =>
                          applyAuthorFilter(
                            comment.authorId,
                            comment.authorName ??
                              comment.authorEmail ??
                              comment.authorId
                          )
                        }
                      >
                        {comment.authorName ?? comment.authorEmail ?? "guest"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={comment.thread.title ?? comment.thread.externalRef}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography variant="body2">
                        {bodySnippet(comment)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {comment.upvotes - comment.downvotes}
                    </TableCell>
                    <TableCell>
                      {comment.pinnedAt ? (
                        <Chip size="small" color="info" label="Pinned" />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(comment.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                        sx={{ flexWrap: "wrap" }}
                      >
                        <Button
                          size="small"
                          color="success"
                          disabled={busy}
                          onClick={() => runAction([comment.id], "approve")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          color="warning"
                          disabled={busy}
                          onClick={() => runAction([comment.id], "reject")}
                        >
                          Reject
                        </Button>
                        <Button
                          size="small"
                          color="warning"
                          disabled={busy}
                          onClick={() => runAction([comment.id], "spam")}
                        >
                          Spam
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          disabled={busy}
                          onClick={() =>
                            runAction(
                              [comment.id],
                              "delete",
                              "Delete this comment?"
                            )
                          }
                        >
                          Delete
                        </Button>
                        <Button
                          size="small"
                          disabled={busy}
                          onClick={() =>
                            runAction(
                              [comment.id],
                              comment.pinnedAt ? "unpin" : "pin"
                            )
                          }
                        >
                          {comment.pinnedAt ? "Unpin" : "Pin"}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack direction="row" justifyContent="flex-end">
            <Button size="small" disabled={busy} onClick={() => void reload()}>
              Refresh
            </Button>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_event, nextPage) => setPage(nextPage)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(event) => {
                setPage(0);
                setPageSize(Number(event.target.value));
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
            />
          </Stack>
        </>
      )}
    </Stack>
  );
}
