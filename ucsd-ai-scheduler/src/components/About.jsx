import React, { useState, useEffect } from 'react';

const About = ({ onBackToLanding }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animatedStats, setAnimatedStats] = useState({
    lines: 0,
    version: 0,
    commits: 0,
    issues: 0
  });

  useEffect(() => {
    setIsVisible(true);
    
    // Animate stats on load
    const animateStats = () => {
      const targetStats = { lines: 44000, version: 0, commits: 42, issues: 14 };
      const duration = 2000;
      const steps = 60;
      const stepDuration = duration / steps;
      
      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        setAnimatedStats({
          lines: Math.floor(targetStats.lines * easeOut),
          version: Math.floor(targetStats.version * easeOut),
          commits: Math.floor(targetStats.commits * easeOut),
          issues: Math.floor(targetStats.issues * easeOut)
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
    <div className="h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      {/* Navigation */}
      <nav className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50">
        <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center space-x-4">
            <a 
              onClick={onBackToLanding}
              className="text-2xl sm:text-3xl lg:text-4xl font-black hover:text-slate-300 transition-colors cursor-pointer"
              style={{ color: 'white', textDecoration: 'none' }}
            >
              taco
            </a>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
            <a 
              onClick={onBackToLanding}
              className="text-sm sm:text-base hover:text-slate-300 transition-colors cursor-pointer"
              style={{ color: 'white', textDecoration: 'none' }}
            >
              Home
            </a>
            <a onClick={() => {}} className="text-sm sm:text-base hover:text-slate-300 transition-colors cursor-pointer" style={{ color: 'white', textDecoration: 'none' }}>About</a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="w-full mx-auto">
          {/* Page Title */}
          <div className={`text-center mb-8 sm:mb-12 lg:mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 
              className="font-bold text-white mb-4 lg:mb-6"
              style={{ 
                fontSize: 'clamp(2.5rem, 8vw, 6rem)',
                fontWeight: '700'
              }}
            >
              About <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">taco</span>
            </h1>
            <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-slate-300">
              The intelligent course planning assistant for UCSD students
            </p>
          </div>

          {/* Animated Stats */}
          <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16 lg:mb-20 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center bg-slate-800/30 p-4 sm:p-6 lg:p-8 rounded-lg border border-blue-500/50">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-400">{animatedStats.lines}+</div>
              <div className="text-xs sm:text-sm lg:text-base text-slate-400">Lines of Code</div>
            </div>
            <div className="text-center bg-slate-800/30 p-4 sm:p-6 lg:p-8 rounded-lg border border-green-500/50">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-400">v1.0.{animatedStats.version}-alpha</div>
              <div className="text-xs sm:text-sm lg:text-base text-slate-400">Version</div>
            </div>
            <div className="text-center bg-slate-800/30 p-4 sm:p-6 lg:p-8 rounded-lg border border-purple-500/50">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-purple-400">{animatedStats.commits}</div>
              <div className="text-xs sm:text-sm lg:text-base text-slate-400">Code Commits</div>
            </div>
            <div className="text-center bg-slate-800/30 p-4 sm:p-6 lg:p-8 rounded-lg border border-orange-500/50">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-orange-400">{animatedStats.issues}</div>
              <div className="text-xs sm:text-sm lg:text-base text-slate-400">Issues Resolved</div>
            </div>
          </div>

          {/* Project Overview */}
          <div className={`mb-12 sm:mb-16 lg:mb-20 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6 sm:mb-8">Overview</h2>
            <div className="bg-slate-800/50 p-6 sm:p-8 lg:p-12 rounded-lg border border-slate-700">
              <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-slate-300 leading-relaxed mb-6 lg:mb-8">

                As a UCSD student myself, I experienced firsthand the challenges of course planning and 
                schedule management. I would spend countless hours trying to figure out the most 
                optimal course schedule given my major and college requirements. 
                The current enrollment tool for UCSD, webreg, is outdated, difficult to use, 
                and doesn't provide the intelligent insights that students may desire. It 
                expects students to already have a deep understanding of the course catalog 
                and the requirements for their major.
                Of course academic advisors are available, but I just couldn't be bothered to make an appointment
                and wait in line to talk to them. So, I built an entire website.
                
              </p>
              <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-slate-300 leading-relaxed">
                By combining real-time enrollment data, AI-filtered recommendations, professor 
                ratings, and major & college specific requirements, taco creates 
                a comprehensive course planning experience that actually helps students 
                make informed decisions about the courses they should take.
              </p>
            </div>
          </div>

          {/* Technology Stack */}
          <div className={`mb-12 sm:mb-16 lg:mb-20 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6 sm:mb-8">The Stack</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
              <div className="bg-slate-800/50 p-6 sm:p-8 lg:p-10 rounded-lg border border-blue-500/50 shadow-lg shadow-blue-500/20">
                <div className="flex items-center mb-4 lg:mb-6">
                  <span className="text-3xl sm:text-4xl mr-4">⚛️</span>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-blue-400">Frontend</h3>
                </div>
                <ul className="text-white text-sm sm:text-base lg:text-lg space-y-2 lg:space-y-3">
                  <li>• React 18</li>
                  <li>• Tailwind CSS</li>
                  <li>• Vite</li>
                  <li>• Vercel</li>
                </ul>
              </div>
              <div className="bg-slate-800/50 p-6 sm:p-8 lg:p-10 rounded-lg border border-green-500/50 shadow-lg shadow-green-500/20">
                <div className="flex items-center mb-4 lg:mb-6">
                  <span className="text-3xl sm:text-4xl mr-4">🚀</span>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-green-400">Backend</h3>
                </div>
                <ul className="text-white text-sm sm:text-base lg:text-lg space-y-2 lg:space-y-3">
                  <li>• Node.js with Express</li>
                  <li>• Python Web Scraping</li>
                  <li>• Google Gemini API</li>
                  <li>• Railway</li>
                </ul>
              </div>
              <div className="bg-slate-800/50 p-6 sm:p-8 lg:p-10 rounded-lg border border-purple-500/50 shadow-lg shadow-purple-500/20 md:col-span-2 xl:col-span-1">
                <div className="flex items-center mb-4 lg:mb-6">
                  <span className="text-3xl sm:text-4xl mr-4">🤖</span>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-purple-400">Data</h3>
                </div>
                <ul className="text-white text-sm sm:text-base lg:text-lg space-y-2 lg:space-y-3">
                  <li>• Real-time Course Enrollment</li>
                  <li>• Rate My Professor</li>
                  <li>• Course Prerequisites </li>
                  <li>• Major & College Requirements</li>
                </ul>
              </div>
            </div>
          </div>


          {/* Developer Section */}
          <div className={`mb-12 sm:mb-16 lg:mb-20 transition-all duration-1000 delay-1100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6 sm:mb-8">About the Developer</h2>
            <div className="bg-slate-800/50 p-6 sm:p-8 lg:p-12 rounded-lg border border-slate-700 hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
              <div className="flex flex-col lg:flex-row items-start lg:items-center mb-6 lg:mb-8">
                <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 lg:mb-0 lg:mr-8 hover:scale-110 transition-transform duration-300 cursor-pointer">
                  <span className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold">SF</span>
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 lg:mb-4">Sky Fujinuma</h3>
                  <p className="text-slate-300 text-base sm:text-lg lg:text-xl">Computer Science Student at UCSD</p>
                </div>
              </div>
              <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-slate-300 leading-relaxed mb-4 lg:mb-6">
                
                When looking for a project to work on, I remembered how difficult it was to plan my courses
                as a first year student. Now, one year later, I've learned a lot about website 
                development and the usage of AI to solve real-world problems. taco was and still
                is my way of applying my knowledge to create both websites and a functional tool
                for students to use. 
              </p>
              <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-slate-300 leading-relaxed mb-6 lg:mb-8">
                Although this project has had numerous bugs and issues, I've learned a lot from it and 
                I'm proud of the progress I've made. It's still a work in progress, but 
                I'm genuinely excited to keep working on it to see where it goes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <a
                  href="https://github.com/skyfujinuma"
                  className="bg-slate-700 !text-slate-300 px-6 py-3 lg:px-8 lg:py-4 rounded-lg font-medium transition-all duration-300 text-sm sm:text-base lg:text-lg text-center hover:scale-105 hover:shadow-lg"
                >
                  GitHub Profile
                </a>
                <a
                  href="https://www.linkedin.com/in/sky-fujinuma-b55704263/"
                  className="!text-slate-300 px-6 py-3 lg:px-8 lg:py-4 rounded-lg font-medium transition-all duration-300 text-sm sm:text-base lg:text-lg text-center hover:scale-105 hover:shadow-lg"
                  style={{ backgroundColor: '#0077B5' }}
                >
                  LinkedIn
                </a>
                <a
                  href="mailto:sfujinuma@ucsd.edu"
                  className="border border-slate-600 hover:border-slate-500 !text-slate-300 hover:text-white px-6 py-3 lg:px-8 lg:py-4 rounded-lg font-medium transition-all duration-300 text-sm sm:text-base lg:text-lg text-center hover:scale-105 hover:shadow-lg"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>

          {/* Project Status */}
          <div className={`mb-12 sm:mb-16 lg:mb-20 transition-all duration-1000 delay-1300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6 sm:mb-8">Project Status</h2>
            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-6 sm:p-8 lg:p-12 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/20">
              <div className="flex items-center mb-4 lg:mb-6">
                <span className="text-yellow-400 text-3xl sm:text-4xl mr-4 animate-pulse">🚧</span>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-yellow-100">Active Development</h3>
              </div>
              <p className="text-yellow-200 text-sm sm:text-base lg:text-lg xl:text-xl mb-4 lg:mb-6">
                taco is currently in active development. New features are being added regularly, 
                and the system is continuously improved based on user feedback and real-world usage.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div>
                  <h4 className="text-yellow-100 font-medium mb-3 lg:mb-4 text-lg sm:text-xl lg:text-2xl">Current Version: v1.0.0-alpha</h4>
                  <ul className="text-yellow-200 text-sm sm:text-base lg:text-lg space-y-2">
                    <li className="hover:text-yellow-100 transition-colors">• AI course filtering</li>
                    <li className="hover:text-yellow-100 transition-colors">• Real-time enrollment data</li>
                    <li className="hover:text-yellow-100 transition-colors">• Partial professor rating integration</li>
                    <li className="hover:text-yellow-100 transition-colors">• Prerequisite tracking</li>
                    <li className="hover:text-yellow-100 transition-colors">• Some major & college requirements</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-yellow-100 font-medium mb-3 lg:mb-4 text-lg sm:text-xl lg:text-2xl">Coming Soon</h4>
                  <ul className="text-yellow-200 text-sm sm:text-base lg:text-lg space-y-2">
                    <li className="hover:text-yellow-100 transition-colors">• More major and college support</li>
                    <li className="hover:text-yellow-100 transition-colors">• Full professor rating integration</li>
                    <li className="hover:text-yellow-100 transition-colors">• Mobile Friendly UI</li>
                    <li className="hover:text-yellow-100 transition-colors">• Advanced scheduling algorithms</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Back to Home */}
          <div className={`text-center transition-all duration-1000 delay-1500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <button
              onClick={onBackToLanding}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 lg:px-12 lg:py-4 rounded-lg font-semibold transition-all duration-300 text-sm sm:text-base lg:text-lg hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default About;
