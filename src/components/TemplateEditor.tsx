import { useState, useEffect } from 'react';
import { FileJson, Plus, Loader2, Copy, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Template {
  id: string;
  name: string;
  description: string | null;
  template_schema: any;
  is_public: boolean;
}

interface TemplateEditorProps {
  onTemplateSelect: (template: any) => void;
  selectedTemplate: any;
}

export function TemplateEditor({ onTemplateSelect, selectedTemplate }: TemplateEditorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [customJson, setCustomJson] = useState('');
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('structure_templates')
        .select('*')
        .eq('is_public', true)
        .order('name');

      if (error) throw error;
      
      // Custom order: Priority templates first
      const priorityOrder = [
        'Exam Questions',
        'Receipt',
        'Medical Record',
        'Lab Report',
        'Meeting Minutes',
        'Document Summary'
      ];
      
      const sorted = (data || []).sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a.name);
        const bIndex = priorityOrder.indexOf(b.name);
        
        // If both are in priority list, sort by priority order
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        // If only a is in priority list, it comes first
        if (aIndex !== -1) return -1;
        // If only b is in priority list, it comes first
        if (bIndex !== -1) return 1;
        // Otherwise, sort alphabetically
        return a.name.localeCompare(b.name);
      });
      
      setTemplates(sorted);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateClick = (template: Template) => {
    onTemplateSelect(template.template_schema);
    setShowCustomEditor(false);
  };

  const handleCustomJsonChange = (value: string) => {
    setCustomJson(value);
    setJsonError('');

    if (value.trim()) {
      try {
        const parsed = JSON.parse(value);
        onTemplateSelect(parsed);
      } catch (error) {
        setJsonError('Invalid JSON format');
      }
    }
  };

  const formatJsonForDisplay = (obj: any): string => {
    return JSON.stringify(obj, null, 2);
  };

  const defaultTemplate = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      date: { type: 'string' },
      summary: { type: 'string' },
      key_points: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  };

  useEffect(() => {
    if (showCustomEditor && !customJson) {
      setCustomJson(formatJsonForDisplay(defaultTemplate));
      onTemplateSelect(defaultTemplate);
    }
  }, [showCustomEditor]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileJson className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Output Structure Template
          </h3>
        </div>

        <button
          onClick={() => setShowCustomEditor(!showCustomEditor)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
        >
          {showCustomEditor ? (
            <>
              <Copy className="w-4 h-4" />
              Use Preset
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Custom JSON
            </>
          )}
        </button>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900">
          Templates define how your extracted data will be structured. Choose a pre-built template or create your own custom JSON schema.
        </p>
      </div>

      {!showCustomEditor ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => {
            const isSelected =
              JSON.stringify(selectedTemplate) === JSON.stringify(template.template_schema);

            return (
              <button
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all
                  ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{template.name}</h4>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                )}
                <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded overflow-x-auto">
                  {Object.keys(template.template_schema.properties || {}).join(', ')}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom JSON Schema
            </label>
            <textarea
              value={customJson}
              onChange={(e) => handleCustomJsonChange(e.target.value)}
              className={`
                w-full h-64 px-4 py-3 border rounded-lg font-mono text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${jsonError ? 'border-red-500' : 'border-gray-300'}
              `}
              placeholder="Enter your custom JSON schema..."
            />
            {jsonError && (
              <p className="mt-2 text-sm text-red-600">{jsonError}</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Tip:</strong> Define your structure using JSON Schema format.
              Include properties with types like string, number, boolean, array, or
              object.
            </p>
          </div>
        </div>
      )}

      {selectedTemplate && !showCustomEditor && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Selected Schema:</p>
          <pre className="text-xs text-gray-600 overflow-x-auto">
            {formatJsonForDisplay(selectedTemplate)}
          </pre>
        </div>
      )}
    </div>
  );
}
