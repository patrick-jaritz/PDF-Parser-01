import { useState, useEffect } from 'react';
import { X, CheckCircle, ArrowRight, FileText, Zap, Database, Settings, BookOpen, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface SmartOnboardingProps {
  userType: 'novice' | 'intermediate' | 'expert';
  completedSteps: string[];
  onStepComplete: (stepId: string) => void;
  onDismiss: () => void;
  showAdvancedFeatures: boolean;
}

export function SmartOnboarding({ 
  userType, 
  completedSteps, 
  onStepComplete, 
  onDismiss,
  showAdvancedFeatures 
}: SmartOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  // Define onboarding steps based on user type
  const getOnboardingSteps = (): OnboardingStep[] => {
    const baseSteps: OnboardingStep[] = [
      {
        id: 'upload-first-document',
        title: 'Upload Your First Document',
        description: 'Start by uploading a PDF or image file to see how DocProcessor works.',
        icon: <FileText className="w-5 h-5" />,
        completed: completedSteps.includes('upload-first-document'),
        action: () => {
          // This would trigger the upload flow
          console.log('Start upload');
        },
        actionLabel: 'Upload Document'
      },
      {
        id: 'process-document',
        title: 'Process with AI',
        description: 'Watch as our AI extracts text and structures it automatically.',
        icon: <Zap className="w-5 h-5" />,
        completed: completedSteps.includes('process-document'),
        action: () => {
          console.log('Start processing');
        },
        actionLabel: 'Process Now'
      },
      {
        id: 'view-results',
        title: 'Review Structured Data',
        description: 'See how your document was transformed into organized, usable data.',
        icon: <Database className="w-5 h-5" />,
        completed: completedSteps.includes('view-results'),
        action: () => {
          console.log('View results');
        },
        actionLabel: 'View Results'
      }
    ];

    // Add intermediate user steps
    if (userType === 'intermediate' || userType === 'expert') {
      baseSteps.push({
        id: 'customize-template',
        title: 'Customize Output Structure',
        description: 'Create custom templates to extract exactly the data you need.',
        icon: <Settings className="w-5 h-5" />,
        completed: completedSteps.includes('customize-template'),
        action: () => {
          console.log('Customize template');
        },
        actionLabel: 'Create Template'
      });
    }

    // Add expert user steps
    if (userType === 'expert') {
      baseSteps.push({
        id: 'create-pipeline',
        title: 'Build Processing Pipelines',
        description: 'Create advanced workflows with DocETL for complex document processing.',
        icon: <Sparkles className="w-5 h-5" />,
        completed: completedSteps.includes('create-pipeline'),
        action: () => {
          console.log('Create pipeline');
        },
        actionLabel: 'Build Pipeline'
      });
    }

    return baseSteps;
  };

  const steps = getOnboardingSteps();
  const completedCount = steps.filter(step => step.completed).length;
  const progressPercentage = (completedCount / steps.length) * 100;

  // Auto-advance to next incomplete step
  useEffect(() => {
    const nextIncompleteStep = steps.findIndex(step => !step.completed);
    if (nextIncompleteStep !== -1 && nextIncompleteStep !== currentStep) {
      setCurrentStep(nextIncompleteStep);
    }
  }, [steps, currentStep]);

  const getWelcomeMessage = () => {
    switch (userType) {
      case 'novice':
        return {
          title: 'Welcome to DocProcessor!',
          subtitle: 'Let\'s get you started with your first document',
          description: 'We\'ll guide you through the basics of document processing with AI.'
        };
      case 'intermediate':
        return {
          title: 'Welcome back!',
          subtitle: 'Ready to explore advanced features?',
          description: 'Let\'s help you get the most out of DocProcessor\'s capabilities.'
        };
      case 'expert':
        return {
          title: 'Welcome back, power user!',
          subtitle: 'Time to build something amazing',
          description: 'Let\'s set up advanced workflows and custom processing pipelines.'
        };
    }
  };

  const welcome = getWelcomeMessage();

  const getStepIcon = (step: OnboardingStep, index: number) => {
    if (step.completed) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (index === currentStep) {
      return <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
        <span className="text-white text-xs font-bold">{index + 1}</span>
      </div>;
    }
    return <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
      <span className="text-gray-600 text-xs font-bold">{index + 1}</span>
    </div>;
  };

  const getStepColor = (step: OnboardingStep, index: number) => {
    if (step.completed) {
      return 'border-green-200 bg-green-50';
    }
    if (index === currentStep) {
      return 'border-blue-200 bg-blue-50';
    }
    return 'border-gray-200 bg-white';
  };

  if (completedCount === steps.length) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Onboarding Complete!</h3>
              <p className="text-sm text-gray-600">You're all set to use DocProcessor</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white rounded-lg p-4 border border-green-200 mb-4">
          <p className="text-sm text-gray-700 mb-3">
            Great job! You've completed all the onboarding steps. Here's what you can do next:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Process more documents with confidence</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Explore advanced features and templates</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Create custom processing workflows</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/help"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <BookOpen className="w-4 h-4" />
            Learn More
          </Link>
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
          >
            Start Using DocProcessor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{welcome.title}</h3>
            <p className="text-sm text-gray-600">{welcome.subtitle}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Dismiss onboarding"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="text-sm text-gray-700 mb-6">{welcome.description}</p>

      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900">
            Progress: {completedCount} of {steps.length} steps completed
          </span>
          <span className="text-sm text-blue-700">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Current step */}
      {steps[currentStep] && (
        <div className={`border-2 rounded-lg p-4 mb-4 ${getStepColor(steps[currentStep], currentStep)}`}>
          <div className="flex items-start gap-3">
            {getStepIcon(steps[currentStep], currentStep)}
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">
                {steps[currentStep].title}
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                {steps[currentStep].description}
              </p>
              {steps[currentStep].action && (
                <button
                  onClick={() => {
                    steps[currentStep].action?.();
                    onStepComplete(steps[currentStep].id);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  {steps[currentStep].actionLabel}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All steps overview */}
      <div className="border-t border-blue-200 pt-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 transition-colors mb-3"
        >
          <span>View all steps</span>
          {showDetails ? <X className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${getStepColor(step, index)}`}
              >
                {getStepIcon(step, index)}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{step.title}</p>
                  <p className="text-xs text-gray-600">{step.description}</p>
                </div>
                {step.completed && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skip option */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-200">
        <p className="text-xs text-gray-600">
          Take your time to explore each step, or skip to start using DocProcessor right away.
        </p>
        <button
          onClick={onDismiss}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Skip onboarding
        </button>
      </div>
    </div>
  );
}

