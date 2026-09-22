import { NextResponse } from "next/server";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
import {
  addDocumentVersion,
  archiveDocument,
  createContractDocument,
  expectedSignatureToken,
  getContractDocument,
  listContractDocuments,
  setDocumentConnector,
  signDocument,
  submitDocumentValidation,
  updateContractDocumentMeta,
  validateDocument,
} from "@/lib/documents-signatures-crm";
import {
  canAccessDocSignatures,
  canManageDocSignatures,
  canValidateAsDirection,
  isDocSigKind,
  isDocSigSlot,
  verifySignatureIntegrity,
  type DocSigRoleSlot,
  type DocSigSignMethod,
} from "@/lib/documents-signatures-shared";
import {
  assertSameOrigin,
  clientIp,
  isJsonRequest,
  rateLimit,
  safeErrorMessage,
} from "@/lib/security";

export const runtime = "nodejs";

function mongoUnavailable() {
  return NextResponse.json(
    {
      error:
        "Base de données indisponible. Configurez DATABASE_URL (MongoDB) pour Documents & signatures.",
    },
    { status: 503 },
  );
}

async function requireAccess() {
  const session = await getServerSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (!canAccessDocSignatures(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé RH, direction ou employé concerné" },
        { status: 403 },
      ),
    };
  }
  return {
    session,
    actor: {
      userId: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
    },
  };
}

export async function GET(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  const { session, actor } = auth;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const item = await getContractDocument(id, actor);
    if (!item) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }
    const verifications = item.signatures.map((sig) => {
      const expected = expectedSignatureToken(sig);
      const check = verifySignatureIntegrity(item, sig, expected);
      return {
        signatureId: sig.id,
        expectedToken: expected,
        ...check,
      };
    });
    return NextResponse.json({
      item,
      verifications,
      canManage: canManageDocSignatures(session.role),
      canValidate: canValidateAsDirection(session.role),
      role: session.role,
    });
  }

  const items = await listContractDocuments(actor);
  return NextResponse.json({
    items,
    canManage: canManageDocSignatures(session.role),
    canValidate: canValidateAsDirection(session.role),
    role: session.role,
    email: session.email,
    userId: session.userId,
  });
}

export async function POST(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: "JSON requis" }, { status: 415 });
  }
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  const { actor } = auth;

  const ip = clientIp(request);
  const rlCreate = rateLimit(`doc-sig:create:${ip}`, 30, 60_000);
  if (!rlCreate.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      {
        status: 429,
        headers: { "Retry-After": String(rlCreate.retryAfterSec) },
      },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const slotsRaw = Array.isArray(body.requiredSlots)
      ? (body.requiredSlots as unknown[]).filter(isDocSigSlot)
      : undefined;

    const item = await createContractDocument(
      {
        kind: isDocSigKind(body.kind) ? body.kind : "contrat",
        title: String(body.title ?? ""),
        body: String(body.body ?? ""),
        employeeName: String(body.employeeName ?? ""),
        employeeEmail: String(body.employeeEmail ?? ""),
        employeeUserId: String(body.employeeUserId ?? ""),
        directionName: String(body.directionName ?? ""),
        directionEmail: String(body.directionEmail ?? ""),
        requiredSlots: slotsRaw as DocSigRoleSlot[] | undefined,
        note: String(body.note ?? ""),
        connectorProvider: String(body.connectorProvider ?? ""),
        connectorExternalId: String(body.connectorExternalId ?? ""),
        jobTitle: String(body.jobTitle ?? ""),
        assignmentSite: String(body.assignmentSite ?? ""),
        assignmentZone: String(body.assignmentZone ?? ""),
        conditions: String(body.conditions ?? ""),
        obligations: String(body.obligations ?? ""),
        confidentiality: String(body.confidentiality ?? ""),
        jobDescriptionId: String(body.jobDescriptionId ?? ""),
        attachments: Array.isArray(body.attachments)
          ? body.attachments.map((raw, idx) => {
              const row = raw as {
                id?: string;
                label?: string;
                fileRef?: string;
                note?: string;
              };
              return {
                id: String(row.id || `ATT-${idx + 1}`),
                label: String(row.label || ""),
                fileRef: String(row.fileRef || ""),
                note: String(row.note || ""),
              };
            })
          : undefined,
      },
      actor,
    );
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Création impossible") },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!hasMongoConfig()) return mongoUnavailable();
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: "JSON requis" }, { status: 415 });
  }
  const auth = await requireAccess();
  if (auth.error) return auth.error;
  const { actor } = auth;

  const ip = clientIp(request);
  const rlPatch = rateLimit(`doc-sig:patch:${ip}`, 60, 60_000);
  if (!rlPatch.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      {
        status: 429,
        headers: { "Retry-After": String(rlPatch.retryAfterSec) },
      },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    const action = String(body.action ?? "").trim();
    if (!id || !action) {
      return NextResponse.json(
        { error: "id et action requis" },
        { status: 400 },
      );
    }

    let item;
    switch (action) {
      case "version":
        item = await addDocumentVersion(
          id,
          {
            title: String(body.title ?? ""),
            body: String(body.body ?? ""),
            note: String(body.note ?? ""),
          },
          actor,
        );
        break;
      case "submit_validation":
        item = await submitDocumentValidation(id, actor);
        break;
      case "validate":
        item = await validateDocument(
          id,
          actor,
          body.decision === "refuse" ? "refuse" : "approve",
          String(body.note ?? ""),
        );
        break;
      case "sign": {
        const method: DocSigSignMethod =
          body.method === "connecteur" ? "connecteur" : "electronique";
        item = await signDocument(
          id,
          {
            roleSlot: isDocSigSlot(body.roleSlot)
              ? (body.roleSlot as DocSigRoleSlot)
              : undefined,
            method,
            signerName: String(body.signerName ?? ""),
            connectorRef: String(body.connectorRef ?? ""),
            note: String(body.note ?? ""),
          },
          actor,
        );
        break;
      }
      case "connector":
        item = await setDocumentConnector(
          id,
          {
            provider: String(body.provider ?? ""),
            externalId: String(body.externalId ?? ""),
          },
          actor,
        );
        break;
      case "archive":
        item = await archiveDocument(id, actor);
        break;
      case "meta":
        item = await updateContractDocumentMeta(
          id,
          {
            jobTitle:
              body.jobTitle !== undefined ? String(body.jobTitle) : undefined,
            assignmentSite:
              body.assignmentSite !== undefined
                ? String(body.assignmentSite)
                : undefined,
            assignmentZone:
              body.assignmentZone !== undefined
                ? String(body.assignmentZone)
                : undefined,
            conditions:
              body.conditions !== undefined
                ? String(body.conditions)
                : undefined,
            obligations:
              body.obligations !== undefined
                ? String(body.obligations)
                : undefined,
            confidentiality:
              body.confidentiality !== undefined
                ? String(body.confidentiality)
                : undefined,
            jobDescriptionId:
              body.jobDescriptionId !== undefined
                ? String(body.jobDescriptionId)
                : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
            employeeName:
              body.employeeName !== undefined
                ? String(body.employeeName)
                : undefined,
            employeeEmail:
              body.employeeEmail !== undefined
                ? String(body.employeeEmail)
                : undefined,
            attachments: Array.isArray(body.attachments)
              ? body.attachments.map((raw, idx) => {
                  const row = raw as {
                    id?: string;
                    label?: string;
                    fileRef?: string;
                    note?: string;
                  };
                  return {
                    id: String(row.id || `ATT-${idx + 1}`),
                    label: String(row.label || ""),
                    fileRef: String(row.fileRef || ""),
                    note: String(row.note || ""),
                  };
                })
              : undefined,
          },
          actor,
        );
        break;
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }

    const verifications = item.signatures.map((sig) => {
      const expected = expectedSignatureToken(sig);
      const check = verifySignatureIntegrity(item, sig, expected);
      return { signatureId: sig.id, expectedToken: expected, ...check };
    });

    return NextResponse.json({ item, verifications });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Mise à jour impossible") },
      { status: 400 },
    );
  }
}
