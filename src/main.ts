import Phaser from 'phaser';
import { HuntingScene } from './game/phaser/HuntingScene';
import './styles.css';
import './firebase';

// Keep the canvas crisp on Retina displays without paying the full 2×/3× fill-rate cost.
const renderResolution = Math.min(window.devicePixelRatio || 1, 1.5);
const canvasSize = () => ({
  width: Math.max(1, Math.round(window.innerWidth * renderResolution)),
  height: Math.max(1, Math.round(window.innerHeight * renderResolution)),
});
const initialSize = canvasSize();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-canvas',
  width: initialSize.width,
  height: initialSize.height,
  backgroundColor: '#151711',
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    transparent: false,
    clearBeforeRender: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    autoMobilePipeline: true,
  },
  scale: {
    mode: Phaser.Scale.NONE,
    zoom: 1 / renderResolution,
    autoRound: true,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { mouse: { preventDefaultWheel: true } },
  scene: [HuntingScene],
});

window.addEventListener('resize', () => {
  const nextSize = canvasSize();
  game.scale.resize(nextSize.width, nextSize.height);
});
