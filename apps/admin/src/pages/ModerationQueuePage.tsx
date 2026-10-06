import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import type { CommentModerationActionVerb, ModerationQueueItem, User } from "@koe/core";
import {
  AdminApiError,
  fetchQueue,
  getSession,
  logout,
  moderate,
} from "../api/client";

export default function ModerationQueuePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
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
        const sessionUser = await getSession();
        if (cancelled) {
          return;
        }
        setUser(sessionUser);
        await loadQueue();
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof AdminApiError && err.status === 401) {
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
      setError(
        err instanceof AdminApiError
          ? `${err.type}: ${err.message}`
          : "The moderation action failed"
      );
      if (err instanceof AdminApiError && err.status === 401) {
        navigate("/login", { replace: true });
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Koe Moderation Queue
          </Typography>
          {user ? (
            <Typography variant="body2">
              {user.name ?? user.email ?? user.id} ({user.role})
            </Typography>
          ) : null}
          <Button color="inherit" onClick={handleLogout}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : null}

          {!loading && items.length === 0 ? (
            <Alert severity="success">
              Nothing needs moderation right now.
            </Alert>
          ) : null}

          {items.map((item) => (
            <Card key={item.id} variant="outlined">
              <CardContent>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mb: 1, flexWrap: "wrap" }}
                >
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
      </Container>
    </Box>
  );
}
