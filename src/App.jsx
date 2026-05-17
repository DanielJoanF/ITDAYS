import Navbar from './components/Navbar/Navbar'
import HeroSection from './components/HeroSection/HeroSection'
import RegistrationSection from './components/RegistrationSection/RegistrationSection'
import Footer from './components/Footer/Footer'
import './App.css'

function App() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <div id="registration">
          <RegistrationSection />
        </div>
      </main>
      <Footer />
    </>
  )
}

export default App
