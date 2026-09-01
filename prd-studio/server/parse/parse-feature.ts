import type { ApiStrategyBlock, CompanyScoping, Entity, FeaturePrd, StateMachine } from "../schema/feature.js";
import { bulletList, boolFrom, csv, section, stripBackticks, subsections, table } from "./md-util.js";

function bulletValue(bullets: string[], prefix: string): string | undefined {
  const b = bullets.find((l) => l.startsWith(prefix));
  return b ? b.slice(prefix.length).trim() : undefined;
}

function labeled(md: string, label: string): string | undefined {
  const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`);
  return re.exec(md)?.[1]?.trim();
}

/**
 * Reverse-parses a docs/prd-feature-<nn>-<name>.md written to the Step 4 template shape
 * back into the structured model. `order` and `slug` come from the filename, not the body.
 */
export function parseFeaturePrd(md: string, order: number, slug: string): FeaturePrd {
  const titleMatch = /^#\s+Feature PRD\s+—\s+(.+)$/m.exec(md);
  const name = titleMatch?.[1]?.trim() ?? slug;

  const purpose = section(md, "Purpose") ?? "";

  const apiStrategyBody = section(md, "API Strategy") ?? "";
  const apiBullets = bulletList(apiStrategyBody);
  const strategyLine = bulletValue(apiBullets, "**Strategy:**") ?? "Full CRUD";
  const apiStrategy: ApiStrategyBlock = { strategy: strategyLine as ApiStrategyBlock["strategy"] };
  if (strategyLine === "Partial CRUD") {
    const ops = bulletValue(apiBullets, "Operations needed:");
    apiStrategy.partialOperations = ops ? (csv(ops) as ApiStrategyBlock["partialOperations"]) : [];
  }
  // Declared regardless of strategy — a Full/Partial CRUD entity routinely gets extra
  // domain-specific actions bolted onto the same controller alongside base CRUD.
  const domainActionBullets = apiBullets.filter((l) => l.startsWith("Action `"));
  if (domainActionBullets.length > 0) {
    apiStrategy.domainActions = domainActionBullets.map((l) => {
      const m = /^Action `([^`]+)`:\s*(.+)$/.exec(l);
      return { name: m?.[1] ?? "", description: m?.[2] ?? "" };
    });
  }

  const entitiesBody = section(md, "Entities") ?? "";
  const entities: Entity[] = subsections(entitiesBody).map((sub) => parseEntity(sub.title, sub.body));

  // The two endpoint tables are independent, not either/or: a CRUD entity commonly carries extra
  // domain action endpoints alongside its base operations, so both markers may appear in the same
  // section, in either combination.
  const endpointsBody = section(md, "Endpoints") ?? "";
  const crudMarkerIdx = endpointsBody.indexOf("For Full or Partial CRUD");
  const domainMarkerIdx = endpointsBody.indexOf("For Domain Actions");
  const crudBlock =
    crudMarkerIdx === -1
      ? ""
      : endpointsBody.slice(crudMarkerIdx, domainMarkerIdx === -1 ? undefined : domainMarkerIdx);
  const domainBlock = domainMarkerIdx === -1 ? "" : endpointsBody.slice(domainMarkerIdx);
  const endpoints: FeaturePrd["endpoints"] = {
    crud: crudBlock
      ? table(crudBlock).map((r) => ({ operation: r[0], permission: stripBackticks(r[1]) }) as FeaturePrd["endpoints"]["crud"][number])
      : [],
    domainActions: domainBlock
      ? table(domainBlock).map(
          (r) => ({ action: r[0], input: r[1], returns: r[2], permission: stripBackticks(r[3]) }) as FeaturePrd["endpoints"]["domainActions"][number],
        )
      : [],
  };

  const stateMachineBody = section(md, "State Machine");
  const stateMachine: StateMachine | undefined = stateMachineBody
    ? parseStateMachine(stateMachineBody, entities[0]?.name ?? "")
    : undefined;

  const validationRows = table(section(md, "Validation") ?? "");
  const validation = validationRows.map((r) => ({ field: r[0], rule: r[1] }));

  const responseBody = section(md, "Response Fields") ?? "";
  const responseBullets = bulletList(responseBody);
  const exposed = csv(bulletValue(responseBullets, "**Exposed:**") ?? "");
  const neverExposed = csv(bulletValue(responseBullets, "**Never exposed:**") ?? "");

  const uiBody = section(md, "UI") ?? "";
  const ui = parseUi(uiBody);

  const localizationBody = section(md, "Localization") ?? "";
  const locBullets = bulletList(localizationBody);
  const translatedContentRequired = boolFrom(bulletValue(locBullets, "Translated content required:") ?? "no");
  const keyPrefix = bulletValue(locBullets, "Key prefix:")?.replace(/`/g, "");

  const nfBody = section(md, "Non-Functional") ?? "";
  const nfBullets = bulletList(nfBody);
  const readHeavyRaw = bulletValue(nfBullets, "List endpoint read-heavy:") ?? "no";
  const cacheTtlMatch = /cache TTL (\d+)s/.exec(readHeavyRaw);
  const notifRaw = bulletValue(nfBullets, "Notifications triggered:") ?? "none";
  const fileRaw = bulletValue(nfBullets, "File attachments:") ?? "none";

  const dependenciesBody = section(md, "Dependencies") ?? "";
  const depBullets = bulletList(dependenciesBody);

  return {
    order,
    slug,
    name,
    purpose,
    apiStrategy,
    entities,
    endpoints,
    stateMachine,
    validation,
    responseFields: { exposed, neverExposed },
    ui,
    localization: { translatedContentRequired, keyPrefix },
    nonFunctional: {
      expectedVolume: (bulletValue(nfBullets, "Expected volume:") ?? "small") as "small" | "medium" | "large",
      listReadHeavy: readHeavyRaw.startsWith("yes"),
      cacheTtlSeconds: cacheTtlMatch ? Number(cacheTtlMatch[1]) : undefined,
      expensiveJoinsOrN1Risks: bulletValue(nfBullets, "Known expensive joins or N+1 risks:") ?? "none",
      softDelete: boolFrom(bulletValue(nfBullets, "Soft delete:") ?? "no"),
      auditLogOn: csv(bulletValue(nfBullets, "Audit log on:") ?? ""),
      notificationsTriggered:
        notifRaw === "none"
          ? []
          : notifRaw.split(";").map((s) => {
              const [when, to] = s.split("→").map((x) => x.trim());
              return { when, to };
            }),
      fileAttachments:
        fileRaw === "none"
          ? []
          : fileRaw.split(";").map((s) => {
              const m = /^(.+?)\s+\((.+?),\s*max\s+(\d+(?:\.\d+)?)MB\)$/.exec(s.trim());
              return {
                field: m?.[1] ?? s.trim(),
                allowedTypes: m ? m[2].split("/").map((t) => t.trim()) : [],
                maxSizeMb: m ? Number(m[3]) : 0,
              };
            }),
    },
    dependencies: {
      dependsOn: csv(bulletValue(depBullets, "Depends on:") ?? ""),
      requiredBefore: csv(bulletValue(depBullets, "Required before:") ?? ""),
    },
  };
}

function parseEntity(name: string, body: string): Entity {
  const fieldRows = table(body);
  const fields = fieldRows.map((r) => ({ name: r[0], type: r[1], nullable: boolFrom(r[2]), notes: r[3] || undefined }));

  let companyScoping: CompanyScoping = { kind: "none" };
  if (body.includes("It always comes") && body.includes("from the authenticated user")) {
    companyScoping = { kind: "self-service" };
  } else {
    const crossTenant = /chosen by ([^\n]+)\s*\nfrom the existing company list[\s\S]*?permission-gated to `([^`]+)`/.exec(
      body,
    );
    if (crossTenant) {
      companyScoping = { kind: "cross-tenant", managingActor: crossTenant[1].trim(), gatingPermission: crossTenant[2].trim() };
    }
  }

  const enumsIdx = body.indexOf("**Enums:**");
  const relationsIdx = body.indexOf("**Relations:**");
  const indexesIdx = body.indexOf("**Indexes:**");

  const enums =
    enumsIdx === -1
      ? []
      : table(
          body.slice(enumsIdx, relationsIdx === -1 ? (indexesIdx === -1 ? undefined : indexesIdx) : relationsIdx),
        ).map((r) => ({
          name: r[0],
          values: csv(r[1]),
          default: r[2],
        }));

  const relations =
    relationsIdx === -1
      ? []
      : table(body.slice(relationsIdx, indexesIdx === -1 ? undefined : indexesIdx)).map((r) => ({
          type: r[0] as Entity["relations"][number]["type"],
          to: r[1],
          onDelete: r[2] as Entity["relations"][number]["onDelete"],
        }));

  const indexesLine = indexesIdx === -1 ? "" : body.slice(indexesIdx).split("\n")[0];
  const indexes = csv(indexesLine.replace("**Indexes:**", ""));

  return { name, fields, companyScoping, enums, relations, indexes };
}

function parseStateMachine(body: string, entityName: string): StateMachine {
  const statesLine = labeled(body, "States") ?? "";
  const states = csv(statesLine);
  const transitions = bulletList(body)
    .map((l) => /^`([^`]+)`\s+--(.+?),\s*by\s+(.+?)-->\s+`([^`]+)`$/.exec(l))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ from: m[1], action: m[2], by: m[3], to: m[4] }));

  return {
    entity: entityName,
    states,
    transitions,
    onReject: labeled(body, "On reject") ?? "",
    parallelVsSequential: labeled(body, "Parallel vs\\. sequential") ?? "",
    workedExample: labeled(body, "Worked example") ?? "",
  };
}

function parseUi(body: string): FeaturePrd["ui"] {
  const subs = subsections(body);
  const listSub = subs.find((s) => s.title.startsWith("List page"));
  const formSub = subs.find((s) => s.title.startsWith("Create / edit form"));
  const behaviourSub = subs.find((s) => s.title.startsWith("Behaviour"));

  const route = stripBackticks(listSub?.title.match(/\(`([^`]+)`\)/)?.[1] ?? "/");
  const listBullets = bulletList(listSub?.body ?? "");

  const columnsRaw = bulletValue(listBullets, "Columns:") ?? "";
  const columns = columnsRaw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => ({ field: c.replace(" (sortable)", ""), sortable: c.includes("(sortable)") }));

  const filtersRaw = bulletValue(listBullets, "Filters:") ?? "none";
  const filters =
    filtersRaw === "none"
      ? []
      : filtersRaw.split(",").map((f) => {
          const [field, inputType] = f.split("—").map((x) => x.trim());
          return { field, inputType: inputType as "text" | "dropdown" | "date-range" };
        });

  const rowActionsRaw = bulletValue(listBullets, "Row actions:") ?? "";
  const rowActions = csv(rowActionsRaw);

  const searchRaw = bulletValue(listBullets, "Search:") ?? "no";
  const search = searchRaw.startsWith("yes")
    ? { enabled: true, fields: csv(searchRaw.replace(/^yes\s*—\s*on\s*/, "")) }
    : { enabled: false, fields: [] };

  const pageSize = Number(bulletValue(listBullets, "Page size:") ?? "20");

  const createEditForm = table(formSub?.body ?? "").map((r) => {
    const notesRaw = r[2] ?? "";
    const optionsMatch = /options from (.+)$/.exec(notesRaw);
    const notes = notesRaw.replace(/;?\s*options from .+$/, "").trim();
    return {
      field: r[0],
      input: r[1] as FeaturePrd["ui"]["createEditForm"][number]["input"],
      notes: notes || undefined,
      optionsFrom: optionsMatch?.[1],
    };
  });

  const behaviour = behaviourSub ? bulletList(behaviourSub.body) : [];

  return {
    listPage: { route, columns, filters, rowActions, search, pageSize },
    createEditForm,
    behaviour,
  };
}
