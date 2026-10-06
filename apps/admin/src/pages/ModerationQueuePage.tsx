import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import type { CommentModerationActionVerb, ModerationQueueItem } from "@koe/core";
import {
  describeAdminError,
  fetchQueue,
  isUnauthorizedError,
  moderate,
} from "../api/client";

export default function ModerationQueuePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    const queue = await fetchQueue();
    setItems(queue);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        if (!cancelled) {
          await loadQueue();
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (isUnauthorizedError(err)) {
          navigate("/login", { replace: true });
          return;
        }
        setError("Unable to load the moderation queue");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadQueue, navigate]);

  async function handleAction(
    commentId: string,
    action: CommentModerationActionVerb
  ) {
    setBusyId(commentId);
    setError(null);
    try {
      await moderate(commentId, action);
      setItems((current) => current.filter((item) => item.id !== commentId));
    } catch (err) {
      setError(describeAdminError(err, "The moderation action failed"));
      if (isUnauthorizedError(err)) {
        navigate("/login", { replace: true });
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        Moderation Queue
      </Typography>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : null}

      {!loading && items.length === 0 ? (
        <Alert severity="success">Nothing needs moderation right now.</Alert>
      ) : null}

      {items.map((item) => (
        <Card key={item.id} variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
              <Chip
                size="small"
                color={item.status === "pending" ? "warning" : "error"}
                label={item.status === "published" ? "reported" : item.status}
              />
              <Chip
                size="small"
                variant="outlined"
                label={item.thread.title ?? item.thread.externalRef}
              />
              <Typography variant="caption" color="text.secondary">
                by {item.authorName ?? "guest"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(item.createdAt).toLocaleString()}
              </Typography>
            </Stack>
            <Box
              sx={{ "& p": { m: 0 } }}
              dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
            />
          </CardContent>
          <CardActions>
            <Button
              size="small"
              color="success"
              variant="contained"
              disabled={busyId === item.id}
              onClick={() => handleAction(item.id, "approve")}
            >
              Approve
            </Button>
            <Button
              size="small"
              color="warning"
              variant="contained"
              disabled={busyId === item.id}
              onClick={() => handleAction(item.id, "reject")}
            >
              Reject
            </Button>
            <Button
              size="small"
              color="error"
              variant="contained"
              disabled={busyId === item.id}
              onClick={() => handleAction(item.id, "spam")}
            >
              Spam
            </Button>
          </CardActions>
        </Card>
      ))}
    </Stack>
  );
}
