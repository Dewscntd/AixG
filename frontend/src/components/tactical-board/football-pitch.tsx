'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Line, Circle, Text } from 'react-konva';
import { useTranslations } from 'next-intl';

interface FootballPitchProps {
  locale: string;
  width?: number;
  height?: number;
}

interface Player {
  id: string;
  x: number;
  y: number;
  number: number;
  team: 'home' | 'away';
}

export default function FootballPitch({ locale, width = 800, height = 600 }: FootballPitchProps) {
  const t = useTranslations('tacticalBoard');
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedTool, setSelectedTool] = useState<'player' | 'line' | 'move'>('player');
  const stageRef = useRef<any>(null);

  // Initialize with default formation (4-4-2)
  useEffect(() => {
    const defaultFormation: Player[] = [
      // Goalkeeper
      { id: '1', x: width * 0.1, y: height * 0.5, number: 1, team: 'home' },
      // Defenders
      { id: '2', x: width * 0.25, y: height * 0.2, number: 2, team: 'home' },
      { id: '3', x: width * 0.25, y: height * 0.4, number: 3, team: 'home' },
      { id: '4', x: width * 0.25, y: height * 0.6, number: 4, team: 'home' },
      { id: '5', x: width * 0.25, y: height * 0.8, number: 5, team: 'home' },
      // Midfielders
      { id: '6', x: width * 0.5, y: height * 0.25, number: 6, team: 'home' },
      { id: '7', x: width * 0.5, y: height * 0.45, number: 7, team: 'home' },
      { id: '8', x: width * 0.5, y: height * 0.55, number: 8, team: 'home' },
      { id: '9', x: width * 0.5, y: height * 0.75, number: 9, team: 'home' },
      // Forwards
      { id: '10', x: width * 0.75, y: height * 0.4, number: 10, team: 'home' },
      { id: '11', x: width * 0.75, y: height * 0.6, number: 11, team: 'home' },
    ];
    setPlayers(defaultFormation);
  }, [width, height]);

  const handlePlayerDragEnd = (id: string, e: any) => {
    const newPlayers = players.map((player) =>
      player.id === id
        ? { ...player, x: e.target.x(), y: e.target.y() }
        : player
    );
    setPlayers(newPlayers);
  };

  const pitchColor = '#2d8659';
  const lineColor = '#ffffff';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTool('player')}
              className={`px-4 py-2 rounded-md ${
                selectedTool === 'player'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              👤 {t('addPlayer', { default: 'Add Player' })}
            </button>
            <button
              onClick={() => setSelectedTool('line')}
              className={`px-4 py-2 rounded-md ${
                selectedTool === 'line'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ✏️ {t('drawLine', { default: 'Draw Line' })}
            </button>
            <button
              onClick={() => setSelectedTool('move')}
              className={`px-4 py-2 rounded-md ${
                selectedTool === 'move'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🖱️ {t('move', { default: 'Move' })}
            </button>
          </div>

          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setPlayers([])}
              className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              🗑️ {t('clear', { default: 'Clear' })}
            </button>
            <button
              onClick={() => {
                // TODO: Save tactical board
                console.log('Saving tactical board...', players);
              }}
              className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
            >
              💾 {t('save', { default: 'Save' })}
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="bg-white shadow rounded-lg p-4">
        <Stage width={width} height={height} ref={stageRef}>
          <Layer>
            {/* Pitch Background */}
            <Rect x={0} y={0} width={width} height={height} fill={pitchColor} />

            {/* Pitch Markings */}
            {/* Center line */}
            <Line
              points={[width / 2, 0, width / 2, height]}
              stroke={lineColor}
              strokeWidth={2}
            />

            {/* Center circle */}
            <Circle
              x={width / 2}
              y={height / 2}
              radius={height * 0.15}
              stroke={lineColor}
              strokeWidth={2}
            />

            {/* Penalty areas */}
            <Rect
              x={0}
              y={height * 0.25}
              width={width * 0.15}
              height={height * 0.5}
              stroke={lineColor}
              strokeWidth={2}
            />
            <Rect
              x={width * 0.85}
              y={height * 0.25}
              width={width * 0.15}
              height={height * 0.5}
              stroke={lineColor}
              strokeWidth={2}
            />

            {/* Goal areas */}
            <Rect
              x={0}
              y={height * 0.4}
              width={width * 0.08}
              height={height * 0.2}
              stroke={lineColor}
              strokeWidth={2}
            />
            <Rect
              x={width * 0.92}
              y={height * 0.4}
              width={width * 0.08}
              height={height * 0.2}
              stroke={lineColor}
              strokeWidth={2}
            />

            {/* Players */}
            {players.map((player) => (
              <React.Fragment key={player.id}>
                <Circle
                  x={player.x}
                  y={player.y}
                  radius={20}
                  fill={player.team === 'home' ? '#3b82f6' : '#ef4444'}
                  stroke="#ffffff"
                  strokeWidth={2}
                  draggable={selectedTool === 'move'}
                  onDragEnd={(e) => handlePlayerDragEnd(player.id, e)}
                  shadowColor="black"
                  shadowBlur={5}
                  shadowOpacity={0.3}
                />
                <Text
                  x={player.x - 8}
                  y={player.y - 8}
                  text={player.number.toString()}
                  fontSize={16}
                  fontStyle="bold"
                  fill="#ffffff"
                  listening={false}
                />
              </React.Fragment>
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Info Panel */}
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          {t('info', { default: 'Tactical Board Info' })}
        </h3>
        <p className="text-sm text-gray-600">
          {t('playerCount', { default: 'Players' })}: {players.length}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {t('instructions', { default: 'Use the tools above to create tactical diagrams. Drag players in move mode.' })}
        </p>
      </div>
    </div>
  );
}
