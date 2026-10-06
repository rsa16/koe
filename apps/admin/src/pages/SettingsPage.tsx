import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { AdminSettings } from "@koe/core";
import {
  describeAdminError,
  fetchSettings,
  isUnauthorizedError,
} from "../api/client";

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Typography variant="body2" sx={{ minWidth: 220, color: "text.secondary" }}>
        {label}
      </Typography>
      <Box sx={{ flexGrow: 1 }}>{children}</Box>
    </Stack>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then((result) => {
        if (!cancelled) {
          setSettings(result);
        }
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        if (isUnauthorizedError(err)) {
          navigate("/login", { replace: true });
          return;
        }
        setError(describeAdminError(err, "Unable to load settings"));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        Settings
      </Typography>

      <Alert severity="info">
        Configuration is environment-based and read-only from the admin UI. Edit
        the server environment variables and restart to change these values.
      </Alert>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : null}

      {settings ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <SettingRow label="Comment depth cap">
              <Typography variant="body1">{settings.commentDepthCap}</Typography>
            </SettingRow>
            <Divider />
            <SettingRow label="Pre-moderation default">
              <Typography variant="body1">
                {settings.preModerationDefault ? "Enabled" : "Disabled"}
              </Typography>
            </SettingRow>
            <Divider />
            <SettingRow label="Google OAuth">
              <Typography variant="body1">
                {settings.googleOAuthEnabled ? "Configured" : "Not configured"}
              </Typography>
            </SettingRow>
            <Divider />
            <SettingRow label="Reaction allowlist">
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {settings.reactionAllowlist.map((emoji) => (
                  <Chip key={emoji} label={emoji} size="small" />
                ))}
              </Stack>
            </SettingRow>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
