import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export type PlanType = 'STARTER' | 'BASIC' | 'PREMIUM';

export interface PlanPermissions {
  plan: PlanType;
  canAccessOperational: boolean;
  maxTrips: number;
  canPostTrip: boolean;
  currentActiveTrips: number;
}

/**
 * Hook to get plan-based permissions for the current agency
 */
export const usePlanPermissions = (): PlanPermissions => {
  const { user } = useAuth();
  const { agencies, trips } = useData();

  return useMemo(() => {
    const currentAgency = agencies.find(a => a.id === user?.id);
    
    // Default to STARTER if no plan is set
    const subscriptionPlan = (currentAgency?.subscriptionPlan as PlanType) || 'STARTER';
    
    // Count active trips for this agency
    const agencyTrips = trips.filter(t => 
      t.agencyId === currentAgency?.agencyId && t.is_active === true
    );
    const currentActiveTrips = agencyTrips.length;

    // Define plan limits
    const maxTripsMap: Record<PlanType, number> = {
      STARTER: 2,
      BASIC: 5,
      PREMIUM: Infinity
    };

    const maxTrips = maxTripsMap[subscriptionPlan] || 1;
    const canPostTrip = currentActiveTrips < maxTrips;
    const canAccessOperational = subscriptionPlan === 'PREMIUM';

    return {
      plan: subscriptionPlan,
      canAccessOperational,
      maxTrips,
      canPostTrip,
      currentActiveTrips
    };
  }, [agencies, trips, user?.id]);
};

