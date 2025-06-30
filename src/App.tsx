import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import MapPage from './pages/Map';

export default function App() {
  return (
    <div>
      <nav className="bg-blue-600 text-white p-4">
        <Link to="/" className="mr-4 hover:underline">
          Home
        </Link>
        <Link to="/map" className="hover:underline">
          Map
        </Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </main>
    </div>
  );
}