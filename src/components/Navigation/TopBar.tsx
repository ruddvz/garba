import React from 'react';
import { AppRoute } from '../../types';
import { usePlayback } from '../../engine/usePlayback';
import { Disc3, Compass, BookOpen, ListMusic } from 'lucide-react';
import styles from './TopBar.module.css';

interface TopBarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onToggleSheet: () => void;
  isSheetOpen: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentRoute,
  onNavigate,
  onToggleSheet,
  isSheetOpen,
}) => {
  const { state } = usePlayback();

  return (
    <header className={styles.topbar}>
      <div className={styles.brandGroup} onClick={() => onNavigate('player')}>
        <div className={styles.logoIcon}>
          <Disc3 size={20} className={state.isPlaying ? 'spin-slow' : ''} />
        </div>
        <span className={styles.brandName}>PlayGarba</span>
      </div>

      <nav className={styles.navLinks} aria-label="Main Navigation">
        <button
          className={`${styles.navButton} ${currentRoute === 'player' ? styles.active : ''}`}
          onClick={() => onNavigate('player')}
        >
          Player
        </button>
        <button
          className={`${styles.navButton} ${currentRoute === 'explore' ? styles.active : ''}`}
          onClick={() => onNavigate('explore')}
        >
          Explore
        </button>
        <button
          className={`${styles.navButton} ${currentRoute === 'navratri' ? styles.active : ''}`}
          onClick={() => onNavigate('navratri')}
        >
          Navratri 2026
        </button>
        <button
          className={`${styles.navButton} ${currentRoute === 'history' ? styles.active : ''}`}
          onClick={() => onNavigate('history')}
        >
          Culture & Guides
        </button>
      </nav>

      <div className={styles.utilityActions}>
        <button
          className={`${styles.iconBtn} ${isSheetOpen ? styles.active : ''}`}
          onClick={onToggleSheet}
          title="Browse queue & songs"
          aria-label="Toggle song sheet"
        >
          <ListMusic size={18} />
          {state.queue.length > 0 && (
            <span className={styles.queueBadge}>{state.queue.length}</span>
          )}
        </button>

        <button
          className={`${styles.iconBtn} ${currentRoute === 'explore' ? styles.active : ''}`}
          onClick={() => onNavigate(currentRoute === 'explore' ? 'player' : 'explore')}
          title="Explore Catalogue"
          aria-label="Explore catalogue"
        >
          <Compass size={18} />
        </button>
      </div>
    </header>
  );
};
