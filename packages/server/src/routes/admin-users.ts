import {
  AdminUpdateUserBodySchema,
  AdminUserListQuerySchema,
  AdminUserListResponseSchema,
  IdParamSchema,
  UserStatus,
  UserSchema,
} from "@koe/core";
import { Database, moderationActions, users } from "@koe/db";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface AdminUsersRoutesOptions {
  db: Database;
}

function statusAuditVerb(status: UserStatus): "ban" | "suspend" | null {
  if (status === "banned") {
    return "ban";
  }
  if (status === "suspended") {
    return "suspend";
  }
  return null;
}

export function createAdminUsersHandlers(
  app: FastifyInstance,
  options: AdminUsersRoutesOptions
) {
  const { db } = options;

  // Admin: paginated users list
  // GET /api/v1/admin/users
  const listUsersHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const queryParsed = AdminUserListQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid user list query",
        request.url,
        queryParsed.error.issues
      );
    }

    const { page, pageSize, role, status, search } = queryParsed.data;

    const conditions: Array<SQL | undefined> = [];
    if (role) {
      conditions.push(eq(users.role, role));
    }
    if (status) {
      conditions.push(eq(users.status, status));
    }
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(ilike(users.name, pattern), ilike(users.email, pattern))
      );
    }
    const filtered = conditions.filter(
      (condition): condition is SQL => condition !== undefined
    );
    const where = filtered.length > 0 ? and(...filtered) : undefined;

    const rows: Array<typeof users.$inferSelect> = await db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(where);

    return reply.status(200).send(
      AdminUserListResponseSchema.parse({
        users: rows.map((row) => UserSchema.parse(row)),
        total: countRow?.count ?? 0,
        page,
        pageSize,
      })
    );
  };

  // Admin: update a user's role and/or status
  // PATCH /api/v1/admin/users/:id
  const updateUserHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const paramsParsed = IdParamSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid user ID parameter",
        request.url,
        paramsParsed.error.issues
      );
    }

    const bodyParsed = AdminUpdateUserBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return app.sendProblem(
        reply,
        400,
        "Bad Request",
        "Invalid user update body",
        request.url,
        bodyParsed.error.issues
      );
    }

    const { id } = paramsParsed.data;
    const update = bodyParsed.data;

    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (foundUsers.length === 0) {
      return app.sendProblem(
        reply,
        404,
        "Not Found",
        "User does not exist",
        request.url
      );
    }

    const previous = foundUsers[0];
    const auditVerb =
      update.status && update.status !== previous.status
        ? statusAuditVerb(update.status)
        : null;

    const updatedUser = await db.transaction(async (tx: Database) => {
      const [user] = await tx
        .update(users)
        .set({ ...update, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      if (auditVerb) {
        await tx.insert(moderationActions).values({
          actorId: request.user!.id,
          action: auditVerb,
          targetType: "user",
          targetId: id,
          metadata: {
            previousStatus: previous.status,
            ...(update.role ? { previousRole: previous.role } : {}),
          },
        });
      }

      return user;
    });

    return reply.status(200).send(UserSchema.parse(updatedUser));
  };

  return { listUsersHandler, updateUserHandler };
}

export default async function adminUsersRoutes(
  app: FastifyInstance,
  options: AdminUsersRoutesOptions
) {
  const { listUsersHandler, updateUserHandler } = createAdminUsersHandlers(
    app,
    options
  );

  app.get(
    "/api/v1/admin/users",
    { preHandler: app.requireAdminRole(["admin"]) },
    listUsersHandler
  );
  app.patch(
    "/api/v1/admin/users/:id",
    {
      preHandler: [app.requireAdminRole(["admin"]), app.requireAdminCsrf],
    },
    updateUserHandler
  );
}
