import type { SanctionRecord } from "../types.js";

/**
 * Snapshot date of the bundled dataset (ISO).
 *
 * NOTE: This file is a CURATED, REPRESENTATIVE SAMPLE of well-known OFAC
 * designations (public information), intended to make the screening logic
 * useful and testable offline. It is NOT the complete authoritative list.
 * Regenerate the full normalized snapshot from the official OFAC sources with
 * `scripts/refresh-sanctions.ts` (see SPEC.md).
 */
export const OFAC_SNAPSHOT_DATE = "2026-07-15";

export const OFAC_RECORDS: SanctionRecord[] = [
  // ── Individuals ────────────────────────────────────────────────────────────
  { id: "SDN-0001", name: "Ayman al-Zawahiri", aliases: ["Aiman Muhammad Rabi al-Zawahiri", "Al Zawahiri"], program: "SDGT", entityType: "individual", list: "OFAC-SDN", jurisdiction: "EG" },
  { id: "SDN-0002", name: "Osama bin Laden", aliases: ["Usama bin Laden", "Usama bin Muhammad bin Awad bin Ladin"], program: "SDGT", entityType: "individual", list: "OFAC-SDN", jurisdiction: "SA" },
  { id: "SDN-0003", name: "Abu Bakr al-Baghdadi", aliases: ["Ibrahim Awwad Ibrahim al-Badri", "Abu Du'a"], program: "SDGT", entityType: "individual", list: "OFAC-SDN", jurisdiction: "IQ" },
  { id: "SDN-0004", name: "Joaquin Archivaldo Guzman Loera", aliases: ["El Chapo", "Chapo Guzman", "El Rapido"], program: "SDNTK", entityType: "individual", list: "OFAC-SDN", jurisdiction: "MX" },
  { id: "SDN-0005", name: "Semion Mogilevich", aliases: ["Semen Yudkovich Mogilevich", "Seva Moguilevich"], program: "TCO", entityType: "individual", list: "OFAC-SDN", jurisdiction: "RU" },
  { id: "SDN-0006", name: "Viktor Bout", aliases: ["Viktor Anatolyevich Bout", "Merchant of Death"], program: "TCO", entityType: "individual", list: "OFAC-SDN", jurisdiction: "RU" },
  { id: "SDN-0007", name: "Dawood Ibrahim", aliases: ["Dawood Ibrahim Kaskar", "Sheikh Dawood Hassan"], program: "SDGT", entityType: "individual", list: "OFAC-SDN", jurisdiction: "PK" },
  { id: "SDN-0008", name: "Kim Jong Un", aliases: ["Kim Jong-un", "Kim Jong Woon"], program: "DPRK", entityType: "individual", list: "OFAC-SDN", jurisdiction: "KP" },
  { id: "SDN-0009", name: "Alexander Lukashenko", aliases: ["Alyaksandr Lukashenka", "Aliaksandr Ryhoravich Lukashenka"], program: "BELARUS", entityType: "individual", list: "OFAC-SDN", jurisdiction: "BY" },
  { id: "SDN-0010", name: "Nicolas Maduro Moros", aliases: ["Nicolas Maduro"], program: "VENEZUELA", entityType: "individual", list: "OFAC-SDN", jurisdiction: "VE" },
  { id: "SDN-0011", name: "Bashar al-Assad", aliases: ["Bashar Hafez al-Assad"], program: "SYRIA", entityType: "individual", list: "OFAC-SDN", jurisdiction: "SY" },
  { id: "SDN-0012", name: "Ali Hoseini Khamenei", aliases: ["Ayatollah Ali Khamenei", "Sayyid Ali Hosseini Khamenei"], program: "IRAN", entityType: "individual", list: "OFAC-SDN", jurisdiction: "IR" },
  { id: "SDN-0013", name: "Qasem Soleimani", aliases: ["Qassem Soleimani", "Qasem Soleymani"], program: "SDGT", entityType: "individual", list: "OFAC-SDN", jurisdiction: "IR" },
  { id: "SDN-0014", name: "Hassan Nasrallah", aliases: ["Sayyed Hassan Nasrallah"], program: "SDGT", entityType: "individual", list: "OFAC-SDN", jurisdiction: "LB" },
  { id: "SDN-0015", name: "Ismail Haniyeh", aliases: ["Ismail Haniya", "Ismail Abd al-Salam Ahmad Haniya"], program: "SDGT", entityType: "individual", list: "OFAC-SDN", jurisdiction: "PS" },
  { id: "SDN-0016", name: "Min Aung Hlaing", aliases: ["Min Aung Hlaing"], program: "BURMA", entityType: "individual", list: "OFAC-SDN", jurisdiction: "MM" },
  { id: "SDN-0017", name: "Ramzan Kadyrov", aliases: ["Ramzan Akhmatovich Kadyrov"], program: "MAGNIT", entityType: "individual", list: "OFAC-SDN", jurisdiction: "RU" },

  // ── Terrorist / militant organizations ──────────────────────────────────────
  { id: "SDN-0018", name: "Al-Qaida", aliases: ["Al-Qaeda", "Al Qaida", "The Base", "Qa'idat al-Jihad"], program: "SDGT", entityType: "entity", list: "OFAC-SDN" },
  { id: "SDN-0019", name: "Islamic State of Iraq and the Levant", aliases: ["ISIL", "ISIS", "Daesh", "Islamic State"], program: "SDGT", entityType: "entity", list: "OFAC-SDN" },
  { id: "SDN-0020", name: "Hizballah", aliases: ["Hezbollah", "Hizbullah", "Party of God"], program: "SDGT", entityType: "entity", list: "OFAC-SDN", jurisdiction: "LB" },
  { id: "SDN-0021", name: "Hamas", aliases: ["Harakat al-Muqawama al-Islamiyya", "Islamic Resistance Movement"], program: "SDGT", entityType: "entity", list: "OFAC-SDN", jurisdiction: "PS" },
  { id: "SDN-0022", name: "Palestinian Islamic Jihad", aliases: ["PIJ", "Islamic Jihad"], program: "SDGT", entityType: "entity", list: "OFAC-SDN", jurisdiction: "PS" },
  { id: "SDN-0023", name: "Islamic Revolutionary Guard Corps", aliases: ["IRGC", "Army of the Guardians of the Islamic Revolution", "Pasdaran"], program: "IRAN", entityType: "entity", list: "OFAC-SDN", jurisdiction: "IR" },

  // ── Transnational criminal organizations / cartels ──────────────────────────
  { id: "SDN-0024", name: "Sinaloa Cartel", aliases: ["Cartel de Sinaloa"], program: "SDNTK", entityType: "entity", list: "OFAC-SDN", jurisdiction: "MX" },
  { id: "SDN-0025", name: "Jalisco New Generation Cartel", aliases: ["CJNG", "Cartel Jalisco Nueva Generacion"], program: "SDNTK", entityType: "entity", list: "OFAC-SDN", jurisdiction: "MX" },
  { id: "SDN-0026", name: "Los Zetas", aliases: ["Cartel de los Zetas"], program: "SDNTK", entityType: "entity", list: "OFAC-SDN", jurisdiction: "MX" },
  { id: "SDN-0027", name: "Revolutionary Armed Forces of Colombia", aliases: ["FARC", "Fuerzas Armadas Revolucionarias de Colombia"], program: "SDNTK", entityType: "entity", list: "OFAC-SDN", jurisdiction: "CO" },
  { id: "SDN-0028", name: "Wagner Group", aliases: ["PMC Wagner", "Private Military Company Wagner", "ChVK Wagner"], program: "RUSSIA-EO14024", entityType: "entity", list: "OFAC-SDN", jurisdiction: "RU" },

  // ── Cyber / crypto ──────────────────────────────────────────────────────────
  { id: "SDN-0029", name: "Lazarus Group", aliases: ["APT38", "Hidden Cobra", "Guardians of Peace"], program: "DPRK-CYBER", entityType: "entity", list: "OFAC-SDN", jurisdiction: "KP" },
  { id: "SDN-0030", name: "Tornado Cash", aliases: ["TornadoCash"], program: "CYBER2", entityType: "entity", list: "OFAC-SDN" },
  { id: "SDN-0031", name: "Evil Corp", aliases: ["Dridex Gang", "Indrik Spider"], program: "CYBER2", entityType: "entity", list: "OFAC-SDN", jurisdiction: "RU" },
  { id: "SDN-0032", name: "Garantex", aliases: ["Garantex Europe OU"], program: "CYBER2", entityType: "entity", list: "OFAC-SDN", jurisdiction: "RU" },
  { id: "SDN-0033", name: "SUEX OTC", aliases: ["Suex"], program: "CYBER2", entityType: "entity", list: "OFAC-SDN" },
  { id: "SDN-0034", name: "Bitzlato", aliases: ["Bitzlato Limited"], program: "CYBER2", entityType: "entity", list: "OFAC-SDN" },
  { id: "SDN-0035", name: "Blender.io", aliases: ["Blender"], program: "DPRK-CYBER", entityType: "entity", list: "OFAC-SDN" },

  // ── Banks / state-owned enterprises ─────────────────────────────────────────
  { id: "SDN-0036", name: "Bank Melli Iran", aliases: ["Bank Melli", "National Bank of Iran"], program: "IRAN", entityType: "entity", list: "OFAC-SDN", jurisdiction: "IR" },
  { id: "SDN-0037", name: "National Iranian Oil Company", aliases: ["NIOC"], program: "IRAN", entityType: "entity", list: "OFAC-SDN", jurisdiction: "IR" },
  { id: "SDN-0038", name: "Sberbank of Russia", aliases: ["Sberbank", "Sberbank Rossii"], program: "RUSSIA-EO14024", entityType: "entity", list: "OFAC-SDN", jurisdiction: "RU" },
  { id: "SDN-0039", name: "Public Joint Stock Company Rosneft Oil Company", aliases: ["Rosneft"], program: "RUSSIA-EO14024", entityType: "entity", list: "OFAC-SDN", jurisdiction: "RU" },
  { id: "SDN-0040", name: "Rosoboronexport", aliases: ["ROE", "Russian Defense Export"], program: "RUSSIA-EO14024", entityType: "entity", list: "OFAC-SDN", jurisdiction: "RU" },

  // ── Vessels ─────────────────────────────────────────────────────────────────
  { id: "SDN-0041", name: "ADRIAN DARYA 1", aliases: ["Grace 1"], program: "IRAN", entityType: "vessel", list: "OFAC-SDN", jurisdiction: "IR" },

  // ── Consolidated (non-SDN) list samples ─────────────────────────────────────
  { id: "CONS-0001", name: "Huawei Technologies Co Ltd", aliases: ["Huawei"], program: "NS-CMIC", entityType: "entity", list: "OFAC-CONSOLIDATED", jurisdiction: "CN" },
  { id: "CONS-0002", name: "China Mobile Communications Group", aliases: ["China Mobile"], program: "NS-CMIC", entityType: "entity", list: "OFAC-CONSOLIDATED", jurisdiction: "CN" },
  { id: "CONS-0003", name: "Semiconductor Manufacturing International Corporation", aliases: ["SMIC"], program: "NS-CMIC", entityType: "entity", list: "OFAC-CONSOLIDATED", jurisdiction: "CN" },
  { id: "CONS-0004", name: "Cubametales", aliases: ["Comercial Cuba Metales"], program: "CUBA", entityType: "entity", list: "OFAC-CONSOLIDATED", jurisdiction: "CU" },
  { id: "CONS-0005", name: "Rossiya Segodnya", aliases: ["Rossiya Segodnya International Information Agency"], program: "RUSSIA-EO14024", entityType: "entity", list: "OFAC-CONSOLIDATED", jurisdiction: "RU" },
];
