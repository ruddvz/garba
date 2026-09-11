import React, { useState } from 'react';
import { AppRoute, Song } from '../../types';
import { usePlayback } from '../../engine/usePlayback';
import {
  Calendar,
  Sparkles,
  Music,
  Play,
  Volume2,
  Info,
  HelpCircle,
  BookOpen,
  Award,
  Layers,
  Heart,
} from 'lucide-react';
import styles from './EditorialView.module.css';

interface EditorialViewProps {
  initialTopic?: 'history' | 'navratri' | 'garba-vs-dandiya' | 'sound-guide' | 'about' | 'faq';
  onNavigate: (route: AppRoute) => void;
  allSongs?: Song[];
}

interface NavratriDay {
  dayNumber: number;
  tithi: string;
  goddess: string;
  gujaratiGoddess: string;
  colorName: string;
  gujaratiColor: string;
  colorHex: string;
  theme: string;
  description: string;
  danceTempo: string;
  suggestedGenre: string;
}

const NAVRATRI_DAYS: NavratriDay[] = [
  {
    dayNumber: 1,
    tithi: 'Pratipada',
    goddess: 'Maa Shailputri',
    gujaratiGoddess: 'મા શૈલપુત્રી',
    colorName: 'Royal Yellow',
    gujaratiColor: 'પીળો',
    colorHex: '#f4d06f',
    theme: 'New Beginnings & Ghatasthapana',
    description:
      'The daughter of the Himalayas, symbolising endurance and devotion. Navratri commences with Ghatasthapana, lighting the sacred Akhand Jyot inside the perforated earthen Garbo pot.',
    danceTempo: 'Slow, graceful Be Taali (0.8x - 1.0x)',
    suggestedGenre: 'devotional',
  },
  {
    dayNumber: 2,
    tithi: 'Dwitiya',
    goddess: 'Maa Brahmacharini',
    gujaratiGoddess: 'મા બ્રહ્મચારિણી',
    colorName: 'Sacred Green',
    gujaratiColor: 'લીલો',
    colorHex: '#2a9d8f',
    theme: 'Penance, Tranquility & Grace',
    description:
      'Embodying peace, austerity, and deep contemplation. Dancers move in steady concentric rings, syncing steps to devotional hymns and Prachin Garbas.',
    danceTempo: 'Steady 2-Taali rhythm (1.0x)',
    suggestedGenre: 'traditional',
  },
  {
    dayNumber: 3,
    tithi: 'Tritiya',
    goddess: 'Maa Chandraghanta',
    gujaratiGoddess: 'મા ચંદ્રઘંટા',
    colorName: 'Auspicious Grey',
    gujaratiColor: 'રાખોડી',
    colorHex: '#8d99ae',
    theme: 'Courage, Valor & Sonic Resonance',
    description:
      'Adorned with a crescent moon shaped like a bell, representing bravery and readiness to fight injustice. The rhythm begins to accelerate as more participants join the circle.',
    danceTempo: 'Medium Tran Taali (1.0x - 1.1x)',
    suggestedGenre: 'traditional',
  },
  {
    dayNumber: 4,
    tithi: 'Chaturthi',
    goddess: 'Maa Kushmanda',
    gujaratiGoddess: 'મા કુષ્માંડા',
    colorName: 'Radiant Orange',
    gujaratiColor: 'નારંગી',
    colorHex: '#f4a261',
    theme: 'Cosmic Radiance & Joyful Creation',
    description:
      'Believed to have created the universe with her divine smile. The festive spirit expands with vibrant mirror-work costumes and joyful whirling.',
    danceTempo: 'Lively 3-Taali & Dodhiyu (1.1x)',
    suggestedGenre: 'folk',
  },
  {
    dayNumber: 5,
    tithi: 'Panchami',
    goddess: 'Maa Skandamata',
    gujaratiGoddess: 'મા સ્કંદમાતા',
    colorName: 'Pure White',
    gujaratiColor: 'સફેદ',
    colorHex: '#edf2f4',
    theme: 'Maternal Protection & Universal Purity',
    description:
      'The mother of Lord Kartikeya (Skanda), representing unconditional grace and nurturing power. Halfway through Navratri, communities reach peak harmony.',
    danceTempo: 'Dynamic choreography (1.15x)',
    suggestedGenre: 'traditional',
  },
  {
    dayNumber: 6,
    tithi: 'Shashti',
    goddess: 'Maa Katyayani',
    gujaratiGoddess: 'મા કાત્યાયની',
    colorName: 'Passionate Red',
    gujaratiColor: 'લાલ',
    colorHex: '#e63946',
    theme: 'Warrior Vigor & Righteous Strength',
    description:
      'The fierce slayer of the demon Mahishasura. Clapping becomes louder and firmer, accented by thumping dhol beats, manjira clangs, and shehnai flourishes.',
    danceTempo: 'Fast Tran Taali & Dakla (1.25x)',
    suggestedGenre: 'dandiya',
  },
  {
    dayNumber: 7,
    tithi: 'Saptami',
    goddess: 'Maa Kalaratri',
    gujaratiGoddess: 'મા કાલરાત્રિ',
    colorName: 'Royal Blue',
    gujaratiColor: 'રોયલ બ્લુ',
    colorHex: '#1d3557',
    theme: 'Destroyer of Darkness & Ignorance',
    description:
      'The fiercest manifestation who vanquishes all negativity and fears while bestowing auspicious boons upon devotees (Shubhankari). Dandiya sticks resonate across venues.',
    danceTempo: 'High Energy Dandiya Raas (1.25x)',
    suggestedGenre: 'dandiya',
  },
  {
    dayNumber: 8,
    tithi: 'Ashtami',
    goddess: 'Maa Mahagauri',
    gujaratiGoddess: 'મા મહાગૌરી',
    colorName: 'Auspicious Pink',
    gujaratiColor: 'ગુલાબી',
    colorHex: '#ff70a6',
    theme: 'Deep Purification & Maha Aarti Night',
    description:
      'The night of profound reverence and the grand Maha Aarti. Thousands gather holding brass aarti thalis with camphor flames, singing "Jay Adhya Shakti" in unison.',
    danceTempo: 'Sacred Maha Aarti followed by Raas',
    suggestedGenre: 'devotional',
  },
  {
    dayNumber: 9,
    tithi: 'Navami',
    goddess: 'Maa Siddhidatri',
    gujaratiGoddess: 'મા સિદ્ધિદાત્રી',
    colorName: 'Royal Purple',
    gujaratiColor: 'જાંબલી',
    colorHex: '#7209b7',
    theme: 'Ultimate Fulfillment & Grand Sanedo Finale',
    description:
      'Bestower of all spiritual perfections (siddhis). The culmination night where dancers play until early dawn, ending in euphoric Sanedo and Bhai Bhai beats!',
    danceTempo: 'Peak Hype Sanedo & Fast Raas (1.25x - 1.5x)',
    suggestedGenre: 'fusion',
  },
];

export const EditorialView: React.FC<EditorialViewProps> = ({
  initialTopic = 'history',
  onNavigate,
  allSongs = [],
}) => {
  const [activeTopic, setActiveTopic] = useState(initialTopic);
  const { playSong } = usePlayback();

  const handlePlayDayGarba = (day: NavratriDay) => {
    // Find a matching song in the catalogue
    const matchingSong =
      allSongs.find((s) => s.genre?.toLowerCase() === day.suggestedGenre.toLowerCase()) ||
      allSongs[0];
    if (matchingSong) {
      playSong(matchingSong);
      onNavigate('player');
    }
  };

  return (
    <div className={styles.editorialContainer}>
      <div className={styles.editorialContent}>
        {/* Topic navigation tabs */}
        <nav className={styles.topicNav} aria-label="Cultural articles navigation">
          <button
            className={`${styles.topicTab} ${activeTopic === 'history' ? styles.active : ''}`}
            onClick={() => setActiveTopic('history')}
          >
            <BookOpen size={15} />
            Heritage & UNESCO
          </button>
          <button
            className={`${styles.topicTab} ${activeTopic === 'navratri' ? styles.active : ''}`}
            onClick={() => setActiveTopic('navratri')}
          >
            <Calendar size={15} />
            Navratri 2026 Guide
          </button>
          <button
            className={`${styles.topicTab} ${activeTopic === 'garba-vs-dandiya' ? styles.active : ''}`}
            onClick={() => setActiveTopic('garba-vs-dandiya')}
          >
            <Sparkles size={15} />
            Garba vs Dandiya
          </button>
          <button
            className={`${styles.topicTab} ${activeTopic === 'sound-guide' ? styles.active : ''}`}
            onClick={() => setActiveTopic('sound-guide')}
          >
            <Volume2 size={15} />
            Sound & Event Setup
          </button>
          <button
            className={`${styles.topicTab} ${activeTopic === 'about' ? styles.active : ''}`}
            onClick={() => setActiveTopic('about')}
          >
            <Info size={15} />
            About PlayGarba
          </button>
          <button
            className={`${styles.topicTab} ${activeTopic === 'faq' ? styles.active : ''}`}
            onClick={() => setActiveTopic('faq')}
          >
            <HelpCircle size={15} />
            FAQ
          </button>
        </nav>

        {/* 1. History of Garba & UNESCO */}
        {activeTopic === 'history' && (
          <article className={styles.articleBody}>
            <header className={styles.articleHero}>
              <span className={styles.kicker}>01 · HERITAGE & LIVING EVOLUTION</span>
              <h1 className={styles.articleTitle}>A Sacred Tradition Alive Across Generations</h1>
              <p className={styles.articleLead}>
                Rooted in deep circular devotion to the mother goddess, Garba has evolved from
                village courtyards into the world’s largest communal dance festival.
              </p>
            </header>

            <div className={styles.unescoBanner}>
              <Award size={24} className={styles.unescoIcon} />
              <div>
                <h3 className={styles.unescoTitle}>
                  UNESCO Representative List of Intangible Cultural Heritage of Humanity
                </h3>
                <p className={styles.unescoText}>
                  In December 2023, UNESCO officially inscribed the <em>Garba of Gujarat</em> on the
                  Representative List of Intangible Cultural Heritage of Humanity (Decision 18.COM
                  8.B.32), recognizing its extraordinary community inclusivity, living oral poetry,
                  costume craftsmanship, and sacred circular ritual structure.
                </p>
              </div>
            </div>

            <section className={styles.cardSection}>
              <h2>The Sacred Centre: The Garbo</h2>
              <p>
                The word <em>Garba</em> originates from the Sanskrit term <em>Garbha</em>, meaning
                the womb. At the center of every traditional Garba circle sits an illuminated
                earthen pot with perforations (the <em>Garbo</em>), housing a continuous flame
                (Akhand Jyot) or an icon of Goddess Amba.
              </p>
              <p>
                The dancers move in concentric circles, revolving counter-clockwise. This circular
                motion symbolizes the Hindu view of time: birth, life, death, and rebirth in endless
                cycles, while the divine mother at the center remains the eternal, unchanging
                reality.
              </p>
            </section>

            <section className={styles.cardSection}>
              <h2>Musical Anatomy & Traditional Instruments</h2>
              <p>
                Traditional Garba music is driven by natural acoustic warmth and percussive rhythm:
              </p>
              <ul className={styles.bulletList}>
                <li>
                  <strong>Dhol & Dholak:</strong> The rhythmic heartbeat that sets the cadence, from
                  slow 2-taali claps to rapid trance beats.
                </li>
                <li>
                  <strong>Manjira (Kansi Joda):</strong> Small hand cymbals struck on the syncopated
                  off-beats.
                </li>
                <li>
                  <strong>Shehnai & Harmonium:</strong> Melodic instruments that carry the sacred
                  tunes and call-and-response choruses.
                </li>
                <li>
                  <strong>Dakla:</strong> Hourglass-shaped ceremonial drums used in high-intensity
                  tribal and rustic Gujarat devotionals.
                </li>
              </ul>
            </section>

            <footer className={styles.sourceFooter}>
              Sources: UNESCO Intangible Cultural Heritage Committee, Sangeet Natak Akademi, Gujarat
              State Lalit Kala Akademi.
            </footer>
          </article>
        )}

        {/* 2. Navratri 2026 Interactive Guide */}
        {activeTopic === 'navratri' && (
          <article className={styles.articleBody}>
            <header className={styles.articleHero}>
              <span className={styles.kicker}>02 · SACRED CALENDAR & RITUALS</span>
              <h1 className={styles.articleTitle}>Sharad Navratri 2026: The Nine Nights</h1>
              <p className={styles.articleLead}>
                Each night of Navratri is consecrated to an incarnation of Goddess Durga (Navadurga)
                with a designated sacred color, symbolic energy, and dance tempo.
              </p>
            </header>

            <div className={styles.daysGrid}>
              {NAVRATRI_DAYS.map((day) => (
                <div key={day.dayNumber} className={styles.dayCard}>
                  <div className={styles.dayCardTop}>
                    <div className={styles.dayBadgeRow}>
                      <span className={styles.dayPill}>Night {day.dayNumber}</span>
                      <span className={styles.tithiPill}>{day.tithi}</span>
                    </div>
                    <div
                      className={styles.colorTag}
                      style={{
                        backgroundColor: `${day.colorHex}22`,
                        borderColor: day.colorHex,
                        color: day.colorHex === '#edf2f4' ? '#ffffff' : day.colorHex,
                      }}
                    >
                      <span className={styles.colorDot} style={{ backgroundColor: day.colorHex }} />
                      {day.colorName} ({day.gujaratiColor})
                    </div>
                  </div>

                  <div className={styles.dayContent}>
                    <h3 className={styles.dayGoddess}>
                      {day.goddess}{' '}
                      <span className={styles.gujaratiSub}>({day.gujaratiGoddess})</span>
                    </h3>
                    <div className={styles.dayTheme}>{day.theme}</div>
                    <p className={styles.dayDesc}>{day.description}</p>
                  </div>

                  <div className={styles.dayFooter}>
                    <div className={styles.tempoRow}>
                      <Music size={13} style={{ color: 'var(--accent)' }} />
                      <span>{day.danceTempo}</span>
                    </div>

                    <button
                      className={styles.playDayBtn}
                      onClick={() => handlePlayDayGarba(day)}
                      title={`Play Garba for ${day.goddess}`}
                    >
                      <Play size={13} fill="currentColor" />
                      Play Night {day.dayNumber} Garba
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        )}

        {/* 3. Garba vs Dandiya Raas */}
        {activeTopic === 'garba-vs-dandiya' && (
          <article className={styles.articleBody}>
            <header className={styles.articleHero}>
              <span className={styles.kicker}>03 · DANCE FORMS & DISTINCTIONS</span>
              <h1 className={styles.articleTitle}>Garba vs Dandiya Raas: The Essential Contrast</h1>
              <p className={styles.articleLead}>
                While both are Gujarati folk traditions celebrated during Navratri, their origins,
                rhythms, and movements are uniquely distinct.
              </p>
            </header>

            <div className={styles.comparisonGrid}>
              <div className={styles.compareCard}>
                <div className={styles.compareBadge}>Devotional & Circular</div>
                <h2>Garba (ગરબા)</h2>
                <p>
                  <strong>Core Meaning:</strong> Dedicated to Goddess Shakti and her eternal cosmic
                  energy.
                </p>
                <p>
                  <strong>Movement:</strong> Circular, fluid movements using hands, claps (Taali),
                  finger snaps, and swirling twirls (Chakar).
                </p>
                <p>
                  <strong>Formations:</strong> Concentric circles expanding around the Garbo altar.
                  Can involve hundreds of dancers synchronized as one massive wave.
                </p>
                <p>
                  <strong>Key Steps:</strong> Be Taali (2-clap), Tran Taali (3-clap), Dodhiyu
                  (forward-backward step), and Hinch.
                </p>
              </div>

              <div className={styles.compareCard}>
                <div className={styles.compareBadge}>Playful & Partnered</div>
                <h2>Dandiya Raas (દાંડિયા રાસ)</h2>
                <p>
                  <strong>Core Meaning:</strong> Rooted in Krishna’s divine play (Gopika Raas) and
                  the sword-and-shield combat of Goddess Durga against Mahishasura.
                </p>
                <p>
                  <strong>Movement:</strong> Danced in opposing pairs using polished wooden sticks
                  (Dandiyas) struck rhythmically against each other.
                </p>
                <p>
                  <strong>Formations:</strong> Long parallel lines or double circles where partners
                  rotate after every four or eight beats.
                </p>
                <p>
                  <strong>Key Elements:</strong> Clockwise partner transitions, rhythmic stick taps,
                  and rapid acrobatic footwork.
                </p>
              </div>
            </div>
          </article>
        )}

        {/* 4. Sound & Event Setup Guide */}
        {activeTopic === 'sound-guide' && (
          <article className={styles.articleBody}>
            <header className={styles.articleHero}>
              <span className={styles.kicker}>04 · LOCAL ORGANIZING MASTERCLASS</span>
              <h1 className={styles.articleTitle}>Sound System & Local Garba Setup Guide</h1>
              <p className={styles.articleLead}>
                Essential technical advice for mandals, residential societies, DJs, and community
                halls using PlayGarba for smooth, uninterrupted celebrations.
              </p>
            </header>

            <section className={styles.cardSection}>
              <h2>1. Audio Hardware: Direct AUX Cable vs Bluetooth</h2>
              <p>
                <strong>
                  Always use a wired connection (AUX / USB-C / Lightning to 3.5mm/XLR):
                </strong>{' '}
                Bluetooth induces between 80ms to 250ms of audio latency. For dancers clapping and
                tapping sticks in sync, even a 100ms lag causes the circle to lose step. A direct
                cable provides zero latency and prevents mid-event connection drops.
              </p>
            </section>

            <section className={styles.cardSection}>
              <h2>2. Pacing the Night: The 4-Phase Garba Arc</h2>
              <p>Great Garba organizers never start at full speed. Follow the traditional arc:</p>
              <ul className={styles.bulletList}>
                <li>
                  <strong>Phase 1: Aarti & Stuti (8:30 PM - 9:15 PM):</strong> Begin with devotional
                  aartis (Jay Adhya Shakti, Vishwambhari Stuti) at 0.8x - 1.0x tempo to welcome
                  families and elders.
                </li>
                <li>
                  <strong>Phase 2: Prachin Be Taali (9:15 PM - 10:15 PM):</strong> Graceful, slow
                  two-clap steps (Atul Purohit, Hemant Chauhan) allowing the circle to stabilize and
                  expand.
                </li>
                <li>
                  <strong>Phase 3: Tran Taali & Dandiya (10:15 PM - 11:45 PM):</strong> High-tempo
                  three-clap steps and partner Dandiya (Falguni Pathak, Geeta Rabari, Aditya
                  Gadhvi). Use the 1.25x speed setting if the crowd has great momentum!
                </li>
                <li>
                  <strong>Phase 4: Sanedo & Grand Finale (11:45 PM - Midnight):</strong>{' '}
                  Call-and-response Sanedo, fast Dodhiyu, and celebratory climax.
                </li>
              </ul>
            </section>

            <section className={styles.cardSection}>
              <h2>3. Continuous Sets Guarantee Zero Awkward Silence</h2>
              <p>
                In a physical Garba circle, a 5-second silence between songs breaks the energy and
                causes people to disperse. Use PlayGarba's <strong>Nonstop Sets</strong> (over 84
                continuous recordings) or queue multiple tracks in advance so playback rolls
                continuously without pause.
              </p>
            </section>
          </article>
        )}

        {/* 5. About PlayGarba */}
        {activeTopic === 'about' && (
          <article className={styles.articleBody}>
            <header className={styles.articleHero}>
              <span className={styles.kicker}>05 · ABOUT PLAYGARBA</span>
              <h1 className={styles.articleTitle}>Built for the Worldwide Garba Community</h1>
              <p className={styles.articleLead}>
                An open, non-commercial digital archive celebrating Gujarat’s living musical
                heritage.
              </p>
            </header>

            <section className={styles.cardSection}>
              <h2>Our Heritage Mission</h2>
              <p>
                PlayGarba was built to solve a universal pain point: local Garba gatherings around
                the world struggled with fragmented playlists, intrusive advertising interruptions,
                poor audio quality, and lost cultural context.
              </p>
              <p>
                By aggregating over 1,673 verified tracks, 84 continuous sets, and rich devotional
                history into a unified, lightning-fast progressive web app, PlayGarba ensures that
                whether you are dancing in Ahmedabad, Vadodara, London, Edison, or Sydney, the music
                never stops.
              </p>
            </section>
          </article>
        )}

        {/* 6. FAQ */}
        {activeTopic === 'faq' && (
          <article className={styles.articleBody}>
            <header className={styles.articleHero}>
              <span className={styles.kicker}>06 · COMMON QUESTIONS</span>
              <h1 className={styles.articleTitle}>Frequently Asked Questions</h1>
              <p className={styles.articleLead}>
                Quick answers on how to use PlayGarba on phones, speakers, and venues.
              </p>
            </header>

            <section className={styles.cardSection}>
              <h2>How do I install PlayGarba as an app on my phone?</h2>
              <p>
                PlayGarba is a Progressive Web App (PWA). On <strong>iPhone (Safari)</strong>: tap
                the Share button (box with arrow pointing up) and tap "Add to Home Screen". On{' '}
                <strong>Android (Chrome)</strong>: tap the three dots in the top corner and tap
                "Install app". It will sit on your home screen with its own native icon and full
                offline shell!
              </p>
            </section>

            <section className={styles.cardSection}>
              <h2>How does PlayGarba handle continuous sets without stopping?</h2>
              <p>
                Our audio engine routes to verified continuous live performances (such as Atul
                Purohit’s United Way of Baroda concerts, Aditya Gadhvi’s Ochhav, and Falguni
                Pathak’s live sets) while tracking individual chapter timestamps so you can jump to
                specific songs within a 60-minute recording without breaking playback continuity.
              </p>
            </section>

            <section className={styles.cardSection}>
              <h2>Can I adjust the speed for dancing practice?</h2>
              <p>
                Yes! On the main player deck, tap the speed pill (1.0x). You can choose 0.8x for
                practicing complex steps, 1.0x for standard dancing, 1.25x for energetic Raas, and
                1.5x for peak Sanedo beats!
              </p>
            </section>
          </article>
        )}
      </div>
    </div>
  );
};
