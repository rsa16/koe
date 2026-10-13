import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  AdminApiError,
  login,
  oauthStartUrl,
  type OAuthProvider,
} from "../api/client";

const OAUTH_PROVIDERS: { id: OAuthProvider; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "discord", label: "Discord" },
];

const OAUTH_SUCCESS = "koe:oauth:success";
const OAUTH_ERROR = "koe:oauth:error";

function describeError(error: unknown): string {
  return error instanceof AdminApiError
    ? `${error.type}: ${error.message}`
    : "Unable to start an admin session";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null
  );

  const completeLogin = useCallback(
    async (token: string) => {
      setError(null);
      setSubmitting(true);
      try {
        await login(token);
        navigate("/queue", { replace: true });
      } catch (err) {
        setError(describeError(err));
      } finally {
        setSubmitting(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // The OAuth popup postMessages the result to the admin origin only.
      if (event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as
        | {
            type?: string;
            accessToken?: string;
            error?: { message?: string };
          }
        | undefined;
      if (!data || typeof data.type !== "string") {
        return;
      }
      if (data.type === OAUTH_ERROR) {
        setPendingProvider(null);
        setError(data.error?.message ?? "OAuth sign-in failed");
        return;
      }
      if (data.type !== OAUTH_SUCCESS) {
        return;
      }
      setPendingProvider(null);
      if (typeof data.accessToken === "string") {
        void completeLogin(data.accessToken);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [completeLogin]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void completeLogin(accessToken.trim());
  }

  function handleOAuth(provider: OAuthProvider) {
    setError(null);
    setPendingProvider(provider);
    const popup = window.open(
      oauthStartUrl(provider),
      "koe-oauth",
      "popup,width=520,height=640"
    );
    if (!popup) {
      setPendingProvider(null);
      setError("The sign-in window was blocked. Allow pop-ups and try again.");
    }
  }

  const busy = submitting || pendingProvider !== null;

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" component="h1" gutterBottom>
              Koe Admin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in with a moderator or admin account. The server exchanges
              your access token for a session cookie scoped to the admin UI.
            </Typography>
          </Box>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Stack spacing={2}>
            {OAUTH_PROVIDERS.map(({ id, label }) => (
              <Button
                key={id}
                variant="outlined"
                fullWidth
                disabled={busy}
                onClick={() => handleOAuth(id)}
              >
                {pendingProvider === id
                  ? `Waiting for ${label}…`
                  : `Sign in with ${label}`}
              </Button>
            ))}
          </Stack>
          <Divider>or paste a token</Divider>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Access token"
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                fullWidth
                required
                autoFocus
                multiline
                minRows={2}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={submitting || accessToken.trim().length === 0}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}
