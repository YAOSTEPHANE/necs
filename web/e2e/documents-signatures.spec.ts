import { test, expect } from "@playwright/test";
import {
  canAccessDocSignatures,
  canManageDocSignatures,
  canValidateAsDirection,
  docSigRecipeRequirements,
  verifySignatureProof,
  type ContractDocument,
  type DocSigSignature,
  type DocSigVersion,
} from "../src/lib/documents-signatures-shared";
import {
  computeContentHash,
  computeSignatureToken,
} from "../src/lib/documents-signatures-crm";

function version(
  partial: Partial<DocSigVersion> & Pick<DocSigVersion, "version" | "contentHash">,
): DocSigVersion {
  return {
    title: "Contrat agent",
    body: "Engagement de service",
    createdAt: "2026-09-01T10:00:00.000Z",
    createdBy: "u-rh",
    createdByName: "RH",
    ...partial,
  };
}

function signature(
  partial: Partial<DocSigSignature> &
    Pick<
      DocSigSignature,
      "id" | "roleSlot" | "contentHash" | "signatureToken" | "signedAt" | "version"
    >,
): DocSigSignature {
  return {
    method: "electronique",
    signerName: "Test",
    signerEmail: "test@necs.cm",
    connectorRef: "",
    note: "",
    ...partial,
  };
}

function stubDoc(
  partial: Partial<ContractDocument> = {},
): ContractDocument {
  const id = partial.id ?? "DOC-TEST01";
  const contentHash =
    partial.versions?.[0]?.contentHash ??
    computeContentHash({
      id,
      version: 1,
      title: "Contrat agent",
      body: "Engagement de service",
    });

  return {
    id,
    kind: "contrat",
    status: "a_signer",
    currentVersion: 1,
    versions: [
      version({
        version: 1,
        contentHash,
        title: "Contrat agent",
        body: "Engagement de service",
      }),
    ],
    requiredSlots: ["employe", "direction"],
    signatures: [],
    employeeName: "Awa N.",
    employeeEmail: "awa@necs.cm",
    employeeUserId: "u-awa",
    directionName: "Direction",
    directionEmail: "direction@necs.cm",
    jobTitle: "Agent d’entretien",
    assignmentSite: "",
    assignmentZone: "",
    conditions: "",
    obligations: "",
    confidentiality: "",
    attachments: [],
    jobDescriptionId: "",
    connectorProvider: "",
    connectorExternalId: "",
    archiveSealedAt: null,
    archiveSealHash: "",
    note: "",
    history: [],
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    createdBy: "u-rh",
    createdByName: "RH",
    ...partial,
  };
}

test.describe("Documents et signatures (Must)", () => {
  test("ACL : RH gère, direction valide, employé accède", () => {
    expect(canManageDocSignatures("rh")).toBe(true);
    expect(canManageDocSignatures("admin")).toBe(true);
    expect(canManageDocSignatures("manager")).toBe(false);
    expect(canManageDocSignatures("nettoyeur")).toBe(false);

    expect(canValidateAsDirection("admin")).toBe(true);
    expect(canValidateAsDirection("manager")).toBe(true);
    expect(canValidateAsDirection("rh")).toBe(false);
    expect(canValidateAsDirection("nettoyeur")).toBe(false);

    expect(canAccessDocSignatures("rh")).toBe(true);
    expect(canAccessDocSignatures("manager")).toBe(true);
    expect(canAccessDocSignatures("nettoyeur")).toBe(true);
    expect(canAccessDocSignatures("commercial")).toBe(false);
  });

  test("recette : signature / version / date vérifiables", () => {
    const id = "DOC-RECETTE";
    const contentHash = computeContentHash({
      id,
      version: 1,
      title: "Contrat agent",
      body: "Engagement de service",
    });
    const signedAt = "2026-09-21T08:30:00.000Z";
    const tokenEmploye = computeSignatureToken({
      contentHash,
      email: "awa@necs.cm",
      signedAt,
      method: "electronique",
      roleSlot: "employe",
    });
    const tokenDir = computeSignatureToken({
      contentHash,
      email: "manager@necs.cm",
      signedAt: "2026-09-21T09:00:00.000Z",
      method: "connecteur",
      roleSlot: "direction",
    });

    const incomplete = stubDoc({ id, versions: [version({ version: 1, contentHash })] });
    const emptyRecipe = docSigRecipeRequirements(incomplete);
    expect(emptyRecipe.ok).toBe(false);
    expect(emptyRecipe.missing.some((m) => /signature Employé/i.test(m))).toBe(
      true,
    );

    const sigEmp = signature({
      id: "SIG-EMP",
      roleSlot: "employe",
      version: 1,
      contentHash,
      signatureToken: tokenEmploye,
      signedAt,
      signerEmail: "awa@necs.cm",
      signerName: "Awa N.",
    });
    const sigDir = signature({
      id: "SIG-DIR",
      roleSlot: "direction",
      version: 1,
      contentHash,
      signatureToken: tokenDir,
      signedAt: "2026-09-21T09:00:00.000Z",
      method: "connecteur",
      signerEmail: "manager@necs.cm",
      signerName: "Manager",
      connectorRef: "YS-998877",
    });

    expect(verifySignatureProof(incomplete, sigEmp).ok).toBe(true);

    const complete = stubDoc({
      id,
      status: "archive",
      versions: [version({ version: 1, contentHash })],
      signatures: [sigEmp, sigDir],
      archiveSealedAt: "2026-09-21T10:00:00.000Z",
      archiveSealHash: "a".repeat(64),
    });
    const ready = docSigRecipeRequirements(complete);
    expect(ready.ok).toBe(true);
    expect(ready.missing).toEqual([]);
    expect(ready.proofs.every((p) => p.ok)).toBe(true);

    const tampered = stubDoc({
      id,
      status: "signe",
      versions: [version({ version: 1, contentHash })],
      signatures: [
        {
          ...sigEmp,
          contentHash: "deadbeef".repeat(8),
        },
        sigDir,
      ],
    });
    const bad = docSigRecipeRequirements(tampered);
    expect(bad.ok).toBe(false);
    expect(bad.proofs.some((p) => !p.ok)).toBe(true);
  });

  test("jeton crypto : empreinte et token stables", () => {
    const hash = computeContentHash({
      id: "DOC-X",
      version: 2,
      title: "Avenant",
      body: "Clause 3",
    });
    expect(hash).toHaveLength(64);
    expect(
      computeContentHash({
        id: "DOC-X",
        version: 2,
        title: "Avenant",
        body: "Clause 3",
      }),
    ).toBe(hash);

    const token = computeSignatureToken({
      contentHash: hash,
      email: "a@b.cm",
      signedAt: "2026-09-21T12:00:00.000Z",
      method: "electronique",
      roleSlot: "rh",
    });
    expect(token).toHaveLength(64);
  });
});
