/**
 * CroquisEditor — vector room sketch editor (pure React + SVG).
 *
 * Extracted verbatim from docs/raw/geminiconversation__1_.txt
 * lines 29804–30358. The CroquisEditorModal is a fullscreen drafting
 * overlay with grid snap, parametric edge editing, fixture symbols
 * (DOOR/WINDOW/OPENING/TOILET/SINK/SHOWER), pan/zoom via pointer
 * events, undo, auto-close, and live area calculation. Output is
 * vector JSON ({ paths, fixtures, area }) — never a rasterized image.
 *
 * No external canvas libraries (no Konva, no Fabric). The dark
 * drafting palette is intentional for the editor context.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/* ───────── Types ───────── */
export interface Point { x: number; y: number; }
export type FixtureType = 'DOOR' | 'WINDOW' | 'OPENING' | 'TOILET' | 'SINK' | 'SHOWER';
export interface Fixture {
  id: number;
  type: FixtureType;
  pathIdx: number;
  ptIdx: number;
  ratio: number;
  size: number;
  flipSide: boolean;
  flipHinge: boolean;
}
export interface EdgeSelection { pathIdx: number; ptIdx: number; }
export type UIState = 'IDLE' | 'DRAWING' | 'EDGE_SELECTED_OPTIONS' | 'LENGTH_EDIT_SELECT_NODE' | 'LENGTH_EDIT_INPUT' | 'FIXTURE_MENU' | 'FIXTURE_EDITING';

declare global { interface Window { haptic: (type?: 'light' | 'heavy') => void; } }

/* ───────── Internal Icon Library ─────────
   The Gemini code uses its own SVG icon set because some symbols
   (FlipH/FlipV/Magnet/Door/Window/Opening/Plumbing) aren't all in
   lucide-react. Kept self-contained — no lucide imports needed here. */
export const CroquisIcon: React.FC<{ name: string; size?: number; className?: string }> = ({ name, size = 20, className = "" }) => {
  const svgs: Record<string, React.ReactElement> = {
    SquarePen: <><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/></>,
    Magnet: <><path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15Z"/><path d="m5 8 4 4"/><path d="m12 15 4 4"/></>,
    Trash2: <><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></>,
    Save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
    Calculator: <><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></>,
    X: <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
    Target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    Undo: <><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></>,
    ZoomIn: <><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></>,
    ZoomOut: <><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></>,
    ChevronUp: <><path d="m18 15-6-6-6 6"/></>,
    ChevronDown: <><path d="m6 9 6 6 6-6"/></>,
    ChevronLeft: <><path d="m15 18-6-6 6-6"/></>,
    ChevronRight: <><path d="m9 18 6-6-6-6"/></>,
    Door: <><path d="M5 21V3h14v18"/><path d="M5 12h7"/><path d="M12 12A7 7 0 0 0 19 5"/></>,
    Window: <><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="12" x2="12" y1="3" y2="21"/></>,
    Opening: <><path d="M4 21V3"/><path d="M20 21V3"/><line x1="4" x2="20" y1="3" y2="3" strokeDasharray="4 4"/></>,
    Plumbing: <><path d="M12 4v2"/><path d="M12 2v0"/><path d="M8 8h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="14" r="3"/></>,
    FlipH: <><path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="M12 20v2"/><path d="M12 14v2"/><path d="M12 8v2"/><path d="M12 2v2"/></>,
    FlipV: <><path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"/><path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"/><path d="M4 12H2"/><path d="M10 12H8"/><path d="M16 12h-2"/><path d="M22 12h-2"/></>,
    ArrowRightLeft: <><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></>,
    Shapes: <><path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/></>,
    Link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {svgs[name] || <circle cx="12" cy="12" r="10" />}
    </svg>
  );
};

/* ───────── Constants ───────── */
export const CROQUIS_PX_PER_METER = 40;
export const CROQUIS_SNAP_DIST_PX = 15;
export const CROQUIS_COLORS = {
  bg: '#0B0410',
  gridMain: 'rgba(45, 212, 191, 0.15)',
  gridSub: 'rgba(45, 212, 191, 0.04)',
  activeLine: '#2dd4bf',
  doneLine: '#e9d5ff',
  selectedLine: '#c084fc',
  dimText: '#2dd4bf',
};

/* ───────── Helpers ───────── */
export const calcDistance = (p1: Point, p2: Point): number =>
  Math.hypot(p2.x - p1.x, p2.y - p1.y) / CROQUIS_PX_PER_METER;

export const calcArea = (points: Point[]): number => {
  if (points.length < 4) return 0;
  let area = 0;
  for (let i = 0; i < points.length - 1; i++) {
    area += points[i].x * points[i + 1].y - points[i + 1].x * points[i].y;
  }
  return Math.abs(area / 2) / (CROQUIS_PX_PER_METER * CROQUIS_PX_PER_METER);
};

/* ───────── Fixture renderer ───────── */
export const renderFixtureSVG = (
  fixture: Fixture,
  p1: Point,
  p2: Point,
  isEdgeSelected: boolean,
  activeFixtureId: number | null,
  isThumbnail: boolean = false,
  setActiveFixtureId?: (id: number) => void,
  setSelectedEdge?: (edge: EdgeSelection) => void,
  setUiState?: (s: UIState) => void,
  showClearConfirm?: boolean
) => {
  const wallLenMeters = calcDistance(p1, p2);
  if (wallLenMeters <= 0.1) return null;

  const safeSizeMeters = Math.min(fixture.size, wallLenMeters);
  const minRatio = (safeSizeMeters / 2) / wallLenMeters;
  const maxRatio = 1 - minRatio;
  const safeRatio = Math.max(minRatio, Math.min(fixture.ratio, maxRatio));

  const lengthPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const angleDeg = angleRad * (180 / Math.PI);

  const cx = p1.x + Math.cos(angleRad) * (safeRatio * lengthPx);
  const cy = p1.y + Math.sin(angleRad) * (safeRatio * lengthPx);

  const sizePx = safeSizeMeters * CROQUIS_PX_PER_METER;
  const isSelected = activeFixtureId === fixture.id;
  const color = isSelected && !isThumbnail
    ? CROQUIS_COLORS.selectedLine
    : (isEdgeSelected && !isThumbnail ? CROQUIS_COLORS.selectedLine : CROQUIS_COLORS.doneLine);

  const flipX = fixture.flipHinge ? -1 : 1;
  const flipY = fixture.flipSide ? -1 : 1;

  return (
    <g
      key={fixture.id}
      transform={`translate(${cx}, ${cy}) rotate(${angleDeg})`}
      onPointerDown={(e) => {
        if (isThumbnail || !setActiveFixtureId) return;
        e.stopPropagation();
        if (showClearConfirm) return;
        setActiveFixtureId(fixture.id);
        setSelectedEdge?.({ pathIdx: fixture.pathIdx, ptIdx: fixture.ptIdx });
        setUiState?.('FIXTURE_EDITING');
      }}
      className={isThumbnail ? "" : "cursor-pointer"}
    >
      {['DOOR', 'WINDOW', 'OPENING'].includes(fixture.type) && (
        <line x1={-sizePx / 2} y1={0} x2={sizePx / 2} y2={0} stroke={CROQUIS_COLORS.bg} strokeWidth={10} />
      )}
      <g transform={`scale(${flipX}, ${flipY})`}>
        {fixture.type === 'DOOR' && (
          <>
            <line x1={-sizePx / 2} y1={0} x2={-sizePx / 2} y2={sizePx} stroke={color} strokeWidth={3} strokeLinecap="round" />
            <path d={`M ${-sizePx / 2} ${sizePx} A ${sizePx} ${sizePx} 0 0 0 ${sizePx / 2} 0`} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray={`4,4`} />
          </>
        )}
        {fixture.type === 'WINDOW' && (
          <g stroke={color} strokeWidth={2}>
            <rect x={-sizePx / 2} y={-4} width={sizePx} height={8} fill={CROQUIS_COLORS.bg} />
            <line x1={-sizePx / 2} y1={0} x2={sizePx / 2} y2={0} strokeWidth={1} />
          </g>
        )}
        {fixture.type === 'OPENING' && (
          <g stroke={color} strokeWidth={2} strokeLinecap="round">
            <line x1={-sizePx / 2} y1={-6} x2={-sizePx / 2} y2={6} />
            <line x1={sizePx / 2} y1={-6} x2={sizePx / 2} y2={6} />
          </g>
        )}
        {fixture.type === 'TOILET' && (
          <g stroke={color} strokeWidth={2} fill={CROQUIS_COLORS.bg}>
            <rect x={-sizePx / 4} y={2} width={sizePx / 2} height={12} rx={2} />
            <ellipse cx={0} cy={24} rx={sizePx / 3.5} ry={14} />
          </g>
        )}
        {fixture.type === 'SINK' && (
          <g stroke={color} strokeWidth={2} fill={CROQUIS_COLORS.bg}>
            <rect x={-sizePx / 2} y={0} width={sizePx} height={20} rx={2} />
            <ellipse cx={0} cy={10} rx={sizePx / 3} ry={6} />
            <circle cx={0} cy={4} r={1.5} fill={color} />
          </g>
        )}
        {fixture.type === 'SHOWER' && (
          <g stroke={color} strokeWidth={2} fill={CROQUIS_COLORS.bg}>
            <rect x={-sizePx / 2} y={0} width={sizePx} height={sizePx} rx={2} />
            <line x1={-sizePx / 2} y1={0} x2={sizePx / 2} y2={sizePx} strokeWidth={1} opacity="0.5" />
            <line x1={sizePx / 2} y1={0} x2={-sizePx / 2} y2={sizePx} strokeWidth={1} opacity="0.5" />
            <circle cx={0} cy={sizePx / 2} r={3} fill={CROQUIS_COLORS.bg} strokeWidth={1.5} />
          </g>
        )}
      </g>
      {!isThumbnail && <circle cx={0} cy={0} r={20} fill="transparent" />}
    </g>
  );
};

/* ───────── CroquisEditorModal ───────── */
export const CroquisEditorModal: React.FC<{
  initialPaths: Point[][];
  initialFixtures: Fixture[];
  readOnly?: boolean;
  onSave: (paths: Point[][], fixtures: Fixture[], area: string) => void;
  onClose: () => void;
}> = ({ initialPaths, initialFixtures, readOnly = false, onSave, onClose }) => {
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const isPanning = useRef<boolean>(false);
  const lastPan = useRef<Point>({ x: 0, y: 0 });

  const [paths, setPaths] = useState<Point[][]>(initialPaths || []);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>(initialFixtures || []);

  const [uiState, setUiState] = useState<UIState>('IDLE');
  const [settings, setSettings] = useState({ ortho: true, grid: true });

  const [selectedEdge, setSelectedEdge] = useState<EdgeSelection | null>(null);
  const [selectedNodeToMove, setSelectedNodeToMove] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [activeFixtureId, setActiveFixtureId] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    window.haptic = (type = 'light') => {
      try { if (navigator && navigator.vibrate) navigator.vibrate(type === 'heavy' ? 15 : 5); } catch (e) { /* ignore */ }
    };

    if (initialPaths.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      initialPaths.forEach(path => path.forEach(pt => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }));
      if (minX !== Infinity) {
        const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
        setPan({ x: window.innerWidth / 2 - cx, y: window.innerHeight / 2 - cy });
      }
    } else {
      setPan({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalArea = useMemo(
    () => paths.reduce((sum, path) => sum + (path.length > 3 ? calcArea(path) : 0), 0).toFixed(1),
    [paths]
  );

  const handleZoom = (delta: number) => {
    const currentZoom = zoom;
    const newZoom = Math.min(Math.max(currentZoom * delta, 0.5), 5);
    if (currentZoom === newZoom) return;
    setPan(prev => ({
      x: windowSize.w / 2 - (windowSize.w / 2 - prev.x) * (newZoom / currentZoom),
      y: windowSize.h / 2 - (windowSize.h / 2 - prev.y) * (newZoom / currentZoom),
    }));
    setZoom(newZoom);
    if (window.haptic) window.haptic('light');
  };

  const handleNudge = (dxCm: number, dyCm: number) => {
    const dxPx = (dxCm / 100) * CROQUIS_PX_PER_METER * zoom;
    const dyPx = (dyCm / 100) * CROQUIS_PX_PER_METER * zoom;
    setPan(prev => ({ x: prev.x - dxPx, y: prev.y - dyPx }));
    if (window.haptic) window.haptic('light');
  };

  const getCenterWorldPos = useCallback(
    (): Point => ({ x: (windowSize.w / 2 - pan.x) / zoom, y: (windowSize.h / 2 - pan.y) / zoom }),
    [windowSize, pan, zoom]
  );

  const getSnappedPos = useCallback((raw: Point): { pos: Point, type: string } => {
    let target = { ...raw }; let didSnap = false;
    const checkPointSnap = (pts: Point[]): boolean => {
      for (const pt of pts) {
        if (Math.hypot(target.x - pt.x, target.y - pt.y) < (CROQUIS_SNAP_DIST_PX / zoom)) {
          target = { x: pt.x, y: pt.y };
          return true;
        }
      }
      return false;
    };
    if (currentPath.length > 0) didSnap = checkPointSnap([currentPath[0]]);
    if (!didSnap) { for (const path of paths) { if (checkPointSnap(path)) { didSnap = true; break; } } }
    if (didSnap) return { pos: target, type: 'point' };

    if (settings.ortho && currentPath.length > 0) {
      const lastPt = currentPath[currentPath.length - 1];
      const dx = Math.abs(target.x - lastPt.x);
      const dy = Math.abs(target.y - lastPt.y);
      if (dx > dy * 1.2) { target.y = lastPt.y; didSnap = true; }
      else if (dy > dx * 1.2) { target.x = lastPt.x; didSnap = true; }
    }

    if (settings.grid && !didSnap) {
      const snapGridPx = CROQUIS_PX_PER_METER * 0.1;
      target.x = Math.round(target.x / snapGridPx) * snapGridPx;
      target.y = Math.round(target.y / snapGridPx) * snapGridPx;
      didSnap = true;
    }
    return { pos: target, type: didSnap ? 'grid' : 'none' };
  }, [currentPath, paths, settings, zoom]);

  const targetData = getSnappedPos(getCenterWorldPos());
  const targetPos = targetData.pos;

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (showClearConfirm) return;
    const target = e.target as HTMLElement | SVGElement;
    if ((target as HTMLElement).closest('button')) return;
    if (target.tagName.toLowerCase() === 'circle' && target.classList.contains('node-selector')) return;
    isPanning.current = true;
    if ((target as any).setPointerCapture) (target as any).setPointerCapture(e.pointerId);
    lastPan.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPan.current.x;
    const dy = e.clientY - lastPan.current.y;
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastPan.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    isPanning.current = false;
    const target = e.target as HTMLElement | SVGElement;
    if ((target as any).releasePointerCapture) (target as any).releasePointerCapture(e.pointerId);
  };

  const dropCorner = () => {
    if (window.haptic) window.haptic('heavy');
    if (currentPath.length === 0) { setCurrentPath([targetPos]); setUiState('DRAWING'); }
    else {
      const startPt = currentPath[0];
      if (startPt.x === targetPos.x && startPt.y === targetPos.y) {
        setPaths([...paths, [...currentPath, targetPos]]);
        setCurrentPath([]);
        setUiState('IDLE');
      } else {
        const lastPt = currentPath[currentPath.length - 1];
        if (lastPt.x !== targetPos.x || lastPt.y !== targetPos.y) setCurrentPath([...currentPath, targetPos]);
      }
    }
  };

  const finishPath = () => {
    if (currentPath.length > 1) setPaths([...paths, currentPath]);
    setCurrentPath([]);
    setUiState('IDLE');
  };
  const undoDraft = () => {
    if (currentPath.length > 1) setCurrentPath(currentPath.slice(0, -1));
    else if (currentPath.length === 1) { setCurrentPath([]); setUiState('IDLE'); }
  };
  const clearAll = () => {
    setPaths([]); setCurrentPath([]); setFixtures([]);
    setUiState('IDLE'); setShowClearConfirm(false);
  };
  const autoCloseRoom = () => {
    if (currentPath.length < 3) return;
    if (window.haptic) window.haptic('heavy');
    const closedPath = [...currentPath, currentPath[0]];
    setPaths([...paths, closedPath]);
    setCurrentPath([]); setUiState('IDLE');
  };

  const handleEdgeClick = (pathIdx: number, ptIdx: number, e: React.PointerEvent | React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation(); e.preventDefault();
    if (uiState === 'DRAWING' || showClearConfirm) return;
    if (window.haptic) window.haptic();
    setSelectedEdge({ pathIdx, ptIdx });
    setUiState('EDGE_SELECTED_OPTIONS');
  };

  const handleSelectNode = (nodeIdx: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (window.haptic) window.haptic('heavy');
    setSelectedNodeToMove(nodeIdx);
    if (selectedEdge) {
      const p1 = paths[selectedEdge.pathIdx][selectedEdge.ptIdx];
      const p2 = paths[selectedEdge.pathIdx][selectedEdge.ptIdx + 1];
      setEditValue(calcDistance(p1, p2).toFixed(2));
    }
    setUiState('LENGTH_EDIT_INPUT');
  };

  const closeEditor = () => {
    setSelectedEdge(null); setSelectedNodeToMove(null);
    setActiveFixtureId(null); setEditValue("");
    setUiState('IDLE');
  };

  const applyParametricChange = () => {
    if (!selectedEdge || selectedNodeToMove === null || !editValue) return;
    const newLengthMeters = parseFloat(editValue);
    if (isNaN(newLengthMeters) || newLengthMeters <= 0) { closeEditor(); return; }
    const { pathIdx, ptIdx } = selectedEdge;
    const newPaths = [...paths];
    const path = [...newPaths[pathIdx]];
    const N = path.length - 1;
    const isClosed = path[0].x === path[N].x && path[0].y === path[N].y;
    const nodeA = ptIdx; const nodeB = ptIdx + 1;
    let mIdx = selectedNodeToMove;
    if (isClosed && selectedNodeToMove === N) mIdx = 0;
    let anchorIdx = (mIdx === nodeA % N) ? (nodeB % N) : (nodeA % N);
    if (isClosed && anchorIdx === N) anchorIdx = 0;
    const pAnchor = path[anchorIdx];
    const pMove = path[mIdx];
    const angle = Math.atan2(pMove.y - pAnchor.y, pMove.x - pAnchor.x);
    const newLengthPx = newLengthMeters * CROQUIS_PX_PER_METER;
    const newMoveX = pAnchor.x + Math.cos(angle) * newLengthPx;
    const newMoveY = pAnchor.y + Math.sin(angle) * newLengthPx;
    path[mIdx] = { x: newMoveX, y: newMoveY };
    if (isClosed && mIdx === 0) { path[N] = { x: newMoveX, y: newMoveY }; }
    newPaths[pathIdx] = path;
    setPaths(newPaths);
    closeEditor();
  };

  const addFixture = (type: FixtureType) => {
    if (!selectedEdge) return;
    if (window.haptic) window.haptic('heavy');
    const sizes: Record<string, number> = { DOOR: 0.9, WINDOW: 1.2, OPENING: 1.0, TOILET: 0.5, SINK: 0.6, SHOWER: 0.9 };
    const wallLen = calcDistance(paths[selectedEdge.pathIdx][selectedEdge.ptIdx], paths[selectedEdge.pathIdx][selectedEdge.ptIdx + 1]);
    let defaultSize = sizes[type] || 0.9;
    if (defaultSize > wallLen) defaultSize = wallLen;
    const newFixture: Fixture = {
      id: Date.now(), type,
      pathIdx: selectedEdge.pathIdx, ptIdx: selectedEdge.ptIdx,
      ratio: 0.5, size: defaultSize,
      flipSide: false, flipHinge: false,
    };
    setFixtures([...fixtures, newFixture]);
    setActiveFixtureId(newFixture.id);
    setUiState('FIXTURE_EDITING');
  };

  const updateActiveFixture = (updates: Partial<Fixture>) => {
    setFixtures(fixtures.map(f => f.id === activeFixtureId ? { ...f, ...updates } : f));
    if (window.haptic) window.haptic('light');
  };
  const deleteActiveFixture = () => {
    setFixtures(fixtures.filter(f => f.id !== activeFixtureId));
    closeEditor();
  };

  const renderEdge = (p1: Point, p2: Point, isActive: boolean, isSelected: boolean, pathIdx: number, ptIdx: number) => {
    const dist = calcDistance(p1, p2);
    if (dist < 0.1) return null;
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    let textAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
    if (textAngle > 90 || textAngle < -90) textAngle += 180;
    const strokeColor = isSelected ? CROQUIS_COLORS.selectedLine : (isActive ? CROQUIS_COLORS.activeLine : CROQUIS_COLORS.doneLine);
    const z = zoom;
    const edgeFixtures = fixtures.filter(f => f.pathIdx === pathIdx && f.ptIdx === ptIdx);

    return (
      <g key={`${p1.x}-${p1.y}-${p2.x}-${p2.y}`}>
        {!isActive && !readOnly && (
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke="transparent" strokeWidth={40 / z}
            className="cursor-pointer"
            onPointerDown={(e) => handleEdgeClick(pathIdx, ptIdx, e)} />
        )}
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke={strokeColor} strokeWidth={isActive ? 3 / z : 4 / z}
          strokeLinecap="round" strokeDasharray={isActive ? `${6 / z},${6 / z}` : "none"}
          className="pointer-events-none" />
        {edgeFixtures.map(fix => renderFixtureSVG(fix, p1, p2, isSelected, activeFixtureId, false, setActiveFixtureId, setSelectedEdge, setUiState, showClearConfirm))}
        {dist >= 0.5 && !uiState.includes('FIXTURE') && uiState !== 'LENGTH_EDIT_SELECT_NODE' && (
          <g transform={`translate(${midX}, ${midY}) rotate(${textAngle})`} className="pointer-events-none">
            <rect x={-26 / z} y={-10 / z} width={52 / z} height={20 / z} fill={CROQUIS_COLORS.bg} rx={4 / z} />
            <text x="0" y="0" fill={isSelected ? CROQUIS_COLORS.selectedLine : CROQUIS_COLORS.dimText}
              fontSize={12 / z} fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
              {dist.toFixed(2)} م
            </text>
          </g>
        )}
        {uiState === 'LENGTH_EDIT_SELECT_NODE' && isSelected && !readOnly && (
          <g>
            <circle cx={p1.x} cy={p1.y} r={18 / z} fill="#f59e0b" opacity="0.8"
              className="animate-pulse cursor-pointer node-selector"
              onPointerDown={(e) => handleSelectNode(ptIdx, e)} />
            <circle cx={p1.x} cy={p1.y} r={6 / z} fill="#fff" className="pointer-events-none" />
            <circle cx={p2.x} cy={p2.y} r={18 / z} fill="#f59e0b" opacity="0.8"
              className="animate-pulse cursor-pointer node-selector"
              onPointerDown={(e) => handleSelectNode(ptIdx + 1, e)} />
            <circle cx={p2.x} cy={p2.y} r={6 / z} fill="#fff" className="pointer-events-none" />
          </g>
        )}
      </g>
    );
  };

  const activeFixture = fixtures.find(f => f.id === activeFixtureId);
  let actFixSafeSize = 0, actFixWallLen = 0, actFixDistToEdge = 0, actFixMaxDistToEdge = 0;
  if (activeFixture) {
    const p1 = paths[activeFixture.pathIdx][activeFixture.ptIdx];
    const p2 = paths[activeFixture.pathIdx][activeFixture.ptIdx + 1];
    actFixWallLen = calcDistance(p1, p2);
    actFixSafeSize = Math.min(activeFixture.size, actFixWallLen);
    const minRatio = (actFixSafeSize / 2) / actFixWallLen;
    const maxRatio = 1 - minRatio;
    const safeRatio = Math.max(minRatio, Math.min(activeFixture.ratio, maxRatio));
    actFixDistToEdge = (safeRatio * actFixWallLen) - (actFixSafeSize / 2);
    actFixMaxDistToEdge = actFixWallLen - actFixSafeSize;
  }

  return (
    <div dir="rtl" className="fixed inset-0 bg-[#0B0410] overflow-hidden select-none font-sans flex flex-col z-[100]">
      {showClearConfirm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#19092B] border border-[#2D124C] rounded-2xl p-5 w-full max-w-[16rem] shadow-2xl flex flex-col items-center text-center">
            <CroquisIcon name="Trash2" size={32} className="text-red-400 mb-3" />
            <h3 className="text-white font-bold text-lg mb-1">مسح المخطط</h3>
            <p className="text-purple-300 text-xs mb-5">هل أنت متأكد من مسح المخطط بالكامل؟</p>
            <div className="flex w-full gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2 rounded-xl bg-[#2D124C] text-white text-sm font-bold active:scale-95 transition-transform">إلغاء</button>
              <button onClick={clearAll} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-bold shadow-lg shadow-red-900/30 active:scale-95 transition-transform">مسح</button>
            </div>
          </div>
        </div>
      )}

      <div className="h-14 bg-[#19092B]/90 backdrop-blur-md border-b border-[#2D124C] flex items-center justify-between px-3 z-40 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-purple-600 p-1.5 rounded-lg shadow-inner shadow-purple-400/30 text-white"><CroquisIcon name="SquarePen" size={18} /></div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">{readOnly ? 'عرض الكروكي' : 'تعديل الكروكي'}</h1>
            <p className="text-purple-400 text-[10px] font-bold">{totalArea} م²</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              <button onClick={() => setSettings(s => ({ ...s, ortho: !s.ortho }))} className={`p-2 rounded-xl transition-all ${settings.ortho ? 'bg-[#2D124C] text-teal-400' : 'text-purple-400/50'}`}><CroquisIcon name="Magnet" size={18} /></button>
              <button onClick={() => setShowClearConfirm(true)} className="p-2 rounded-xl text-purple-400/50 hover:text-red-400 transition-all"><CroquisIcon name="Trash2" size={18} /></button>
            </>
          )}
          <div className="w-px h-5 bg-[#2D124C] mx-1"></div>
          <button onClick={onClose} className="p-2 text-white hover:text-red-400 transition font-bold text-sm bg-[#2D124C] rounded-xl px-4">إغلاق</button>
          {!readOnly && (
            <button onClick={() => onSave(paths, fixtures, totalArea)} className="bg-teal-600 hover:bg-teal-500 text-[#0B0410] px-4 py-2 rounded-xl font-bold text-sm shadow-[0_0_10px_rgba(45,212,191,0.2)] active:scale-95 transition-transform flex items-center gap-1">
              <CroquisIcon name="Save" size={16} /> حفظ
            </button>
          )}
        </div>
      </div>

      <div className="relative flex-1 w-full h-full overflow-hidden">
        {uiState === 'DRAWING' && currentPath.length > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-teal-500 text-[#0B0410] px-4 py-1.5 rounded-full font-bold text-lg shadow-2xl backdrop-blur-md z-40 border border-teal-400/50 transition-all">
            {calcDistance(currentPath[currentPath.length - 1], targetPos).toFixed(2)} م
          </div>
        )}

        <svg className="absolute inset-0 w-full h-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}>
          <defs>
            <pattern id="grid" width={CROQUIS_PX_PER_METER * 0.1 * zoom} height={CROQUIS_PX_PER_METER * 0.1 * zoom} patternUnits="userSpaceOnUse">
              <path d={`M ${CROQUIS_PX_PER_METER * 0.1 * zoom} 0 L 0 0 0 ${CROQUIS_PX_PER_METER * 0.1 * zoom}`} fill="none" stroke={CROQUIS_COLORS.gridSub} strokeWidth="1" />
            </pattern>
            <pattern id="grid-major" width={CROQUIS_PX_PER_METER * zoom} height={CROQUIS_PX_PER_METER * zoom} patternUnits="userSpaceOnUse">
              <rect width={CROQUIS_PX_PER_METER * zoom} height={CROQUIS_PX_PER_METER * zoom} fill="url(#grid)" />
              <path d={`M ${CROQUIS_PX_PER_METER * zoom} 0 L 0 0 0 ${CROQUIS_PX_PER_METER * zoom}`} fill="none" stroke={CROQUIS_COLORS.gridMain} strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-major)" transform={`translate(${pan.x % (CROQUIS_PX_PER_METER * zoom)}, ${pan.y % (CROQUIS_PX_PER_METER * zoom)})`} />
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {paths.map((path, pathIdx) => (
              <g key={`path-${pathIdx}`}>
                {path.length > 2 && path[0].x === path[path.length - 1].x && path[0].y === path[path.length - 1].y && (
                  <polygon points={path.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(45, 212, 191, 0.05)" />
                )}
                {path.map((pt, ptIdx) => {
                  if (ptIdx === path.length - 1) return null;
                  const isSelected = selectedEdge?.pathIdx === pathIdx && selectedEdge?.ptIdx === ptIdx;
                  return renderEdge(pt, path[ptIdx + 1], false, isSelected, pathIdx, ptIdx);
                })}
                {path.map((pt, i) => (
                  <circle key={i} cx={pt.x} cy={pt.y} r={3.5 / zoom} fill={CROQUIS_COLORS.dimText} className="pointer-events-none" />
                ))}
              </g>
            ))}
            {currentPath.map((pt, idx) => {
              if (idx === currentPath.length - 1) return null;
              return renderEdge(pt, currentPath[idx + 1], false, false, -1, -1);
            })}
            {uiState === 'DRAWING' && currentPath.length > 0 && renderEdge(currentPath[currentPath.length - 1], targetPos, true, false, -1, -1)}
            {!readOnly && (
              <g transform={`translate(${targetPos.x}, ${targetPos.y})`} className="pointer-events-none">
                <circle cx="0" cy="0" r={10 / zoom} fill={CROQUIS_COLORS.activeLine} opacity="0.3" />
                <circle cx="0" cy="0" r={4 / zoom} fill={CROQUIS_COLORS.activeLine} />
              </g>
            )}
          </g>
        </svg>

        {!readOnly && (uiState === 'IDLE' || uiState === 'DRAWING') && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 opacity-60 text-teal-400 drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]">
            <CroquisIcon name="Target" size={48} />
          </div>
        )}

        <div className="absolute top-1/2 left-3 -translate-y-1/2 flex flex-col items-center gap-4 z-40 pointer-events-auto" dir="ltr">
          <div className="flex flex-col gap-2">
            <button onClick={() => handleZoom(1.5)} className="w-10 h-10 rounded-full bg-[#19092B]/90 backdrop-blur-md border border-[#2D124C] flex items-center justify-center text-teal-400 shadow-[0_5px_15px_rgba(0,0,0,0.5)] hover:bg-[#2D124C] active:bg-teal-500/20 active:scale-90 transition-all"><CroquisIcon name="ZoomIn" size={20} /></button>
            <button onClick={() => handleZoom(1 / 1.5)} className="w-10 h-10 rounded-full bg-[#19092B]/90 backdrop-blur-md border border-[#2D124C] flex items-center justify-center text-teal-400 shadow-[0_5px_15px_rgba(0,0,0,0.5)] hover:bg-[#2D124C] active:bg-teal-500/20 active:scale-90 transition-all"><CroquisIcon name="ZoomOut" size={20} /></button>
          </div>
          {!readOnly && (uiState === 'IDLE' || uiState === 'DRAWING') && (
            <div className="bg-[#19092B]/90 backdrop-blur-md border border-[#2D124C] rounded-3xl p-2.5 flex flex-col items-center gap-1 shadow-[0_5px_15px_rgba(0,0,0,0.5)] w-max">
              <div className="text-[9px] text-purple-300 font-bold mb-1 text-center leading-tight">1 سم</div>
              <button onClick={() => handleNudge(0, -1)} className="p-2 text-teal-400 bg-[#0B0410] rounded-xl hover:bg-[#2D124C] active:bg-teal-500/30 active:scale-90 transition-all border border-[#2D124C]/50"><CroquisIcon name="ChevronUp" size={18} /></button>
              <div className="flex gap-1">
                <button onClick={() => handleNudge(-1, 0)} className="p-2 text-teal-400 bg-[#0B0410] rounded-xl hover:bg-[#2D124C] active:bg-teal-500/30 active:scale-90 transition-all border border-[#2D124C]/50"><CroquisIcon name="ChevronLeft" size={18} /></button>
                <div className="w-8 h-8 rounded-full border-2 border-[#2D124C] flex items-center justify-center bg-[#0B0410]/50"><div className="w-2 h-2 bg-teal-400 rounded-full shadow-[0_0_8px_#2dd4bf]"></div></div>
                <button onClick={() => handleNudge(1, 0)} className="p-2 text-teal-400 bg-[#0B0410] rounded-xl hover:bg-[#2D124C] active:bg-teal-500/30 active:scale-90 transition-all border border-[#2D124C]/50"><CroquisIcon name="ChevronRight" size={18} /></button>
              </div>
              <button onClick={() => handleNudge(0, 1)} className="p-2 text-teal-400 bg-[#0B0410] rounded-xl hover:bg-[#2D124C] active:bg-teal-500/30 active:scale-90 transition-all border border-[#2D124C]/50"><CroquisIcon name="ChevronDown" size={18} /></button>
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="absolute bottom-6 inset-x-0 px-4 z-50 pointer-events-none">
            {(uiState === 'IDLE' || uiState === 'DRAWING') && (
              <div className="flex flex-col items-center gap-4 pointer-events-auto">
                {uiState === 'DRAWING' && (
                  <div className="flex flex-col gap-3 w-full max-w-[16rem]">
                    {currentPath.length >= 3 && (
                      <button onClick={autoCloseRoom} className="w-full bg-amber-500 hover:bg-amber-400 text-[#0B0410] h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(245,158,11,0.4)] active:scale-95 transition-transform">
                        <CroquisIcon name="Link" size={18} className="ml-1.5" /> الإغلاق التلقائي
                      </button>
                    )}
                    <div className="flex gap-3">
                      <button onClick={undoDraft} className="flex-1 bg-[#19092B] border border-[#2D124C] text-purple-300 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg active:scale-95 transition-transform">
                        <CroquisIcon name="Undo" size={18} className="ml-1.5" /> تراجع
                      </button>
                      <button onClick={finishPath} className="flex-1 bg-[#19092B] border border-[#2D124C] text-purple-300 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg active:scale-95 transition-transform">إنهاء المسار</button>
                    </div>
                  </div>
                )}
                <button onClick={dropCorner} className={`w-full max-w-[16rem] h-16 rounded-2xl flex items-center justify-center gap-2 shadow-2xl transition-all active:scale-95 border-b-2 border-black/30 ${uiState === 'DRAWING' ? 'bg-teal-500 text-[#0B0410] shadow-[0_0_15px_rgba(45,212,191,0.3)]' : 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]'}`}>
                  <span className="font-black text-xl">{uiState === 'DRAWING' ? "تثبيت الزاوية" : "بدء الجدار"}</span>
                </button>
              </div>
            )}

            {uiState === 'EDGE_SELECTED_OPTIONS' && (
              <div className="bg-[#19092B] border border-[#2D124C] rounded-3xl p-5 shadow-2xl pointer-events-auto max-w-[20rem] mx-auto flex flex-col gap-4 animate-in slide-in-from-bottom-5">
                <div className="flex items-center justify-between pb-2 border-b border-[#2D124C]">
                  <span className="font-bold text-teal-400 text-base">خيارات الجدار</span>
                  <button onClick={closeEditor} className="p-1.5 text-purple-400 bg-[#2D124C]/50 rounded-full hover:bg-red-500 hover:text-white transition-colors"><CroquisIcon name="X" size={18} /></button>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setUiState('FIXTURE_MENU')} className="bg-[#2D124C] hover:bg-[#3D1865] text-white p-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg active:scale-95 transition-all border border-purple-500/30 shadow-lg"><CroquisIcon name="Shapes" size={24} className="text-teal-400" /> أضف مكونات</button>
                  <button onClick={() => setUiState('LENGTH_EDIT_SELECT_NODE')} className="bg-[#2D124C] hover:bg-[#3D1865] text-white p-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg active:scale-95 transition-all border border-purple-500/30 shadow-lg"><CroquisIcon name="ArrowRightLeft" size={24} className="text-amber-400" /> تعديل الطول الدقيق</button>
                </div>
              </div>
            )}

            {uiState === 'FIXTURE_MENU' && (
              <div className="bg-[#19092B] border border-[#2D124C] rounded-3xl p-4 shadow-2xl pointer-events-auto max-w-[20rem] mx-auto flex flex-col gap-4 animate-in slide-in-from-bottom-5">
                <div className="flex items-center justify-between px-1">
                  <span className="font-bold text-teal-400 text-base">أضف مكون</span>
                  <button onClick={closeEditor} className="p-1.5 text-purple-400 bg-[#2D124C]/50 rounded-full hover:bg-red-500 hover:text-white transition-colors"><CroquisIcon name="X" size={18} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2.5 w-full">
                  {[
                    { id: 'DOOR', icon: 'Door', label: 'باب' },
                    { id: 'WINDOW', icon: 'Window', label: 'نافذة' },
                    { id: 'OPENING', icon: 'Opening', label: 'فتحة' },
                    { id: 'TOILET', icon: 'Plumbing', label: 'مرحاض' },
                    { id: 'SINK', icon: 'Plumbing', label: 'مغسلة' },
                    { id: 'SHOWER', icon: 'Plumbing', label: 'دش' },
                  ].map(item => (
                    <button key={item.id} onClick={() => addFixture(item.id as FixtureType)} className="flex flex-col items-center justify-center gap-2 bg-[#2D124C]/60 py-3 rounded-xl text-purple-200 hover:text-teal-400 hover:bg-[#2D124C] active:scale-95 transition-all border border-[#2D124C] hover:border-purple-500/30">
                      <CroquisIcon name={item.icon} size={26} />
                      <span className="text-[11px] font-bold">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {uiState === 'LENGTH_EDIT_SELECT_NODE' && (
              <div className="bg-amber-500 text-[#0B0410] rounded-3xl p-5 shadow-[0_0_30px_rgba(245,158,11,0.3)] pointer-events-auto max-w-[20rem] mx-auto flex flex-col items-center text-center gap-3 animate-in slide-in-from-bottom-5">
                <div className="font-black text-xl">اختر الزاوية للتحريك</div>
                <p className="text-sm font-bold opacity-90 leading-snug">اضغط على إحدى النقطتين البرتقالية لتعديل الطول انطلاقاً منها.</p>
                <button onClick={closeEditor} className="mt-2 bg-[#0B0410]/10 hover:bg-[#0B0410]/20 text-[#0B0410] px-8 py-2.5 rounded-xl text-base font-bold active:scale-95 transition-all border border-[#0B0410]/20">إلغاء</button>
              </div>
            )}

            {uiState === 'LENGTH_EDIT_INPUT' && (
              <div className="bg-[#19092B] border border-[#2D124C] rounded-3xl p-4 shadow-2xl pointer-events-auto max-w-sm mx-auto flex flex-col gap-4 animate-in slide-in-from-bottom-5">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 text-teal-400"><CroquisIcon name="Calculator" size={20} /><span className="font-bold text-base">الطول الجديد</span></div>
                  <button onClick={closeEditor} className="p-2 text-purple-400 bg-[#2D124C]/50 rounded-full hover:bg-red-500 hover:text-white transition-colors"><CroquisIcon name="X" size={20} /></button>
                </div>
                <div className="bg-[#0B0410] text-white text-4xl font-mono text-center py-4 rounded-2xl border-2 border-teal-500/50 shadow-inner flex justify-center items-center gap-2">{editValue || "0.0"}<span className="text-teal-400 opacity-70 text-2xl font-sans mt-2">م</span></div>
                <div className="grid grid-cols-3 gap-2" dir="ltr">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map(num => (
                    <button key={num} onClick={() => setEditValue(prev => prev + num)} className="bg-[#2D124C] text-purple-100 text-2xl font-bold py-3.5 rounded-2xl active:bg-teal-600 active:scale-95 transition-all">{num}</button>
                  ))}
                  <button onClick={() => setEditValue(prev => prev.slice(0, -1))} className="bg-[#2D124C] text-purple-300 py-3.5 rounded-2xl active:bg-red-600 active:scale-95 transition-all flex items-center justify-center"><CroquisIcon name="Undo" size={24} /></button>
                </div>
                <button onClick={applyParametricChange} className="w-full bg-teal-500 text-[#0B0410] font-black text-xl py-4 rounded-2xl mt-1 active:scale-95 transition-transform shadow-lg shadow-teal-900/30">تطبيق التعديل</button>
              </div>
            )}

            {uiState === 'FIXTURE_EDITING' && activeFixture && (
              <div className="bg-[#19092B] border border-[#2D124C] rounded-3xl p-5 shadow-2xl pointer-events-auto max-w-[20rem] mx-auto flex flex-col gap-5 animate-in slide-in-from-bottom-5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-400 text-lg">تعديل العنصر</span>
                  <button onClick={closeEditor} className="text-purple-400 bg-[#2D124C]/50 rounded-full p-2 hover:bg-red-500 hover:text-white transition-colors"><CroquisIcon name="X" size={20} /></button>
                </div>
                <div className="bg-[#0B0410] p-3.5 rounded-2xl border border-[#2D124C]">
                  <div className="flex justify-between text-purple-300 text-[13px] font-bold mb-2"><span>البعد عن الزاوية (للحافة)</span><span>{actFixDistToEdge.toFixed(2)} م</span></div>
                  <input type="range" min="0" max={actFixMaxDistToEdge} step="0.01" value={actFixDistToEdge}
                    onChange={(e) => { const newRatio = (parseFloat(e.target.value) + actFixSafeSize / 2) / actFixWallLen; updateActiveFixture({ ratio: newRatio }); }}
                    className="w-full accent-teal-500" />
                </div>
                <div className="bg-[#0B0410] p-3.5 rounded-2xl border border-[#2D124C]">
                  <div className="flex justify-between text-purple-300 text-[13px] font-bold mb-2"><span>العرض (Size)</span><span>{actFixSafeSize.toFixed(2)} م</span></div>
                  <input type="range" min="0.4" max={Math.min(3.0, actFixWallLen)} step="0.01" value={actFixSafeSize}
                    onChange={(e) => {
                      const newSize = parseFloat(e.target.value);
                      const newMinRatio = (newSize / 2) / actFixWallLen;
                      const newMaxRatio = 1 - newMinRatio;
                      const newRatio = Math.max(newMinRatio, Math.min(activeFixture.ratio, newMaxRatio));
                      updateActiveFixture({ size: newSize, ratio: newRatio });
                    }}
                    className="w-full accent-purple-500" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateActiveFixture({ flipSide: !activeFixture.flipSide })} className="flex-1 bg-[#2D124C] hover:bg-[#3D1865] text-purple-100 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold active:scale-95 transition-all border border-[#2D124C]"><CroquisIcon name="FlipV" size={18} /> الجهة</button>
                  {['DOOR', 'WINDOW', 'OPENING'].includes(activeFixture.type) && (
                    <button onClick={() => updateActiveFixture({ flipHinge: !activeFixture.flipHinge })} className="flex-1 bg-[#2D124C] hover:bg-[#3D1865] text-purple-100 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold active:scale-95 transition-all border border-[#2D124C]"><CroquisIcon name="FlipH" size={18} /> المفصلة</button>
                  )}
                  <button onClick={deleteActiveFixture} className="bg-red-950/40 hover:bg-red-900 text-red-400 hover:text-white border border-red-900/50 p-3 rounded-xl active:scale-95 transition-all"><CroquisIcon name="Trash2" size={20} /></button>
                </div>
                <button onClick={closeEditor} className="w-full bg-teal-500 text-[#0B0410] font-black text-xl py-3.5 rounded-xl active:scale-95 transition-transform shadow-lg shadow-teal-900/30">تم</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
