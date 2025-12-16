import React from 'react';

/**
 * Skeleton component for Guide cards
 * Used during loading states in GuideList
 */
export const GuideCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden h-full flex flex-col animate-pulse">
    {/* Header: Cover & Profile - Matching new design */}
    <div className="relative h-32 bg-gray-300"></div>
    
    <div className="pt-14 px-6 pb-6 flex-1 flex flex-col">
      {/* Name and Location */}
      <div className="mb-4">
        <div className="h-7 bg-gray-200 w-40 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 w-32 rounded"></div>
      </div>
      
      {/* Badges */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <div className="h-6 bg-gray-200 w-20 rounded-full"></div>
        <div className="h-6 bg-gray-200 w-24 rounded-full"></div>
        <div className="h-6 bg-gray-200 w-18 rounded-full"></div>
      </div>
      
      {/* Portfolio */}
      <div className="mb-6">
        <div className="h-3 bg-gray-200 w-24 rounded mb-2"></div>
        <div className="flex gap-2">
          <div className="h-16 bg-gray-200 w-1/3 rounded-xl"></div>
          <div className="h-16 bg-gray-200 w-1/3 rounded-xl"></div>
          <div className="h-16 bg-gray-200 w-1/3 rounded-xl"></div>
        </div>
      </div>

      {/* Footer with buttons */}
      <div className="mt-auto flex gap-3">
        <div className="flex-1 h-10 bg-gray-200 rounded-full"></div>
        <div className="flex-1 h-10 bg-gray-200 rounded-full"></div>
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

