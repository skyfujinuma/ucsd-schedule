import { useState } from 'react';
import LandingPage from './components/LandingPage';
import About from './components/About';
import Scheduler from './components/Scheduler';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  // Show landing page first
  if (currentPage === 'landing') {
    return <LandingPage 
      onGetStarted={() => setCurrentPage('scheduler')} 
      onAbout={() => setCurrentPage('about')}
    />;
  }

  // Show about page
  if (currentPage === 'about') {
    return <About onBackToLanding={() => setCurrentPage('landing')} />;
  }

  // Show scheduler
  return <Scheduler 
    onBackToLanding={() => setCurrentPage('landing')} 
    onAbout={() => setCurrentPage('about')}
  />;
}

export default App;