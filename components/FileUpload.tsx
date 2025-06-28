import RuleBuilder, { Rule } from "./RuleBuilder";
import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – JSZip's typings export default but some bundlers flag it; this silences TS redline
import JSZip from "jszip";

import * as XLSX from "xlsx";
import DataTable, {
  TableColumn,
  ConditionalStyles,
} from "react-data-table-component";

/* ---------- Types ---------- */
interface BaseRow {
  [key: string]: any;
}

interface MappedRow extends BaseRow {
  ClientID?: string;
  PriorityLevel?: string;
  AttributesJSON?: string;
  __errors?: string[];
  dirty?: boolean;
}

const EXPECTED_FIELDS = ["ClientID", "PriorityLevel", "AttributesJSON"] as const;

const downloadFile = (name: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

export default function FileUpload() {
  const [datasetType, setDatasetType] = useState<"clients" | "tasks" | "workers" | "">("");
  const [rawRows, setRawRows] = useState<BaseRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [customRules, setCustomRules] = useState<Rule[]>([]);
  const [rows, setRows] = useState<MappedRow[]>([]);
  const [history, setHistory] = useState<MappedRow[][]>([]);
  const [redoStack, setRedoStack] = useState<MappedRow[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<MappedRow>>({});
  const [searchText, setSearchText] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showOnlyValid, setShowOnlyValid] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);

  const mapRow = (row: BaseRow, map: Record<string, string>): MappedRow => {
    const mapped: MappedRow = { ...row };
    EXPECTED_FIELDS.forEach((f) => {
      const src = map[f];
      if (src && src in row) mapped[f] = row[src];
    });
    return mapped;
  };

  const mapRows = (raw: BaseRow[], map: Record<string, string>) => raw.map((r) => mapRow(r, map));

  const applyRules = (row: MappedRow): string[] => {
    const errors: string[] = [];
    for (const rule of customRules) {
      const fieldVal = String(row[rule.field] ?? "");
      const compare = rule.value;
      let failed = false;
      switch (rule.condition) {
        case "equals":
          failed = fieldVal !== compare;
          break;
        case "not equals":
          failed = fieldVal === compare;
          break;
        case "contains":
          failed = !fieldVal.includes(compare);
          break;
        case "not contains":
          failed = fieldVal.includes(compare);
          break;
      }
      if (failed) errors.push(rule.message || `Rule failed on ${rule.field}`);
    }
    return errors;
  };

  const validateRows = (mapped: MappedRow[]): MappedRow[] => {
    const seen = new Set<string>();
    return mapped.map((row): MappedRow => {
      const errors: string[] = [];
      const id = row.ClientID?.trim();
      if (!id) errors.push("Missing ClientID");
      else if (seen.has(id)) errors.push("Duplicate ClientID");
      else seen.add(id);

      const prio = Number(row.PriorityLevel);
      if (!Number.isInteger(prio) || prio < 1 || prio > 5) errors.push("PriorityLevel 1‑5");

      try {
        if (row.AttributesJSON) JSON.parse(row.AttributesJSON);
      } catch {
        errors.push("Bad JSON");
      }

      return { ...row, __errors: [...errors, ...applyRules(row)] };
    });
  };

  const pushToHistory = (next: MappedRow[]) => {
    setHistory((prev) => [...prev, rows]);
    setRedoStack([]);
    setRows(next);
  };

  const handleUndo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setRedoStack((r) => [rows, ...r]);
    setRows(prev);
  };

  const handleRedo = () => {
    if (!redoStack.length) return;
    const next = redoStack[0];
    setRedoStack((r) => r.slice(1));
    setHistory((h) => [...h, rows]);
    setRows(next);
  };

  const revalidate = (raw: BaseRow[], map: Record<string, string>) => {
    const mapped = mapRows(raw, map);
    pushToHistory(validateRows(mapped));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const processData = (data: BaseRow[]) => {
      setLoading(true);
      setTimeout(() => {
        setRawRows(data);
        const hdrs = Object.keys(data[0] || {});
        setHeaders(hdrs);

        const initialMap: Record<string, string> = {};
        EXPECTED_FIELDS.forEach((f) => {
          initialMap[f] = hdrs.includes(f) ? f : hdrs[0];
        });
        setMapping(initialMap);
        revalidate(data, initialMap);
        setLoading(false);
      }, 100);
    };

    if (fileName.endsWith(".csv")) {
      Papa.parse<BaseRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data }) => processData(data),
      });
    } else if (fileName.endsWith(".xlsx")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const binaryStr = evt.target?.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData: BaseRow[] = XLSX.utils.sheet_to_json(sheet);
        processData(jsonData);
      };
      reader.readAsBinaryString(file);
    } else {
      alert("Unsupported file type. Please upload a .csv or .xlsx file.");
    }
  };

  useEffect(() => {
    if (rawRows.length) revalidate(rawRows, mapping);
  }, [mapping, customRules]);

  const getFilteredRows = () =>
    rows.filter((row) => {
      const matchesSearch = Object.values(row).some((val) =>
        String(val).toLowerCase().includes(searchText.toLowerCase())
      );
      const matchesPriority =
        priorityFilter === "all" || row.PriorityLevel === priorityFilter;
      const matchesValid = !showOnlyValid || (row.__errors?.length || 0) === 0;
      const showDirtyOnly = filters.__dirty === "true";
      const matchesDirty = !showDirtyOnly || row.dirty === true;

      const matchesColumnFilters = Object.entries(filters).every(([key, value]) => {
        if (key === "__dirty") return true;
        return !value
          ? true
          : String(row[key] ?? "").toLowerCase().includes(value.toLowerCase());
      });

      return matchesSearch && matchesPriority && matchesValid && matchesDirty && matchesColumnFilters;
    });

  const rowStyles: ConditionalStyles<MappedRow>[] = [
    {
      when: (row) => (row.__errors?.length || 0) > 0,
      style: {
        backgroundColor: "#fee2e2",
        borderLeft: "4px solid #dc2626",
        fontWeight: "500",
      },
    },
    {
      when: (row) => row.ClientID === editRowId,
      style: {
        backgroundColor: "#fefcbf",
        borderLeft: "4px solid #d97706",
      },
    },
    {
      when: (row) => row.dirty === true,
      style: {
        backgroundColor: "#e0f2fe",
        borderLeft: "4px solid #0284c7",
      },
    },
  ];

  const columns: TableColumn<MappedRow>[] = [
    ...headers.map((h): TableColumn<MappedRow> => ({
      name: h,
      selector: (row: MappedRow): string => String(row[h as keyof MappedRow] ?? ""),
      cell: (row: MappedRow) =>
        h === "PriorityLevel" ? (
          <input
            type="range"
            min={1}
            max={5}
            value={Number(row[h] ?? 1)}
            onChange={(e) => {
              const updated = rows.map((r) =>
                r.ClientID === row.ClientID
                  ? {
                      ...r,
                      [h]: e.target.value,
                      dirty: true,
                      __errors: applyRules({ ...r, [h]: e.target.value }),
                    }
                  : r
              );
              pushToHistory(updated);
            }}
          />
        ) : (
          <span>{String(row[h as keyof MappedRow] ?? "")}</span>
        ),
      sortable: true,
      wrap: true,
    })),
    {
      name: "Status",
      selector: (row: MappedRow): string => (row.__errors || []).join("; "),
      cell: (row: MappedRow) =>
        row.__errors && row.__errors.length ? (
          <span className="text-red-600 font-medium">{row.__errors.join("; ")}</span>
        ) : (
          <span className="text-green-600 font-semibold">✓</span>
        ),
      maxWidth: "220px",
    },
  ];

  /* ------------------ RENDER ------------------ */
  return (
    <div className="bg-white p-6 rounded shadow w-full">
      <h2 className="text-xl font-bold mb-4">📂 Upload and Validate Data</h2>

      {/* Dataset Selector */}
      <select
        value={datasetType}
        onChange={(e) => setDatasetType(e.target.value as any)}
        className="border px-3 py-2 rounded w-full mb-4"
      >
        <option value="">-- Select Dataset --</option>
        <option value="clients">Clients</option>
        <option value="tasks">Tasks</option>
        <option value="workers">Workers</option>
      </select>

      {/* File Upload */}
      <input
        type="file"
        accept=".csv, .xlsx"
        onChange={handleFileUpload}
        disabled={!datasetType}
        className="mb-4"
      />

      {loading && (
        <div className="flex items-center justify-center py-10">
          <span className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500 border-solid" />
          <span className="ml-3 text-blue-600 font-semibold">Processing File...</span>
        </div>
      )}

      {/* MAIN UI after headers */}
      {headers.length > 0 && !loading && (
        <>
          {/* Mapping */}
          <div className="mb-6 border rounded p-4 bg-gray-50">
            <h3 className="font-semibold mb-3">🗺️ Map incoming columns</h3>
            {EXPECTED_FIELDS.map((f) => (
              <div key={f} className="flex items-center gap-2 mb-2">
                <label className="w-40 font-medium">{f}</label>
                <select
                  value={mapping[f] || ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [f]: e.target.value }))}
                  className="border px-2 py-1 rounded"
                >
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Rule Builder */}
          <RuleBuilder
            headers={headers}
            onAddRule={(rule) => setCustomRules((prev) => [...prev, rule])}
          />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`px-4 py-2 rounded ${history.length === 0 ? "bg-gray-300" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
            >
              Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className={`px-4 py-2 rounded ${redoStack.length === 0 ? "bg-gray-300" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
            >
              Redo
            </button>
            <button
              onClick={() => {
                const valid = rows.filter((r) => (r.__errors?.length || 0) === 0);
                const csv = Papa.unparse(valid.map(({ __errors, dirty, ...rest }) => rest));
                downloadFile("valid-rows.csv", csv, "text/csv");
              }}
              className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
            >
              Export CSV
            </button>
            <button
              onClick={() => {
                const valid = rows.filter((r) => (r.__errors?.length || 0) === 0);
                const json = JSON.stringify(valid.map(({ __errors, dirty, ...rest }) => rest), null, 2);
                downloadFile("valid-rows.json", json, "application/json");
              }}
              className="px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Export JSON
            </button>
            <button
              onClick={async () => {
                const valid = rows.filter((r) => (r.__errors?.length || 0) === 0);
                const csv = Papa.unparse(valid.map(({ __errors, dirty, ...rest }) => rest));
                const json = JSON.stringify(valid.map(({ __errors, dirty, ...rest }) => rest), null, 2);
                const zip = new JSZip();
                zip.file("valid-rows.csv", csv);
                zip.file("valid-rows.json", json);
                const blob = await zip.generateAsync({ type: "blob" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "valid-data.zip";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white"
            >
              Export ZIP
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center mb-4">
            <input
              type="text"
              placeholder="Search rows..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="px-3 py-2 border rounded w-full sm:w-64"
            />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border px-2 py-1 rounded"
            >
              <option value="all">All Priorities</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>Priority {n}</option>
              ))}
            </select>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlyValid}
                onChange={(e) => setShowOnlyValid(e.target.checked)}
              />
              <span>Show only valid</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.__dirty === "true"}
                onChange={(e) => setFilters((f) => ({ ...f, __dirty: e.target.checked ? "true" : "" }))}
              />
              <span>Show only changed</span>
            </label>
          </div>

          {/* Column filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
            {headers.map((header) => (
              <input
                key={header}
                type="text"
                placeholder={`Filter ${header}`}
                value={filters[header] || ""}
                onChange={(e) => setFilters((prev) => ({ ...prev, [header]: e.target.value }))}
                className="border px-2 py-1 rounded"
              />
            ))}
          </div>

          {/* DataTable */}
          <DataTable
            title="Validated Data"
            columns={columns}
            data={getFilteredRows()}
            pagination
            highlightOnHover
            striped
            dense
            conditionalRowStyles={rowStyles}
          />
        </>
      )}
    </div>
  );
}