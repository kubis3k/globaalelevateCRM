// AUTO-GENERATED from the live Neon schema. Do not hand-edit column definitions;
// regenerate via scripts/gen-drizzle-schema if the DB schema changes.
import { pgTable, pgEnum, uuid, text, boolean, integer, bigint, numeric, timestamp, date, time, jsonb, doublePrecision, real, varchar } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const appRoleEnum = pgEnum("app_role", ["admin", "manager", "employee", "external"])
export const bcPartyTypeEnum = pgEnum("bc_party_type", ["artist", "rental", "supplier", "client", "other"])
export const bcStatusEnum = pgEnum("bc_status", ["draft", "active", "expired", "terminated"])
export const catalogKindEnum = pgEnum("catalog_kind", ["product", "service"])
export const crmActivityTypeEnum = pgEnum("crm_activity_type", ["note", "call", "meeting", "email", "task"])
export const crmClientStatusEnum = pgEnum("crm_client_status", ["active", "inactive", "lead"])
export const crmDealStageEnum = pgEnum("crm_deal_stage", ["lead", "qualified", "proposal", "negotiation", "won", "lost"])
export const eventStatusEnum = pgEnum("event_status", ["planning", "confirmed", "done", "cancelled"])
export const expenseStatusEnum = pgEnum("expense_status", ["pending", "approved", "rejected"])
export const guestTypeEnum = pgEnum("guest_type", ["guest", "press", "artist", "staff", "promoter"])
export const hrAssignmentStatusEnum = pgEnum("hr_assignment_status", ["assigned", "confirmed", "declined", "decline_requested"])
export const hrCandidateStageEnum = pgEnum("hr_candidate_stage", ["applied", "screening", "interview", "offer", "hired", "rejected"])
export const hrChecklistKindEnum = pgEnum("hr_checklist_kind", ["onboarding", "offboarding"])
export const hrContractStatusEnum = pgEnum("hr_contract_status", ["draft", "active", "ended"])
export const hrContractTypeEnum = pgEnum("hr_contract_type", ["hpp", "dpp", "dpc", "ico", "other"])
export const hrDocCategoryEnum = pgEnum("hr_doc_category", ["contract", "payslip", "id", "other"])
export const hrEmployeeStatusEnum = pgEnum("hr_employee_status", ["active", "terminated"])
export const hrEmploymentTypeEnum = pgEnum("hr_employment_type", ["full_time", "part_time", "contract", "intern", "dpp", "dpc"])
export const hrJobStatusEnum = pgEnum("hr_job_status", ["open", "closed"])
export const hrLeaveStatusEnum = pgEnum("hr_leave_status", ["pending", "approved", "rejected"])
export const hrLeaveTypeEnum = pgEnum("hr_leave_type", ["vacation", "sick", "personal", "unpaid"])
export const hrReviewTypeEnum = pgEnum("hr_review_type", ["review", "one_on_one"])
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "pending", "paid", "overdue", "cancelled"])
export const invoiceTypeEnum = pgEnum("invoice_type", ["issued", "received"])
export const meetingStatusEnum = pgEnum("meeting_status", ["scheduled", "done", "cancelled"])
export const poStatusEnum = pgEnum("po_status", ["draft", "sent", "confirmed", "delivered", "cancelled"])
export const projectPriorityEnum = pgEnum("project_priority", ["low", "medium", "high"])
export const projectStatusEnum = pgEnum("project_status", ["planning", "active", "on_hold", "completed", "cancelled"])
export const projectTaskStatusEnum = pgEnum("project_task_status", ["todo", "in_progress", "done"])
export const quoteStatusEnum = pgEnum("quote_status", ["draft", "sent", "accepted", "rejected"])
export const reservationStatusEnum = pgEnum("reservation_status", ["pending", "confirmed", "seated", "cancelled", "no_show"])
export const socialPlatformEnum = pgEnum("social_platform", ["instagram", "facebook", "tiktok", "youtube", "x", "linkedin", "threads", "other"])
export const socialPostStatusEnum = pgEnum("social_post_status", ["draft", "scheduled", "published", "failed"])
export const sopCategoryEnum = pgEnum("sop_category", ["open", "close", "emergency", "bar", "other"])
export const supplierCategoryEnum = pgEnum("supplier_category", ["artist", "security", "rental", "drinks", "other"])
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"])
export const vipBoxEnum = pgEnum("vip_box", ["diamond", "gold", "silver", "other"])

// Better-Auth core tables — camelCase keys matching its own field-name
// conventions (unlike every other table in this file, which uses snake_case
// keys 1:1 with SQL columns for the src/lib/supabase/* PostgREST-compat shim).
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  owner_id: uuid("owner_id"),
  title: text("title"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversation_id: uuid("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull().default(""),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id"),
  action: text("action").notNull(),
  entity: text("entity"),
  entity_id: text("entity_id"),
  summary: text("summary"),
  meta: jsonb("meta").notNull().default({}),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const businessContracts = pgTable("business_contracts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  title: text("title").notNull(),
  party_type: bcPartyTypeEnum("party_type").notNull().default("other"),
  counterparty: text("counterparty"),
  supplier_id: uuid("supplier_id"),
  client_id: uuid("client_id"),
  event_id: uuid("event_id"),
  type: text("type"),
  status: bcStatusEnum("status").notNull().default("active"),
  start_date: date("start_date"),
  end_date: date("end_date"),
  value: numeric("value", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("CZK"),
  acknowledged_at: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledged_by: uuid("acknowledged_by"),
  note: text("note"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  document_id: uuid("document_id"),
  acknowledged_ip: text("acknowledged_ip"),
})

export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  start_time: timestamp("start_time", { withTimezone: true }).notNull(),
  end_time: timestamp("end_time", { withTimezone: true }).notNull(),
  assigned_to: uuid("assigned_to"),
  assigned_role: appRoleEnum("assigned_role"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  assigned_custom_role_id: uuid("assigned_custom_role_id"),
})

export const catalogItems = pgTable("catalog_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  kind: catalogKindEnum("kind").notNull().default("service"),
  name: text("name").notNull(),
  description: text("description"),
  unit: text("unit").notNull().default("ks"),
  unit_price: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("CZK"),
  vat_rate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("21"),
  active: boolean("active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const companySettings = pgTable("company_settings", {
  tenant_id: uuid("tenant_id").primaryKey(),
  legal_name: text("legal_name"),
  ico: text("ico"),
  dic: text("dic"),
  vat_payer: boolean("vat_payer").notNull().default(true),
  default_vat_rate: numeric("default_vat_rate", { precision: 5, scale: 2 }).notNull().default("21"),
  street: text("street"),
  city: text("city"),
  zip: text("zip"),
  country: text("country").notNull().default("CZ"),
  bank_account: text("bank_account"),
  iban: text("iban"),
  email: text("email"),
  phone: text("phone"),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  jobs_enabled: boolean("jobs_enabled").notNull().default(false),
  careers_intro: text("careers_intro"),
})

export const crmActivities = pgTable("crm_activities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  client_id: uuid("client_id").notNull(),
  type: crmActivityTypeEnum("type").notNull().default("note"),
  subject: text("subject").notNull(),
  content: text("content"),
  due_date: date("due_date"),
  done: boolean("done").notNull().default(false),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  due_reminded_at: date("due_reminded_at"),
  visible_to_client: boolean("visible_to_client").notNull().default(false),
})

export const crmClients = pgTable("crm_clients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  ico: text("ico"),
  dic: text("dic"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  address: text("address"),
  owner_id: uuid("owner_id"),
  status: crmClientStatusEnum("status").notNull().default("active"),
  note: text("note"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const crmContacts = pgTable("crm_contacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  client_id: uuid("client_id").notNull(),
  name: text("name").notNull(),
  position: text("position"),
  email: text("email"),
  phone: text("phone"),
  is_primary: boolean("is_primary").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const crmDeals = pgTable("crm_deals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  client_id: uuid("client_id"),
  title: text("title").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("CZK"),
  stage: crmDealStageEnum("stage").notNull().default("lead"),
  owner_id: uuid("owner_id"),
  expected_close: date("expected_close"),
  note: text("note"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const crmProspectTouches = pgTable("crm_prospect_touches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  prospect_id: uuid("prospect_id").notNull(),
  channel: text("channel").notNull().default("jine"),
  note: text("note"),
  outcome: text("outcome").notNull().default("no_reply"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const crmProspects = pgTable("crm_prospects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  ico: text("ico"),
  dic: text("dic"),
  region: text("region"),
  source: text("source").notNull().default("jine"),
  website: text("website"),
  email: text("email"),
  phone: text("phone"),
  instagram: text("instagram"),
  score: integer("score").notNull().default(0),
  signals: jsonb("signals").notNull().default({}),
  status: text("status").notNull().default("new"),
  owner: uuid("owner"),
  next_touch_at: date("next_touch_at"),
  touch_count: integer("touch_count").notNull().default(0),
  converted_client_id: uuid("converted_client_id"),
  note: text("note"),
  digest_notified_at: date("digest_notified_at"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const customRoles = pgTable("custom_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#6366f1"),
  modules: jsonb("modules").notNull().default([]),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const deliverables = pgTable("deliverables", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  client_id: uuid("client_id").notNull(),
  project_id: uuid("project_id"),
  event_id: uuid("event_id"),
  title: text("title").notNull(),
  description: text("description"),
  document_id: uuid("document_id"),
  external_url: text("external_url"),
  status: text("status").notNull().default("submitted"),
  client_comment: text("client_comment"),
  submitted_by: uuid("submitted_by"),
  submitted_at: timestamp("submitted_at", { withTimezone: true }).defaultNow(),
  decided_by: uuid("decided_by"),
  decided_at: timestamp("decided_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const departmentMessages = pgTable("department_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  department_id: uuid("department_id").notNull(),
  user_id: uuid("user_id").notNull(),
  body: text("body").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const departmentTasks = pgTable("department_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  department_id: uuid("department_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assigned_to: uuid("assigned_to"),
  due_date: date("due_date"),
  priority: text("priority").notNull().default("normal"),
  done: boolean("done").notNull().default(false),
  done_at: timestamp("done_at", { withTimezone: true }),
  done_by: uuid("done_by"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("other"),
  storage_path: text("storage_path").notNull(),
  file_size: bigint("file_size", { mode: 'number' }),
  mime_type: text("mime_type"),
  source: text("source").notNull().default("upload"),
  source_ref: text("source_ref"),
  uploaded_by: uuid("uploaded_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  client_id: uuid("client_id"),
})

export const eventBudgetItems = pgTable("event_budget_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  event_id: uuid("event_id").notNull(),
  category: text("category"),
  item: text("item").notNull(),
  planned: numeric("planned", { precision: 12, scale: 2 }),
  actual: numeric("actual", { precision: 12, scale: 2 }),
  note: text("note"),
  sort: integer("sort").notNull().default(0),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const eventLineup = pgTable("event_lineup", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  event_id: uuid("event_id").notNull(),
  artist: text("artist").notNull(),
  slot_start: time("slot_start"),
  slot_end: time("slot_end"),
  fee: numeric("fee", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("booked"),
  note: text("note"),
  sort: integer("sort").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const eventTimeline = pgTable("event_timeline", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  event_id: uuid("event_id").notNull(),
  at_time: time("at_time"),
  item: text("item").notNull(),
  sort: integer("sort").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const events = pgTable("events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  event_date: date("event_date"),
  doors_time: time("doors_time"),
  start_time: time("start_time"),
  end_time: time("end_time"),
  location: text("location"),
  capacity: integer("capacity"),
  client: text("client"),
  status: eventStatusEnum("status").notNull().default("planning"),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  tech_notes: text("tech_notes"),
  description: text("description"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  client_id: uuid("client_id"),
})

export const expenseClaims = pgTable("expense_claims", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  expense_date: date("expense_date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("CZK"),
  category: text("category"),
  description: text("description"),
  status: expenseStatusEnum("status").notNull().default("pending"),
  reviewed_by: uuid("reviewed_by"),
  reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
  transaction_id: uuid("transaction_id"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const guestList = pgTable("guest_list", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  event_id: uuid("event_id").notNull(),
  name: text("name").notNull(),
  party_size: integer("party_size").notNull().default(1),
  type: guestTypeEnum("type").notNull().default("guest"),
  note: text("note"),
  arrived: boolean("arrived").notNull().default(false),
  arrived_at: timestamp("arrived_at", { withTimezone: true }),
  added_by: uuid("added_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  is_vip: boolean("is_vip").notNull().default(false),
  is_permanent: boolean("is_permanent").notNull().default(false),
})

export const hrAttendance = pgTable("hr_attendance", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  work_date: date("work_date").notNull(),
  clock_in: timestamp("clock_in", { withTimezone: true }),
  clock_out: timestamp("clock_out", { withTimezone: true }),
  note: text("note"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const hrAudit = pgTable("hr_audit", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  actor_id: uuid("actor_id"),
  entity: text("entity").notNull(),
  entity_id: uuid("entity_id"),
  action: text("action").notNull(),
  detail: text("detail"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const hrCandidates = pgTable("hr_candidates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  job_id: uuid("job_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  stage: hrCandidateStageEnum("stage").notNull().default("applied"),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  source: text("source"),
  cover_letter: text("cover_letter"),
  cv_path: text("cv_path"),
})

export const hrChecklistItems = pgTable("hr_checklist_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  checklist_id: uuid("checklist_id").notNull(),
  label: text("label").notNull(),
  sort: integer("sort").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const hrChecklistRunItems = pgTable("hr_checklist_run_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  run_id: uuid("run_id").notNull(),
  label: text("label").notNull(),
  sort: integer("sort").notNull().default(0),
  done: boolean("done").notNull().default(false),
  done_at: timestamp("done_at", { withTimezone: true }),
  done_by: uuid("done_by"),
})

export const hrChecklistRuns = pgTable("hr_checklist_runs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  checklist_id: uuid("checklist_id"),
  name: text("name").notNull(),
  kind: hrChecklistKindEnum("kind").notNull().default("onboarding"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const hrChecklists = pgTable("hr_checklists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  kind: hrChecklistKindEnum("kind").notNull().default("onboarding"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const hrContracts = pgTable("hr_contracts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  type: hrContractTypeEnum("type").notNull().default("hpp"),
  title: text("title"),
  start_date: date("start_date"),
  end_date: date("end_date"),
  weekly_hours: numeric("weekly_hours", { precision: 5, scale: 2 }),
  hourly_rate: numeric("hourly_rate", { precision: 12, scale: 2 }),
  salary: numeric("salary", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("CZK"),
  storage_path: text("storage_path"),
  status: hrContractStatusEnum("status").notNull().default("active"),
  acknowledged_at: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledged_by: uuid("acknowledged_by"),
  expiry_reminded_at: date("expiry_reminded_at"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const hrDepartments = pgTable("hr_departments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const hrDocuments = pgTable("hr_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  name: text("name").notNull(),
  category: hrDocCategoryEnum("category").notNull().default("other"),
  storage_path: text("storage_path").notNull(),
  uploaded_by: uuid("uploaded_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const hrEmployees = pgTable("hr_employees", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  position: text("position"),
  department_id: uuid("department_id"),
  employment_type: hrEmploymentTypeEnum("employment_type").notNull().default("full_time"),
  start_date: date("start_date"),
  end_date: date("end_date"),
  phone: text("phone"),
  personal_email: text("personal_email"),
  address: text("address"),
  manager_id: uuid("manager_id"),
  annual_leave_days: integer("annual_leave_days").notNull().default(20),
  salary: numeric("salary", { precision: 12, scale: 2 }),
  salary_currency: text("salary_currency").notNull().default("CZK"),
  status: hrEmployeeStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  weekly_hours: numeric("weekly_hours", { precision: 5, scale: 2 }),
  hourly_rate: numeric("hourly_rate", { precision: 12, scale: 2 }),
  personal_no: text("personal_no"),
})

export const hrJobPostings = pgTable("hr_job_postings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  title: text("title").notNull(),
  department_id: uuid("department_id"),
  description: text("description"),
  status: hrJobStatusEnum("status").notNull().default("open"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  location: text("location"),
  employment_type: text("employment_type"),
  salary_range: text("salary_range"),
  published: boolean("published").notNull().default(false),
})

export const hrLeaveRequests = pgTable("hr_leave_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  type: hrLeaveTypeEnum("type").notNull().default("vacation"),
  start_date: date("start_date").notNull(),
  end_date: date("end_date").notNull(),
  working_days: numeric("working_days", { precision: 5, scale: 1 }).notNull().default("0"),
  reason: text("reason"),
  status: hrLeaveStatusEnum("status").notNull().default("pending"),
  reviewed_by: uuid("reviewed_by"),
  reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const hrReviews = pgTable("hr_reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  reviewer_id: uuid("reviewer_id"),
  type: hrReviewTypeEnum("type").notNull().default("review"),
  review_date: date("review_date").notNull(),
  rating: integer("rating"),
  strengths: text("strengths"),
  improvements: text("improvements"),
  next_steps: text("next_steps"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const hrShiftAssignments = pgTable("hr_shift_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  shift_id: uuid("shift_id").notNull(),
  user_id: uuid("user_id").notNull(),
  status: hrAssignmentStatusEnum("status").notNull().default("assigned"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  decline_reason: text("decline_reason"),
  worked_status: text("worked_status").notNull().default("none"),
  worked_reported_at: timestamp("worked_reported_at", { withTimezone: true }),
  worked_verified_at: timestamp("worked_verified_at", { withTimezone: true }),
  worked_verified_by: uuid("worked_verified_by"),
  worked_note: text("worked_note"),
})

export const hrShifts = pgTable("hr_shifts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  work_date: date("work_date").notNull(),
  start_time: time("start_time"),
  end_time: time("end_time"),
  role: text("role"),
  location: text("location"),
  project_id: uuid("project_id"),
  required_count: integer("required_count").notNull().default(1),
  note: text("note"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const hrTrainings = pgTable("hr_trainings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  name: text("name").notNull(),
  provider: text("provider"),
  completed_on: date("completed_on"),
  expires_on: date("expires_on"),
  note: text("note"),
  reminded_on: date("reminded_on"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  type: invoiceTypeEnum("type").notNull(),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  invoice_number: text("invoice_number").notNull(),
  client_name: text("client_name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("CZK"),
  issue_date: date("issue_date").notNull(),
  due_date: date("due_date").notNull(),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  client_id: uuid("client_id"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }),
  vat_amount: numeric("vat_amount", { precision: 12, scale: 2 }),
  vat_rate: numeric("vat_rate", { precision: 5, scale: 2 }),
  overdue_notified_at: timestamp("overdue_notified_at", { withTimezone: true }),
})

export const mailAccounts = pgTable("mail_accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  owner_id: uuid("owner_id"),
  created_by: uuid("created_by"),
  email: text("email").notNull(),
  display_name: text("display_name"),
  imap_host: text("imap_host").notNull().default(""),
  imap_port: integer("imap_port").notNull().default(993),
  smtp_host: text("smtp_host").notNull().default(""),
  smtp_port: integer("smtp_port").notNull().default(587),
  secret_enc: text("secret_enc").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const mailPollState = pgTable("mail_poll_state", {
  account_id: uuid("account_id").primaryKey(),
  last_uid: bigint("last_uid", { mode: 'number' }),
  last_checked_at: timestamp("last_checked_at", { withTimezone: true }),
})

export const meetingActionItems = pgTable("meeting_action_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  meeting_id: uuid("meeting_id").notNull(),
  text: text("text").notNull(),
  assignee: uuid("assignee"),
  done: boolean("done").notNull().default(false),
  sort: integer("sort").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  title: text("title").notNull(),
  agenda: text("agenda"),
  attendees: text("attendees"),
  location: text("location"),
  notes: text("notes"),
  starts_at: timestamp("starts_at", { withTimezone: true }).notNull(),
  ends_at: timestamp("ends_at", { withTimezone: true }),
  status: meetingStatusEnum("status").notNull().default("scheduled"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const milestones = pgTable("milestones", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  timeframe: text("timeframe").notNull().default("month"),
  target_date: date("target_date"),
  progress: integer("progress").notNull().default(0),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  archived: boolean("archived").notNull().default(false),
})

export const notificationPrefs = pgTable("notification_prefs", {
  user_id: uuid("user_id").primaryKey(),
  tenant_id: uuid("tenant_id").notNull(),
  calendar: boolean("calendar").notNull().default(true),
  email: boolean("email").notNull().default(true),
  crm: boolean("crm").notNull().default(true),
  hr: boolean("hr").notNull().default(true),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  projects: boolean("projects").notNull().default(true),
  social: boolean("social").notNull().default(true),
  events: boolean("events").notNull().default(true),
  invoices: boolean("invoices").notNull().default(true),
  meetings: boolean("meetings").notNull().default(true),
  portal: boolean("portal").notNull().default(true),
})

export const opsChecklistItems = pgTable("ops_checklist_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  checklist_id: uuid("checklist_id").notNull(),
  label: text("label").notNull(),
  sort: integer("sort").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const opsChecklistRunItems = pgTable("ops_checklist_run_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  run_id: uuid("run_id").notNull(),
  label: text("label").notNull(),
  sort: integer("sort").notNull().default(0),
  done: boolean("done").notNull().default(false),
  done_at: timestamp("done_at", { withTimezone: true }),
  done_by: uuid("done_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const opsChecklistRuns = pgTable("ops_checklist_runs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  checklist_id: uuid("checklist_id"),
  name: text("name").notNull(),
  run_date: date("run_date").notNull(),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const opsChecklists = pgTable("ops_checklists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  category: sopCategoryEnum("category").notNull().default("other"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const payrollConfig = pgTable("payroll_config", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  year: integer("year").notNull(),
  sp_emp: numeric("sp_emp", { precision: 6, scale: 4 }).notNull().default("0.071"),
  zp_emp: numeric("zp_emp", { precision: 6, scale: 4 }).notNull().default("0.045"),

  sp_er: numeric("sp_er", { precision: 6, scale: 4 }).notNull().default("0.248"),
  zp_er: numeric("zp_er", { precision: 6, scale: 4 }).notNull().default("0.09"),

  tax_rate1: numeric("tax_rate1", { precision: 6, scale: 4 }).notNull().default("0.15"),
  tax_rate2: numeric("tax_rate2", { precision: 6, scale: 4 }).notNull().default("0.23"),

  tax_progress_monthly: numeric("tax_progress_monthly", { precision: 12, scale: 2 }).notNull().default("139671"),
  credit_taxpayer: numeric("credit_taxpayer", { precision: 10, scale: 2 }).notNull().default("2570"),

  credit_child1: numeric("credit_child1", { precision: 10, scale: 2 }).notNull().default("1267"),
  credit_child2: numeric("credit_child2", { precision: 10, scale: 2 }).notNull().default("1860"),

  credit_child3: numeric("credit_child3", { precision: 10, scale: 2 }).notNull().default("2320"),
  min_wage_hour: numeric("min_wage_hour", { precision: 8, scale: 2 }).notNull().default("134.40"),

  dpp_threshold: numeric("dpp_threshold", { precision: 10, scale: 2 }).notNull().default("12000"),
  dpc_threshold: numeric("dpc_threshold", { precision: 10, scale: 2 }).notNull().default("4500"),

  srazkova_rate: numeric("srazkova_rate", { precision: 6, scale: 4 }).notNull().default("0.15"),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const payrollItems = pgTable("payroll_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  run_id: uuid("run_id").notNull(),
  user_id: uuid("user_id").notNull(),
  contract_type: text("contract_type").notNull().default("hpp"),
  gross: numeric("gross", { precision: 12, scale: 2 }).notNull().default("0"),
  children: integer("children").notNull().default(0),
  taxpayer_credit: boolean("taxpayer_credit").notNull().default(true),
  sp_emp: numeric("sp_emp", { precision: 12, scale: 2 }).notNull().default("0"),
  zp_emp: numeric("zp_emp", { precision: 12, scale: 2 }).notNull().default("0"),

  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  net: numeric("net", { precision: 12, scale: 2 }).notNull().default("0"),

  sp_er: numeric("sp_er", { precision: 12, scale: 2 }).notNull().default("0"),
  zp_er: numeric("zp_er", { precision: 12, scale: 2 }).notNull().default("0"),

  employer_cost: numeric("employer_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  regime: text("regime"),
  note: text("note"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const payrollRuns = pgTable("payroll_runs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  status: text("status").notNull().default("draft"),
  locked_at: timestamp("locked_at", { withTimezone: true }),
  locked_by: uuid("locked_by"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const personalEvents = pgTable("personal_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  start_time: timestamp("start_time", { withTimezone: true }).notNull(),
  end_time: timestamp("end_time", { withTimezone: true }).notNull(),
  all_day: boolean("all_day").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const personalGoals = pgTable("personal_goals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  timeframe: text("timeframe").notNull().default("month"),
  target_date: date("target_date"),
  progress: integer("progress").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  archived: boolean("archived").notNull().default(false),
})

export const personalNotes = pgTable("personal_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  title: text("title"),
  content: text("content").notNull().default(""),
  pinned: boolean("pinned").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const personalTasks = pgTable("personal_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  title: text("title").notNull(),
  note: text("note"),
  due_date: date("due_date"),
  priority: text("priority").notNull().default("normal"),
  done: boolean("done").notNull().default(false),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const portalAccess = pgTable("portal_access", {
  user_id: uuid("user_id").primaryKey(),
  tenant_id: uuid("tenant_id").notNull(),
  client_id: uuid("client_id"),
  display_name: text("display_name"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const portalInvites = pgTable("portal_invites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  client_id: uuid("client_id"),
  email: text("email").notNull(),
  display_name: text("display_name"),
  token: text("token").notNull(),
  invited_by: uuid("invited_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  used_at: timestamp("used_at", { withTimezone: true }),
})

export const portalMessages = pgTable("portal_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  status: text("status").notNull().default("new"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const portalVisibilityOverrides = pgTable("portal_visibility_overrides", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  client_id: uuid("client_id").notNull(),
  item_type: text("item_type").notNull(),
  item_id: uuid("item_id").notNull(),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  username: text("username").notNull(),
  full_name: text("full_name"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const projectTasks = pgTable("project_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  project_id: uuid("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: projectTaskStatusEnum("status").notNull().default("todo"),
  priority: projectPriorityEnum("priority").notNull().default("medium"),
  assignee_id: uuid("assignee_id"),
  due_date: date("due_date"),
  position: integer("position").notNull().default(0),
  created_by: uuid("created_by"),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  client_id: uuid("client_id"),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("planning"),
  priority: projectPriorityEnum("priority").notNull().default("medium"),
  owner_id: uuid("owner_id"),
  start_date: date("start_date"),
  due_date: date("due_date"),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("CZK"),
  note: text("note"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  po_id: uuid("po_id").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
  unit_price: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),

  line_total: numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0"),
  position: integer("position").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  supplier_id: uuid("supplier_id"),
  event_id: uuid("event_id"),
  number: text("number").notNull(),
  status: poStatusEnum("status").notNull().default("draft"),
  order_date: date("order_date").notNull(),
  expected_date: date("expected_date"),
  currency: text("currency").notNull().default("CZK"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  note: text("note"),
  transaction_id: uuid("transaction_id"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  user_agent: text("user_agent"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const quoteItems = pgTable("quote_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  quote_id: uuid("quote_id").notNull(),
  catalog_item_id: uuid("catalog_item_id"),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
  unit_price: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),

  vat_rate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  line_total: numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0"),

  position: integer("position").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  number: text("number").notNull(),
  client_id: uuid("client_id"),
  client_name: text("client_name"),
  status: quoteStatusEnum("status").notNull().default("draft"),
  issue_date: date("issue_date").notNull(),
  valid_until: date("valid_until"),
  currency: text("currency").notNull().default("CZK"),
  note: text("note"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  vat_total: numeric("vat_total", { precision: 12, scale: 2 }).notNull().default("0"),

  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  invoice_id: uuid("invoice_id"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  sent_at: timestamp("sent_at", { withTimezone: true }),
  stale_reminded_at: date("stale_reminded_at"),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const socialAccounts = pgTable("social_accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  platform: socialPlatformEnum("platform").notNull(),
  handle: text("handle"),
  display_name: text("display_name"),
  profile_url: text("profile_url"),
  followers: integer("followers").notNull().default(0),
  following: integer("following").notNull().default(0),
  posts_count: integer("posts_count").notNull().default(0),
  access_token_enc: text("access_token_enc"),
  auto_sync: boolean("auto_sync").notNull().default(false),
  last_synced_at: timestamp("last_synced_at", { withTimezone: true }),
  connected_by: uuid("connected_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const socialMetrics = pgTable("social_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  account_id: uuid("account_id").notNull(),
  followers: integer("followers").notNull().default(0),
  following: integer("following").notNull().default(0),
  posts_count: integer("posts_count").notNull().default(0),
  captured_at: timestamp("captured_at", { withTimezone: true }).defaultNow(),
})

export const socialPosts = pgTable("social_posts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  content: text("content"),
  media_doc_id: uuid("media_doc_id"),
  media_name: text("media_name"),
  platforms: socialPlatformEnum("platforms").array().notNull().default([]),
  status: socialPostStatusEnum("status").notNull().default("draft"),
  scheduled_at: timestamp("scheduled_at", { withTimezone: true }),
  published_at: timestamp("published_at", { withTimezone: true }),
  notified_at: timestamp("notified_at", { withTimezone: true }),
  error: text("error"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const sopArticles = pgTable("sop_articles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  category: sopCategoryEnum("category").notNull().default("other"),
  title: text("title").notNull(),
  body: text("body"),
  updated_by: uuid("updated_by"),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  category: supplierCategoryEnum("category").notNull().default("other"),
  ico: text("ico"),
  dic: text("dic"),
  email: text("email"),
  phone: text("phone"),
  note: text("note"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const tenantUsers = pgTable("tenant_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  role: appRoleEnum("role").notNull().default("employee"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  custom_role_id: uuid("custom_role_id"),
})

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  user_id: uuid("user_id").notNull(),
  project_id: uuid("project_id"),
  task_id: uuid("task_id"),
  work_date: date("work_date").notNull(),
  minutes: integer("minutes").notNull(),
  description: text("description"),
  billable: boolean("billable").notNull().default(true),
  hourly_rate: numeric("hourly_rate", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("CZK"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const transactionCategories = pgTable("transaction_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  color: text("color"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("CZK"),
  type: transactionTypeEnum("type").notNull(),
  date: date("date").notNull(),
  description: text("description"),
  invoice_id: uuid("invoice_id"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  category_id: uuid("category_id"),
})

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  rawUserMetaData: jsonb("raw_user_meta_data").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  name: text("name"),
  emailVerified: boolean("email_verified").notNull().default(true),
  image: text("image"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const vipReservations = pgTable("vip_reservations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenant_id: uuid("tenant_id").notNull(),
  event_id: uuid("event_id").notNull(),
  box_type: vipBoxEnum("box_type").notNull().default("silver"),
  box_label: text("box_label"),
  guest_name: text("guest_name"),
  contact: text("contact"),
  party_size: integer("party_size").notNull().default(2),
  min_spend: numeric("min_spend", { precision: 12, scale: 2 }),
  deposit: numeric("deposit", { precision: 12, scale: 2 }),
  status: reservationStatusEnum("status").notNull().default("pending"),
  arrived_at: timestamp("arrived_at", { withTimezone: true }),
  note: text("note"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
})
