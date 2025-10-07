import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { GitBranch, Play, Plus, Trash2, FileText, Activity, CheckCircle, XCircle, Clock, BookOpen, X, Upload, Download, Copy, AlertCircle, Loader2, ChevronRight, Zap, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Pipeline {
  id: string;
  name: string;
  description: string;
  config: any;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Execution {
  id: string;
  pipeline_id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  input_data: any;
  output_data: any;
  metrics: any;
  error_message?: string;
}

export function DocETLPipelines() {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [executions, setExecutions] = useState<Record<string, Execution[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPipelineType, setSelectedPipelineType] = useState<'general' | 'exam'>('general');
  const [showTutorial, setShowTutorial] = useState(true);

  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [executingPipeline, setExecutingPipeline] = useState<Pipeline | null>(null);
  const [inputData, setInputData] = useState('');
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [executionStep, setExecutionStep] = useState<'input' | 'confirm' | 'executing' | 'results'>('input');
  const [currentExecution, setCurrentExecution] = useState<Execution | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  useEffect(() => {
    loadPipelines();
  }, []);

  const loadPipelines = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('docetl_pipelines')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPipelines(data || []);

      for (const pipeline of data || []) {
        loadExecutions(pipeline.id);
      }
    } catch (error) {
      console.error('Error loading pipelines:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async (pipelineId: string) => {
    try {
      const { data, error } = await supabase
        .from('docetl_executions')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setExecutions(prev => ({
        ...prev,
        [pipelineId]: data || []
      }));
    } catch (error) {
      console.error('Error loading executions:', error);
    }
  };

  const handleExecutePipeline = (pipeline: Pipeline) => {
    setExecutingPipeline(pipeline);
    setShowExecuteModal(true);
    setExecutionStep('input');
    setInputData('');
    setInputFile(null);
    setCurrentExecution(null);
    setExecutionError(null);

    const sampleData = generateSampleData(pipeline);
    setInputData(JSON.stringify(sampleData, null, 2));
  };

  const generateSampleData = (pipeline: Pipeline) => {
    if (pipeline.name.toLowerCase().includes('exam')) {
      return [{
        content: "Question 1: What is 2+2?\nA) 3\nB) 4\nC) 5\nD) 6\n\nQuestion 2: What is the capital of France?\nA) London\nB) Paris\nC) Rome\nD) Madrid",
        metadata: { source: "sample_exam.pdf" }
      }];
    }
    return [{
      content: "Sample document content for processing. This document contains important information about various topics including technology, science, and education.",
      metadata: { title: "Sample Document", date: "2024-01-15" }
    }];
  };

  const handleFileUpload = async (file: File) => {
    setInputFile(file);

    if (file.type === 'application/json') {
      const text = await file.text();
      setInputData(text);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const wrappedData = [{
          content: text,
          metadata: { filename: file.name }
        }];
        setInputData(JSON.stringify(wrappedData, null, 2));
      };
      reader.readAsText(file);
    }
  };

  const validateInputData = () => {
    try {
      const parsed = JSON.parse(inputData);
      if (!Array.isArray(parsed)) {
        return { valid: false, error: 'Input data must be an array of objects' };
      }
      if (parsed.length === 0) {
        return { valid: false, error: 'Input data cannot be empty' };
      }
      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: 'Invalid JSON format' };
    }
  };

  const executeWithData = async () => {
    if (!executingPipeline) return;

    const validation = validateInputData();
    if (!validation.valid) {
      setExecutionError(validation.error);
      return;
    }

    setExecutionStep('executing');
    setExecutionError(null);

    try {
      const parsedInput = JSON.parse(inputData);

      const { data, error } = await supabase.functions.invoke('execute-docetl-pipeline', {
        body: {
          pipeline_id: executingPipeline.id,
          input_data: parsedInput,
          user_id: user?.id
        }
      });

      if (error) throw error;

      if (data?.success) {
        const { data: executionData } = await supabase
          .from('docetl_executions')
          .select('*')
          .eq('id', data.execution_id)
          .single();

        setCurrentExecution(executionData);
        setExecutionStep('results');
        loadExecutions(executingPipeline.id);
      } else {
        throw new Error(data?.error || 'Pipeline execution failed');
      }
    } catch (error) {
      console.error('Execution error:', error);
      setExecutionError(error instanceof Error ? error.message : 'Unknown error occurred');
      setExecutionStep('input');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadResults = (execution: Execution) => {
    const blob = new Blob([JSON.stringify(execution.output_data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline-results-${execution.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const createExamplePipeline = async () => {
    try {
      let pipelineConfig;

      if (selectedPipelineType === 'exam') {
        pipelineConfig = {
          name: 'Exam Question Extractor Pipeline',
          description: 'Extract exam questions, answers, topics, tags, and difficulty from uploaded documents',
          user_id: user?.id,
          status: 'active',
          config: {
            operators: [
              {
                id: 'op1',
                name: 'extract_questions',
                type: 'map',
                config: {
                  prompt: 'Extract all exam questions from this document. For each question, identify: the question text, all possible answer options (A, B, C, D, etc.), the correct answer, the topic/subject area, relevant tags (e.g., "multiple-choice", "calculation", "theory"), and the difficulty level (easy, medium, hard, expert). Format as structured data.',
                  model: 'gpt-4o-mini',
                  output_schema: {
                    questions: 'array',
                    question_text: 'string',
                    options: 'array',
                    correct_answer: 'string',
                    topic: 'string',
                    tags: 'array',
                    difficulty: 'string',
                    points: 'number',
                    explanation: 'string'
                  }
                }
              },
              {
                id: 'op2',
                name: 'expand_questions',
                type: 'unnest',
                config: {
                  unnest_key: 'questions'
                }
              },
              {
                id: 'op3',
                name: 'filter_valid',
                type: 'filter',
                config: {
                  filter_condition: 'item.question_text && item.correct_answer && item.options && item.options.length > 0'
                }
              },
              {
                id: 'op4',
                name: 'group_by_difficulty',
                type: 'reduce',
                config: {
                  reduce_key: 'difficulty',
                  fold_prompt: 'Group all questions by difficulty level and provide statistics on question count per difficulty',
                  model: 'gpt-4o-mini'
                }
              }
            ]
          }
        };
      } else {
        pipelineConfig = {
          name: 'Example Document Processing Pipeline',
          description: 'Extract key information from documents and summarize',
          user_id: user?.id,
          status: 'active',
          config: {
            operators: [
              {
                id: 'op1',
                name: 'extract_info',
                type: 'map',
                config: {
                  prompt: 'Extract the following information from the document: title, author, date, and main topics.',
                  model: 'gpt-4o-mini',
                  output_schema: {
                    title: 'string',
                    author: 'string',
                    date: 'string',
                    main_topics: 'array'
                  }
                }
              },
              {
                id: 'op2',
                name: 'filter_recent',
                type: 'filter',
                config: {
                  filter_condition: 'new Date(item.date) > new Date("2020-01-01")'
                }
              },
              {
                id: 'op3',
                name: 'summarize',
                type: 'reduce',
                config: {
                  reduce_key: 'main_topics',
                  fold_prompt: 'Summarize all documents about this topic',
                  model: 'gpt-4o-mini'
                }
              }
            ]
          }
        };
      }

      const { data, error } = await supabase
        .from('docetl_pipelines')
        .insert(pipelineConfig)
        .select()
        .single();

      if (error) throw error;

      loadPipelines();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating pipeline:', error);
      alert('Failed to create pipeline');
    }
  };

  const deletePipeline = async (pipelineId: string) => {
    if (!confirm('Are you sure you want to delete this pipeline?')) return;

    try {
      const { error } = await supabase
        .from('docetl_pipelines')
        .delete()
        .eq('id', pipelineId);

      if (error) throw error;

      loadPipelines();
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      alert('Failed to delete pipeline');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <GitBranch className="w-8 h-8 text-blue-600" />
              DocETL Pipelines
            </h1>
            <p className="text-gray-600">
              Create and execute LLM-powered document processing workflows
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Pipeline
          </button>
        </div>

        {showTutorial && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">How to Use DocETL Pipelines</h3>
                  <p className="text-sm text-gray-600">Transform documents with AI-powered workflows</p>
                </div>
              </div>
              <button
                onClick={() => setShowTutorial(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <h4 className="font-semibold text-gray-900">Create Pipeline</h4>
                </div>
                <p className="text-xs text-gray-600">
                  Click "New Pipeline" to create a workflow from templates or build your own custom operators.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <h4 className="font-semibold text-gray-900">Execute Pipeline</h4>
                </div>
                <p className="text-xs text-gray-600">
                  Click the "Run Pipeline" button, upload your documents or paste JSON data, then click Execute.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <h4 className="font-semibold text-gray-900">Get Results</h4>
                </div>
                <p className="text-xs text-gray-600">
                  View structured output, download results as JSON, and review execution metrics.
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-900">
                <strong>Quick Tip:</strong> Start with a pre-built template to see how pipelines work, then customize it for your needs!
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : pipelines.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <GitBranch className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pipelines Yet</h3>
            <p className="text-gray-600 mb-4">Create your first DocETL pipeline to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Create Pipeline
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pipelines.map((pipeline) => (
              <div
                key={pipeline.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{pipeline.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(pipeline.status)}`}>
                        {pipeline.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{pipeline.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {pipeline.config?.operators?.length || 0} operators
                      </span>
                      <span>Created {new Date(pipeline.created_at).toLocaleDateString()}</span>
                      {executions[pipeline.id]?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <History className="w-4 h-4" />
                          {executions[pipeline.id].length} executions
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => handleExecutePipeline(pipeline)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg font-semibold"
                  >
                    <Play className="w-5 h-5" />
                    Run Pipeline
                  </button>

                  <button
                    onClick={() => setSelectedPipeline(pipeline.id === selectedPipeline ? null : pipeline.id)}
                    className="px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    {selectedPipeline === pipeline.id ? 'Hide Details' : 'View Details'}
                  </button>

                  <div className="flex-1"></div>

                  <button
                    onClick={() => deletePipeline(pipeline.id)}
                    className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Pipeline"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {selectedPipeline === pipeline.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Pipeline Configuration</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(pipeline.config, null, 2)}
                          </pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Recent Executions
                        </h4>
                        {executions[pipeline.id]?.length > 0 ? (
                          <div className="space-y-2">
                            {executions[pipeline.id].map((execution) => (
                              <div
                                key={execution.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  {getStatusIcon(execution.status)}
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{execution.status}</p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(execution.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                {execution.metrics && execution.metrics.total_duration_ms && (
                                  <div className="text-xs text-gray-600 mr-2">
                                    {execution.metrics.total_duration_ms}ms
                                  </div>
                                )}
                                {execution.status === 'completed' && (
                                  <button
                                    onClick={() => downloadResults(execution)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Download Results"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No executions yet</p>
                            <button
                              onClick={() => handleExecutePipeline(pipeline)}
                              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Run your first execution
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New Pipeline</h2>
              <p className="text-gray-600 mb-6">
                Choose a pre-built pipeline template to get started quickly. You can customize it after creation.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Select Pipeline Template
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedPipelineType('general')}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      selectedPipelineType === 'general'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selectedPipelineType === 'general' ? 'bg-blue-600' : 'bg-gray-200'
                      }`}>
                        <FileText className={`w-5 h-5 ${selectedPipelineType === 'general' ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">General Document Processing</h3>
                        <p className="text-xs text-gray-600 mb-2">
                          Extract key information, filter by date, and summarize by topics
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Map</span>
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">Filter</span>
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">Reduce</span>
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedPipelineType('exam')}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      selectedPipelineType === 'exam'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selectedPipelineType === 'exam' ? 'bg-blue-600' : 'bg-gray-200'
                      }`}>
                        <FileText className={`w-5 h-5 ${selectedPipelineType === 'exam' ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">Exam Question Extractor</h3>
                        <p className="text-xs text-gray-600 mb-2">
                          Extract questions, answers, topics, tags, and difficulty levels
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Map</span>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Unnest</span>
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">Filter</span>
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">Reduce</span>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {selectedPipelineType === 'exam' && (
                <div className="mb-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Exam Question Extractor Features</h4>
                  <ul className="space-y-1 text-sm text-green-800">
                    <li>• Automatically extracts all questions from exam documents</li>
                    <li>• Identifies answer options (A, B, C, D, etc.) and correct answers</li>
                    <li>• Categorizes questions by topic and assigns relevant tags</li>
                    <li>• Determines difficulty level (easy, medium, hard, expert)</li>
                    <li>• Groups questions by difficulty for analysis</li>
                    <li>• Perfect for creating question banks and study materials</li>
                  </ul>
                </div>
              )}

              {selectedPipelineType === 'general' && (
                <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">General Document Processing Features</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Extracts titles, authors, dates, and main topics</li>
                    <li>• Filters documents based on date criteria</li>
                    <li>• Groups and summarizes documents by topic</li>
                    <li>• Great starting point for custom workflows</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createExamplePipeline}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Pipeline
                </button>
              </div>
            </div>
          </div>
        )}

        {showExecuteModal && executingPipeline && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Execute Pipeline</h2>
                    <p className="text-sm text-gray-600 mt-1">{executingPipeline.name}</p>
                  </div>
                  <button
                    onClick={() => setShowExecuteModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                    executionStep === 'input' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
                    Input Data
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                    executionStep === 'executing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
                    Execute
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                    executionStep === 'results' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">3</span>
                    Results
                  </div>
                </div>
              </div>

              <div className="p-6">
                {executionStep === 'input' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Provide Input Data</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Upload a file or paste JSON data. Sample data is pre-filled to help you get started.
                      </p>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload File (JSON, TXT, or any text-based format)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                          <input
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file);
                            }}
                            className="hidden"
                            id="file-upload"
                            accept=".json,.txt,.csv"
                          />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">
                              {inputFile ? inputFile.name : 'Click to upload or drag and drop'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">JSON, TXT, CSV files accepted</p>
                          </label>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Or Edit JSON Data Directly
                        </label>
                        <textarea
                          value={inputData}
                          onChange={(e) => setInputData(e.target.value)}
                          className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder='[{"content": "Your document text here..."}]'
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Input must be valid JSON array format. Each item should have a "content" field.
                        </p>
                      </div>

                      {executionError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-900">Input Error</p>
                            <p className="text-sm text-red-700">{executionError}</p>
                          </div>
                        </div>
                      )}

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">Expected Input Format</h4>
                        <pre className="text-xs text-blue-800 overflow-x-auto">
{`[
  {
    "content": "Document text to process",
    "metadata": {
      "optional": "fields"
    }
  }
]`}
                        </pre>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                      <button
                        onClick={() => setShowExecuteModal(false)}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={executeWithData}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                      >
                        <Zap className="w-4 h-4" />
                        Execute Pipeline
                      </button>
                    </div>
                  </div>
                )}

                {executionStep === 'executing' && (
                  <div className="py-12 text-center">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Pipeline...</h3>
                    <p className="text-gray-600 mb-4">
                      Running {executingPipeline.config?.operators?.length || 0} operators
                    </p>
                    <div className="max-w-md mx-auto bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-blue-600 animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-4">This may take a minute depending on your data...</p>
                  </div>
                )}

                {executionStep === 'results' && currentExecution && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">Execution Complete!</h3>
                        <p className="text-sm text-gray-600">
                          Processed in {currentExecution.metrics?.total_duration_ms}ms
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(currentExecution.output_data, null, 2))}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          Copy
                        </button>
                        <button
                          onClick={() => downloadResults(currentExecution)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium mb-1">Operators Executed</p>
                        <p className="text-2xl font-bold text-green-900">
                          {currentExecution.metrics?.operators_executed || 0}
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-600 font-medium mb-1">Processing Time</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {currentExecution.metrics?.total_duration_ms}ms
                        </p>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-sm text-purple-600 font-medium mb-1">Output Items</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {currentExecution.output_data?.results?.length || 0}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Structured Output</h4>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(currentExecution.output_data, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                      <button
                        onClick={() => {
                          setShowExecuteModal(false);
                          setExecutionStep('input');
                        }}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          setExecutionStep('input');
                          setCurrentExecution(null);
                          setInputData(JSON.stringify(generateSampleData(executingPipeline), null, 2));
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Run Again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
