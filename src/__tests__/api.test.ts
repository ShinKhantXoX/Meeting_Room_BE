import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { getAuthToken, resetAndSeed, SEED } from "./setup.js";

describe("1. Auth", () => {
  it("1.1 Login by userId returns 200 and { token, user }", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ userId: SEED.adminId })
      .expect(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toMatchObject({
      id: SEED.adminId,
      name: "Alice",
      role: "admin",
    });
  });

  it("1.2 Login by name returns 200 and { token, user }", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ name: "Bob" })
      .expect(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toMatchObject({ name: "Bob", role: "owner" });
  });

  it("1.3 Login with unknown name returns 404 NOT_FOUND", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ name: "Nobody" })
      .expect(404);
    expect(res.body.error?.code).toBe("NOT_FOUND");
  });

  it("1.4 Login with empty body returns 400 VALIDATION", async () => {
    const res = await request(app).post("/api/auth/login").send({}).expect(400);
    expect(res.body.error?.code).toBe("VALIDATION");
  });

  it("1.5 GET /api/auth/me with valid token returns 200 and user", async () => {
    const token = getAuthToken(SEED.adminId, "admin");
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toMatchObject({
      id: SEED.adminId,
      name: "Alice",
      role: "admin",
    });
  });

  it("1.6 GET /api/auth/me without token returns 401 UNAUTHORIZED", async () => {
    const res = await request(app).get("/api/auth/me").expect(401);
    expect(res.body.error?.code).toBe("UNAUTHORIZED");
  });
});

describe("2. User Management (permissions)", () => {
  it("2.1 Admin creates user returns 201", async () => {
    const token = getAuthToken(SEED.adminId, "admin");
    await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "NewUser", role: "user" })
      .expect(201);
  });

  it("2.2 Owner creates user returns 403 FORBIDDEN", async () => {
    const token = getAuthToken(SEED.ownerId, "owner");
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "NewUser", role: "user" })
      .expect(403);
    expect(res.body.error?.code).toBe("FORBIDDEN");
  });

  it("2.3 User creates user returns 403 FORBIDDEN", async () => {
    const token = getAuthToken(SEED.userId, "user");
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "NewUser", role: "user" })
      .expect(403);
    expect(res.body.error?.code).toBe("FORBIDDEN");
  });

  it("2.4 Admin changes role returns 200", async () => {
    const token = getAuthToken(SEED.adminId, "admin");
    await request(app)
      .patch(`/api/users/${SEED.userId2}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "owner" })
      .expect(200);
  });

  it("2.5 Owner changes role returns 403 FORBIDDEN", async () => {
    const token = getAuthToken(SEED.ownerId, "owner");
    const res = await request(app)
      .patch(`/api/users/${SEED.userId2}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "admin" })
      .expect(403);
    expect(res.body.error?.code).toBe("FORBIDDEN");
  });

  it("2.6 Admin deletes user returns 204", async () => {
    const token = getAuthToken(SEED.adminId, "admin");
    const createRes = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "ToDelete", role: "user" })
      .expect(201);
    await request(app)
      .delete(`/api/users/${createRes.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });

  it("2.7 Owner deletes user returns 403 FORBIDDEN", async () => {
    const token = getAuthToken(SEED.ownerId, "owner");
    const res = await request(app)
      .delete(`/api/users/${SEED.userId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
    expect(res.body.error?.code).toBe("FORBIDDEN");
  });

  it("2.8 Admin lists users returns 200", async () => {
    const token = getAuthToken(SEED.adminId, "admin");
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("2.9 Owner lists users returns 200", async () => {
    const token = getAuthToken(SEED.ownerId, "owner");
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("2.10 User lists users returns 403 FORBIDDEN", async () => {
    const token = getAuthToken(SEED.userId, "user");
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
    expect(res.body.error?.code).toBe("FORBIDDEN");
  });
});

describe("3. Booking CRUD (permissions)", () => {
  const validBooking = {
    startTime: "2026-06-01T10:00:00.000Z",
    endTime: "2026-06-01T11:00:00.000Z",
  };

  it("3.1 Any role creates booking returns 201", async () => {
    const token = getAuthToken(SEED.userId, "user");
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send(validBooking)
      .expect(201);
  });

  it("3.2 Any role lists bookings returns 200", async () => {
    const token = getAuthToken(SEED.userId, "user");
    const res = await request(app)
      .get("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("3.3 User deletes own booking returns 204", async () => {
    const token = getAuthToken(SEED.userId, "user");
    await request(app)
      .delete(`/api/bookings/${SEED.booking3}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });

  it("3.4 User deletes other's booking returns 403 FORBIDDEN", async () => {
    await resetAndSeed();
    const token = getAuthToken(SEED.userId, "user");
    const res = await request(app)
      .delete(`/api/bookings/${SEED.booking1}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
    expect(res.body.error?.code).toBe("FORBIDDEN");
  });

  it("3.5 Owner deletes any booking returns 204", async () => {
    await resetAndSeed();
    const token = getAuthToken(SEED.ownerId, "owner");
    await request(app)
      .delete(`/api/bookings/${SEED.booking1}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });

  it("3.6 Admin deletes any booking returns 204", async () => {
    await resetAndSeed();
    const token = getAuthToken(SEED.adminId, "admin");
    await request(app)
      .delete(`/api/bookings/${SEED.booking2}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });
});

describe("4. Booking Validation", () => {
  const token = getAuthToken(SEED.userId, "user");

  it("4.1 startTime after endTime returns 400 VALIDATION", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        startTime: "2026-06-01T11:00:00.000Z",
        endTime: "2026-06-01T10:00:00.000Z",
      })
      .expect(400);
    expect(res.body.error?.code).toBe("VALIDATION");
    expect(res.body.error?.message).toMatch(/before endTime|startTime/i);
  });

  it("4.2 startTime equals endTime returns 400 VALIDATION", async () => {
    const t = "2026-06-01T10:00:00.000Z";
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ startTime: t, endTime: t })
      .expect(400);
    expect(res.body.error?.code).toBe("VALIDATION");
  });

  it("4.3 Missing fields returns 400 VALIDATION", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ startTime: "2026-06-01T10:00:00.000Z" })
      .expect(400);
    expect(res.body.error?.code).toBe("VALIDATION");
  });

  it("4.4 Non-ISO date format returns 400 VALIDATION", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        startTime: "not-a-date",
        endTime: "2026-06-01T11:00:00.000Z",
      })
      .expect(400);
    expect(res.body.error?.code).toBe("VALIDATION");
  });
});

describe("5. Overlap Detection", () => {
  beforeEach(async () => {
    await resetAndSeed();
  });

  const base = "2026-06-15";
  const authToken = () => getAuthToken(SEED.userId, "user");

  it("5.1 Identical range returns 409 OVERLAP", async () => {
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T10:00:00.000Z`,
        endTime: `${base}T11:00:00.000Z`,
      })
      .expect(201);
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T10:00:00.000Z`,
        endTime: `${base}T11:00:00.000Z`,
      })
      .expect(409);
    expect(res.body.error?.code).toBe("OVERLAP");
  });

  it("5.2 Partial overlap (start inside) returns 409 OVERLAP", async () => {
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T10:00:00.000Z`,
        endTime: `${base}T11:00:00.000Z`,
      })
      .expect(201);
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T10:30:00.000Z`,
        endTime: `${base}T11:30:00.000Z`,
      })
      .expect(409);
    expect(res.body.error?.code).toBe("OVERLAP");
  });

  it("5.3 Partial overlap (end inside) returns 409 OVERLAP", async () => {
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T10:00:00.000Z`,
        endTime: `${base}T11:00:00.000Z`,
      })
      .expect(201);
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T09:30:00.000Z`,
        endTime: `${base}T10:30:00.000Z`,
      })
      .expect(409);
    expect(res.body.error?.code).toBe("OVERLAP");
  });

  it("5.4 New fully inside existing returns 409 OVERLAP", async () => {
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T10:00:00.000Z`,
        endTime: `${base}T12:00:00.000Z`,
      })
      .expect(201);
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T10:30:00.000Z`,
        endTime: `${base}T11:30:00.000Z`,
      })
      .expect(409);
    expect(res.body.error?.code).toBe("OVERLAP");
  });

  it("5.5 Existing fully inside new returns 409 OVERLAP", async () => {
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T10:30:00.000Z`,
        endTime: `${base}T11:30:00.000Z`,
      })
      .expect(201);
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T10:00:00.000Z`,
        endTime: `${base}T12:00:00.000Z`,
      })
      .expect(409);
    expect(res.body.error?.code).toBe("OVERLAP");
  });

  it("5.6 Back-to-back (end = start) returns 201", async () => {
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T10:00:00.000Z`,
        endTime: `${base}T11:00:00.000Z`,
      })
      .expect(201);
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T11:00:00.000Z`,
        endTime: `${base}T12:00:00.000Z`,
      })
      .expect(201);
  });

  it("5.7 Back-to-back (start = end) returns 201", async () => {
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T11:00:00.000Z`,
        endTime: `${base}T12:00:00.000Z`,
      })
      .expect(201);
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T10:00:00.000Z`,
        endTime: `${base}T11:00:00.000Z`,
      })
      .expect(201);
  });

  it("5.8 No overlap returns 201", async () => {
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T10:00:00.000Z`,
        endTime: `${base}T11:00:00.000Z`,
      })
      .expect(201);
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${authToken()}`)
      .send({
        startTime: `${base}T13:00:00.000Z`,
        endTime: `${base}T14:00:00.000Z`,
      })
      .expect(201);
  });
});

describe("6. Cascade Deletion", () => {
  it("6.1 Delete user with bookings returns 204 and user bookings are deleted", async () => {
    await resetAndSeed();
    const token = getAuthToken(SEED.adminId, "admin");
    const listBefore = await request(app)
      .get("/api/bookings")
      .set("Authorization", `Bearer ${token}`);
    const charlieBookings = listBefore.body.filter(
      (b: { userId: string }) => b.userId === SEED.userId,
    );
    expect(charlieBookings.length).toBeGreaterThanOrEqual(1);

    await request(app)
      .delete(`/api/users/${SEED.userId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    const listAfter = await request(app)
      .get("/api/bookings")
      .set("Authorization", `Bearer ${token}`);
    const charlieBookingsAfter = listAfter.body.filter(
      (b: { userId: string }) => b.userId === SEED.userId,
    );
    expect(charlieBookingsAfter.length).toBe(0);
  });

  it("6.2 Other users' bookings unaffected", async () => {
    await resetAndSeed();
    const token = getAuthToken(SEED.adminId, "admin");
    const listBefore = await request(app)
      .get("/api/bookings")
      .set("Authorization", `Bearer ${token}`);
    const countBefore = listBefore.body.length;

    await request(app)
      .delete(`/api/users/${SEED.userId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    const listAfter = await request(app)
      .get("/api/bookings")
      .set("Authorization", `Bearer ${token}`);
    expect(listAfter.body.length).toBe(countBefore - 1);
  });
});

describe("7. Summary/Aggregation (permissions)", () => {
  beforeEach(async () => {
    await resetAndSeed();
  });

  it("7.1 Owner views summary returns 200 with totalBookings", async () => {
    const token = getAuthToken(SEED.ownerId, "owner");
    const res = await request(app)
      .get("/api/bookings/summary")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("totalBookings");
      expect(res.body[0]).toHaveProperty("userId");
    }
  });

  it("7.2 Admin views summary returns 200", async () => {
    const token = getAuthToken(SEED.adminId, "admin");
    await request(app)
      .get("/api/bookings/summary")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });

  it("7.3 User views summary returns 403 FORBIDDEN", async () => {
    const token = getAuthToken(SEED.userId, "user");
    const res = await request(app)
      .get("/api/bookings/summary")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
    expect(res.body.error?.code).toBe("FORBIDDEN");
  });

  it("7.4 Owner views grouped bookings returns 200", async () => {
    const token = getAuthToken(SEED.ownerId, "owner");
    const res = await request(app)
      .get("/api/bookings?groupBy=user")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("userId");
      expect(res.body[0]).toHaveProperty("bookings");
      expect(res.body[0]).toHaveProperty("user");
    }
  });

  it("7.5 User views grouped bookings returns 403 FORBIDDEN", async () => {
    const token = getAuthToken(SEED.userId, "user");
    const res = await request(app)
      .get("/api/bookings?groupBy=user")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
    expect(res.body.error?.code).toBe("FORBIDDEN");
  });
});
