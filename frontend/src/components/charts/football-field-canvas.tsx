/**
 * Football Field Canvas Component
 *
 * High-performance canvas-based football field visualization with:
 * - Real-time player positions
 * - Heatmap overlays
 * - Event animations
 * - Touch/mouse interactions
 * - Responsive scaling
 * - Performance optimizations
 */

'use client';

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useTheme } from 'next-themes';
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';
import { cn } from '@/lib/utils';

// Types
export interface PlayerPosition {
  id: string;
  x: number; // 0-100 (percentage of field width)
  y: number; // 0-100 (percentage of field height)
  teamId: string;
  jerseyNumber: number;
  name: string;
  role?: string;
}

export interface FieldEvent {
  id: string;
  x: number;
  y: number;
  type: 'goal' | 'shot' | 'pass' | 'foul' | 'card';
  timestamp: number;
  playerId?: string;
  teamId: string;
}

export interface HeatmapData {
  x: number;
  y: number;
  intensity: number; // 0-1
}

export interface FootballFieldCanvasProps {
  width?: number;
  height?: number;
  className?: string;

  // Data
  players?: PlayerPosition[];
  events?: FieldEvent[];
  heatmapData?: HeatmapData[];

  // Display options
  showPlayers?: boolean;
  showHeatmap?: boolean;
  showEvents?: boolean;
  showGrid?: boolean;

  // Team colors
  homeTeamColor?: string;
  awayTeamColor?: string;

  // Interactions
  onPlayerClick?: (player: PlayerPosition) => void;
  onEventClick?: (event: FieldEvent) => void;
  onFieldClick?: (x: number, y: number) => void;

  // Animation
  animationSpeed?: number;
  enableAnimations?: boolean;
}

export interface FootballFieldCanvasRef {
  updatePlayers: (players: PlayerPosition[]) => void;
  addEvent: (event: FieldEvent) => void;
  clearEvents: () => void;
  exportImage: () => string;
  zoomToArea: (x: number, y: number, width: number, height: number) => void;
}

/**
 * Football Field Canvas Component
 */
export const FootballFieldCanvas = forwardRef<
  FootballFieldCanvasRef,
  FootballFieldCanvasProps
>(
  (
    {
      width = 800,
      height = 520,
      className,
      players = [],
      events = [],
      heatmapData = [],
      showPlayers = true,
      showHeatmap = false,
      showEvents = true,
      showGrid = false,
      homeTeamColor = '#3b82f6',
      awayTeamColor = '#ef4444',
      onPlayerClick,
      onEventClick,
      onFieldClick,
      animationSpeed = 1000,
      enableAnimations = true,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();
    const { theme } = useTheme();
    const performanceMonitor = usePerformanceMonitor('football-field-canvas');

    // State for animations
    const [animatedPlayers, setAnimatedPlayers] =
      useState<PlayerPosition[]>(players);
    const [animatedEvents, setAnimatedEvents] = useState<FieldEvent[]>([]);

    // Canvas context and dimensions
    const [canvasContext, setCanvasContext] =
      useState<CanvasRenderingContext2D | null>(null);
    const [devicePixelRatio, setDevicePixelRatio] = useState(1);

    // Initialize canvas
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      setDevicePixelRatio(dpr);

      // Set canvas size with device pixel ratio
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Scale context for high DPI displays
      ctx.scale(dpr, dpr);

      setCanvasContext(ctx);
    }, [width, height]);

    // Field dimensions (FIFA standard: 105m x 68m)
    const fieldDimensions = useMemo(
      () => ({
        width: width - 40, // Leave margin
        height: height - 40,
        offsetX: 20,
        offsetY: 20,
        // Field markings
        penaltyAreaWidth: (width - 40) * 0.17, // 18 yards
        penaltyAreaHeight: (height - 40) * 0.32, // 44 yards
        goalAreaWidth: (width - 40) * 0.06, // 6 yards
        goalAreaHeight: (height - 40) * 0.18, // 20 yards
        centerCircleRadius: (height - 40) * 0.15, // 10 yards radius
      }),
      [width, height]
    );

    // Colors based on theme
    const colors = useMemo(
      () => ({
        field: theme === 'dark' ? '#1a4d2e' : '#2d5016',
        lines: theme === 'dark' ? '#ffffff' : '#ffffff',
        background: theme === 'dark' ? '#0f172a' : '#f8fafc',
        text: theme === 'dark' ? '#ffffff' : '#000000',
        heatmapLow: 'rgba(59, 130, 246, 0.1)',
        heatmapHigh: 'rgba(239, 68, 68, 0.8)',
      }),
      [theme]
    );

    // Draw football field
    const drawField = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        const {
          width: fieldWidth,
          height: fieldHeight,
          offsetX,
          offsetY,
        } = fieldDimensions;

        // Clear canvas
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, width, height);

        // Draw field background
        ctx.fillStyle = colors.field;
        ctx.fillRect(offsetX, offsetY, fieldWidth, fieldHeight);

        // Set line style
        ctx.strokeStyle = colors.lines;
        ctx.lineWidth = 2;

        // Field border
        ctx.strokeRect(offsetX, offsetY, fieldWidth, fieldHeight);

        // Center line
        ctx.beginPath();
        ctx.moveTo(offsetX + fieldWidth / 2, offsetY);
        ctx.lineTo(offsetX + fieldWidth / 2, offsetY + fieldHeight);
        ctx.stroke();

        // Center circle
        ctx.beginPath();
        ctx.arc(
          offsetX + fieldWidth / 2,
          offsetY + fieldHeight / 2,
          fieldDimensions.centerCircleRadius,
          0,
          2 * Math.PI
        );
        ctx.stroke();

        // Center spot
        ctx.beginPath();
        ctx.arc(
          offsetX + fieldWidth / 2,
          offsetY + fieldHeight / 2,
          3,
          0,
          2 * Math.PI
        );
        ctx.fill();

        // Penalty areas
        const {
          penaltyAreaWidth,
          penaltyAreaHeight,
          goalAreaWidth,
          goalAreaHeight,
        } = fieldDimensions;

        // Left penalty area
        ctx.strokeRect(
          offsetX,
          offsetY + (fieldHeight - penaltyAreaHeight) / 2,
          penaltyAreaWidth,
          penaltyAreaHeight
        );

        // Right penalty area
        ctx.strokeRect(
          offsetX + fieldWidth - penaltyAreaWidth,
          offsetY + (fieldHeight - penaltyAreaHeight) / 2,
          penaltyAreaWidth,
          penaltyAreaHeight
        );

        // Goal areas
        ctx.strokeRect(
          offsetX,
          offsetY + (fieldHeight - goalAreaHeight) / 2,
          goalAreaWidth,
          goalAreaHeight
        );

        ctx.strokeRect(
          offsetX + fieldWidth - goalAreaWidth,
          offsetY + (fieldHeight - goalAreaHeight) / 2,
          goalAreaWidth,
          goalAreaHeight
        );

        // Penalty spots
        ctx.beginPath();
        ctx.arc(
          offsetX + penaltyAreaWidth * 0.65,
          offsetY + fieldHeight / 2,
          2,
          0,
          2 * Math.PI
        );
        ctx.fill();

        ctx.beginPath();
        ctx.arc(
          offsetX + fieldWidth - penaltyAreaWidth * 0.65,
          offsetY + fieldHeight / 2,
          2,
          0,
          2 * Math.PI
        );
        ctx.fill();

        // Goals
        ctx.lineWidth = 3;
        ctx.strokeRect(
          offsetX - 8,
          offsetY + fieldHeight * 0.4,
          8,
          fieldHeight * 0.2
        );
        ctx.strokeRect(
          offsetX + fieldWidth,
          offsetY + fieldHeight * 0.4,
          8,
          fieldHeight * 0.2
        );

        // Grid overlay
        if (showGrid) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;

          for (let i = 1; i < 10; i++) {
            const x = offsetX + (fieldWidth / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, offsetY);
            ctx.lineTo(x, offsetY + fieldHeight);
            ctx.stroke();
          }

          for (let i = 1; i < 6; i++) {
            const y = offsetY + (fieldHeight / 6) * i;
            ctx.beginPath();
            ctx.moveTo(offsetX, y);
            ctx.lineTo(offsetX + fieldWidth, y);
            ctx.stroke();
          }
        }
      },
      [fieldDimensions, colors, showGrid, width, height]
    );

    // Draw heatmap
    const drawHeatmap = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        if (!showHeatmap || heatmapData.length === 0) return;

        const {
          width: fieldWidth,
          height: fieldHeight,
          offsetX,
          offsetY,
        } = fieldDimensions;

        heatmapData.forEach(({ x, y, intensity }) => {
          const canvasX = offsetX + (x / 100) * fieldWidth;
          const canvasY = offsetY + (y / 100) * fieldHeight;

          const gradient = ctx.createRadialGradient(
            canvasX,
            canvasY,
            0,
            canvasX,
            canvasY,
            20
          );
          gradient.addColorStop(0, `rgba(239, 68, 68, ${intensity * 0.6})`);
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 20, 0, 2 * Math.PI);
          ctx.fill();
        });
      },
      [showHeatmap, heatmapData, fieldDimensions]
    );

    // Draw players
    const drawPlayers = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        if (!showPlayers) return;

        const {
          width: fieldWidth,
          height: fieldHeight,
          offsetX,
          offsetY,
        } = fieldDimensions;

        animatedPlayers.forEach(player => {
          const canvasX = offsetX + (player.x / 100) * fieldWidth;
          const canvasY = offsetY + (player.y / 100) * fieldHeight;

          // Determine team color
          const isHomeTeam = player.teamId === 'home'; // Simplified logic
          const playerColor = isHomeTeam ? homeTeamColor : awayTeamColor;

          // Draw player circle
          ctx.fillStyle = playerColor;
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 8, 0, 2 * Math.PI);
          ctx.fill();

          // Draw jersey number
          ctx.fillStyle = colors.text;
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(player.jerseyNumber.toString(), canvasX, canvasY);

          // Draw player name (on hover or selection)
          if (player.role) {
            ctx.font = '8px Arial';
            ctx.fillText(player.name, canvasX, canvasY + 15);
          }
        });
      },
      [
        showPlayers,
        animatedPlayers,
        fieldDimensions,
        homeTeamColor,
        awayTeamColor,
        colors.text,
      ]
    );

    // Draw events
    const drawEvents = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        if (!showEvents) return;

        const {
          width: fieldWidth,
          height: fieldHeight,
          offsetX,
          offsetY,
        } = fieldDimensions;

        animatedEvents.forEach(event => {
          const canvasX = offsetX + (event.x / 100) * fieldWidth;
          const canvasY = offsetY + (event.y / 100) * fieldHeight;

          // Event icon based on type
          ctx.fillStyle = event.type === 'goal' ? '#fbbf24' : '#6b7280';

          switch (event.type) {
            case 'goal':
              // Star shape for goals
              ctx.beginPath();
              ctx.arc(canvasX, canvasY, 6, 0, 2 * Math.PI);
              ctx.fill();
              break;
            case 'shot':
              // Triangle for shots
              ctx.beginPath();
              ctx.moveTo(canvasX, canvasY - 5);
              ctx.lineTo(canvasX - 4, canvasY + 3);
              ctx.lineTo(canvasX + 4, canvasY + 3);
              ctx.closePath();
              ctx.fill();
              break;
            default:
              // Circle for other events
              ctx.beginPath();
              ctx.arc(canvasX, canvasY, 3, 0, 2 * Math.PI);
              ctx.fill();
          }
        });
      },
      [showEvents, animatedEvents, fieldDimensions]
    );

    // Main render function
    const render = useCallback(() => {
      if (!canvasContext) return;

      performanceMonitor.startTimer('render');

      drawField(canvasContext);
      drawHeatmap(canvasContext);
      drawPlayers(canvasContext);
      drawEvents(canvasContext);

      performanceMonitor.endTimer('render');
    }, [
      canvasContext,
      drawField,
      drawHeatmap,
      drawPlayers,
      drawEvents,
      performanceMonitor,
    ]);

    // Animation loop
    useEffect(() => {
      const animate = () => {
        render();
        if (enableAnimations) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animate();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [render, enableAnimations]);

    // Update players with animation
    useEffect(() => {
      if (enableAnimations) {
        // Smooth transition to new positions
        const startTime = Date.now();
        const duration = animationSpeed;
        const startPositions = [...animatedPlayers];

        const animateToNewPositions = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          const interpolatedPlayers = players.map((newPlayer, index) => {
            const oldPlayer = startPositions[index];
            if (!oldPlayer) return newPlayer;

            return {
              ...newPlayer,
              x: oldPlayer.x + (newPlayer.x - oldPlayer.x) * progress,
              y: oldPlayer.y + (newPlayer.y - oldPlayer.y) * progress,
            };
          });

          setAnimatedPlayers(interpolatedPlayers);

          if (progress < 1) {
            requestAnimationFrame(animateToNewPositions);
          }
        };

        animateToNewPositions();
      } else {
        setAnimatedPlayers(players);
      }
    }, [players, enableAnimations, animationSpeed]);

    // Handle canvas interactions
    const handleCanvasClick = useCallback(
      (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Convert to field coordinates
        const {
          width: fieldWidth,
          height: fieldHeight,
          offsetX,
          offsetY,
        } = fieldDimensions;
        const fieldX = ((x - offsetX) / fieldWidth) * 100;
        const fieldY = ((y - offsetY) / fieldHeight) * 100;

        // Check for player clicks
        const clickedPlayer = animatedPlayers.find(player => {
          const playerX = offsetX + (player.x / 100) * fieldWidth;
          const playerY = offsetY + (player.y / 100) * fieldHeight;
          const distance = Math.sqrt((x - playerX) ** 2 + (y - playerY) ** 2);
          return distance <= 12; // Click tolerance
        });

        if (clickedPlayer && onPlayerClick) {
          onPlayerClick(clickedPlayer);
          return;
        }

        // Check for event clicks
        const clickedEvent = animatedEvents.find(event => {
          const eventX = offsetX + (event.x / 100) * fieldWidth;
          const eventY = offsetY + (event.y / 100) * fieldHeight;
          const distance = Math.sqrt((x - eventX) ** 2 + (y - eventY) ** 2);
          return distance <= 10;
        });

        if (clickedEvent && onEventClick) {
          onEventClick(clickedEvent);
          return;
        }

        // Field click
        if (
          onFieldClick &&
          fieldX >= 0 &&
          fieldX <= 100 &&
          fieldY >= 0 &&
          fieldY <= 100
        ) {
          onFieldClick(fieldX, fieldY);
        }
      },
      [
        fieldDimensions,
        animatedPlayers,
        animatedEvents,
        onPlayerClick,
        onEventClick,
        onFieldClick,
      ]
    );

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        updatePlayers: (newPlayers: PlayerPosition[]) => {
          setAnimatedPlayers(newPlayers);
        },
        addEvent: (event: FieldEvent) => {
          setAnimatedEvents(prev => [...prev, event]);
        },
        clearEvents: () => {
          setAnimatedEvents([]);
        },
        exportImage: () => {
          const canvas = canvasRef.current;
          return canvas ? canvas.toDataURL() : '';
        },
        zoomToArea: (x: number, y: number, w: number, h: number) => {
          // TODO: Implement zoom functionality
          console.log('Zoom to area:', { x, y, w, h });
        },
      }),
      []
    );

    return (
      <canvas
        ref={canvasRef}
        className={cn('cursor-pointer', className)}
        onClick={handleCanvasClick}
        role="img"
        aria-label="Football field with player positions and events"
      />
    );
  }
);

FootballFieldCanvas.displayName = 'FootballFieldCanvas';

export default FootballFieldCanvas;
