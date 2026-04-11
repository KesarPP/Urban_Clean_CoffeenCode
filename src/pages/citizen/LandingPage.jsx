import { ArrowRight, FileText, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8 bg-gradient-to-br from-[#F8FAFC] to-[#E2E8F0] overflow-hidden min-h-[80vh] flex flex-col justify-center">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primaryAction via-transparent to-transparent"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 font-medium text-sm mb-8 animate-bounce">
            <AlertTriangle className="h-4 w-4" />
            Together for a cleaner city
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-textMain tracking-tight mb-6">
            Keep our city <span className="text-primaryAction">clean</span> and <span className="text-secondaryAction">safe</span>.
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Report waste overflows, illegal dumping, and water leaks directly to the city officials. Let's build a sustainable environment together.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/report" 
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-white bg-primaryAction hover:bg-green-600 font-semibold rounded-2xl shadow-soft transition-transform hover:-translate-y-1"
            >
              Report an Issue
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link 
              to="/my-reports" 
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-textMain bg-cards border border-gray-200 hover:border-gray-300 hover:bg-gray-50 font-semibold rounded-2xl shadow-soft transition-transform hover:-translate-y-1"
            >
              <FileText className="h-5 w-5 text-gray-500" />
              Track My Reports
            </Link>
          </div>
        </div>
      </section>

      {/* Feature stats or info could go below, maintaining high visually appealing layout */}
    </div>
  );
}
