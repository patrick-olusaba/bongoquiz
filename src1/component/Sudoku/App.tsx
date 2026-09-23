import { useState } from 'react';
import { SudokuMain } from './components/SudokuMain';
import { LandingPage } from './components/LandingPage';
import './styles/styles.css';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);

  return isPlaying ? (
      <SudokuMain onExit={() => setIsPlaying(false)} />
  ) : (
      <LandingPage onPlay={() => setIsPlaying(true)} />
  );
}
