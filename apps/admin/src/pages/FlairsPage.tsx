import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import type { Flair } from "@koe/core";
import {
  createFlair,
  deleteFlair,
  describeAdminError,
  fetchFlairs,
  isUnauthorizedError,
  updateFlair,
} from "../api/client";

interface FlairFormState {
  slug: string;
  label: string;
  colour: string;
  rank: string;
}

const EMPTY_FORM: FlairFormState = {
  slug: "",
  label: "",
  colour: "#000000",
  rank: "0",
};

/** Native colour inputs only accept 6-digit hex. */
function to6DigitHex(colour: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(colour)) {
    return colour;
  }
  const match = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(colour);
  if (match) {
    const [, r, g, b] = match;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#000000";
}

export default function FlairsPage() {
  const navigate = useNavigate();
  const [flairs, setFlairs] = useState<Flair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Flair | null>(null);
  const [form, setForm] = useState<FlairFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    fetchFlairs()
      .then((result) => {
        if (!cancelled) {
          setFlairs(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          handleError(err, "Unable to load Flairs");
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
  }, [handleError]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(flair: Flair) {
    setEditing(flair);
    setForm({
      slug: flair.slug,
      label: flair.label,
      colour: to6DigitHex(flair.colour),
      rank: String(flair.rank),
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (saving) {
      return;
    }
    setDialogOpen(false);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const updated = await updateFlair(editing.id, {
          label: form.label,
          colour: form.colour,
          rank: Number(form.rank),
        });
        setFlairs((current) =>
          current
            .map((flair) => (flair.id === updated.id ? updated : flair))
            .sort((a, b) => a.rank - b.rank)
        );
      } else {
        const created = await createFlair({
          slug: form.slug,
          label: form.label,
          colour: form.colour,
          rank: Number(form.rank),
        });
        setFlairs((current) =>
          [...current, created].sort((a, b) => a.rank - b.rank)
        );
      }
      setDialogOpen(false);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        navigate("/login", { replace: true });
        return;
      }
      setFormError(describeAdminError(err, "Unable to save the Flair"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(flair: Flair) {
    if (
      !window.confirm(
        `Delete the "${flair.label}" Flair? Anyone holding it will lose it.`
      )
    ) {
      return;
    }
    setBusyId(flair.id);
    setError(null);
    try {
      await deleteFlair(flair.id);
      setFlairs((current) => current.filter((item) => item.id !== flair.id));
    } catch (err) {
      handleError(err, "Unable to delete the Flair");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" component="h1">
          Flairs
        </Typography>
        <Button variant="contained" onClick={openCreate}>
          New Flair
        </Button>
      </Stack>

      <Alert severity="info">
        Flairs are labels shown beside a person's name. Rank sets the display
        order; lower ranks come first. The slug is permanent once created
        because external systems hold on to it.
      </Alert>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer sx={{ bgcolor: "background.paper" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Colour</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Label</TableCell>
                <TableCell align="right">Rank</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flairs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No Flairs yet.
                  </TableCell>
                </TableRow>
              ) : null}
              {flairs.map((flair) => {
                const busy = busyId === flair.id;
                return (
                  <TableRow key={flair.id} hover>
                    <TableCell>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          border: "1px solid rgba(0,0,0,0.2)",
                          bgcolor: flair.colour,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {flair.slug}
                      </Typography>
                    </TableCell>
                    <TableCell>{flair.label}</TableCell>
                    <TableCell align="right">{flair.rank}</TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                      >
                        <Button
                          size="small"
                          disabled={busy}
                          onClick={() => openEdit(flair)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          disabled={busy}
                          onClick={() => handleDelete(flair)}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSave}>
          <DialogTitle>{editing ? "Edit Flair" : "New Flair"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {formError ? <Alert severity="error">{formError}</Alert> : null}
              <TextField
                label="Slug"
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
                disabled={Boolean(editing)}
                helperText={
                  editing
                    ? "The slug cannot change."
                    : "Lowercase letters, digits and hyphens."
                }
                fullWidth
                required
              />
              <TextField
                label="Label"
                value={form.label}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                fullWidth
                required
              />
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  label="Colour"
                  type="color"
                  value={form.colour}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      colour: event.target.value,
                    }))
                  }
                  sx={{ width: 96 }}
                />
                <TextField
                  label="Rank"
                  type="number"
                  value={form.rank}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rank: event.target.value,
                    }))
                  }
                  helperText="Lower ranks display first."
                  fullWidth
                  required
                />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {editing ? "Save" : "Create"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
