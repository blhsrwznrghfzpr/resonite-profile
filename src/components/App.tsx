import { LocationProvider, Router } from 'preact-iso';
import { Header } from './Header.tsx';
import { SearchPage } from './SearchPage.tsx';
import { UserDetailPage } from './UserDetailPage.tsx';

export function App() {
  return (
    <LocationProvider>
      <div class="container">
        <Header />
        <Router>
          <UserDetailPage path="/:id" />
          <SearchPage default />
        </Router>
      </div>
    </LocationProvider>
  );
}
