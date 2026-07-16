import type { IdentifierEntry } from "../types.js";

/** Mask SSN to last 4 digits: ***-**-XXXX */
function maskSsn(area: string, group: string, serial: string): string {
  return `***-**-${serial}`;
}

export function validateSsn(raw: string): IdentifierEntry {
  // Accept XXX-XX-XXXX or XXXXXXXXX (9 digits)
  const stripped = raw.trim().replace(/-/g, "");

  if (!/^\d{9}$/.test(stripped)) {
    return {
      value: raw.replace(/\d(?=\d{4})/g, "*"),
      type: "ssn",
      valid: false,
      checksum: "not_applicable",
      detail: "Invalid format: expected XXX-XX-XXXX or 9 digits",
    };
  }

  const area = stripped.slice(0, 3);
  const group = stripped.slice(3, 5);
  const serial = stripped.slice(5, 9);

  // SSA structural rules
  if (area === "000") {
    return {
      value: maskSsn(area, group, serial),
      type: "ssn",
      valid: false,
      checksum: "not_applicable",
      normalized: maskSsn(area, group, serial),
      detail: "Area 000 is not valid",
    };
  }
  if (area === "666") {
    return {
      value: maskSsn(area, group, serial),
      type: "ssn",
      valid: false,
      checksum: "not_applicable",
      normalized: maskSsn(area, group, serial),
      detail: "Area 666 is not valid",
    };
  }
  const areaNum = parseInt(area, 10);
  if (areaNum >= 900 && areaNum <= 999) {
    return {
      value: maskSsn(area, group, serial),
      type: "ssn",
      valid: false,
      checksum: "not_applicable",
      normalized: maskSsn(area, group, serial),
      detail: "Areas 900–999 are not valid (ITIN range)",
    };
  }
  if (group === "00") {
    return {
      value: maskSsn(area, group, serial),
      type: "ssn",
      valid: false,
      checksum: "not_applicable",
      normalized: maskSsn(area, group, serial),
      detail: "Group 00 is not valid",
    };
  }
  if (serial === "0000") {
    return {
      value: maskSsn(area, group, serial),
      type: "ssn",
      valid: false,
      checksum: "not_applicable",
      normalized: maskSsn(area, group, serial),
      detail: "Serial 0000 is not valid",
    };
  }

  const masked = maskSsn(area, group, serial);
  return {
    value: masked,
    type: "ssn",
    valid: true,
    checksum: "not_applicable",
    normalized: masked,
  };
}
