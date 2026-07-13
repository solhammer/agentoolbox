import { describe, it, expect } from "vitest";
import { extractImports } from "./extractor.js";

describe("extractImports — Python", () => {
  it("extracts top-level package from import statement", () => {
    const code = "import numpy\nimport pandas as pd";
    const result = extractImports(code, "python");
    expect(result.map((r) => r.name)).toEqual(["numpy", "pandas"]);
  });

  it("extracts top-level package from from...import", () => {
    const code = "from sklearn.linear_model import LinearRegression";
    const result = extractImports(code, "python");
    expect(result.map((r) => r.name)).toEqual(["sklearn"]);
  });

  it("deduplicates packages", () => {
    const code = "import numpy\nimport numpy as np";
    const result = extractImports(code, "python");
    expect(result).toHaveLength(1);
  });

  it("filters stdlib packages", () => {
    const code = "import os\nimport sys\nimport numpy";
    const result = extractImports(code, "python");
    expect(result.map((r) => r.name)).toEqual(["numpy"]);
  });
});

describe("extractImports — JavaScript/TypeScript", () => {
  it("extracts ESM imports", () => {
    const code = `import React from 'react';\nimport { useState } from 'react';\nimport axios from 'axios';`;
    const result = extractImports(code, "javascript");
    expect(result.map((r) => r.name)).toContain("react");
    expect(result.map((r) => r.name)).toContain("axios");
  });

  it("extracts require calls", () => {
    const code = `const express = require('express');\nconst _ = require('lodash');`;
    const result = extractImports(code, "javascript");
    expect(result.map((r) => r.name)).toEqual(["express", "lodash"]);
  });

  it("ignores relative imports", () => {
    const code = `import foo from './foo';\nimport bar from '../bar';\nimport axios from 'axios';`;
    const result = extractImports(code, "javascript");
    expect(result.map((r) => r.name)).toEqual(["axios"]);
  });

  it("filters node: builtins", () => {
    const code = `import fs from 'node:fs';\nimport axios from 'axios';`;
    const result = extractImports(code, "javascript");
    expect(result.map((r) => r.name)).toEqual(["axios"]);
  });
});

describe("extractImports — Rust", () => {
  it("extracts crate names from use statements", () => {
    const code = `use serde::{Deserialize, Serialize};\nuse tokio::runtime::Runtime;`;
    const result = extractImports(code, "rust");
    expect(result.map((r) => r.name)).toContain("serde");
    expect(result.map((r) => r.name)).toContain("tokio");
  });

  it("filters std crate", () => {
    const code = `use std::collections::HashMap;\nuse serde::Serialize;`;
    const result = extractImports(code, "rust");
    expect(result.map((r) => r.name)).toEqual(["serde"]);
  });
});

describe("extractImports — Go", () => {
  it("extracts packages from import statements", () => {
    const code = `import "github.com/gin-gonic/gin"`;
    const result = extractImports(code, "go");
    expect(result.map((r) => r.name)).toContain("github");
  });
});
