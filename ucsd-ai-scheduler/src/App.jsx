import { useState } from 'react';
import LandingPage from './components/LandingPage';
import Scheduler from './components/Scheduler';

function App() {
  const [showLanding, setShowLanding] = useState(true);

  // Show landing page first
  if (showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  // Show scheduler
  return <Scheduler onBackToLanding={() => setShowLanding(true)} />;
}

export default App;