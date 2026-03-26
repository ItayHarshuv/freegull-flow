import { withTx } from "./db.js";

export class StateVersionConflictError extends Error {
  constructor(message = "State version conflict") {
    super(message);
    this.name = "StateVersionConflictError";
  }
}

export class StateValidationError extends Error {
  constructor(message, path) {
    super(message);
    this.name = "StateValidationError";
    this.path = path;
  }
}

const DEFAULT_STATE = {
  currentUser: null,
  isEditorMode: false,
  isTourActive: false,
  users: [],
  shifts: [],
  lessons: [],
  confirmedShifts: [],
  rentals: [],
  events: [],
  tasks: [],
  leads: [],
  availability: [],
  rentalStatus: [],
  availableRentalItems: [],
  whatsappTemplates: [],
  knowledgeFiles: [],
  activeShifts: {},
  syncStatus: "synced",
  lastSyncTime: "",
};

const TABLES_TO_CLEAR = [
  "user_certifications uc USING users u",
  "shift_bonuses sb USING shifts s",
  "task_assignees ta USING tasks t",
  "event_boats eb USING sea_events e",
  "event_participants ep USING sea_events e",
  "active_shifts",
  "confirmed_shifts",
  "lessons",
  "rentals",
  "tasks",
  "leads",
  "availability",
  "sea_events",
  "whatsapp_templates",
  "knowledge_files",
  "club_rental_items",
  "club_rental_statuses",
  "shifts",
  "users",
];

const PHONE_REGEX = /^(?:\+\d+|0\d+)$/;

function toDateString(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return new Date(value).toISOString().slice(0, 10);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizePhone(value) {
  const normalized = normalizeString(value);
  if (!normalized) return "";

  const digitsOnly = normalized.replace(/\D/g, "");
  return normalized.startsWith("+") ? `+${digitsOnly}` : digitsOnly;
}

function validatePhone(value, path, { required = false } = {}) {
  const normalized = normalizePhone(value);
  if (!normalized) {
    if (required) {
      throw new StateValidationError(`${path} is required`, path);
    }
    return null;
  }

  if (!PHONE_REGEX.test(normalized)) {
    throw new StateValidationError(
      `${path} must start with "+" or "0" and contain digits only`,
      path
    );
  }

  return normalized;
}

function requireUserId(value, userIds, path) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new StateValidationError(`${path} is required`, path);
  }
  if (!userIds.has(normalized)) {
    throw new StateValidationError(`${path} must reference an existing user id`, path);
  }
  return normalized;
}

function resolveOptionalUserId(value, userIds, path) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  if (!userIds.has(normalized)) {
    throw new StateValidationError(`${path} must reference an existing user id`, path);
  }
  return normalized;
}

function resolveTaskCreatorId(value, userIds, userIdsByName, path) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new StateValidationError(`${path} is required`, path);
  }
  if (userIds.has(normalized)) {
    return normalized;
  }

  const matchingIds = userIdsByName.get(normalized) || [];
  if (matchingIds.length === 1) {
    return matchingIds[0];
  }

  throw new StateValidationError(`${path} must reference an existing user id`, path);
}

async function clearClubData(client, clubId) {
  await client.query("DELETE FROM active_shifts WHERE club_id = $1", [clubId]);
  await client.query("DELETE FROM confirmed_shifts WHERE club_id = $1", [clubId]);
  await client.query("DELETE FROM lessons WHERE club_id = $1", [clubId]);
  await client.query("DELETE FROM rentals WHERE club_id = $1", [clubId]);
  await client.query("DELETE FROM tasks WHERE club_id = $1", [clubId]);
  await client.query("DELETE FROM leads WHERE club_id = $1", [clubId]);
  await client.query("DELETE FROM availability WHERE club_id = $1", [clubId]);
  await client.query("DELETE FROM sea_events WHERE club_id = $1", [clubId]);
  await client.query("DELETE FROM whatsapp_templates WHERE club_id = $1", [clubId]);
  await client.query("DELETE FROM knowledge_files WHERE club_id = $1", [clubId]);
  await client.query("DELETE FROM club_rental_items WHERE club_id = $1", [clubId]);
  await client.query("DELETE FROM club_rental_statuses WHERE club_id = $1", [clubId]);
  await client.query("DELETE FROM shifts WHERE club_id = $1", [clubId]);
  await client.query("DELETE FROM users WHERE club_id = $1", [clubId]);
}

async function ensureClub(client, clubId, settings = {}) {
  await client.query(
    `
      INSERT INTO clubs (
        id, landline, mobile, location_text, maps_url, bank_account_name,
        bank_name, bank_branch, bank_account_number
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO UPDATE SET
        landline = EXCLUDED.landline,
        mobile = EXCLUDED.mobile,
        location_text = EXCLUDED.location_text,
        maps_url = EXCLUDED.maps_url,
        bank_account_name = EXCLUDED.bank_account_name,
        bank_name = EXCLUDED.bank_name,
        bank_branch = EXCLUDED.bank_branch,
        bank_account_number = EXCLUDED.bank_account_number,
        updated_at = NOW()
    `,
    [
      clubId,
      settings.landline || "",
      settings.mobile || "",
      settings.locationText || "",
      settings.mapsUrl || "",
      settings.bankAccountName || "",
      settings.bankName || "",
      settings.bankBranch || "",
      settings.bankAccountNumber || "",
    ]
  );
}

async function readStateTx(client, clubId) {
  const [clubRowRes, usersRes, certsRes, shiftsRes, bonusesRes, activeShiftsRes] = await Promise.all([
    client.query("SELECT * FROM clubs WHERE id = $1 LIMIT 1", [clubId]),
    client.query("SELECT * FROM users WHERE club_id = $1", [clubId]),
    client.query(
      `
        SELECT uc.* FROM user_certifications uc
        INNER JOIN users u ON u.id = uc.user_id
        WHERE u.club_id = $1
      `,
      [clubId]
    ),
    client.query("SELECT * FROM shifts WHERE club_id = $1", [clubId]),
    client.query(
      `
        SELECT sb.* FROM shift_bonuses sb
        INNER JOIN shifts s ON s.id = sb.shift_id
        WHERE s.club_id = $1
      `,
      [clubId]
    ),
    client.query("SELECT * FROM active_shifts WHERE club_id = $1", [clubId]),
  ]);

  const [
    confirmedShiftsRes,
    lessonsRes,
    rentalsRes,
    tasksRes,
    taskAssigneesRes,
    leadsRes,
    availabilityRes,
    eventsRes,
    boatsRes,
    participantsRes,
    templatesRes,
    filesRes,
    itemsRes,
    statusesRes,
  ] = await Promise.all([
    client.query("SELECT * FROM confirmed_shifts WHERE club_id = $1", [clubId]),
    client.query("SELECT * FROM lessons WHERE club_id = $1", [clubId]),
    client.query("SELECT * FROM rentals WHERE club_id = $1", [clubId]),
    client.query("SELECT * FROM tasks WHERE club_id = $1", [clubId]),
    client.query(
      `
        SELECT ta.* FROM task_assignees ta
        INNER JOIN tasks t ON t.id = ta.task_id
        WHERE t.club_id = $1
      `,
      [clubId]
    ),
    client.query("SELECT * FROM leads WHERE club_id = $1", [clubId]),
    client.query("SELECT * FROM availability WHERE club_id = $1", [clubId]),
    client.query("SELECT * FROM sea_events WHERE club_id = $1", [clubId]),
    client.query(
      `
        SELECT eb.* FROM event_boats eb
        INNER JOIN sea_events e ON e.id = eb.event_id
        WHERE e.club_id = $1
      `,
      [clubId]
    ),
    client.query(
      `
        SELECT ep.* FROM event_participants ep
        INNER JOIN sea_events e ON e.id = ep.event_id
        WHERE e.club_id = $1
      `,
      [clubId]
    ),
    client.query("SELECT * FROM whatsapp_templates WHERE club_id = $1", [clubId]),
    client.query("SELECT * FROM knowledge_files WHERE club_id = $1", [clubId]),
    client.query("SELECT * FROM club_rental_items WHERE club_id = $1", [clubId]),
    client.query("SELECT * FROM club_rental_statuses WHERE club_id = $1", [clubId]),
  ]);

  const certsByUser = new Map();
  for (const cert of certsRes.rows) {
    const current = certsByUser.get(cert.user_id) || [];
    current.push(cert.certification);
    certsByUser.set(cert.user_id, current);
  }

  const bonusesByShift = new Map();
  for (const bonus of bonusesRes.rows) {
    const current = bonusesByShift.get(bonus.shift_id) || [];
    current.push({
      id: bonus.id,
      clientName: bonus.client_name,
      item: bonus.item,
      amount: Number(bonus.amount),
    });
    bonusesByShift.set(bonus.shift_id, current);
  }

  const assignedByTask = new Map();
  for (const row of taskAssigneesRes.rows) {
    const current = assignedByTask.get(row.task_id) || [];
    current.push(row.user_id);
    assignedByTask.set(row.task_id, current);
  }

  const boatsByEvent = new Map();
  for (const row of boatsRes.rows) {
    const current = boatsByEvent.get(row.event_id) || [];
    current.push({
      id: row.id,
      operatorId: row.operator_id,
      assistantId: row.assistant_id ?? "",
    });
    boatsByEvent.set(row.event_id, current);
  }

  const participantsByEvent = new Map();
  for (const row of participantsRes.rows) {
    const current = participantsByEvent.get(row.event_id) || [];
    current.push({
      id: row.id,
      name: row.name,
      phone: row.phone,
      equipment: row.equipment,
      status: row.status,
      hasArrived: row.has_arrived,
      rescues: row.rescues,
      notes: row.notes ?? undefined,
    });
    participantsByEvent.set(row.event_id, current);
  }

  const activeShifts = {};
  for (const row of activeShiftsRes.rows) {
    activeShifts[row.user_id] = row.payload || {};
  }

  const club = clubRowRes.rows[0];
  const version = Number(club?.state_version ?? 0);

  return {
    state: {
      clubId,
      ...DEFAULT_STATE,
      clubSettings: {
        landline: club?.landline || "",
        mobile: club?.mobile || "",
        locationText: club?.location_text || "",
        mapsUrl: club?.maps_url || "",
        bankAccountName: club?.bank_account_name || "",
        bankName: club?.bank_name || "",
        bankBranch: club?.bank_branch || "",
        bankAccountNumber: club?.bank_account_number || "",
      },
      users: usersRes.rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        avatar: u.avatar || "",
        certifications: certsByUser.get(u.id) || [],
        isArchived: u.is_archived,
        isFullTime: u.is_full_time,
        fixedDayOff: u.fixed_day_off,
        canAddBonuses: u.can_add_bonuses,
        bankName: u.bank_name ?? undefined,
        bankBranch: u.bank_branch ?? undefined,
        accountNumber: u.account_number ?? undefined,
        hasForm101: u.has_form_101 ?? undefined,
        form101Data: u.form_101_data ?? undefined,
        form101FileName: u.form_101_file_name ?? undefined,
        quickCode: u.quick_code ?? undefined,
      })),
      shifts: shiftsRes.rows.map((s) => ({
        id: s.id,
        userId: s.user_id,
        userName: s.user_name,
        date: s.shift_date.toISOString().slice(0, 10),
        startTime: s.start_time,
        endTime: s.end_time,
        teachingHours: Number(s.teaching_hours),
        bonuses: bonusesByShift.get(s.id) || [],
        notes: s.notes,
        isClosed: s.is_closed,
        hasTravel: s.has_travel,
        breakMinutes: Number(s.break_minutes ?? 0),
      })),
      activeShifts,
      confirmedShifts: confirmedShiftsRes.rows.map((s) => ({
        id: s.id,
        userId: s.user_id,
        userName: s.user_name,
        date: s.shift_date.toISOString().slice(0, 10),
        startTime: s.start_time,
        endTime: s.end_time,
      })),
      lessons: lessonsRes.rows.map((l) => ({
        id: l.id,
        clientName: l.client_name,
        phone: l.phone,
        type: l.lesson_type,
        pathType: l.path_type,
        lessonNumber: l.lesson_number,
        date: l.lesson_date.toISOString().slice(0, 10),
        time: l.start_time,
        endTime: l.end_time ?? undefined,
        instructorId: l.instructor_id ?? undefined,
        voucherNumber: l.voucher_number ?? undefined,
        hasVoucher: l.has_voucher ?? undefined,
        isRegistered: l.is_registered ?? undefined,
        isPaid: l.is_paid ?? undefined,
        isCancelled: l.is_cancelled ?? undefined,
        isArchived: l.is_archived ?? undefined,
      })),
      rentals: rentalsRes.rows.map((r) => ({
        id: r.id,
        date: r.rental_date.toISOString().slice(0, 10),
        clientName: r.client_name,
        item: r.item,
        quantity: r.quantity,
        durationMinutes: r.duration_minutes,
        overdueMinutes: r.overdue_minutes ?? undefined,
        paymentType: r.payment_type,
        startTime: r.start_time,
        isReturned: r.is_returned,
        extraPaid: r.extra_paid ?? null,
        isArchived: r.is_archived ?? undefined,
      })),
      tasks: tasksRes.rows.map((t) => ({
        id: t.id,
        title: t.title,
        type: t.task_type,
        clientName: t.client_name ?? undefined,
        clientPhone: t.client_phone ?? undefined,
        assignedTo: assignedByTask.get(t.id) || [],
        priority: t.priority,
        status: t.status,
        createdBy: t.created_by,
        createdAt: t.created_at.toISOString(),
      })),
      leads: leadsRes.rows.map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        email: l.email ?? undefined,
        source: l.source,
        status: l.status,
        notes: l.notes,
        createdAt: l.created_at.toISOString(),
      })),
      availability: availabilityRes.rows.map((a) => ({
        id: a.id,
        userId: a.user_id,
        userName: a.user_name,
        date: a.available_date.toISOString().slice(0, 10),
        isAvailable: a.is_available,
        isAllDay: a.is_all_day,
        startTime: a.start_time ?? undefined,
        endTime: a.end_time ?? undefined,
        notes: a.notes ?? undefined,
      })),
      events: eventsRes.rows.map((e) => ({
        id: e.id,
        name: e.name,
        date: e.event_date.toISOString().slice(0, 10),
        boats: boatsByEvent.get(e.id) || [],
        participants: participantsByEvent.get(e.id) || [],
        googleFormLink: e.google_form_link ?? undefined,
        isArchived: e.is_archived,
      })),
      whatsappTemplates: templatesRes.rows.map((t) => ({
        id: t.id,
        title: t.title,
        text: t.text,
      })),
      knowledgeFiles: filesRes.rows.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.file_type,
      })),
      availableRentalItems: itemsRes.rows.map((i) => i.item),
      rentalStatus: statusesRes.rows.map((s) => s.status),
      lastSyncTime: new Date().toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      syncStatus: "synced",
    },
    version,
  };
}

export async function writeState(clubId, state, expectedVersion) {
  return withTx(async (client) => {
    await ensureClub(client, clubId, state.clubSettings);

    const currentClubRes = await client.query(
      "SELECT state_version FROM clubs WHERE id = $1 LIMIT 1",
      [clubId]
    );
    const currentVersion = Number(currentClubRes.rows[0]?.state_version ?? 0);
    if (typeof expectedVersion === "number" && expectedVersion !== currentVersion) {
      throw new StateVersionConflictError();
    }

    const nextVersion = currentVersion + 1;
    const versionUpdate = await client.query(
      `
        UPDATE clubs
        SET state_version = $1, updated_at = NOW()
        WHERE id = $2 AND state_version = $3
      `,
      [nextVersion, clubId, currentVersion]
    );
    if (versionUpdate.rowCount === 0) {
      throw new StateVersionConflictError();
    }

    const incomingUsers = Array.isArray(state.users) ? state.users : [];
    const userIds = new Set();
    const userIdsByName = new Map();
    for (const [index, user] of incomingUsers.entries()) {
      const userId = normalizeOptionalString(user?.id);
      if (!userId) {
        throw new StateValidationError(`users[${index}].id is required`, `users[${index}].id`);
      }
      userIds.add(userId);

      const userName = normalizeOptionalString(user?.name);
      if (userName) {
        const existingIds = userIdsByName.get(userName) || [];
        existingIds.push(userId);
        userIdsByName.set(userName, existingIds);
      }
    }
    const existingUsersCountRes = await client.query(
      "SELECT COUNT(*)::int AS count FROM users WHERE club_id = $1",
      [clubId]
    );
    const existingUsersCount = Number(existingUsersCountRes.rows[0]?.count ?? 0);
    if (existingUsersCount > 0 && incomingUsers.length === 0) {
      throw new Error(
        "Refusing to overwrite existing club data with an empty users payload"
      );
    }

    await clearClubData(client, clubId);

    for (const [index, user] of incomingUsers.entries()) {
      await client.query(
        `
          INSERT INTO users (
            id, club_id, name, email, phone, role, avatar, is_archived, is_full_time,
            fixed_day_off, can_add_bonuses, bank_name, bank_branch, account_number,
            has_form_101, form_101_data, form_101_file_name, quick_code
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        `,
        [
          user.id,
          clubId,
          user.name,
          user.email,
          validatePhone(user.phone, `users[${index}].phone`) ?? "",
          user.role,
          user.avatar || "",
          !!user.isArchived,
          user.isFullTime ?? null,
          user.fixedDayOff ?? null,
          user.canAddBonuses ?? null,
          user.bankName ?? null,
          user.bankBranch ?? null,
          user.accountNumber ?? null,
          user.hasForm101 ?? null,
          user.form101Data ?? null,
          user.form101FileName ?? null,
          user.quickCode ?? null,
        ]
      );

      for (const cert of user.certifications || []) {
        await client.query(
          "INSERT INTO user_certifications (user_id, certification) VALUES ($1, $2)",
          [user.id, cert]
        );
      }
    }

    for (const shift of state.shifts || []) {
      await client.query(
        `
          INSERT INTO shifts (
            id, club_id, user_id, user_name, shift_date, start_time, end_time,
            teaching_hours, notes, is_closed, has_travel, break_minutes
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        `,
        [
          shift.id,
          clubId,
          shift.userId,
          shift.userName,
          toDateString(shift.date),
          shift.startTime,
          shift.endTime,
          shift.teachingHours ?? 0,
          shift.notes ?? "",
          !!shift.isClosed,
          !!shift.hasTravel,
          shift.breakMinutes ?? 0,
        ]
      );

      for (const bonus of shift.bonuses || []) {
        await client.query(
          `
            INSERT INTO shift_bonuses (id, shift_id, client_name, item, amount)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [bonus.id, shift.id, bonus.clientName, bonus.item, bonus.amount ?? 0]
        );
      }
    }

    for (const [userId, payload] of Object.entries(state.activeShifts || {})) {
      await client.query(
        `
          INSERT INTO active_shifts (user_id, club_id, payload, updated_at)
          VALUES ($1, $2, $3::jsonb, NOW())
        `,
        [userId, clubId, JSON.stringify(payload || {})]
      );
    }

    for (const cShift of state.confirmedShifts || []) {
      await client.query(
        `
          INSERT INTO confirmed_shifts (
            id, club_id, user_id, user_name, shift_date, start_time, end_time
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          cShift.id,
          clubId,
          cShift.userId,
          cShift.userName,
          toDateString(cShift.date),
          cShift.startTime,
          cShift.endTime,
        ]
      );
    }

    const lessons = Array.isArray(state.lessons) ? state.lessons : [];
    for (const [index, lesson] of lessons.entries()) {
      const instructorId = resolveOptionalUserId(
        lesson.instructorId,
        userIds,
        `lessons[${index}].instructorId`
      );
      await client.query(
        `
          INSERT INTO lessons (
            id, club_id, client_name, phone, lesson_type, path_type, lesson_number,
            lesson_date, start_time, end_time, instructor_id, voucher_number, has_voucher,
            is_registered, is_paid, is_cancelled, is_archived
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
          )
        `,
        [
          lesson.id,
          clubId,
          lesson.clientName,
          validatePhone(lesson.phone, `lessons[${index}].phone`, { required: true }),
          lesson.type,
          lesson.pathType,
          lesson.lessonNumber,
          toDateString(lesson.date),
          lesson.time,
          lesson.endTime ?? null,
          instructorId,
          lesson.voucherNumber ?? null,
          lesson.hasVoucher ?? null,
          lesson.isRegistered ?? null,
          lesson.isPaid ?? null,
          lesson.isCancelled ?? null,
          lesson.isArchived ?? null,
        ]
      );
    }

    for (const rental of state.rentals || []) {
      await client.query(
        `
          INSERT INTO rentals (
            id, club_id, rental_date, client_name, item, quantity, duration_minutes,
            overdue_minutes, payment_type, start_time, is_returned, extra_paid, is_archived
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        `,
        [
          rental.id,
          clubId,
          toDateString(rental.date),
          rental.clientName,
          rental.item,
          rental.quantity,
          rental.durationMinutes,
          rental.overdueMinutes ?? null,
          rental.paymentType,
          rental.startTime,
          !!rental.isReturned,
          rental.extraPaid ?? null,
          rental.isArchived ?? null,
        ]
      );
    }

    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    for (const [index, task] of tasks.entries()) {
      const createdBy = resolveTaskCreatorId(
        task.createdBy,
        userIds,
        userIdsByName,
        `tasks[${index}].createdBy`
      );
      await client.query(
        `
          INSERT INTO tasks (
            id, club_id, title, task_type, client_name, client_phone, priority, status, created_by, created_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
        [
          task.id,
          clubId,
          task.title,
          task.type,
          normalizeOptionalString(task.clientName),
          validatePhone(task.clientPhone, `tasks[${index}].clientPhone`),
          task.priority,
          task.status,
          createdBy,
          task.createdAt || new Date().toISOString(),
        ]
      );

      for (const [assigneeIndex, userId] of (task.assignedTo || []).entries()) {
        await client.query(
          "INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)",
          [
            task.id,
            requireUserId(
              userId,
              userIds,
              `tasks[${index}].assignedTo[${assigneeIndex}]`
            ),
          ]
        );
      }
    }

    const leads = Array.isArray(state.leads) ? state.leads : [];
    for (const [index, lead] of leads.entries()) {
      await client.query(
        `
          INSERT INTO leads (id, club_id, name, phone, email, source, status, notes, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          lead.id,
          clubId,
          lead.name,
          validatePhone(lead.phone, `leads[${index}].phone`, { required: true }),
          lead.email ?? null,
          lead.source,
          lead.status,
          lead.notes ?? "",
          lead.createdAt || new Date().toISOString(),
        ]
      );
    }

    for (const a of state.availability || []) {
      await client.query(
        `
          INSERT INTO availability (
            id, club_id, user_id, user_name, available_date, is_available, is_all_day, start_time, end_time, notes
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
        [
          a.id,
          clubId,
          a.userId,
          a.userName,
          toDateString(a.date),
          !!a.isAvailable,
          !!a.isAllDay,
          a.startTime ?? null,
          a.endTime ?? null,
          a.notes ?? null,
        ]
      );
    }

    const events = Array.isArray(state.events) ? state.events : [];
    for (const [eventIndex, event] of events.entries()) {
      await client.query(
        `
          INSERT INTO sea_events (id, club_id, name, event_date, google_form_link, is_archived)
          VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          event.id,
          clubId,
          event.name,
          toDateString(event.date),
          event.googleFormLink ?? null,
          !!event.isArchived,
        ]
      );

      for (const [boatIndex, boat] of (event.boats || []).entries()) {
        await client.query(
          `
            INSERT INTO event_boats (id, event_id, operator_id, assistant_id)
            VALUES ($1,$2,$3,$4)
          `,
          [
            boat.id,
            event.id,
            requireUserId(
              boat.operatorId,
              userIds,
              `events[${eventIndex}].boats[${boatIndex}].operatorId`
            ),
            resolveOptionalUserId(
              boat.assistantId,
              userIds,
              `events[${eventIndex}].boats[${boatIndex}].assistantId`
            ),
          ]
        );
      }

      for (const [participantIndex, p] of (event.participants || []).entries()) {
        await client.query(
          `
            INSERT INTO event_participants (
              id, event_id, name, phone, equipment, status, has_arrived, rescues, notes
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          `,
          [
            p.id,
            event.id,
            p.name,
            validatePhone(
              p.phone,
              `events[${eventIndex}].participants[${participantIndex}].phone`
            ) ?? "",
            p.equipment,
            p.status,
            !!p.hasArrived,
            p.rescues ?? 0,
            p.notes ?? null,
          ]
        );
      }
    }

    for (const template of state.whatsappTemplates || []) {
      await client.query(
        `
          INSERT INTO whatsapp_templates (id, club_id, title, text)
          VALUES ($1,$2,$3,$4)
        `,
        [template.id, clubId, template.title, template.text]
      );
    }

    for (const file of state.knowledgeFiles || []) {
      await client.query(
        `
          INSERT INTO knowledge_files (id, club_id, name, size, file_type)
          VALUES ($1,$2,$3,$4,$5)
        `,
        [file.id, clubId, file.name, file.size, file.type]
      );
    }

    for (const item of state.availableRentalItems || []) {
      await client.query(
        "INSERT INTO club_rental_items (club_id, item) VALUES ($1, $2)",
        [clubId, item]
      );
    }

    for (const status of state.rentalStatus || []) {
      await client.query(
        "INSERT INTO club_rental_statuses (club_id, status) VALUES ($1, $2)",
        [clubId, status]
      );
    }

    return { version: nextVersion };
  });
}

export async function readState(clubId) {
  const { state } = await readStateWithVersion(clubId);
  return state;
}

export async function readStateWithVersion(clubId) {
  return withTx(async (client) => readStateTx(client, clubId));
}

export async function readStateVersion(clubId) {
  return withTx(async (client) => {
    const res = await client.query(
      "SELECT state_version FROM clubs WHERE id = $1 LIMIT 1",
      [clubId]
    );
    return Number(res.rows[0]?.state_version ?? 0);
  });
}
