import { useState } from 'react';
import { Plus, Download, Trash2, Check } from 'lucide-react';

const TEMPLATES_TO_ADD = [
  {
    name: 'Invoice',
    description: 'Extract invoice details including items, amounts, dates, and vendor information',
    template_schema: {
      type: 'object',
      properties: {
        invoice_number: { type: 'string' },
        invoice_date: { type: 'string' },
        due_date: { type: 'string' },
        vendor_name: { type: 'string' },
        vendor_address: { type: 'string' },
        customer_name: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
              total: { type: 'number' }
            }
          }
        },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        total_amount: { type: 'number' }
      }
    }
  },
  // Add all other templates here...
];

export function TemplateManager() {
  const [copied, setCopied] = useState(false);

  const sqlToRun = `
-- Copy this SQL and run it in Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/lbjjzisqbihrlosozfgr/sql/new

INSERT INTO structure_templates (name, description, template_schema, is_public, user_id)
VALUES
${TEMPLATES_TO_ADD.map((t, i) => `  (
    '${t.name.replace(/'/g, "''")}',
    '${t.description.replace(/'/g, "''")}',
    '${JSON.stringify(t.template_schema)}'::jsonb,
    true,
    NULL
  )${i < TEMPLATES_TO_ADD.length - 1 ? ',' : ''}`).join('\n')}
ON CONFLICT DO NOTHING;
  `.trim();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sqlToRun);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Add All Templates</h1>
          <p className="text-gray-600 mb-6">
            Click the button below to copy the SQL, then paste it into Supabase SQL Editor.
          </p>

          <div className="mb-6">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Copy SQL to Clipboard
                </>
              )}
            </button>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 text-sm font-mono">{sqlToRun}</pre>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">Next Steps:</p>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Click "Copy SQL to Clipboard" above</li>
              <li>Open: <a href="https://supabase.com/dashboard/project/lbjjzisqbihrlosozfgr/sql/new" target="_blank" rel="noopener noreferrer" className="underline">Supabase SQL Editor</a></li>
              <li>Paste the SQL and click "Run"</li>
              <li>Refresh your app to see {TEMPLATES_TO_ADD.length} new templates!</li>
            </ol>
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-3">Templates Being Added:</h2>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES_TO_ADD.map((t) => (
                <div key={t.name} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Plus className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

