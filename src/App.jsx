import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import HeroSection from './components/HeroSection/HeroSection'
import AboutSection from './components/AboutSection/AboutSection'
import TimelineSection from './components/TimelineSection/TimelineSection'
import RegistrationSection from './components/RegistrationSection/RegistrationSection'
import UploadSection from './components/UploadSection/UploadSection'
import Footer from './components/Footer/Footer'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={
        <>
          <Navbar />
          <main>
            <HeroSection />
            <AboutSection />
            <TimelineSection />
            <div id="registration">
              <RegistrationSection />
            </div>
          </main>
          <Footer />
        </>
      } />
      <Route path="/upload" element={<UploadSection />} />
    </Routes>
  )
}

export default App
