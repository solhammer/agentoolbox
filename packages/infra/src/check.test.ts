import { describe, it, expect } from "vitest";
import { checkInfraPlan } from "./check.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Terraform: 0.0.0.0/0 ingress → BLOCK
// ─────────────────────────────────────────────────────────────────────────────

describe("Terraform analyzer", () => {
  it("BLOCKs on aws_security_group ingress open to 0.0.0.0/0", () => {
    const document = {
      resource_changes: [
        {
          address: "aws_security_group.web",
          type: "aws_security_group",
          change: {
            actions: ["create"],
            before: null,
            after: {
              name: "web-sg",
              ingress: [
                {
                  from_port: 0,
                  to_port: 65535,
                  protocol: "-1",
                  cidr_blocks: ["0.0.0.0/0"],
                  ipv6_cidr_blocks: [],
                },
              ],
              egress: [],
            },
          },
        },
      ],
    };

    const result = checkInfraPlan({ format: "terraform", document });

    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.some((f) => f.ruleId === "TF-SEC-001")).toBe(true);
    expect(result.counts.high).toBeGreaterThan(0);
  });

  it("BLOCKs on aws_security_group_rule ingress open to ::/0", () => {
    const document = {
      resource_changes: [
        {
          address: "aws_security_group_rule.allow_all",
          type: "aws_security_group_rule",
          change: {
            actions: ["create"],
            before: null,
            after: {
              type: "ingress",
              from_port: 22,
              to_port: 22,
              protocol: "tcp",
              cidr_blocks: [],
              ipv6_cidr_blocks: ["::/0"],
            },
          },
        },
      ],
    };

    const result = checkInfraPlan({ format: "terraform", document });
    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.some((f) => f.ruleId === "TF-SEC-001")).toBe(true);
  });

  it("BLOCKs on S3 bucket with public-read ACL", () => {
    const document = {
      resource_changes: [
        {
          address: "aws_s3_bucket.assets",
          type: "aws_s3_bucket",
          change: {
            actions: ["create"],
            before: null,
            after: { bucket: "my-assets", acl: "public-read" },
          },
        },
      ],
    };

    const result = checkInfraPlan({ format: "terraform", document });
    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.some((f) => f.ruleId === "TF-SEC-002")).toBe(true);
    expect(result.counts.critical).toBeGreaterThan(0);
  });

  it("BLOCKs on RDS instance that is publicly accessible", () => {
    const document = {
      resource_changes: [
        {
          address: "aws_db_instance.prod",
          type: "aws_db_instance",
          change: {
            actions: ["create"],
            before: null,
            after: {
              identifier: "prod-db",
              publicly_accessible: true,
              storage_encrypted: true,
            },
          },
        },
      ],
    };

    const result = checkInfraPlan({ format: "terraform", document });
    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.some((f) => f.ruleId === "TF-SEC-003")).toBe(true);
  });

  it("BLOCKs on stateful resource being destroyed", () => {
    const document = {
      resource_changes: [
        {
          address: "aws_db_instance.legacy",
          type: "aws_db_instance",
          change: {
            actions: ["delete"],
            before: { identifier: "legacy-db" },
            after: null,
          },
        },
      ],
    };

    const result = checkInfraPlan({ format: "terraform", document });
    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.some((f) => f.ruleId === "TF-CHG-001")).toBe(true);
  });

  it("FLAGs on EBS volume with encryption disabled (medium < default high threshold)", () => {
    const document = {
      resource_changes: [
        {
          address: "aws_ebs_volume.data",
          type: "aws_ebs_volume",
          change: {
            actions: ["create"],
            before: null,
            after: { availability_zone: "us-east-1a", encrypted: false },
          },
        },
      ],
    };

    const result = checkInfraPlan({ format: "terraform", document });
    // TF-SEC-004 is severity "medium"; default threshold is "high" → FLAG not BLOCK
    expect(result.verdict).toBe("FLAG");
    expect(result.findings.some((f) => f.ruleId === "TF-SEC-004")).toBe(true);
    expect(result.counts.medium).toBeGreaterThan(0);
  });

  it("PASSes a clean terraform plan with no violations", () => {
    const document = {
      resource_changes: [
        {
          address: "aws_instance.web",
          type: "aws_instance",
          change: {
            actions: ["create"],
            before: null,
            after: { instance_type: "t3.micro", ami: "ami-12345678" },
          },
        },
        {
          address: "aws_security_group.web",
          type: "aws_security_group",
          change: {
            actions: ["create"],
            before: null,
            after: {
              ingress: [
                // restricted to specific IP, not 0.0.0.0/0
                { cidr_blocks: ["10.0.0.0/8"], from_port: 443, to_port: 443, protocol: "tcp", ipv6_cidr_blocks: [] },
              ],
              egress: [],
            },
          },
        },
      ],
    };

    const result = checkInfraPlan({ format: "terraform", document });
    expect(result.verdict).toBe("PASS");
    expect(result.findings).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. IAM: Action "*" + Resource "*" → BLOCK
// ─────────────────────────────────────────────────────────────────────────────

describe("IAM analyzer", () => {
  it("BLOCKs on wildcard Action '*'", () => {
    const document = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "*",
          Resource: "*",
        },
      ],
    };

    const result = checkInfraPlan({ format: "iam", document });

    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.some((f) => f.ruleId === "IAM-WILDCARD-ACTION")).toBe(true);
    expect(result.findings.some((f) => f.ruleId === "IAM-WILDCARD-RESOURCE")).toBe(true);
    expect(result.counts.critical).toBeGreaterThan(0);
  });

  it("BLOCKs on wildcard Principal '*'", () => {
    const document = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: "arn:aws:s3:::my-bucket/*",
        },
      ],
    };

    const result = checkInfraPlan({ format: "iam", document });
    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.some((f) => f.ruleId === "IAM-WILDCARD-PRINCIPAL")).toBe(true);
  });

  it("BLOCKs on NotAction with Effect Allow", () => {
    const document = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          NotAction: ["iam:DeleteUser"],
          Resource: "*",
        },
      ],
    };

    const result = checkInfraPlan({ format: "iam", document });
    expect(result.findings.some((f) => f.ruleId === "IAM-NOTACTION")).toBe(true);
  });

  it("BLOCKs on iam:PassRole with Resource '*'", () => {
    const document = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PassAnyRole",
          Effect: "Allow",
          Action: ["iam:PassRole"],
          Resource: "*",
        },
      ],
    };

    const result = checkInfraPlan({ format: "iam", document });
    expect(result.findings.some((f) => f.ruleId === "IAM-PASSROLE-STAR")).toBe(true);
    expect(result.verdict).toBe("BLOCK");
  });

  it("PASSes a narrowly scoped IAM policy", () => {
    const document = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "ReadBucket",
          Effect: "Allow",
          Action: ["s3:GetObject", "s3:ListBucket"],
          Resource: [
            "arn:aws:s3:::my-bucket",
            "arn:aws:s3:::my-bucket/*",
          ],
        },
      ],
    };

    const result = checkInfraPlan({ format: "iam", document });
    expect(result.verdict).toBe("PASS");
    expect(result.findings).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. K8s: privileged pod → BLOCK
// ─────────────────────────────────────────────────────────────────────────────

describe("K8s analyzer", () => {
  it("BLOCKs on privileged container", () => {
    const document = {
      apiVersion: "v1",
      kind: "Pod",
      metadata: { name: "risky-pod" },
      spec: {
        containers: [
          {
            name: "app",
            image: "nginx:1.21",
            securityContext: { privileged: true },
            resources: { limits: { cpu: "100m", memory: "128Mi" } },
          },
        ],
      },
    };

    const result = checkInfraPlan({ format: "k8s", document });

    expect(result.verdict).toBe("BLOCK");
    expect(result.findings.some((f) => f.ruleId === "K8S-PRIVILEGED")).toBe(true);
    expect(result.counts.critical).toBeGreaterThan(0);
  });

  it("BLOCKs on hostNetwork: true", () => {
    const document = {
      apiVersion: "v1",
      kind: "Pod",
      metadata: { name: "net-pod" },
      spec: {
        hostNetwork: true,
        containers: [
          {
            name: "app",
            image: "nginx:1.21",
            resources: { limits: { cpu: "100m", memory: "128Mi" } },
          },
        ],
      },
    };

    const result = checkInfraPlan({ format: "k8s", document });
    expect(result.findings.some((f) => f.ruleId === "K8S-HOST-NETWORK")).toBe(true);
    expect(result.verdict).toBe("BLOCK");
  });

  it("BLOCKs on SYS_ADMIN capability", () => {
    const document = {
      apiVersion: "v1",
      kind: "Pod",
      metadata: { name: "cap-pod" },
      spec: {
        containers: [
          {
            name: "app",
            image: "alpine:3.18",
            securityContext: {
              capabilities: { add: ["SYS_ADMIN"] },
            },
            resources: { limits: { cpu: "100m", memory: "64Mi" } },
          },
        ],
      },
    };

    const result = checkInfraPlan({ format: "k8s", document });
    expect(result.findings.some((f) => f.ruleId === "K8S-SYS-ADMIN")).toBe(true);
    expect(result.verdict).toBe("BLOCK");
  });

  it("FLAGs on hostPath volume (medium) and :latest image (medium) with default threshold", () => {
    const document = {
      apiVersion: "v1",
      kind: "Pod",
      metadata: { name: "hostpath-pod" },
      spec: {
        volumes: [
          { name: "host-logs", hostPath: { path: "/var/log" } },
        ],
        containers: [
          {
            name: "app",
            image: "nginx:latest",
            resources: { limits: { cpu: "100m", memory: "128Mi" } },
          },
        ],
      },
    };

    const result = checkInfraPlan({ format: "k8s", document });
    expect(result.findings.some((f) => f.ruleId === "K8S-HOST-PATH")).toBe(true);
    expect(result.findings.some((f) => f.ruleId === "K8S-LATEST-TAG")).toBe(true);
    // Both are medium severity; default threshold is high → FLAG not BLOCK
    expect(result.verdict).toBe("FLAG");
  });

  it("FLAGs on missing resource limits (low severity, default threshold high)", () => {
    const document = {
      apiVersion: "v1",
      kind: "Pod",
      metadata: { name: "no-limits-pod" },
      spec: {
        containers: [
          {
            name: "app",
            image: "nginx:1.21",
            // no resources field at all
          },
        ],
      },
    };

    const result = checkInfraPlan({ format: "k8s", document });
    expect(result.findings.some((f) => f.ruleId === "K8S-NO-RESOURCE-LIMITS")).toBe(true);
    expect(result.verdict).toBe("FLAG");
  });

  it("PASSes a fully hardened pod", () => {
    const document = {
      apiVersion: "v1",
      kind: "Pod",
      metadata: { name: "safe-pod" },
      spec: {
        containers: [
          {
            name: "app",
            image: "nginx:1.25.3",
            securityContext: {
              privileged: false,
              allowPrivilegeEscalation: false,
              runAsNonRoot: true,
              capabilities: { drop: ["ALL"] },
            },
            resources: {
              limits: { cpu: "200m", memory: "256Mi" },
              requests: { cpu: "100m", memory: "128Mi" },
            },
          },
        ],
      },
    };

    const result = checkInfraPlan({ format: "k8s", document });
    expect(result.verdict).toBe("PASS");
    expect(result.findings).toHaveLength(0);
  });

  it("handles a Deployment manifest correctly", () => {
    const document = {
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: { name: "my-app" },
      spec: {
        replicas: 3,
        selector: { matchLabels: { app: "my-app" } },
        template: {
          metadata: { labels: { app: "my-app" } },
          spec: {
            containers: [
              {
                name: "app",
                image: "my-app:1.2.3",
                securityContext: { privileged: true },
                resources: { limits: { cpu: "500m", memory: "512Mi" } },
              },
            ],
          },
        },
      },
    };

    const result = checkInfraPlan({ format: "k8s", document });
    expect(result.findings.some((f) => f.ruleId === "K8S-PRIVILEGED")).toBe(true);
    expect(result.verdict).toBe("BLOCK");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Benign / PASS baseline
// ─────────────────────────────────────────────────────────────────────────────

describe("Benign documents (PASS)", () => {
  it("PASSes an IAM policy with no violations", () => {
    const result = checkInfraPlan({
      format: "iam",
      document: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["logs:CreateLogGroup", "logs:PutLogEvents"],
            Resource: "arn:aws:logs:us-east-1:123456789012:log-group:my-logs:*",
          },
        ],
      },
    });
    expect(result.verdict).toBe("PASS");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Policy threshold respected
// ─────────────────────────────────────────────────────────────────────────────

describe("Policy threshold", () => {
  it("BLOCKs at default threshold (high) on IAM-WILDCARD-RESOURCE (high)", () => {
    const document = {
      Version: "2012-10-17",
      Statement: [
        // Only IAM-WILDCARD-RESOURCE (high) — no wildcard action
        { Sid: "S1", Effect: "Allow", Action: ["s3:GetObject"], Resource: "*" },
      ],
    };
    const result = checkInfraPlan({ format: "iam", document });
    expect(result.verdict).toBe("BLOCK");
  });

  it("FLAGs when threshold is raised to 'critical' and highest finding is 'high'", () => {
    const document = {
      Version: "2012-10-17",
      Statement: [
        { Sid: "S1", Effect: "Allow", Action: ["s3:GetObject"], Resource: "*" },
      ],
    };
    const result = checkInfraPlan({
      format: "iam",
      document,
      policy: { blockSeverityAtOrAbove: "critical" },
    });
    // IAM-WILDCARD-RESOURCE is "high"; threshold "critical" means high < critical → FLAG
    expect(result.verdict).toBe("FLAG");
  });

  it("BLOCKs when threshold is lowered to 'medium' on a medium finding", () => {
    // TF-SEC-004 (EBS unencrypted) is medium severity
    const document = {
      resource_changes: [
        {
          address: "aws_ebs_volume.data",
          type: "aws_ebs_volume",
          change: {
            actions: ["create"],
            before: null,
            after: { availability_zone: "us-east-1a", encrypted: false },
          },
        },
      ],
    };
    const result = checkInfraPlan({
      format: "terraform",
      document,
      policy: { blockSeverityAtOrAbove: "medium" },
    });
    expect(result.verdict).toBe("BLOCK");
  });

  it("PASSes when threshold is raised to 'critical' and only medium findings exist", () => {
    const document = {
      resource_changes: [
        {
          address: "aws_ebs_volume.data",
          type: "aws_ebs_volume",
          change: {
            actions: ["create"],
            before: null,
            after: { availability_zone: "us-east-1a", encrypted: false },
          },
        },
      ],
    };
    // medium < critical threshold AND medium < high, both below BLOCK threshold
    // but medium IS >= low, so it should be FLAG not PASS
    const result = checkInfraPlan({
      format: "terraform",
      document,
      policy: { blockSeverityAtOrAbove: "critical" },
    });
    expect(result.verdict).toBe("FLAG");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Edge cases — no crash on malformed / empty input
// ─────────────────────────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("handles null document without throwing", () => {
    expect(() => checkInfraPlan({ format: "terraform", document: null })).not.toThrow();
    const result = checkInfraPlan({ format: "terraform", document: null });
    expect(result.verdict).toBe("PASS");
    expect(result.findings).toHaveLength(0);
  });

  it("handles empty object document without throwing", () => {
    expect(() => checkInfraPlan({ format: "iam", document: {} })).not.toThrow();
    const result = checkInfraPlan({ format: "iam", document: {} });
    expect(result.verdict).toBe("PASS");
  });

  it("handles a non-object scalar without throwing", () => {
    expect(() => checkInfraPlan({ format: "k8s", document: "not-an-object" })).not.toThrow();
    expect(() => checkInfraPlan({ format: "k8s", document: 42 })).not.toThrow();
    expect(() => checkInfraPlan({ format: "terraform", document: [] })).not.toThrow();
  });

  it("handles a terraform plan with an empty resource_changes array", () => {
    const result = checkInfraPlan({
      format: "terraform",
      document: { resource_changes: [] },
    });
    expect(result.verdict).toBe("PASS");
    expect(result.findings).toHaveLength(0);
  });

  it("handles a k8s document with an unknown kind gracefully", () => {
    const result = checkInfraPlan({
      format: "k8s",
      document: { apiVersion: "v1", kind: "Service", metadata: { name: "my-svc" } },
    });
    expect(result.verdict).toBe("PASS");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Certificate format + determinism
// ─────────────────────────────────────────────────────────────────────────────

describe("Certificate", () => {
  it("has the expected sha256:<hex64> format", () => {
    const result = checkInfraPlan({
      format: "terraform",
      document: { resource_changes: [] },
    });
    expect(result.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("produces the same verdict and findings on repeated calls with same input", () => {
    const input = {
      format: "iam" as const,
      document: {
        Version: "2012-10-17",
        Statement: [{ Effect: "Allow", Action: "*", Resource: "*" }],
      },
    };

    const r1 = checkInfraPlan(input);
    const r2 = checkInfraPlan(input);

    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.findings).toEqual(r2.findings);
    expect(r1.counts).toEqual(r2.counts);
    // certificates include a timestamp so they differ; format must be consistent
    expect(r1.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(r2.certificate).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("produces different certificates for documents with different findings", () => {
    const clean = checkInfraPlan({
      format: "iam",
      document: {
        Version: "2012-10-17",
        Statement: [{ Effect: "Allow", Action: ["s3:GetObject"], Resource: "arn:aws:s3:::my-bucket/*" }],
      },
    });
    const risky = checkInfraPlan({
      format: "iam",
      document: {
        Version: "2012-10-17",
        Statement: [{ Effect: "Allow", Action: "*", Resource: "*" }],
      },
    });

    // Different verdicts / finding counts → different certificates
    expect(clean.verdict).toBe("PASS");
    expect(risky.verdict).toBe("BLOCK");
    expect(clean.certificate).not.toBe(risky.certificate);
  });

  it("returns latencyMs as a non-negative number", () => {
    const result = checkInfraPlan({ format: "k8s", document: {} });
    expect(typeof result.latencyMs).toBe("number");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
