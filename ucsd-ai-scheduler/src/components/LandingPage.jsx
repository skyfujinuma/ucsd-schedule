import React from 'react';

const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen relative">
      {/* Background with radial gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(35.56% 50% at 50% 50%, #1E1D1D 0%, #1A1818 100%)'
        }}
      />
      
      <div className="relative z-10">
         {/* Header/Navigation */}
         <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 sm:pt-6 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20">
           {/* Logo and Title Section */}
           <div className="flex flex-col ml-4 sm:ml-8 md:ml-12 lg:ml-16 xl:ml-20 mb-4 sm:mb-0">
             <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-black text-gray-200 leading-none mb-1 sm:mb-2">
               TACO
             </h1>
             <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl font-black text-gray-200">
               Triton AI Course Organizer
             </p>
           </div>

          {/* Navigation Links */}
          <nav className="flex gap-4 sm:gap-6 md:gap-8 mt-0 sm:mt-3">
            <a 
              href="#home" 
              className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-black text-gray-500 hover:text-gray-300 transition-colors duration-200"
            >
              home
            </a>
            <a 
              href="#about" 
              className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-black text-gray-500 hover:text-gray-300 transition-colors duration-200"
            >
              about
            </a>
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 pt-8 sm:pt-12 md:pt-16 lg:pt-20 xl:pt-24 2xl:pt-32 min-h-[60vh] sm:min-h-[70vh] md:min-h-[80vh]">
           {/* Hero Text */}
           <div className="text-center w-full mx-auto mb-8 sm:mb-12 md:mb-16 lg:mb-20 px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12">
             <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-black text-white leading-tight mb-6 sm:mb-8">
               leverage AI to power your course planning with live enrollment data and major-specific requirements
             </h2>
           </div>

          {/* CTA Button */}
          <button 
            onClick={onGetStarted}
            className="group relative bg-gray-300 hover:bg-gray-200 text-gray-900 px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-4 lg:px-12 lg:py-5 rounded-full text-base sm:text-lg md:text-xl lg:text-2xl font-black transition-all duration-300 transform hover:scale-105"
            style={{
              boxShadow: '0 4px 4px 0 rgba(0, 0, 0, 0.50)'
            }}
          >
            get started
          </button>
        </main>
      </div>
    </div>
  );
};

export default LandingPage;
