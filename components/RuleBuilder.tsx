// RuleBuilder.tsx
import { useState } from "react";

interface Rule {
  field: string;
  condition: string;
  value: string;
  message: string;
}

const conditions = ["equals", "not equals", "contains", "not contains"];

const RuleBuilder = ({ headers, onAddRule }: { headers: string[]; onAddRule: (rule: Rule) => void }) => {
  const [rule, setRule] = useState<Rule>({
    field: headers[0] || "",
    condition: "equals",
    value: "",
    message: "Custom validation failed."
  });

  const handleAdd = () => {
    if (rule.field && rule.condition && rule.value) {
      onAddRule(rule);
      setRule({ ...rule, value: "", message: "Custom validation failed." });
    }
  };

  return (
    <div className="border rounded p-4 bg-gray-50 mb-6">
      <h3 className="text-lg font-semibold mb-2">Add Validation Rule</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <select
          value={rule.field}
          onChange={(e) => setRule({ ...rule, field: e.target.value })}
          className="border px-2 py-1 rounded"
        >
          {headers.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>

        <select
          value={rule.condition}
          onChange={(e) => setRule({ ...rule, condition: e.target.value })}
          className="border px-2 py-1 rounded"
        >
          {conditions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Value"
          value={rule.value}
          onChange={(e) => setRule({ ...rule, value: e.target.value })}
          className="border px-2 py-1 rounded"
        />

        <input
          type="text"
          placeholder="Custom error message"
          value={rule.message}
          onChange={(e) => setRule({ ...rule, message: e.target.value })}
          className="border px-2 py-1 rounded"
        />
      </div>
      <button
        onClick={handleAdd}
        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        ➕ Add Rule
      </button>
    </div>
  );
};

export default RuleBuilder;
export type { Rule };
