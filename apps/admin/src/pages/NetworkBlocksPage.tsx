import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { AdminNetworkBlockItem } from "@koe/core";
import {
  describeAdminError,
  fetchNetworkBlocks,
  isUnauthorizedError,
  revokeNetworkBlock,
} from "../api/client";

function formatExpiry(expiresAt: Date): string {
  return new Date(expiresAt).toLocaleString();
}

export default function NetworkBlocksPage() {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<AdminNetworkBlockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNetworkBlocks()
      .then((result) => {
        if (!cancelled) {
          setBlocks(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          handleError(err, "Unable to load Network Blocks");
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

  async function handleRevoke(block: AdminNetworkBlockItem) {
    if (
      !window.confirm(
        `Revoke the Network Block for ${block.ip}? That address will be able to interact again.`
      )
    ) {
      return;
    }
    setBusyId(block.id);
    setError(null);
    try {
      await revokeNetworkBlock(block.id);
      setBlocks((current) => current.filter((item) => item.id !== block.id));
    } catch (err) {
      handleError(err, "Unable to revoke the Network Block");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        Network Blocks
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Addresses blocked from writing. Auto-derived from a User ban.
      </Typography>

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
                <TableCell>Address</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Created by</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {blocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No active Network Blocks.
                  </TableCell>
                </TableRow>
              ) : null}
              {blocks.map((block) => {
                const busy = busyId === block.id;
                return (
                  <TableRow key={block.id} hover>
                    <TableCell>{block.ip}</TableCell>
                    <TableCell>
                      {block.bannedUserName ?? block.bannedUserId ?? "—"}
                    </TableCell>
                    <TableCell>{block.createdByName ?? "—"}</TableCell>
                    <TableCell>
                      <Chip size="small" label={block.source} />
                    </TableCell>
                    <TableCell>{formatExpiry(block.expiresAt)}</TableCell>
                    <TableCell>{block.reason}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="error"
                        disabled={busy}
                        onClick={() => void handleRevoke(block)}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
