import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, FileText, Clock, CheckCircle, XCircle, BarChart3, Calendar, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AnalyticsData {
  totalDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  successRate: number;
  documentsThisWeek: number;
  documentsThisMonth: number;
  providerUsage: { provider: string; count: number }[];
  llmProviderUsage: { provider: string; count: number }[];
  templateUsage: { template_name: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
}

export function Analytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalDocuments: 0,
    completedDocuments: 0,
    failedDocuments: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    successRate: 0,
    documentsThisWeek: 0,
    documentsThisMonth: 0,
    providerUsage: [],
    llmProviderUsage: [],
    templateUsage: [],
    dailyActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all documents and jobs for the user
      const { data: documents } = await supabase
        .from('documents')
        .select(`
          id,
          status,
          created_at,
          processing_jobs (
            id,
            processing_time_ms,
            ocr_provider,
            llm_provider,
            status,
            structure_template
          )
        `)
        .eq('user_id', user?.id || null);

      if (!documents) {
        setLoading(false);
        return;
      }

      const total = documents.length;
      const completed = documents.filter(d => d.status === 'completed').length;
      const failed = documents.filter(d => d.status === 'failed').length;

      const jobs = documents.flatMap(d => d.processing_jobs || []);
      const completedJobs = jobs.filter(j => j.status === 'completed' && j.processing_time_ms);
      
      const totalTime = completedJobs.reduce((sum, j) => sum + (j.processing_time_ms || 0), 0);
      const avgTime = completedJobs.length > 0 ? totalTime / completedJobs.length : 0;

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const docsThisWeek = documents.filter(d => new Date(d.created_at) >= weekAgo).length;
      const docsThisMonth = documents.filter(d => new Date(d.created_at) >= monthAgo).length;

      // OCR Provider usage
      const ocrProviders: { [key: string]: number } = {};
      jobs.forEach(j => {
        if (j.ocr_provider) {
          ocrProviders[j.ocr_provider] = (ocrProviders[j.ocr_provider] || 0) + 1;
        }
      });

      // LLM Provider usage
      const llmProviders: { [key: string]: number } = {};
      jobs.forEach(j => {
        if (j.llm_provider) {
          llmProviders[j.llm_provider] = (llmProviders[j.llm_provider] || 0) + 1;
        }
      });

      // Template usage
      const templates: { [key: string]: number } = {};
      jobs.forEach(j => {
        if (j.structure_template) {
          const templateName = typeof j.structure_template === 'object' 
            ? 'Custom Template' 
            : j.structure_template;
          templates[templateName] = (templates[templateName] || 0) + 1;
        }
      });

      // Daily activity (last 30 days)
      const dailyActivity: { [key: string]: number } = {};
      documents.forEach(d => {
        const date = new Date(d.created_at).toLocaleDateString();
        dailyActivity[date] = (dailyActivity[date] || 0) + 1;
      });

      setAnalytics({
        totalDocuments: total,
        completedDocuments: completed,
        failedDocuments: failed,
        totalProcessingTime: totalTime,
        averageProcessingTime: avgTime,
        successRate: total > 0 ? (completed / total) * 100 : 0,
        documentsThisWeek: docsThisWeek,
        documentsThisMonth: docsThisMonth,
        providerUsage: Object.entries(ocrProviders).map(([provider, count]) => ({ provider, count })),
        llmProviderUsage: Object.entries(llmProviders).map(([provider, count]) => ({ provider, count })),
        templateUsage: Object.entries(templates).map(([template_name, count]) => ({ template_name, count })),
        dailyActivity: Object.entries(dailyActivity).map(([date, count]) => ({ date, count })),
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 animate-pulse mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Insights and statistics about your document processing
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Documents</span>
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{analytics.totalDocuments}</div>
            <div className="text-sm text-gray-500 mt-1">All time</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Success Rate</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{analytics.successRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-500 mt-1">
              {analytics.completedDocuments} completed
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Avg Processing</span>
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {(analytics.averageProcessingTime / 1000).toFixed(1)}s
            </div>
            <div className="text-sm text-gray-500 mt-1">Per document</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">This Month</span>
              <Calendar className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{analytics.documentsThisMonth}</div>
            <div className="text-sm text-gray-500 mt-1">
              {analytics.documentsThisWeek} this week
            </div>
          </div>
        </div>

        {/* Provider Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              OCR Provider Usage
            </h2>
            {analytics.providerUsage.length > 0 ? (
              <div className="space-y-3">
                {analytics.providerUsage
                  .sort((a, b) => b.count - a.count)
                  .map((item) => (
                    <div key={item.provider} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {item.provider.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${(item.count / Math.max(...analytics.providerUsage.map(p => p.count))) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No data yet</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              LLM Provider Usage
            </h2>
            {analytics.llmProviderUsage.length > 0 ? (
              <div className="space-y-3">
                {analytics.llmProviderUsage
                  .sort((a, b) => b.count - a.count)
                  .map((item) => (
                    <div key={item.provider} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {item.provider.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{
                              width: `${(item.count / Math.max(...analytics.llmProviderUsage.map(p => p.count))) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No data yet</p>
            )}
          </div>
        </div>

        {/* Template Usage */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Popular Templates
          </h2>
          {analytics.templateUsage.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.templateUsage
                .sort((a, b) => b.count - a.count)
                .slice(0, 6)
                .map((item) => (
                  <div key={item.template_name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{item.template_name}</span>
                      <span className="text-lg font-bold text-purple-600">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{
                          width: `${(item.count / Math.max(...analytics.templateUsage.map(t => t.count))) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No template usage data yet</p>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Recent Activity
          </h2>
          {analytics.dailyActivity.length > 0 ? (
            <div className="space-y-2">
              {analytics.dailyActivity
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 14)
                .map((item) => (
                  <div key={item.date} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700">{item.date}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-48 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${(item.count / Math.max(...analytics.dailyActivity.map(d => d.count))) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No activity data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

