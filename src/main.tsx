import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import { QuestionsProvider } from './context/QuestionsContext';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <QuestionsProvider>
          <GameProvider>
            <App />
          </GameProvider>
        </QuestionsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
