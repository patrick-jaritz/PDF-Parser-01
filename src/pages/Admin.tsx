import { useState } from 'react';
import { Activity, FileText, Stethoscope, BarChart3 } from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { AdminLogs } from './AdminLogs';
import { DiagnosticDashboard } from './DiagnosticDashboard';

type TabType = 'dashboard' | 'logs' | 'diagnostics';

export function Admin() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    {
      id: 'dashboard' as TabType,
      name: 'Provider Health',
      icon: BarChart3,
      description: 'Monitor system health and performance',
    },
    {
      id: 'logs' as TabType,
      name: 'Logs',
      icon: FileText,
      description: 'View and filter system logs',
    },
    {
      id: 'diagnostics' as TabType,
      name: 'Diagnostics',
      icon: Stethoscope,
      description: 'Run system health checks',
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'logs':
        return <AdminLogs />;
      case 'diagnostics':
        return <DiagnosticDashboard />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-600">System monitoring and diagnostics</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap
                    ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="transition-all">
        {renderContent()}
      </div>
    </div>
  );
}

