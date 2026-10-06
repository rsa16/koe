import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
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
import type { User, UserRole, UserStatus } from "@koe/core";
import {
  describeAdminError,
  fetchUsers,
  isUnauthorizedError,
  updateUser,
  type UserListParams,
} from "../api/client";

const ROLE_OPTIONS: UserRole[] = ["guest", "member", "moderator", "admin"];
const STATUS_OPTIONS: UserStatus[] = ["active", "suspended", "banned"];

const STATUS_COLOR: Record<UserStatus, "success" | "warning" | "error"> = {
  active: "success",
  suspended: "warning",
  banned: "error",
};

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
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

  const loadUsers = useCallback(async () => {
    const params: UserListParams = {
      page: page + 1,
      pageSize,
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
    };
    return fetchUsers(params);
  }, [page, pageSize, role, status, search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadUsers()
      .then((result) => {
        if (cancelled) {
          return;
        }
        setUsers(result.users);
        setTotal(result.total);
      })
      .catch((err) => {
        if (!cancelled) {
          handleError(err, "Unable to load users");
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
  }, [loadUsers, handleError]);

  async function applyUpdate(
    userId: string,
    update: { role?: UserRole; status?: UserStatus }
  ) {
    setBusyId(userId);
    setError(null);
    try {
      const updated = await updateUser(userId, update);
      setUsers((current) =>
        current.map((user) => (user.id === updated.id ? updated : user))
      );
    } catch (err) {
      handleError(err, "Unable to update the user");
    } finally {
      setBusyId(null);
    }
  }

  function handleRoleChange(userId: string, nextRole: UserRole) {
    void applyUpdate(userId, { role: nextRole });
  }

  function handleStatusChange(user: User, nextStatus: UserStatus) {
    if (
      nextStatus === "banned" &&
      !window.confirm(
        `Ban ${user.name ?? user.email ?? user.id}? Their existing comments will be hidden.`
      )
    ) {
      return;
    }
    void applyUpdate(user.id, { status: nextStatus });
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        Users
      </Typography>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        component="form"
        onSubmit={handleSearchSubmit}
      >
        <TextField
          label="Search by name or email"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          size="small"
          fullWidth
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="role-filter-label">Role</InputLabel>
          <Select
            labelId="role-filter-label"
            label="Role"
            value={role}
            onChange={(event) => {
              setPage(0);
              setRole(event.target.value as UserRole | "");
            }}
          >
            <MenuItem value="">All roles</MenuItem>
            {ROLE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            label="Status"
            value={status}
            onChange={(event) => {
              setPage(0);
              setStatus(event.target.value as UserStatus | "");
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
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No users match the current filters.
                    </TableCell>
                  </TableRow>
                ) : null}
                {users.map((user) => {
                  const busy = busyId === user.id;
                  return (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar
                            src={user.avatarUrl ?? undefined}
                            sx={{ width: 32, height: 32 }}
                          >
                            {(user.name ?? user.email ?? "?")
                              .charAt(0)
                              .toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              {user.name ?? "(guest)"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.email ?? user.id}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={user.role}
                          disabled={busy}
                          onChange={(event) =>
                            handleRoleChange(
                              user.id,
                              event.target.value as UserRole
                            )
                          }
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={user.status}
                          color={STATUS_COLOR[user.status]}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="flex-end"
                        >
                          {user.status === "active" ? (
                            <Button
                              size="small"
                              color="warning"
                              disabled={busy}
                              onClick={() =>
                                handleStatusChange(user, "suspended")
                              }
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              color="success"
                              disabled={busy}
                              onClick={() => handleStatusChange(user, "active")}
                            >
                              Reactivate
                            </Button>
                          )}
                          {user.status !== "banned" ? (
                            <Button
                              size="small"
                              color="error"
                              disabled={busy}
                              onClick={() => handleStatusChange(user, "banned")}
                            >
                              Ban
                            </Button>
                          ) : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
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
        </>
      )}
    </Stack>
  );
}
