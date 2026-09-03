import AppRouter from './navigation/AppRouter';
import { SettingsProvider } from './context/SettingsContext';

function App() {
  return (
    <SettingsProvider>
      <AppRouter />
    </SettingsProvider>
  );
}

export default App;
