import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';
export function App() {
  const match = location.pathname.match(/^\/r\/([A-Za-z0-9_-]+)$/);
  return match ? <RoomPage roomId={match[1]} /> : <HomePage />;
}
