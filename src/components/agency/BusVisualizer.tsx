import React from 'react';
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
}

const BusVisualizer: React.FC<BusVisualizerProps> = ({
    vehicle,
    selectedPassenger,
    dragOverSeat,
    onDragOver,
    onDragLeave,
    onDrop,
    onSeatClick,
    isSeatOccupied
}) => {
    const { totalSeats, cols, aisleAfterCol } = vehicle.config;
    const rows = Math.ceil(totalSeats / cols);
    const grid = [];

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
                
                rowSeats.push(
                    <div
                        key={seatNum}
                        onDragOver={(e) => { 
                            e.preventDefault(); 
                            if (!occupant) onDragOver(e, seatStr); 
                        }}
                        onDragLeave={onDragLeave}
                        onDrop={(e) => { 
                            e.preventDefault(); 
                            onDragLeave(); 
                            if (!occupant) onDrop(e, seatStr); 
                        }}
                        onClick={() => onSeatClick(seatStr)}
                        className={`
                            relative w-12 h-12 flex flex-col items-center justify-center transition-all duration-200
                            ${occupant 
                                ? 'cursor-pointer text-primary-600' 
                                : isTarget 
                                    ? 'cursor-pointer scale-110 text-green-500 bg-green-50 rounded-lg shadow-sm border border-green-200' 
                                    : 'cursor-pointer text-gray-300 hover:text-gray-400'
                            }
                        `}
                        title={occupant ? occupant.passengerName : `Poltrona ${seatNum}`}
                    >
                        <Armchair 
                            size={40} 
                            className={`
                                transition-all 
                                ${occupant 
                                    ? 'fill-primary-100 stroke-primary-600' 
                                    : isTarget 
                                        ? 'fill-green-50 stroke-green-500' 
                                        : 'fill-white stroke-current'
                                }
                            `} 
                            strokeWidth={1.5} 
                        />
                        <span 
                            className={`
                                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold 
                                ${occupant ? 'text-primary-700' : 'text-gray-400'}
                            `}
                        >
                            {occupant ? occupant.passengerName.substring(0, 2).toUpperCase() : seatNum}
                        </span>
                        {occupant && (
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow opacity-0 hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                                {occupant.passengerName}
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

    return <>{grid}</>;
};

export default BusVisualizer;

