import React, { useRef, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
    id: string;
    label: string;
    icon?: LucideIcon;
}

interface DashboardMobileTabsProps {
    tabs: TabItem[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    className?: string;
}

const DashboardMobileTabs: React.FC<DashboardMobileTabsProps> = ({
    tabs,
    activeTab,
    onTabChange,
    className = ""
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const activeTabRef = useRef<HTMLButtonElement>(null);

    // Auto-scroll to active tab
    useEffect(() => {
        if (activeTabRef.current && scrollRef.current) {
            const scrollContainer = scrollRef.current;
            const activeElement = activeTabRef.current;

            const containerWidth = scrollContainer.offsetWidth;
            const activeLeft = activeElement.offsetLeft;
            const activeWidth = activeElement.offsetWidth;

            // Calculate position to center the active tab
            const scrollPosition = activeLeft - (containerWidth / 2) + (activeWidth / 2);

            scrollContainer.scrollTo({
                left: scrollPosition,
                behavior: 'smooth'
            });
        }
    }, [activeTab]);

    return (
        <div
            className={`sticky top-[64px] z-40 bg-white border-b border-gray-100 shadow-sm md:hidden ${className}`}
        >
            <div
                ref={scrollRef}
                className="flex overflow-x-auto scrollbar-hide py-2 px-4 gap-2 snap-x"
                style={{ scrollBehavior: 'smooth' }}
            >
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            ref={isActive ? activeTabRef : null}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border snap-center
                ${isActive
                                    ? 'bg-primary-50 text-primary-700 border-primary-200 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }
              `}
                        >
                            {Icon && <Icon size={16} className={isActive ? 'text-primary-600' : 'text-gray-400'} />}
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default DashboardMobileTabs;
