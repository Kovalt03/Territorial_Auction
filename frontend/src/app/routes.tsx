import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { WorldMapPage } from './pages/WorldMapPage';
import { ContinentPage } from './pages/ContinentPage';
import { TerritoryDetailPage } from './pages/TerritoryDetailPage';
import { MyPage } from './pages/MyPage';
import { RankingPage } from './pages/RankingPage';
import { ChargePage } from './pages/ChargePage';
import { TerritoryGridPage } from './pages/TerritoryGridPage';
import { SiegePage } from './pages/SiegePage';
import { ItemShopPage } from './pages/ItemShopPage';
import { SeasonPassPage } from './pages/SeasonPassPage';
import { VaultPage } from './pages/VaultPage';
import { PersonalIslandPage } from './pages/PersonalIslandPage';
import { SettingsPage } from './pages/SettingsPage';
import { GuildListPage } from './pages/GuildListPage';
import { GuildDetailPage } from './pages/GuildDetailPage';
import { NotificationPage } from './pages/NotificationPage';
import { PrivateRoute } from './components/PrivateRoute';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', Component: LoginPage },
  { path: '/register', Component: RegisterPage },
  { path: '/app/map', Component: WorldMapPage },
  { path: '/app/continent/:id', Component: ContinentPage },
  { path: '/app/territory/:id', Component: TerritoryDetailPage },
  { path: '/app/ranking', Component: RankingPage },
  { path: '/app/guild', Component: GuildListPage },
  { path: '/app/guild/:id', Component: GuildDetailPage },
  { path: '/app/mypage', element: <PrivateRoute><MyPage /></PrivateRoute> },
  { path: '/app/notifications', element: <PrivateRoute><NotificationPage /></PrivateRoute> },
  { path: '/app/charge', element: <PrivateRoute><ChargePage /></PrivateRoute> },
  { path: '/app/territory-grid/:id', element: <PrivateRoute><TerritoryGridPage /></PrivateRoute> },
  { path: '/app/siege', element: <PrivateRoute><SiegePage /></PrivateRoute> },
  { path: '/app/item-shop', element: <PrivateRoute><ItemShopPage /></PrivateRoute> },
  { path: '/app/season-pass', element: <PrivateRoute><SeasonPassPage /></PrivateRoute> },
  { path: '/app/vault', element: <PrivateRoute><VaultPage /></PrivateRoute> },
  { path: '/app/my-island', element: <PrivateRoute><PersonalIslandPage /></PrivateRoute> },
  { path: '/app/settings', element: <PrivateRoute><SettingsPage /></PrivateRoute> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
