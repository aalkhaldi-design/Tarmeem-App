/**
 * CroquisMiniViewer — read-only thumbnail of a saved croquis.
 *
 * Auto-fits the path bounding box to the available area; renders edges
 * and fixtures via the shared renderFixtureSVG helper. When `onOpen` is
 * provided, hovering shows an overlay inviting the user to open the
 * full editor (in readOnly or edit mode, decided by the caller).
 */
import React from 'react';
import { Eye, PenTool } from 'lucide-react';
import {
  type Point, type Fixture,
  renderFixtureSVG, CROQUIS_COLORS,
} from './CroquisEditor';

interface Props {
  paths: Point[][];
  fixtures: Fixture[];
  area?: string;
  onOpen?: () => void;
  className?: string;
}

export const CroquisMiniViewer: React.FC<Props> = ({ paths, fixtures, area, onOpen, className = '' }) => {
  const hasPaths = paths && paths.length > 0;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  if (hasPaths) {
    paths.forEach(path => path.forEach(pt => {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }));
  }

  const empty = !hasPaths || minX === Infinity;

  const inner = empty ? (
    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
      <PenTool className="w-8 h-8 mb-2 opacity-50" />
      <span className="text-xs font-bold">{onOpen ? 'انقر للتعديل' : 'لا يوجد رسم'}</span>
    </div>
  ) : (() => {
    const pad = 60;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const vb = `${minX - pad} ${minY - pad} ${w} ${h}`;
    return (
      <svg viewBox={vb} className="w-full h-full">
        {paths.map((path, pathIdx) => (
          <g key={`path-${pathIdx}`}>
            {path.length > 2 && path[0].x === path[path.length - 1].x && path[0].y === path[path.length - 1].y && (
              <polygon points={path.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(45, 212, 191, 0.05)" />
            )}
            {path.map((pt, ptIdx) => {
              if (ptIdx === path.length - 1) return null;
              const p1 = pt; const p2 = path[ptIdx + 1];
              return (
                <g key={`${p1.x}-${p1.y}-${p2.x}-${p2.y}`}>
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={CROQUIS_COLORS.doneLine} strokeWidth={4} strokeLinecap="round" />
                  {fixtures.filter(f => f.pathIdx === pathIdx && f.ptIdx === ptIdx)
                    .map(fix => renderFixtureSVG(fix, p1, p2, false, null, true))}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    );
  })();

  const wrapperClass =
    `relative w-full h-full bg-[#0B0410] rounded-xl border border-gray-800 overflow-hidden ` +
    (onOpen ? 'cursor-pointer group ' : '') + className;

  return (
    <div className={wrapperClass} onClick={onOpen}>
      {inner}
      {area && !empty && (
        <span className="absolute top-2 right-2 text-[10px] font-bold bg-[#05110e] text-[#43bba1] border border-[#43bba1]/30 px-2 py-0.5 rounded-md">
          {area} م²
        </span>
      )}
      {onOpen && !empty && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
          <Eye className="w-8 h-8 text-white mb-2 shadow-lg" />
          <span className="text-white text-xs font-bold">انقر للتكبير والتفاصيل</span>
        </div>
      )}
    </div>
  );
};
