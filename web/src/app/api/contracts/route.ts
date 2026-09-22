import { NextResponse } from "next/server";
import {
  activateContract,
  contractOpsFinanceView,
  createAmendment,
  createContractFromWonOpportunity,
  createManualServiceContract,
  getContract,
  getContractByOpportunity,
  listContracts,
  listWonOpportunitiesEligible,
  previewContractFromWonOpportunity,
  setContractStatus,
  signServiceContract,
  submitContractForReview,
  toggleMilestone,
  updateContractDraft,
} from "@/lib/contracts-crm";
import { syncReferentialFromContracts } from "@/lib/ops-referential-crm";
import {
  assertNoResaisie,
  canAccessContracts,
  canManageContracts,
  canOperateContracts,
  isContractAmendmentModType,
  type ContractMilestone,
  type ContractPrestationLine,
  type ContractRenewal,
  type ContractSignature,
  type ContractSignatureRole,
  type ContractSite,
  type ContractSla,
  type ContractStatus,
  type ContractTariffLine,
} from "@/lib/contracts-shared";
import { hasMongoConfig } from "@/lib/mongo";
import { getServerSession } from "@/lib/session-server";
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
        "Base de données indisponible. Configurez DATABASE_URL pour les contrats.",
    },
    { status: 503 },
  );
}

async function requireAccess(manage = false) {
  const session = await getServerSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (!canAccessContracts(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Accès réservé commercial / opérations / finance" },
        { status: 403 },
      ),
    };
  }
  if (manage && !canManageContracts(session.role)) {
    return {
      error: NextResponse.json({ error: "Droits insuffisants" }, { status: 403 }),
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
  const auth = await requireAccess(false);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const opportunityId = url.searchParams.get("opportunityId");
  const preview = url.searchParams.get("preview") === "1";
  const eligible = url.searchParams.get("eligible") === "1";

  if (eligible) {
    const items = await listWonOpportunitiesEligible(auth.actor);
    return NextResponse.json({
      items,
      canManage: canManageContracts(auth.session.role),
    });
  }

  if (preview && opportunityId) {
    try {
      const previewData = await previewContractFromWonOpportunity(
        opportunityId,
        auth.actor,
      );
      return NextResponse.json({
        preview: previewData,
        canManage: canManageContracts(auth.session.role),
      });
    } catch (error) {
      return NextResponse.json(
        { error: safeErrorMessage(error, "Aperçu impossible") },
        { status: 400 },
      );
    }
  }

  if (opportunityId && !id) {
    const item = await getContractByOpportunity(opportunityId);
    if (!item) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
    }
    return NextResponse.json({
      item,
      view: contractOpsFinanceView(item),
      noResaisie: assertNoResaisie(item),
      canManage: canManageContracts(auth.session.role),
      canOperate: canOperateContracts(auth.session.role),
      role: auth.session.role,
    });
  }

  if (id) {
    const item = await getContract(id);
    if (!item) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
    }
    return NextResponse.json({
      item,
      view: contractOpsFinanceView(item),
      noResaisie: assertNoResaisie(item),
      canManage: canManageContracts(auth.session.role),
      canOperate: canOperateContracts(auth.session.role),
      role: auth.session.role,
    });
  }

  const items = await listContracts(auth.actor);
  const wonEligible = canManageContracts(auth.session.role)
    ? await listWonOpportunitiesEligible(auth.actor)
    : [];

  return NextResponse.json({
    items,
    wonEligible,
    canManage: canManageContracts(auth.session.role),
    canOperate: canOperateContracts(auth.session.role),
    role: auth.session.role,
    email: auth.session.email,
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
  const auth = await requireAccess(false);
  if (auth.error) return auth.error;

  const ip = clientIp(request);
  const rl = rateLimit(`contracts:post:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "from-won");

    const wrap = (item: Awaited<ReturnType<typeof getContract>>) => {
      if (!item) throw new Error("Contrat introuvable");
      return {
        item,
        view: contractOpsFinanceView(item),
        noResaisie: assertNoResaisie(item),
      };
    };

    switch (action) {
      case "from-won": {
        if (!canManageContracts(auth.session.role)) {
          return NextResponse.json({ error: "Création refusée" }, { status: 403 });
        }
        const item = await createContractFromWonOpportunity(
          String(body.opportunityId ?? ""),
          auth.actor,
          {
            startAt:
              body.startAt !== undefined ? String(body.startAt) : undefined,
            durationMonths:
              body.durationMonths !== undefined
                ? Number(body.durationMonths)
                : undefined,
            renewal:
              body.renewal !== undefined
                ? (String(body.renewal) as ContractRenewal)
                : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
          },
        );
        return NextResponse.json(wrap(item), { status: 201 });
      }
      case "create-manual": {
        if (!canManageContracts(auth.session.role)) {
          return NextResponse.json({ error: "Création refusée" }, { status: 403 });
        }
        const item = await createManualServiceContract(
          {
            company: String(body.company ?? ""),
            contactName:
              body.contactName !== undefined
                ? String(body.contactName)
                : undefined,
            contactEmail:
              body.contactEmail !== undefined
                ? String(body.contactEmail)
                : undefined,
            clientRccm:
              body.clientRccm !== undefined
                ? String(body.clientRccm)
                : undefined,
            clientRepName:
              body.clientRepName !== undefined
                ? String(body.clientRepName)
                : undefined,
            clientRepTitle:
              body.clientRepTitle !== undefined
                ? String(body.clientRepTitle)
                : undefined,
            necsRepName:
              body.necsRepName !== undefined
                ? String(body.necsRepName)
                : undefined,
            necsRepTitle:
              body.necsRepTitle !== undefined
                ? String(body.necsRepTitle)
                : undefined,
            object: body.object !== undefined ? String(body.object) : undefined,
            perimeter:
              body.perimeter !== undefined ? String(body.perimeter) : undefined,
            obligations:
              body.obligations !== undefined
                ? String(body.obligations)
                : undefined,
            pricingTerms:
              body.pricingTerms !== undefined
                ? String(body.pricingTerms)
                : undefined,
            billingTerms:
              body.billingTerms !== undefined
                ? String(body.billingTerms)
                : undefined,
            terminationTerms:
              body.terminationTerms !== undefined
                ? String(body.terminationTerms)
                : undefined,
            sla:
              body.sla !== undefined
                ? (String(body.sla) as ContractSla)
                : undefined,
            startAt:
              body.startAt !== undefined ? String(body.startAt) : undefined,
            durationMonths:
              body.durationMonths !== undefined
                ? Number(body.durationMonths)
                : undefined,
            renewal:
              body.renewal !== undefined
                ? (String(body.renewal) as ContractRenewal)
                : undefined,
            staffCount:
              body.staffCount !== undefined
                ? Number(body.staffCount)
                : undefined,
            frequency:
              body.frequency !== undefined
                ? String(body.frequency)
                : undefined,
            serviceLevel:
              body.serviceLevel !== undefined
                ? String(body.serviceLevel)
                : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
            bcRef: body.bcRef !== undefined ? String(body.bcRef) : undefined,
            contractVersion:
              body.contractVersion !== undefined
                ? String(body.contractVersion)
                : undefined,
            signaturePlace:
              body.signaturePlace !== undefined
                ? String(body.signaturePlace)
                : undefined,
            indexation:
              body.indexation !== undefined
                ? String(body.indexation)
                : undefined,
            deposit:
              body.deposit !== undefined ? String(body.deposit) : undefined,
            penalties:
              body.penalties !== undefined
                ? String(body.penalties)
                : undefined,
            sites: Array.isArray(body.sites)
              ? (body.sites as Partial<ContractSite>[])
              : undefined,
            tariffs: Array.isArray(body.tariffs)
              ? (body.tariffs as Partial<ContractTariffLine>[])
              : undefined,
            prestations: Array.isArray(body.prestations)
              ? (body.prestations as Partial<ContractPrestationLine>[])
              : undefined,
          },
          auth.actor,
        );
        return NextResponse.json(wrap(item), { status: 201 });
      }
      case "update": {
        if (!canManageContracts(auth.session.role)) {
          return NextResponse.json({ error: "Modification refusée" }, { status: 403 });
        }
        const item = await updateContractDraft(
          String(body.id ?? ""),
          {
            sla:
              body.sla !== undefined
                ? (String(body.sla) as ContractSla)
                : undefined,
            startAt:
              body.startAt !== undefined ? String(body.startAt) : undefined,
            endAt:
              body.endAt !== undefined
                ? body.endAt === null
                  ? null
                  : String(body.endAt)
                : undefined,
            durationMonths:
              body.durationMonths !== undefined
                ? Number(body.durationMonths)
                : undefined,
            renewal:
              body.renewal !== undefined
                ? (String(body.renewal) as ContractRenewal)
                : undefined,
            staffCount:
              body.staffCount !== undefined
                ? Number(body.staffCount)
                : undefined,
            note: body.note !== undefined ? String(body.note) : undefined,
            company:
              body.company !== undefined ? String(body.company) : undefined,
            contactName:
              body.contactName !== undefined
                ? String(body.contactName)
                : undefined,
            contactEmail:
              body.contactEmail !== undefined
                ? String(body.contactEmail)
                : undefined,
            clientRccm:
              body.clientRccm !== undefined
                ? String(body.clientRccm)
                : undefined,
            clientRepName:
              body.clientRepName !== undefined
                ? String(body.clientRepName)
                : undefined,
            clientRepTitle:
              body.clientRepTitle !== undefined
                ? String(body.clientRepTitle)
                : undefined,
            necsRepName:
              body.necsRepName !== undefined
                ? String(body.necsRepName)
                : undefined,
            necsRepTitle:
              body.necsRepTitle !== undefined
                ? String(body.necsRepTitle)
                : undefined,
            object: body.object !== undefined ? String(body.object) : undefined,
            perimeter:
              body.perimeter !== undefined ? String(body.perimeter) : undefined,
            obligations:
              body.obligations !== undefined
                ? String(body.obligations)
                : undefined,
            pricingTerms:
              body.pricingTerms !== undefined
                ? String(body.pricingTerms)
                : undefined,
            billingTerms:
              body.billingTerms !== undefined
                ? String(body.billingTerms)
                : undefined,
            terminationTerms:
              body.terminationTerms !== undefined
                ? String(body.terminationTerms)
                : undefined,
            bcRef: body.bcRef !== undefined ? String(body.bcRef) : undefined,
            contractVersion:
              body.contractVersion !== undefined
                ? String(body.contractVersion)
                : undefined,
            signaturePlace:
              body.signaturePlace !== undefined
                ? String(body.signaturePlace)
                : undefined,
            indexation:
              body.indexation !== undefined
                ? String(body.indexation)
                : undefined,
            deposit:
              body.deposit !== undefined ? String(body.deposit) : undefined,
            penalties:
              body.penalties !== undefined
                ? String(body.penalties)
                : undefined,
            frequency:
              body.frequency !== undefined
                ? String(body.frequency)
                : undefined,
            serviceLevel:
              body.serviceLevel !== undefined
                ? String(body.serviceLevel)
                : undefined,
            sites: Array.isArray(body.sites)
              ? (body.sites as Partial<ContractSite>[])
              : undefined,
            tariffs: Array.isArray(body.tariffs)
              ? (body.tariffs as Partial<ContractTariffLine>[])
              : undefined,
            prestations: Array.isArray(body.prestations)
              ? (body.prestations as Partial<ContractPrestationLine>[])
              : undefined,
            milestones: Array.isArray(body.milestones)
              ? (body.milestones as Partial<ContractMilestone>[])
              : undefined,
            signatures: Array.isArray(body.signatures)
              ? (body.signatures as Partial<ContractSignature>[])
              : undefined,
          },
          auth.actor,
        );
        return NextResponse.json(wrap(item));
      }
      case "sign": {
        if (!canManageContracts(auth.session.role)) {
          return NextResponse.json({ error: "Signature refusée" }, { status: 403 });
        }
        const item = await signServiceContract(
          String(body.id ?? ""),
          {
            role: String(body.role ?? "client") as ContractSignatureRole,
            name: body.name !== undefined ? String(body.name) : undefined,
            title: body.title !== undefined ? String(body.title) : undefined,
          },
          auth.actor,
        );
        return NextResponse.json(wrap(item));
      }
      case "submit-review": {
        if (!canManageContracts(auth.session.role)) {
          return NextResponse.json({ error: "Revue refusée" }, { status: 403 });
        }
        const item = await submitContractForReview(
          String(body.id ?? ""),
          auth.actor,
        );
        return NextResponse.json(wrap(item));
      }
      case "activate": {
        if (!canManageContracts(auth.session.role)) {
          return NextResponse.json({ error: "Activation refusée" }, { status: 403 });
        }
        const item = await activateContract(String(body.id ?? ""), auth.actor);
        // Pousse sites / SLA / tarifs vers le référentiel OPS (sans ressaisie).
        let opsSync: { clients: number; sites: number } | null = null;
        try {
          opsSync = await syncReferentialFromContracts(auth.actor);
        } catch {
          opsSync = null;
        }
        return NextResponse.json({ ...wrap(item), opsSync });
      }
      case "amend": {
        if (!canManageContracts(auth.session.role)) {
          return NextResponse.json({ error: "Avenant refusé" }, { status: 403 });
        }
        const item = await createAmendment(
          String(body.id ?? ""),
          {
            reason: String(body.reason ?? ""),
            effectiveAt:
              body.effectiveAt !== undefined
                ? String(body.effectiveAt)
                : undefined,
            modificationType:
              body.modificationType !== undefined
                ? isContractAmendmentModType(body.modificationType)
                  ? body.modificationType
                  : undefined
                : undefined,
            impactFinancial:
              body.impactFinancial !== undefined
                ? Number(body.impactFinancial)
                : undefined,
            sla:
              body.sla !== undefined
                ? (String(body.sla) as ContractSla)
                : undefined,
            endAt:
              body.endAt !== undefined
                ? body.endAt === null
                  ? null
                  : String(body.endAt)
                : undefined,
            durationMonths:
              body.durationMonths !== undefined
                ? Number(body.durationMonths)
                : undefined,
            staffCount:
              body.staffCount !== undefined
                ? Number(body.staffCount)
                : undefined,
            perimeter:
              body.perimeter !== undefined
                ? String(body.perimeter)
                : undefined,
            sites: Array.isArray(body.sites)
              ? (body.sites as Partial<ContractSite>[])
              : undefined,
            tariffs: Array.isArray(body.tariffs)
              ? (body.tariffs as Partial<ContractTariffLine>[])
              : undefined,
            prestations: Array.isArray(body.prestations)
              ? (body.prestations as Partial<ContractPrestationLine>[])
              : undefined,
          },
          auth.actor,
        );
        return NextResponse.json(wrap(item));
      }
      case "milestone": {
        if (!canOperateContracts(auth.session.role)) {
          return NextResponse.json({ error: "Action refusée" }, { status: 403 });
        }
        const item = await toggleMilestone(
          String(body.id ?? ""),
          String(body.milestoneId ?? ""),
          Boolean(body.done),
          auth.actor,
        );
        return NextResponse.json(wrap(item));
      }
      case "status": {
        if (!canManageContracts(auth.session.role)) {
          return NextResponse.json({ error: "Statut refusé" }, { status: 403 });
        }
        const item = await setContractStatus(
          String(body.id ?? ""),
          String(body.status ?? "") as ContractStatus,
          auth.actor,
        );
        return NextResponse.json(wrap(item));
      }
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Opération impossible") },
      { status: 400 },
    );
  }
}
