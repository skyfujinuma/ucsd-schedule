import React, { useState, useEffect } from 'react';

const LandingPage = ({ onGetStarted, onAbout }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animatedStats, setAnimatedStats] = useState({
    majors: 0,
    colleges: 0,
    version: 0,
    license: 0
  });

  useEffect(() => {
    setIsVisible(true);
    
    // Animate stats on load
    const animateStats = () => {
      const targetStats = { majors: 1, colleges: 1, version: 1, license: 1 };
      const duration = 2000;
      const steps = 60;
      const stepDuration = duration / steps;
      
      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        setAnimatedStats({
          majors: Math.floor(targetStats.majors * easeOut),
          colleges: Math.floor(targetStats.colleges * easeOut),
          version: targetStats.version,
          license: targetStats.license
        });
        
        if (currentStep >= steps) {
          clearInterval(timer);
        }
      }, stepDuration);
    };
    
    const timer = setTimeout(animateStats, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      {/* Navigation */}
      <nav className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50">
        <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center space-x-4">
            <a 
              href="#home" 
              className="text-2xl sm:text-3xl lg:text-4xl font-black hover:text-slate-300 transition-colors"
              style={{ color: 'white', textDecoration: 'none' }}
            >
              taco
            </a>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
            <a onClick={() => {}} className="text-sm sm:text-base hover:text-slate-300 transition-colors cursor-pointer" style={{ color: 'white', textDecoration: 'none' }}>Home</a>
            <a onClick={onAbout} className="text-sm sm:text-base hover:text-slate-300 transition-colors cursor-pointer" style={{ color: 'white', textDecoration: 'none' }}>About</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="w-full max-w-7xl mx-auto">
          {/* Main Title */}
          <div className={`flex flex-col items-center mb-1 sm:mb-2 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 
              className="font-black leading-none hover:scale-105 transition-transform duration-500 cursor-pointer bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
              style={{ 
                fontSize: 'clamp(4rem, 15vw, 10rem)',
                fontWeight: '900',
                transform: 'translateX(-1em)'
              }}
            >
              taco
            </h1>
          </div>
          <div className={`text-center transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-slate-300 mb-6 sm:mb-8 hover:text-white transition-colors duration-300">
              triton ai course organizer 
            </p>
          </div>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 lg:mb-16 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <button
              onClick={onGetStarted}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-all duration-300 text-sm sm:text-base hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30"
            >
              Get Started
            </button>
            <a
              href="https://github.com/skyfujinuma/ucsd-schedule"
              className="border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-all duration-300 text-sm sm:text-base hover:scale-105 hover:shadow-lg hover:shadow-slate-500/30"
            >
              Explore on GitHub
            </a>
          </div>

          {/* Stats */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16 lg:mb-20 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center bg-slate-800/30 p-4 sm:p-6 rounded-lg border border-blue-500/50">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-400">{animatedStats.majors}</div>
              <div className="text-xs sm:text-sm text-slate-400">Loaded Majors</div>
            </div>
            <div className="text-center bg-slate-800/30 p-4 sm:p-6 lg:p-8 rounded-lg border border-green-500/50">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400">{animatedStats.colleges}</div>
              <div className="text-xs sm:text-sm text-slate-400">Loaded Colleges</div>
            </div>
            <div className="text-center bg-slate-800/30 p-4 sm:p-6 lg:p-8 rounded-lg border border-purple-500/50">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-400">v{animatedStats.version}.0.0-alpha</div>
              <div className="text-xs sm:text-sm text-slate-400">Latest Release</div>
            </div>
            <div className="text-center bg-slate-800/30 p-4 sm:p-6 lg:p-8 rounded-lg border border-orange-500/50">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-400">MIT</div>
              <div className="text-xs sm:text-sm text-slate-400">License</div>
            </div>
          </div>
        </div>

        {/* What is TACO Section */}
        <div className={`w-full max-w-7xl mx-auto mb-12 sm:mb-16 lg:mb-20 transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">What is taco?</h2>
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 leading-relaxed mb-6 sm:mb-8">
            taco is an intelligent, AI-powered course planning assistant for UCSD students, 
            focused on clean design, real-time data, and user experience. It analyzes 
            enrollment data, professor ratings, and major requirements to help you navigate creating your schedule.
          </p>
          
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-slate-800/50 p-4 sm:p-6 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 group">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3 group-hover:text-blue-400 transition-colors">Try taco</h3>
              <p className="text-sm sm:text-base text-slate-300 mb-3 sm:mb-4 group-hover:text-slate-200 transition-colors">Experience the course planning capabilities with the majors and colleges implemented thus far.</p>
              <button
                onClick={onGetStarted}
                className="text-blue-400 hover:text-blue-300 font-medium text-sm sm:text-base hover:scale-105 transition-all duration-300"
              >
                Get Started →
              </button>
            </div>
            <div className="bg-slate-800/50 p-4 sm:p-6 rounded-lg border border-slate-700 hover:border-green-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 group">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3 group-hover:text-green-400 transition-colors">About taco</h3>
              <p className="text-sm sm:text-base text-slate-300 mb-3 sm:mb-4 group-hover:text-slate-200 transition-colors">Get to know more about taco and its developmental process.</p>
              <button
                onClick={onAbout}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold transition-all duration-300 text-sm sm:text-base hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30"
              >
                Learn More →
              </button>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className={`w-full max-w-7xl mx-auto mb-12 sm:mb-16 lg:mb-20 transition-all duration-1000 delay-1100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6 sm:mb-8">Key Features</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
            <div className="bg-slate-800/50 p-6 sm:p-8 lg:p-10 rounded-lg border border-blue-500/50">
              <div className="flex items-center mb-4 lg:mb-6">
                <span className="text-3xl sm:text-4xl mr-4">🤖</span>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-blue-400">AI-Powered Recommendations</h3>
              </div>
              <p className="text-slate-200 text-sm sm:text-base lg:text-lg">
                Get personalized course suggestions based on your preferences, completed courses, and academic goals.
              </p>
            </div>
            <div className="bg-slate-800/50 p-6 sm:p-8 lg:p-10 rounded-lg border border-green-500/50">
              <div className="flex items-center mb-4 lg:mb-6">
                <span className="text-3xl sm:text-4xl mr-4">📊</span>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-green-400">Real-Time Data</h3>
              </div>
              <p className="text-slate-200 text-sm sm:text-base lg:text-lg">
                Access live enrollment data, seat availability, and course schedules updated in real-time.
              </p>
            </div>
            <div className="bg-slate-800/50 p-6 sm:p-8 lg:p-10 rounded-lg border border-purple-500/50">
              <div className="flex items-center mb-4 lg:mb-6">
                <span className="text-3xl sm:text-4xl mr-4">⭐</span>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-purple-400">Professor Insights</h3>
              </div>
              <p className="text-slate-200 text-sm sm:text-base lg:text-lg">
                Integrated Rate My Professor data to help you choose courses with the best instructors.
              </p>
            </div>
            <div className="bg-slate-800/50 p-6 sm:p-8 lg:p-10 rounded-lg border border-orange-500/50">
              <div className="flex items-center mb-4 lg:mb-6">
                <span className="text-3xl sm:text-4xl mr-4">🎯</span>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-orange-400">Degree Tracking</h3>
              </div>
              <p className="text-slate-200 text-sm sm:text-base lg:text-lg">
                Track your progress toward major requirements and ensure you're on the right path to graduation.
              </p>
            </div>
          </div>
        </div>

        {/* Development Notice */}
        <div className={`w-full max-w-7xl mx-auto transition-all duration-1000 delay-1300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 sm:p-6 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/20">
            <div className="flex items-center mb-2 sm:mb-3">
              <span className="text-yellow-400 text-lg sm:text-xl mr-2 sm:mr-3 animate-pulse">🚧</span>
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
