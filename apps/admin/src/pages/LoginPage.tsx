import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AdminApiError, login } from "../api/client";

export default function LoginPage() {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(accessToken.trim());
      navigate("/queue", { replace: true });
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? `${err.type}: ${err.message}`
          : "Unable to start an admin session"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" component="h1" gutterBottom>
              Koe Admin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in with a moderator or admin access token. The server
              exchanges it for a session cookie scoped to the admin UI.
            </Typography>
          </Box>
          {error ? <Alert severity="error">{error}</Alert> : null}
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
