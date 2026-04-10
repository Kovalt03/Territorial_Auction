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

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', Component: LoginPage },
  { path: '/register', Component: RegisterPage },
  { path: '/app/map', Component: WorldMapPage },
  { path: '/app/continent/:id', Component: ContinentPage },
  { path: '/app/territory/:id', Component: TerritoryDetailPage },
  { path: '/app/mypage', Component: MyPage },
  { path: '/app/ranking', Component: RankingPage },
  { path: '/app/charge', Component: ChargePage },
  { path: '/app/territory-grid/:id', Component: TerritoryGridPage },
  { path: '/app/siege', Component: SiegePage },
  { path: '/app/item-shop', Component: ItemShopPage },
  { path: '/app/season-pass', Component: SeasonPassPage },
  { path: '/app/vault', Component: VaultPage },
  { path: '/app/my-island', Component: PersonalIslandPage },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
