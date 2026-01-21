
interface MainMenuProps {
  onStartGame: () => void;
  onOpenSettings: () => void;
}

export function MainMenu({ onStartGame, onOpenSettings }: MainMenuProps) {
  return (
    <div 
      className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/UI Mockups- Example/Startscreen.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay interactive buttons on top of mockup */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Play Button - positioned based on mockup */}
        <button
          onClick={onStartGame}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-8 bg-transparent hover:bg-white/10 rounded-lg p-4 transition-all"
          style={{ 
            top: '45%',
            left: '50%',
          }}
        >
          <span className="sr-only">Play</span>
        </button>

        {/* Options Button - positioned based on mockup */}
        <button
          onClick={onOpenSettings}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-24 bg-transparent hover:bg-white/10 rounded-lg p-4 transition-all"
          style={{ 
            top: '55%',
            left: '50%',
          }}
        >
          <span className="sr-only">Options</span>
        </button>
      </div>
    </div>
  );
}