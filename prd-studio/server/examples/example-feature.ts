import type { FeaturePrd } from "../schema/feature.js";

export const exampleFeature: FeaturePrd = {
  order: 1,
  slug: "invoicing",
  name: "Invoicing",
  purpose:
    "Lets an agency's accountant create an invoice against a client, add line items, send it, and " +
    "track it through payment. The client-facing view is out of scope for this module.",
  apiStrategy: {
    strategy: "Full CRUD",
    domainActions: [
      { name: "send", description: "Marks a DRAFT invoice as SENT and emails it to the client." },
      { name: "recordPayment", description: "Marks a SENT invoice as PAID and records the payment amount and date." },
      { name: "void", description: "Marks a DRAFT or SENT invoice as VOID; blocked once the invoice is PAID." },
    ],
  },
  entities: [
    {
      name: "Invoice",
      fields: [
        { name: "clientName", type: "string(255)", nullable: false },
        { name: "clientEmail", type: "string(255)", nullable: false },
        { name: "issueDate", type: "date", nullable: false },
        { name: "dueDate", type: "date", nullable: false },
        { name: "status", type: "enum", nullable: false, notes: "see InvoiceStatusEnum" },
        { name: "totalAmount", type: "decimal(10,2)", nullable: false, notes: "sum of line items, computed" },
      ],
      companyScoping: { kind: "self-service" },
      enums: [
        { name: "InvoiceStatusEnum", values: ["DRAFT", "SENT", "PAID", "VOID"], default: "DRAFT" },
      ],
      relations: [{ type: "OneToMany", to: "InvoiceItem", onDelete: "CASCADE" }],
      indexes: ["status", "clientEmail"],
    },
    {
      name: "InvoiceItem",
      fields: [
        { name: "description", type: "string(255)", nullable: false },
        { name: "quantity", type: "int", nullable: false },
        { name: "unitPrice", type: "decimal(10,2)", nullable: false },
      ],
      companyScoping: { kind: "none" },
      enums: [],
      relations: [{ type: "ManyToOne", to: "Invoice", onDelete: "CASCADE" }],
      indexes: [],
    },
  ],
  endpoints: {
    crud: [
      { operation: "insert", permission: "invoice.create" },
      { operation: "getAll", permission: "invoice.read" },
      { operation: "getById", permission: "invoice.read" },
      { operation: "update", permission: "invoice.update" },
      { operation: "delete", permission: "invoice.delete" },
    ],
    domainActions: [
      { action: "send", input: "invoice id", returns: "single record", permission: "invoice.send" },
      {
        action: "recordPayment",
        input: "invoice id, amount, paidAt",
        returns: "single record",
        permission: "invoice.record-payment",
      },
      { action: "void", input: "invoice id", returns: "single record", permission: "invoice.void" },
    ],
  },
  stateMachine: {
    entity: "Invoice",
    states: ["DRAFT", "SENT", "PAID", "VOID"],
    transitions: [
      { from: "DRAFT", to: "SENT", action: "send", by: "Accountant" },
      { from: "SENT", to: "PAID", action: "record payment", by: "Accountant" },
      { from: "SENT", to: "VOID", action: "void", by: "Accountant" },
      { from: "DRAFT", to: "VOID", action: "void", by: "Accountant" },
    ],
    onReject: "Not applicable — invoices have no rejection step, only send/void/pay.",
    parallelVsSequential: "Sequential — a single actor moves one invoice through one path at a time.",
    workedExample:
      "A DRAFT invoice for $1,200 is sent to the client (now SENT). The accountant records a bank " +
      "transfer against it, moving it to PAID. A SENT invoice can also be voided directly without " +
      "ever reaching PAID, e.g. if the client cancels the engagement.",
  },
  validation: [
    { field: "clientEmail", rule: "required, valid email format" },
    { field: "dueDate", rule: "required, must be on or after issueDate" },
    { field: "totalAmount", rule: "required, minimum 0" },
  ],
  responseFields: {
    exposed: [
      "id",
      "clientName",
      "clientEmail",
      "issueDate",
      "dueDate",
      "status",
      "totalAmount",
      "description",
      "quantity",
      "unitPrice",
    ],
    neverExposed: [],
  },
  ui: {
    listPage: {
      route: "/invoices",
      columns: [
        { field: "clientName", sortable: true },
        { field: "issueDate", sortable: true },
        { field: "dueDate", sortable: true },
        { field: "status", sortable: false },
        { field: "totalAmount", sortable: true },
      ],
      filters: [{ field: "status", inputType: "dropdown" }],
      rowActions: ["Edit", "Delete", "Send", "Void"],
      search: { enabled: true, fields: ["clientName", "clientEmail"] },
      pageSize: 20,
    },
    createEditForm: [
      { field: "clientName", input: "text", notes: "required, max 255 chars" },
      { field: "clientEmail", input: "text", notes: "required, valid email" },
      { field: "issueDate", input: "date", notes: "required" },
      { field: "dueDate", input: "date", notes: "required" },
    ],
    behaviour: [
      "Status badge colours: DRAFT=gray, SENT=blue, PAID=green, VOID=red",
      "Line items editable inline in a nested table within the invoice form",
      "Send/Void are confirmation-gated row actions",
    ],
  },
  localization: { translatedContentRequired: false },
  nonFunctional: {
    expectedVolume: "medium",
    listReadHeavy: true,
    cacheTtlSeconds: 30,
    expensiveJoinsOrN1Risks: "none",
    softDelete: true,
    auditLogOn: ["send", "void", "record payment"],
    notificationsTriggered: [],
    fileAttachments: [{ field: "pdfExport", allowedTypes: ["pdf"], maxSizeMb: 5 }],
  },
  dependencies: { dependsOn: [], requiredBefore: [] },
};
