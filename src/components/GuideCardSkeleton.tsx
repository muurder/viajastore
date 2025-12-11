import React from 'react';

/**
 * Skeleton component for Guide cards
 * Used during loading states in GuideList
 */
export const GuideCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col animate-pulse">
    {/* Avatar/Image */}
    <div className="h-48 bg-gray-200 w-full"></div>
    
    <div className="p-5 flex-1 flex flex-col">
      {/* Name and Rating */}
      <div className="flex justify-between items-start mb-3">
        <div className="h-6 bg-gray-200 w-32 rounded"></div>
        <div className="h-5 bg-gray-200 w-16 rounded-full"></div>
      </div>
      
      {/* Description */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-200 w-full rounded"></div>
        <div className="h-4 bg-gray-200 w-5/6 rounded"></div>
        <div className="h-4 bg-gray-200 w-4/6 rounded"></div>
      </div>
      
      {/* Location */}
      <div className="h-4 bg-gray-200 w-24 rounded mb-4"></div>
      
      {/* Specialties/Tags */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <div className="h-5 bg-gray-200 w-20 rounded-full"></div>
        <div className="h-5 bg-gray-200 w-16 rounded-full"></div>
        <div className="h-5 bg-gray-200 w-24 rounded-full"></div>
      </div>

      {/* Footer with buttons */}
      <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
        <div className="h-8 bg-gray-200 w-20 rounded"></div>
        <div className="h-9 bg-gray-200 w-28 rounded-full"></div>
      </div>
    </div>
  </div>
);

/**
 * Skeleton for Guide list view (compact)
 */
export const GuideListItemSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 animate-pulse">
    {/* Avatar */}
    <div className="w-16 h-16 bg-gray-200 rounded-full flex-shrink-0"></div>
    
    <div className="flex-1 min-w-0">
      {/* Name and Rating */}
      <div className="flex justify-between items-start mb-2">
        <div className="h-5 bg-gray-200 w-40 rounded"></div>
        <div className="h-4 bg-gray-200 w-12 rounded-full"></div>
      </div>
      
      {/* Description */}
      <div className="h-4 bg-gray-200 w-full rounded mb-2"></div>
      <div className="h-4 bg-gray-200 w-3/4 rounded mb-3"></div>
      
      {/* Location and Tags */}
      <div className="flex items-center gap-3">
        <div className="h-3 bg-gray-200 w-24 rounded"></div>
        <div className="flex gap-2">
          <div className="h-4 bg-gray-200 w-16 rounded-full"></div>
          <div className="h-4 bg-gray-200 w-20 rounded-full"></div>
        </div>
      </div>
    </div>
    
    {/* Action button */}
    <div className="h-9 bg-gray-200 w-24 rounded-full flex-shrink-0"></div>
  </div>
);

