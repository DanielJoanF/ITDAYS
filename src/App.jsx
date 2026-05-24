import Navbar from './components/Navbar/Navbar'
import HeroSection from './components/HeroSection/HeroSection'
import AboutSection from './components/AboutSection/AboutSection'
import TimelineSection from './components/TimelineSection/TimelineSection'
import RegistrationSection from './components/RegistrationSection/RegistrationSection'
import Footer from './components/Footer/Footer'
import './App.css'

function App() {
  return (
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
  )
}

export default App
