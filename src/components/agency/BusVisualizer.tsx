import React, { useState } from 'react';
import { Armchair } from 'lucide-react';
import { VehicleInstance, PassengerSeat } from '../../types';

interface BusVisualizerProps {
    vehicle: VehicleInstance;
    selectedPassenger: { id: string; name: string; bookingId: string } | null;
    dragOverSeat: string | null;
    onDragOver: (e: React.DragEvent, seatNum: string) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent, seatNum: string) => void;
    onSeatClick: (seatNum: string) => void;
    isSeatOccupied: (seatNum: string) => PassengerSeat | undefined;
    getPassengerDetails?: (seat: PassengerSeat) => { name: string; avatar?: string; status?: string } | null;
}

const BusVisualizer: React.FC<BusVisualizerProps> = ({
    vehicle,
    selectedPassenger,
    dragOverSeat,
    onDragOver,
    onDragLeave,
    onDrop,
    onSeatClick,
    isSeatOccupied,
    getPassengerDetails
}) => {
    const { totalSeats, cols, aisleAfterCol } = vehicle.config;
    const rows = Math.ceil(totalSeats / cols);
    const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
    const grid = [];

    // Helper to get initials from name
    const getInitials = (name: string): string => {
        const parts = name.trim().split(' ').filter(p => p.length > 0);
        if (parts.length === 0) return '??';
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    for (let r = 1; r <= rows; r++) {
        const rowSeats = [];
        for (let c = 1; c <= cols; c++) {
            const seatNum = ((r - 1) * cols) + c;

            // Add row number indicator in the aisle
            if (c === aisleAfterCol + 1) {
                rowSeats.push(
                    <div
                        key={`aisle-${r}`}
                        className="w-8 flex justify-center items-center text-xs text-gray-300 font-mono select-none"
                    >
                        {r}
                    </div>
                );
            }

            if (seatNum <= totalSeats) {
                const seatStr = seatNum.toString();
                const occupant = isSeatOccupied(seatStr);
                const isTarget = dragOverSeat === seatStr || (selectedPassenger && !occupant);
                const isHovered = hoveredSeat === seatStr;
                const passengerDetails = occupant && getPassengerDetails ? getPassengerDetails(occupant) : null;

                rowSeats.push(
                    <div
                        key={seatNum}
                        onDragOver={(e) => {
                            e.preventDefault();
                            if (!occupant) onDragOver(e, seatStr);
                        }}
                        onDragLeave={() => {
                            onDragLeave();
                            setHoveredSeat(null);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            onDragLeave();
                            if (!occupant) onDrop(e, seatStr);
                        }}
                        onClick={() => onSeatClick(seatStr)}
                        onMouseEnter={() => setHoveredSeat(seatStr)}
                        onMouseLeave={() => setHoveredSeat(null)}
                        className={`
                            relative w-12 h-12 flex flex-col items-center justify-center transition-all duration-200
                            ${occupant
                                ? 'cursor-pointer text-primary-600'
                                : isTarget
                                    ? 'cursor-pointer scale-110 text-green-500 bg-green-50 rounded-lg shadow-sm border border-green-200'
                                    : 'cursor-pointer text-gray-300 hover:text-gray-400'
                            }
                        `}
                    >
                        <Armchair
                            size={40}
                            className={`
                                transition-all 
                                ${occupant
                                    ? 'fill-blue-600 stroke-blue-700'
                                    : isTarget
                                        ? 'fill-green-50 stroke-green-500'
                                        : 'fill-white stroke-current'
                                }
                            `}
                            strokeWidth={1.5}
                        />
                        {/* Content: Number for free, Initials for occupied */}
                        {occupant ? (
                            <span
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white leading-none z-10"
                                style={{ fontSize: '12px', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                            >
                                {getInitials(occupant.passengerName)}
                            </span>
                        ) : (
                            <span
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-bold text-gray-700 leading-none"
                                style={{ fontSize: '13px' }}
                            >
                                {seatNum}
                            </span>
                        )}

                        {/* Enhanced Tooltip on Hover */}
                        {occupant && isHovered && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl z-50 pointer-events-none whitespace-nowrap min-w-[220px] max-w-[300px]">
                                <div className="flex items-center gap-2 mb-1">
                                    {passengerDetails?.avatar ? (
                                        <img
                                            src={passengerDetails.avatar}
                                            alt=""
                                            className="w-8 h-8 rounded-full object-cover border border-gray-700"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold">
                                            {getInitials(occupant.passengerName)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold">{occupant.passengerName}</div>
                                        {passengerDetails?.status && (
                                            <div className="text-[10px] text-gray-300">{passengerDetails.status}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-300 border-t border-gray-700 pt-1 mt-1">
                                    Assento {seatNum}
                                </div>
                            </div>
                        )}
                    </div>
                );
            } else {
                rowSeats.push(<div key={`empty-${seatNum}`} className="w-12 h-12"></div>);
            }
        }
        grid.push(
            <div key={`row-${r}`} className="flex justify-center items-center gap-1 mb-2">
                {rowSeats}
            </div>
        );
    }

    return (
        <>
            {grid}
            {/* Legend - Hidden on mobile (shown above in parent) */}
            <div className="hidden md:flex mt-6 items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 border border-green-300 flex items-center justify-center">
                        <span className="text-xs font-bold text-green-700">1</span>
                    </div>
                    <span className="text-gray-600">Livre</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-primary-100 border border-primary-600 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary-700">JD</span>
                    </div>
                    <span className="text-gray-600">Ocupado</span>
                </div>
            </div>
        </>
    );
};

export default BusVisualizer;

