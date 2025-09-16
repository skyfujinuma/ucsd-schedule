import React from 'react';

const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      {/* Navigation */}
      <nav className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50">
        <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center space-x-4">
            <a 
              href="#home" 
              className="text-2xl sm:text-3xl lg:text-4xl font-black hover:text-slate-300 transition-colors no-underline"
              style={{ color: 'white', textDecoration: 'none' }}
            >
              taco
            </a>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
            <a href="#home" className="text-sm sm:text-base hover:text-slate-300 transition-colors no-underline" style={{ color: 'white', textDecoration: 'none' }}>Home</a>
            <a href="#about" className="text-sm sm:text-base hover:text-slate-300 transition-colors no-underline" style={{ color: 'white', textDecoration: 'none' }}>About</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="w-full mx-auto">
          {/* Main Title */}
          <div className="flex flex-col items-center mb-1 sm:mb-2">
            <h1 
              className="font-black text-white leading-none"
              style={{ 
                fontSize: 'clamp(4rem, 15vw, 10rem)',
                fontWeight: '900',
                transform: 'translateX(-1em)'
              }}
            >
              taco
            </h1>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-slate-300 mb-6 sm:mb-8">
              triton ai course organizer 
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 lg:mb-16">
            <button
              onClick={onGetStarted}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-colors text-sm sm:text-base"
            >
              Get Started with TACO
            </button>
            <a
              href="https://github.com/skyfujinuma/ucsd-schedule"
              className="border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-colors text-sm sm:text-base"
            >
              Explore on GitHub
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16 lg:mb-20">
            <div className="text-center">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">500+</div>
              <div className="text-xs sm:text-sm text-slate-400">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">50+</div>
              <div className="text-xs sm:text-sm text-slate-400">GitHub Stars</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">v1.0</div>
              <div className="text-xs sm:text-sm text-slate-400">Latest Release</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white">MIT</div>
              <div className="text-xs sm:text-sm text-slate-400">License</div>
            </div>
          </div>
        </div>

        {/* What is TACO Section */}
        <div className="w-full mx-auto mb-12 sm:mb-16 lg:mb-20">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">What is TACO?</h2>
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 leading-relaxed mb-6 sm:mb-8">
            taco is an intelligent, AI-powered course planning assistant for UCSD students, 
            focused on clean design, real-time data, and user experience. It analyzes 
            enrollment data, professor ratings, and major requirements to help you navigate creating your schedule.
          </p>
          
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-slate-800/50 p-4 sm:p-6 rounded-lg border border-slate-700">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">Install TACO</h3>
              <p className="text-sm sm:text-base text-slate-300 mb-3 sm:mb-4">Step-by-step instructions to set up TACO quickly and safely.</p>
              <button
                onClick={onGetStarted}
                className="text-blue-400 hover:text-blue-300 font-medium text-sm sm:text-base"
              >
                Get Started →
              </button>
            </div>
            <div className="bg-slate-800/50 p-4 sm:p-6 rounded-lg border border-slate-700">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">Join Community</h3>
              <p className="text-sm sm:text-base text-slate-300 mb-3 sm:mb-4">Get help, share feedback, and follow announcements.</p>
              <a href="#" className="text-blue-400 hover:text-blue-300 font-medium text-sm sm:text-base">
                Join Discord →
              </a>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="w-full mx-auto mb-12 sm:mb-16 lg:mb-20">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-8 sm:mb-10 lg:mb-12">Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                <span className="text-white text-lg sm:text-xl">📊</span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Real-time Data</h3>
              <p className="text-slate-400 text-xs sm:text-sm">Live enrollment data and course availability updates.</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-lg mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                <span className="text-white text-lg sm:text-xl">🤖</span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">AI-Powered</h3>
              <p className="text-slate-400 text-xs sm:text-sm">Intelligent recommendations based on your preferences.</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-lg mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                <span className="text-white text-lg sm:text-xl">⭐</span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Professor Ratings</h3>
              <p className="text-slate-400 text-xs sm:text-sm">Integrated Rate My Professor data for informed decisions.</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-600 rounded-lg mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                <span className="text-white text-lg sm:text-xl">🎯</span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Major Requirements</h3>
              <p className="text-slate-400 text-xs sm:text-sm">Track progress toward your degree requirements.</p>
            </div>
          </div>
        </div>

        {/* Development Notice */}
        <div className="w-full mx-auto">
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 sm:p-6">
            <div className="flex items-center mb-2 sm:mb-3">
              <span className="text-yellow-400 text-lg sm:text-xl mr-2 sm:mr-3">🚧</span>
              <h3 className="text-base sm:text-lg font-semibold text-yellow-100">Currently in Development</h3>
            </div>
            <p className="text-yellow-200 text-sm sm:text-base">
              taco is actively being built and improved. Features and functionality may change as I continue development.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
