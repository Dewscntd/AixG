/**
 * Virtual List Component
 * 
 * High-performance virtual scrolling implementation for large datasets with:
 * - Dynamic item heights
 * - Smooth scrolling
 * - Intersection observer optimization
 * - RTL support
 * - Accessibility features
 * - Performance monitoring
 */

'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { FixedSizeList as List, VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';
import { cn } from '@/lib/utils';

export interface VirtualListItem {
  id: string | number;
  height?: number;
  data: any;
}

export interface VirtualListProps<T extends VirtualListItem> {
  items: T[];
  itemHeight?: number | ((index: number) => number);
  renderItem: (props: {
    index: number;
    style: React.CSSProperties;
    data: T;
    isScrolling?: boolean;
  }) => React.ReactNode;
  className?: string;
  height?: number;
  width?: number;
  overscan?: number;
  direction?: 'ltr' | 'rtl';
  
  // Infinite loading
  hasNextPage?: boolean;
  isNextPageLoading?: boolean;
  loadNextPage?: () => Promise<void>;
  
  // Performance
  useIsScrolling?: boolean;
  trackPerformance?: boolean;
  
  // Accessibility
  role?: string;
  ariaLabel?: string;
  
  // Callbacks
  onScroll?: (props: {
    scrollDirection: 'forward' | 'backward';
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
  }) => void;
  onItemsRendered?: (props: {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => void;
}

export interface VirtualListRef {
  scrollTo: (offset: number) => void;
  scrollToItem: (index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start') => void;
  resetAfterIndex: (index: number, shouldForceUpdate?: boolean) => void;
}

/**
 * Virtual List Component with dynamic heights
 */
export const VirtualList = forwardRef<VirtualListRef, VirtualListProps<VirtualListItem>>(
  <T extends VirtualListItem>(
    {
      items,
      itemHeight = 50,
      renderItem,
      className,
      height,
      width,
      overscan = 5,
      direction = 'ltr',
      hasNextPage = false,
      isNextPageLoading = false,
      loadNextPage,
      useIsScrolling = false,
      trackPerformance = false,
      role = 'list',
      ariaLabel,
      onScroll,
      onItemsRendered,
    }: VirtualListProps<T>,
    ref: React.Ref<VirtualListRef>
  ) => {
    const listRef = useRef<any>(null);
    const performanceMonitor = usePerformanceMonitor('virtual-list');
    
    // Track performance metrics
    useEffect(() => {
      if (trackPerformance) {
        performanceMonitor.recordMetric('itemCount', items.length);
        performanceMonitor.startTimer('render');
        return () => {
          performanceMonitor.endTimer('render');
        };
      }
    }, [items.length, trackPerformance, performanceMonitor]);

    // Determine if we're using fixed or variable size
    const isVariableSize = typeof itemHeight === 'function';

    // Item size getter for variable size list
    const getItemSize = useCallback(
      (index: number) => {
        if (typeof itemHeight === 'function') {
          return itemHeight(index);
        }
        return items[index]?.height || itemHeight;
      },
      [itemHeight, items]
    );

    // Item count including loading indicator
    const itemCount = hasNextPage ? items.length + 1 : items.length;

    // Check if item is loaded
    const isItemLoaded = useCallback(
      (index: number) => !!items[index],
      [items]
    );

    // Enhanced render item with performance optimizations
    const enhancedRenderItem = useCallback(
      ({ index, style, isScrolling }: any) => {
        // Loading indicator for infinite scroll
        if (index >= items.length) {
          return (
            <div
              style={style}
              className="flex items-center justify-center p-4"
              role="status"
              aria-label="Loading more items"
            >
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="sr-only">Loading more items...</span>
            </div>
          );
        }

        const item = items[index];
        if (!item) {
          return (
            <div
              style={style}
              className="flex items-center justify-center p-4"
              role="status"
              aria-label="Loading item"
            >
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            </div>
          );
        }

        return renderItem({
          index,
          style,
          data: item,
          isScrolling,
        });
      },
      [items, renderItem]
    );

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      scrollTo: (offset: number) => {
        listRef.current?.scrollTo(offset);
      },
      scrollToItem: (index: number, align = 'auto') => {
        listRef.current?.scrollToItem(index, align);
      },
      resetAfterIndex: (index: number, shouldForceUpdate = true) => {
        if (isVariableSize) {
          listRef.current?.resetAfterIndex(index, shouldForceUpdate);
        }
      },
    }), [isVariableSize]);

    // Memoized list component
    const ListComponent = useMemo(() => {
      const commonProps = {
        ref: listRef,
        itemCount,
        overscanCount: overscan,
        direction,
        useIsScrolling,
        onScroll,
        onItemsRendered,
        role,
        'aria-label': ariaLabel,
      };

      if (isVariableSize) {
        return (
          <VariableSizeList
            {...commonProps}
            itemSize={getItemSize}
          >
            {enhancedRenderItem}
          </VariableSizeList>
        );
      }

      return (
        <List
          {...commonProps}
          itemSize={itemHeight as number}
        >
          {enhancedRenderItem}
        </List>
      );
    }, [
      itemCount,
      overscan,
      direction,
      useIsScrolling,
      onScroll,
      onItemsRendered,
      role,
      ariaLabel,
      isVariableSize,
      getItemSize,
      itemHeight,
      enhancedRenderItem,
    ]);

    // Infinite loading wrapper
    const InfiniteListComponent = useMemo(() => {
      if (!loadNextPage) {
        return ListComponent;
      }

      return (
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={itemCount}
          loadMoreItems={loadNextPage}
          threshold={5}
        >
          {({ onItemsRendered: onInfiniteItemsRendered, ref: infiniteRef }) => (
            <div ref={infiniteRef}>
              {React.cloneElement(ListComponent, {
                onItemsRendered: (props: any) => {
                  onInfiniteItemsRendered(props);
                  onItemsRendered?.(props);
                },
              })}
            </div>
          )}
        </InfiniteLoader>
      );
    }, [ListComponent, loadNextPage, isItemLoaded, itemCount, onItemsRendered]);

    // Auto-sizer wrapper
    if (!height || !width) {
      return (
        <div className={cn('h-full w-full', className)}>
          <AutoSizer>
            {({ height: autoHeight, width: autoWidth }) =>
              React.cloneElement(InfiniteListComponent, {
                height: height || autoHeight,
                width: width || autoWidth,
              })
            }
          </AutoSizer>
        </div>
      );
    }

    return (
      <div className={cn('relative', className)}>
        {React.cloneElement(InfiniteListComponent, {
          height,
          width,
        })}
      </div>
    );
  }
);

VirtualList.displayName = 'VirtualList';

/**
 * Specialized Virtual List for Match Events
 */
export interface MatchEventListProps {
  events: Array<{
    id: string;
    type: string;
    timestamp: number;
    description: string;
    playerId?: string;
    teamId: string;
  }>;
  onEventClick?: (event: any) => void;
  className?: string;
}

export const MatchEventList: React.FC<MatchEventListProps> = ({
  events,
  onEventClick,
  className,
}) => {
  const renderEvent = useCallback(
    ({ index, style, data }: any) => (
      <div
        style={style}
        className={cn(
          'flex items-center space-x-3 border-b border-border p-3',
          'hover:bg-muted/50 cursor-pointer transition-colors',
          onEventClick && 'cursor-pointer'
        )}
        onClick={() => onEventClick?.(data)}
        role="listitem"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onEventClick?.(data);
          }
        }}
      >
        <div className="flex-shrink-0">
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {data.description}
          </p>
          <p className="text-xs text-muted-foreground">
            {Math.floor(data.timestamp / 60)}:{(data.timestamp % 60).toString().padStart(2, '0')}
          </p>
        </div>
        <div className="flex-shrink-0">
          <span className="text-xs font-medium text-muted-foreground">
            {data.type}
          </span>
        </div>
      </div>
    ),
    [onEventClick]
  );

  return (
    <VirtualList
      items={events}
      itemHeight={60}
      renderItem={renderEvent}
      className={className}
      trackPerformance
      ariaLabel="Match events list"
    />
  );
};

export default VirtualList;
