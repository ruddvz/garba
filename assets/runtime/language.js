/* PlayGarba interface language: English, or ગુજરાતી.
   One toggle in each player's More header switches the interface text: labels, headings, buttons, tooltips,
   accessible names, status lines and toasts. Catalogue metadata (song titles, artists, releases, credits), links and
   the PlayGarba name are never translated. The choice is kept on this device and shared by Simple and Immersive, so
   switching in one switches the other.

   The Gujarati below is the owner-reviewed table for #1775: one English string on the left, its Gujarati on the
   right. Text that carries a song name or a number is matched by the patterns after it. Anything not in the table
   stays in English rather than being guessed. */
(function (root) {
  'use strict';

  var GU = {
    // Players and top bar
    'Skip to player': 'પ્લેયર પર જાઓ',
    'Player tools': 'પ્લેયરનાં સાધનો',
    'PlayGarba home': 'PlayGarba હોમ',
    'Search songs': 'ગીતો શોધો',
    'Search songs (/)': 'ગીતો શોધો (/)',
    'Search songs and artists': 'ગીતો અને કલાકારો શોધો',
    'Search songs or artists': 'ગીતો અથવા કલાકારો શોધો',
    'Songs or artists': 'ગીતો અથવા કલાકારો',
    'More': 'વધુ',
    'Close': 'બંધ કરો',
    'Close More': 'વધુ બંધ કરો',
    'Tonight': 'આજની રાત',
    'Close Tonight': 'આજની રાત બંધ કરો',
    'Play YouTube link': 'YouTube લિંક વગાડો',
    'Close Play YouTube link': 'YouTube લિંક બંધ કરો',
    'Hide player': 'પ્લેયર છુપાવો',
    'Show player': 'પ્લેયર બતાવો',
    'Player view': 'પ્લેયર દૃશ્ય',
    'Immersive view': 'ઇમર્સિવ દૃશ્ય',
    'Simple view': 'સાદું દૃશ્ય',
    'Switch to Simple view': 'સાદા દૃશ્યમાં જાઓ',
    'Full screen': 'પૂર્ણ સ્ક્રીન',
    'Exit full screen': 'પૂર્ણ સ્ક્રીન બંધ કરો',
    'For full screen on this phone, add PlayGarba to your Home Screen.': 'આ ફોન પર પૂર્ણ સ્ક્રીન માટે PlayGarba ને હોમ સ્ક્રીન પર ઉમેરો.',
    "Full screen isn't available here.": 'અહીં પૂર્ણ સ્ક્રીન ઉપલબ્ધ નથી.',
    'Scene': 'દૃશ્ય',
    'View': 'દૃશ્ય',
    'Sound': 'અવાજ',
    'Ideas': 'સૂચનો',
    'Circle': 'સર્કલ',

    // Playback
    'Now playing': 'હમણાં વાગે છે',
    'Playback controls': 'પ્લેબેક નિયંત્રણો',
    'Play': 'વગાડો',
    'Pause': 'થોભાવો',
    'Loading': 'લોડ થાય છે',
    'Next': 'આગળનું',
    'Previous': 'પાછળનું',
    'Next song': 'આગળનું ગીત',
    'Previous song': 'પાછળનું ગીત',
    'Shuffle': 'શફલ',
    'Toggle shuffle': 'શફલ ચાલુ/બંધ',
    'Shuffle songs (S)': 'ગીતો શફલ કરો (S)',
    'Shuffle off': 'શફલ બંધ',
    'Shuffle turned off.': 'શફલ બંધ થયું.',
    'Seek': 'આગળ-પાછળ કરો',
    'Playback progress': 'પ્લેબેક પ્રગતિ',
    'Save to My Garba': 'મારા ગરબામાં સાચવો',
    'Save to My Garba (F)': 'મારા ગરબામાં સાચવો (F)',
    'Removed from My Garba': 'મારા ગરબામાંથી કાઢ્યું',
    'Removed from My Garba.': 'મારા ગરબામાંથી કાઢ્યું.',
    'Light the garbo to play': 'વગાડવા માટે ગરબો પ્રગટાવો',
    'Tap the garbo to light it': 'ગરબો પ્રગટાવવા ટૅપ કરો',
    'Tap anywhere to start the garba': 'ગરબા શરૂ કરવા ક્યાંય પણ ટૅપ કરો',
    'Use the arrow keys to walk around': 'ફરવા માટે એરો કી વાપરો',
    'Lighting the lamp…': 'દીવો પ્રગટે છે…',
    'Streaming via': 'સ્ટ્રીમિંગ:',
    'Streaming via YouTube': 'YouTube દ્વારા સ્ટ્રીમિંગ',
    'From': 'આલ્બમ',
    'Not playable here yet': 'હજી અહીં વગાડી શકાતું નથી',
    'Not playable yet': 'હજી વગાડી શકાતું નથી',
    'This recording is not available to play yet.': 'આ રેકોર્ડિંગ હજી વગાડવા માટે ઉપલબ્ધ નથી.',
    'That song is already playing.': 'આ ગીત વાગી જ રહ્યું છે.',
    'Playback needs an internet connection. Reconnect to play.': 'વગાડવા માટે ઇન્ટરનેટ જોઈએ. ફરી કનેક્ટ થઈને વગાડો.',
    "You're offline. Playback resumes when you're back online.": 'તમે ઑફલાઇન છો. ફરી ઑનલાઇન થતાં વગાડવાનું ફરી શરૂ થશે.',
    'Back online.': 'ફરી ઑનલાઇન.',
    'Choose a genre or another song to continue listening.': 'સાંભળવાનું ચાલુ રાખવા કોઈ પ્રકાર કે બીજું ગીત પસંદ કરો.',

    // Genres and styles
    'Genres': 'પ્રકાર',
    'Nonstop': 'નોનસ્ટોપ',
    'Traditional': 'પરંપરાગત',
    'Dandiya': 'દાંડિયા',
    'Devotional': 'ભક્તિ',
    'Folk': 'લોકગીત',
    'Sanedo': 'સનેડો',
    'Fusion': 'ફ્યુઝન',
    'Nonstop Garba': 'નોનસ્ટોપ ગરબા',
    'Traditional Garba': 'પરંપરાગત ગરબા',
    'Devotional Garba': 'ભક્તિ ગરબા',
    'Dandiya Raas': 'દાંડિયા રાસ',
    'Gujarati Folk': 'ગુજરાતી લોકગીત',
    'Modern Fusion Garba': 'આધુનિક ફ્યુઝન ગરબા',
    'Nonstop set': 'નોનસ્ટોપ સેટ',
    'Previous genre': 'પાછળનો પ્રકાર',
    'Next genre': 'આગળનો પ્રકાર',
    'Swipe the genres below for more': 'વધુ માટે નીચેના પ્રકારો સરકાવો',
    'Explore': 'એક્સપ્લોર',
    'Explore PlayGarba': 'PlayGarba એક્સપ્લોર કરો',
    'Explore PlayGarba catalogue': 'PlayGarba નો સંગ્રહ એક્સપ્લોર કરો',
    'Close Explore': 'એક્સપ્લોર બંધ કરો',
    'Browse Nonstop Garba': 'નોનસ્ટોપ ગરબા જુઓ',
    'Browse': 'જુઓ',
    'Filter by genre': 'પ્રકાર પ્રમાણે ગાળો',
    'Filter songs by genre': 'ગીતોને પ્રકાર પ્રમાણે ગાળો',
    'This genre is waiting for catalogue data.': 'આ પ્રકારનાં ગીતો હજી આવી રહ્યાં છે.',
    'No playable songs in this genre yet.': 'આ પ્રકારમાં હજી વગાડી શકાય એવાં ગીતો નથી.',

    // 24/7 Live
    '24/7 Live': '24/7 લાઇવ',
    '24/7 LIVE': '24/7 લાઇવ',
    '24/7 Live Garba Radio': '24/7 લાઇવ ગરબા રેડિયો',
    'Tune into 24/7 Live Garba Radio': '24/7 લાઇવ ગરબા રેડિયો સાંભળો',
    'Tuning into 24/7 Live Garba Radio...': '24/7 લાઇવ ગરબા રેડિયો શરૂ થાય છે…',
    '24/7 Live Radio is tuning in...': '24/7 લાઇવ રેડિયો શરૂ થાય છે…',
    'Exited 24/7 Live Radio.': '24/7 લાઇવ રેડિયો બંધ કર્યો.',
    'Left 24/7 Live': '24/7 લાઇવ બંધ કર્યું',
    'Live now': 'હમણાં લાઇવ',
    '24/7 Live Radio follows its song order. Turn off Live to choose another song.': '24/7 લાઇવ રેડિયો પોતાના ક્રમમાં વાગે છે. બીજું ગીત પસંદ કરવા લાઇવ બંધ કરો.',
    "PlayGarba's own station. Everyone hears the same moment.": 'PlayGarba નું પોતાનું સ્ટેશન. બધા એક જ ક્ષણ સાંભળે છે.',

    // Private Garba Circle
    'Private Garba Circle': 'પ્રાઇવેટ ગરબા સર્કલ',
    'Listen with friends': 'મિત્રો સાથે સાંભળો',
    'Listen together with friends': 'મિત્રો સાથે મળીને સાંભળો',
    'Private Garba Circle: listen with friends': 'પ્રાઇવેટ ગરબા સર્કલ: મિત્રો સાથે સાંભળો',
    'Private Garba Circle: listen with friends, in sync': 'પ્રાઇવેટ ગરબા સર્કલ: મિત્રો સાથે એકસાથે સાંભળો',
    'Private Garba Circle: listen with friends, everyone hearing the same song at the same moment': 'પ્રાઇવેટ ગરબા સર્કલ: મિત્રો સાથે સાંભળો, બધા એક જ ગીત એક જ ક્ષણે સાંભળે',
    'That song is already in the circle.': 'આ ગીત સર્કલમાં છે જ.',
    "YouTube didn’t give this song’s length, so it can’t join the circle.": 'YouTube એ આ ગીતની લંબાઈ ન આપી, એટલે તે સર્કલમાં ઉમેરી શકાતું નથી.',
    'Getting the song’s length from YouTube…': 'YouTube પરથી ગીતની લંબાઈ મેળવાય છે…',
    'Your Private Garba Circle. Open the circle.': 'તમારું પ્રાઇવેટ ગરબા સર્કલ. સર્કલ ખોલો.',
    'You’re in a Private Garba Circle. Only its host can add songs. Leave the circle to play this link on your own.': 'તમે પ્રાઇવેટ ગરબા સર્કલમાં છો. ફક્ત હોસ્ટ જ ગીતો ઉમેરી શકે. આ લિંક જાતે વગાડવા સર્કલ છોડો.',

    // More, install, share, about
    'My Garba': 'મારા ગરબા',
    'Open My Garba': 'મારા ગરબા ખોલો',
    'My Garba is empty': 'મારા ગરબા ખાલી છે',
    'Tap the heart beside a song to save it here.': 'ગીત અહીં સાચવવા તેની બાજુનું હૃદય ટૅપ કરો.',
    'Share this song': 'આ ગીત શેર કરો',
    'Share current song': 'હાલનું ગીત શેર કરો',
    'Share': 'શેર કરો',
    'Close Share': 'શેર બંધ કરો',
    'Share card': 'કાર્ડ શેર કરો',
    'Share card preview': 'શેર કાર્ડનું પૂર્વદર્શન',
    'Share link': 'લિંક શેર કરો',
    'Copy link': 'લિંક કૉપિ કરો',
    'Link copied': 'લિંક કૉપિ થઈ',
    'Link copied to clipboard': 'લિંક કૉપિ થઈ',
    'Unable to copy link': 'લિંક કૉપિ ન થઈ',
    'Select the link and copy it.': 'લિંક પસંદ કરીને કૉપિ કરો.',
    'What is Garba?': 'ગરબા એટલે શું?',
    'Ask for a feature': 'નવી સુવિધા માગો',
    'Garba Atmosphere': 'ગરબા વાતાવરણ',
    'Install PlayGarba': 'PlayGarba ઇન્સ્ટોલ કરો',
    'Close Install PlayGarba': 'ઇન્સ્ટોલ બંધ કરો',
    'Install': 'ઇન્સ્ટોલ કરો',
    'Install now': 'હમણાં ઇન્સ્ટોલ કરો',
    'Not now': 'હમણાં નહીં',
    'Keep the full-screen player one tap away.': 'પૂર્ણ સ્ક્રીન પ્લેયર એક ટૅપ દૂર રાખો.',
    'Your device': 'તમારું ઉપકરણ',
    'iPhone': 'iPhone',
    'Android': 'Android',
    'Computer': 'કમ્પ્યુટર',
    "Listen in Brave. It's the browser we suggest on iPhone.": 'Brave માં સાંભળો. iPhone પર અમે આ જ બ્રાઉઝર સૂચવીએ છીએ.',
    "Brave can't add PlayGarba to your Home Screen, though. For that, open playgarba.com in Safari, tap Share, then Add to Home Screen. It opens full screen, without the browser bars.": 'જોકે Brave, PlayGarba ને હોમ સ્ક્રીન પર ઉમેરી શકતું નથી. તે માટે Safari માં playgarba.com ખોલો, Share ટૅપ કરો, પછી Add to Home Screen. તે બ્રાઉઝરની પટ્ટીઓ વગર પૂર્ણ સ્ક્રીનમાં ખૂલે છે.',
    'Use Brave. The music keeps playing when your screen turns off or you switch to another app.': 'Brave વાપરો. સ્ક્રીન બંધ થાય કે તમે બીજી ઍપમાં જાઓ ત્યારે પણ સંગીત ચાલુ રહે છે.',
    'To install, open the Brave menu and tap Install app, or Add to Home screen.': 'ઇન્સ્ટોલ કરવા Brave નું મેનૂ ખોલો અને Install app અથવા Add to Home screen ટૅપ કરો.',
    'PlayGarba works in any browser on a computer.': 'કમ્પ્યુટર પર PlayGarba કોઈ પણ બ્રાઉઝરમાં ચાલે છે.',
    'To keep it one click away in Brave, Chrome or Edge, click the install icon at the right end of the address bar.': 'Brave, Chrome કે Edge માં તેને એક ક્લિક દૂર રાખવા, એડ્રેસ બારના જમણા છેડે ઇન્સ્ટોલ આઇકન ક્લિક કરો.',
    'PlayGarba is installed on this device.': 'આ ઉપકરણ પર PlayGarba ઇન્સ્ટોલ થયેલું છે.',
    'GARBA installed.': 'PlayGarba ઇન્સ્ટોલ થયું.',
    'Use Safari Share, then Add to Home Screen.': 'Safari માં Share, પછી Add to Home Screen વાપરો.',
    'In Safari, use Share → Add to Home Screen.': 'Safari માં Share → Add to Home Screen વાપરો.',

    // Up next and queue
    'Up next': 'હવે પછી',
    'Add to Up next': 'હવે પછીમાં ઉમેરો',
    'Added to Up next.': 'હવે પછીમાં ઉમેર્યું.',
    'Already in Up next.': 'હવે પછીમાં છે જ.',
    'Removed from Up next.': 'હવે પછીમાંથી કાઢ્યું.',
    'Up next cleared.': 'હવે પછી ખાલી કર્યું.',
    'Nothing up next': 'હવે પછી કંઈ નથી',
    'Play next': 'પછી વગાડો',
    'Play now': 'હમણાં વગાડો',
    'Queued': 'ઉમેર્યું',
    'Clear': 'સાફ કરો',
    'Continue': 'ચાલુ રાખો',
    'Continue playing': 'વગાડવાનું ચાલુ રાખો',
    'Got it': 'સમજાયું',
    'Songs': 'ગીતો',
    'All': 'બધાં',
    'By step': 'સ્ટેપ પ્રમાણે',
    'Song results': 'ગીતોનાં પરિણામો',
    'No songs found': 'કોઈ ગીત મળ્યું નહીં',
    'Close song browser': 'ગીતોની યાદી બંધ કરો',
    'Resize song browser': 'ગીતોની યાદીનું કદ બદલો',
    'Compact player': 'નાનું પ્લેયર',
    'Type a song, artist, genre or style to see matching results.': 'મળતાં પરિણામો જોવા ગીત, કલાકાર, પ્રકાર કે શૈલી લખો.',
    'Song catalogue updated.': 'ગીતોનો સંગ્રહ અપડેટ થયો.',
    'Update available. It will apply when playback is paused.': 'અપડેટ ઉપલબ્ધ છે. વગાડવાનું થોભશે ત્યારે લાગુ થશે.',

    // YouTube links
    'YouTube link': 'YouTube લિંક',
    'Paste a YouTube video or playlist': 'YouTube વીડિયો કે પ્લેલિસ્ટ પેસ્ટ કરો',
    'Paste any YouTube song or video link to play it directly.': 'કોઈ પણ YouTube ગીત કે વીડિયોની લિંક પેસ્ટ કરીને સીધું વગાડો.',
    'Please enter a valid YouTube link or video ID.': 'કૃપા કરીને માન્ય YouTube લિંક કે વીડિયો ID લખો.',
    'Please enter a valid YouTube video or playlist link, or a video ID.': 'કૃપા કરીને માન્ય YouTube વીડિયો કે પ્લેલિસ્ટ લિંક, અથવા વીડિયો ID લખો.',
    'Could not load track from YouTube link.': 'YouTube લિંક પરથી ગીત લોડ ન થયું.',
    'That playlist could not be opened. It may be private or empty.': 'આ પ્લેલિસ્ટ ખૂલી નહીં. તે ખાનગી કે ખાલી હોઈ શકે.',
    'Opening…': 'ખૂલે છે…',
    'Add to circle': 'સર્કલમાં ઉમેરો',
    'YouTube video': 'YouTube વીડિયો',
    'Close video': 'વીડિયો બંધ કરો',
    'Custom track': 'તમારું ગીત',
    'YouTube Track': 'YouTube ગીત',
    'Your playlist': 'તમારી પ્લેલિસ્ટ',

    // View card
    'Venue': 'સ્થળ',
    'Indoor stadium': 'ઇન્ડોર સ્ટેડિયમ',
    'Outdoors': 'ખુલ્લું મેદાન',
    'Sheri': 'શેરી',
    'Where you stand': 'તમે ક્યાં ઊભા છો',
    'Where you are': 'તમે ક્યાં છો',
    'In the circle': 'વર્તુળમાં',
    'Far away': 'દૂર',
    'By the stage': 'સ્ટેજ પાસે',
    'You and your partner': 'તમે અને તમારો સાથી',
    'Add your face': 'તમારો ચહેરો ઉમેરો',
    'Remove your face': 'તમારો ચહેરો કાઢો',
    "Add your partner's face": 'સાથીનો ચહેરો ઉમેરો',
    "Remove your partner's face": 'સાથીનો ચહેરો કાઢો',
    'Your name': 'તમારું નામ',
    "Your partner's name": 'સાથીનું નામ',
    'Zoom': 'ઝૂમ',
    'Cancel': 'રદ કરો',
    'Use this face': 'આ ચહેરો વાપરો',
    'Your photo. Drag, or use the arrow keys, to fit the face in the circle.': 'તમારો ફોટો. ચહેરો વર્તુળમાં ગોઠવવા ખેંચો, અથવા એરો કી વાપરો.',
    'Dance as the man instead': 'તેના બદલે પુરુષ તરીકે રમો',
    'Dance as the woman instead': 'તેના બદલે સ્ત્રી તરીકે રમો',

    // Sound card and Atmosphere
    'Sound is off': 'અવાજ બંધ છે',
    'Sound is on': 'અવાજ ચાલુ છે',
    'Atmosphere is off': 'વાતાવરણ બંધ છે',
    'Atmosphere is on': 'વાતાવરણ ચાલુ છે',
    'Garba Atmosphere: off': 'ગરબા વાતાવરણ: બંધ',
    'Garba Atmosphere: on': 'ગરબા વાતાવરણ: ચાલુ',
    'Close Garba Atmosphere': 'ગરબા વાતાવરણ બંધ કરો',
    'Test Garba Atmosphere': 'ગરબા વાતાવરણ અજમાવો',
    'Test atmosphere': 'વાતાવરણ અજમાવો',
    'Who keeps the beat': 'તાલ કોણ આપે છે',
    'Hand claps': 'તાળીઓ',
    'Dandiya sticks': 'દાંડિયા',
    'Around the music': 'સંગીતની આસપાસ',
    'Crowd': 'ભીડ',
    'Claps': 'તાળીઓ',
    'Full circle': 'આખું વર્તુળ',
    'Beat': 'તાલ',
    'Tap the beat': 'તાલ ટૅપ કરો',
    "Follow the song's beat": 'ગીતનો તાલ અનુસરો',
    'On the beat': 'તાલ પર',
    'Be tali': 'બે તાળી',
    'Tran tali': 'ત્રણ તાળી',
    'Clap pattern': 'તાળીની રીત',
    'Intensity': 'તીવ્રતા',
    'Background': 'પૃષ્ઠભૂમિ',
    'Background image': 'પૃષ્ઠભૂમિની છબી',
    'Background options': 'પૃષ્ઠભૂમિના વિકલ્પો',
    'Explore backgrounds': 'પૃષ્ઠભૂમિઓ જુઓ',
    'Upload': 'અપલોડ કરો',
    'Reset': 'મૂળ પ્રમાણે કરો',
    'Open the listening room': 'લિસનિંગ રૂમ ખોલો',
    'Turn Atmosphere on, then tap along with the song.': 'વાતાવરણ ચાલુ કરો, પછી ગીત સાથે ટૅપ કરો.',
    'Play a song to hear the circle around it.': 'આસપાસનું વર્તુળ સાંભળવા કોઈ ગીત વગાડો.',
    'The circle claps on the beat.': 'વર્તુળ તાલ પર તાળી પાડે છે.',
    'Everyone strikes dandiya sticks on the beat.': 'બધા તાલ પર દાંડિયા ટકરાવે છે.',
    "Locked to your taps. The claps now land on the song's beat.": 'તમારા ટૅપ પર ગોઠવાયું. હવે તાળીઓ ગીતના તાલ પર પડે છે.',

    // Ideas
    'Your idea': 'તમારું સૂચન',
    'Your name, if you want to add it': 'તમારું નામ, જો ઉમેરવું હોય તો',
    'Your name (optional)': 'તમારું નામ (વૈકલ્પિક)',
    'Send idea': 'સૂચન મોકલો',
    'Sending…': 'મોકલાય છે…',
    'Thank you. Your idea is with the PlayGarba team.': 'આભાર. તમારું સૂચન PlayGarba ટીમ સુધી પહોંચ્યું.',
    'Form not showing? Open it in a new tab': 'ફોર્મ દેખાતું નથી? નવા ટૅબમાં ખોલો',
    'Features requested by other Garbaholics': 'બીજા ગરબાપ્રેમીઓએ માગેલી સુવિધાઓ',

    // Tonight
    'Start tonight': 'આજની રાત શરૂ કરો',
    'Restart tonight': 'આજની રાત ફરી શરૂ કરો',
    'That was tonight. Thanks for dancing.': 'આજની રાત પૂરી થઈ. રમવા બદલ આભાર.',
    'A Garba night has a shape. Tonight plays a night in five parts, one after another.': 'ગરબાની રાતનો એક ક્રમ હોય છે. આજની રાત પાંચ ભાગમાં, એક પછી એક વાગે છે.',

    // Steps
    'Hinch': 'હીંચ',
    'Dodhiyu': 'દોઢિયું',
    'Popatiyu': 'પોપટિયું',
    'Raas': 'રાસ',
    'Two claps in each round': 'દરેક ફેરામાં બે તાળી',
    'Three claps in each round': 'દરેક ફેરામાં ત્રણ તાળી',
    'No songs tagged yet': 'હજી કોઈ ગીત ટૅગ થયું નથી',
    'Mixes Garba and Raas movement': 'ગરબા અને રાસની ચાલ ભેળવે છે',
    'Four steps forward, two steps back': 'ચાર પગલાં આગળ, બે પાછળ',
    'The parrot step, led by the shoulders and hands': 'પોપટની ચાલ, ખભા અને હાથથી',
    'Danced in pairs with dandiya sticks': 'જોડીમાં દાંડિયા સાથે રમાય છે',
    '2 claps': '2 તાળી',
    '3 claps': '3 તાળી',

    // Lives (prototype)
    'Lives': 'લાઇવ',
    'Host a live': 'લાઇવ હોસ્ટ કરો',
    'Close Lives': 'લાઇવ બંધ કરો',
    'Close Host a live': 'લાઇવ હોસ્ટ કરવાનું બંધ કરો',
    'Go live': 'લાઇવ થાઓ',
    'Your live is on': 'તમારું લાઇવ ચાલુ છે',
    'Link to your live': 'તમારા લાઇવની લિંક',

    // Guide
    'PlayGarba Guide': 'PlayGarba માર્ગદર્શિકા',
    'Back to player': 'પ્લેયર પર પાછા',
    'The lamp': 'દીવો',
    'The circle': 'વર્તુળ',
    'The steps': 'સ્ટેપ',
    'The nights': 'રાત્રિઓ',
    'Dancers move around the lamp or an image of the goddess in a counterclockwise circle. The circle can grow ring by ring as more people join.': 'રમનારા દીવા કે માતાજીની છબીની આસપાસ ઘડિયાળની ઊંધી દિશામાં વર્તુળમાં ફરે છે. વધુ લોકો જોડાતાં વર્તુળ એક પછી એક કુંડાળે મોટું થાય છે.',
    'Garba is danced in named steps. Be tali has two claps and Tran tali has three. Hinch, Dodhiyu and Popatiyu each have their own movement.': 'ગરબા નામવાળા સ્ટેપમાં રમાય છે. બે તાળીમાં બે તાળી અને ત્રણ તાળીમાં ત્રણ. હીંચ, દોઢિયું અને પોપટિયુંની પોતપોતાની ચાલ છે.',
    'Garba is danced through the nine nights of Navratri, devoted to the Mother Goddess. It is also danced at weddings and other celebrations through the year.': 'માતાજીને સમર્પિત નવરાત્રિની નવ રાત ગરબા રમાય છે. વર્ષભર લગ્ન અને બીજા ઉત્સવોમાં પણ ગરબા રમાય છે.',

    // Catalogue states
    'Catalogue could not load. The app shell is ready, but song data is unavailable.': 'ગીતોનો સંગ્રહ લોડ ન થયો. ઍપ તૈયાર છે, પણ ગીતોની માહિતી ઉપલબ્ધ નથી.',
    'You’re offline. Catalogue browsing is available, but music playback requires an internet connection.': 'તમે ઑફલાઇન છો. ગીતો જોઈ શકાય છે, પણ વગાડવા માટે ઇન્ટરનેટ જોઈએ.',
    'Loading verified Nonstop sets…': 'નોનસ્ટોપ સેટ લોડ થાય છે…',
    'No verified Nonstop sets are available right now.': 'હમણાં કોઈ નોનસ્ટોપ સેટ ઉપલબ્ધ નથી.',
    'Nonstop sets could not load. Check your connection.': 'નોનસ્ટોપ સેટ લોડ ન થયા. તમારું કનેક્શન તપાસો.'
  };

  // Text that carries a song name or a number: English pattern, then its Gujarati
  var PATTERNS = [
    [/^Share (.+) by (.+)$/, '$1 ($2) શેર કરો'],
    [/^Share (.+)$/, '$1 શેર કરો'],
    [/^Save (.+) to My Garba$/, '$1 મારા ગરબામાં સાચવો'],
    [/^Play (.+) by (.+)$/, '$1 ($2) વગાડો'],
    [/^Playing “(.+)”$/, '“$1” વાગે છે'],
    [/^Move up: (.+)$/, 'ઉપર ખસેડો: $1'],
    [/^Move down: (.+)$/, 'નીચે ખસેડો: $1'],
    [/^Play next: (.+)$/, 'પછી વગાડો: $1'],
    [/^Add to Up next: (.+)$/, 'હવે પછીમાં ઉમેરો: $1'],
    [/^Remove: (.+)$/, 'કાઢો: $1'],
    [/^Now playing: (.+)$/, 'હમણાં વાગે છે: $1'],
    [/^Tuned into 24\/7 Live Garba Radio · (.+)$/, '24/7 લાઇવ ગરબા રેડિયો · $1'],
    [/^Open Up next, (\d+\+?) songs shown$/, 'હવે પછી ખોલો, $1 ગીતો'],
    [/^Search ([\d,]+) songs$/, '$1 ગીતો શોધો'],
    [/^([\d,]+) songs$/, '$1 ગીતો'],
    [/^Showing ([\d,]+) of ([\d,]+)$/, '$2 માંથી $1 બતાવ્યાં'],
    [/^Showing the first ([\d,]+) of ([\d,]+) matches\. Keep typing to narrow the list\.$/, '$2 માંથી પહેલાં $1 પરિણામો. યાદી નાની કરવા લખતા રહો.'],
    [/^Keep going: (\d+) more taps?\.$/, 'ચાલુ રાખો: હજી $1 ટૅપ.'],
    [/^Tonight · (\d+) of (\d+)$/, 'આજની રાત · $2 માંથી $1'],
    [/^Starts in (.+)$/, '$1 માં શરૂ'],
    [/^Starts at (.+)$/, '$1 વાગ્યે શરૂ']
  ];

  function translateText(text) {
    if (typeof text !== 'string') return null;
    var t = text.replace(/\s+/g, ' ').trim();
    if (!t) return null;
    if (Object.prototype.hasOwnProperty.call(GU, t)) return GU[t];
    for (var i = 0; i < PATTERNS.length; i++) if (PATTERNS[i][0].test(t)) return t.replace(PATTERNS[i][0], PATTERNS[i][1]);
    return null;
  }

  var api = { translate: translateText, table: GU, patterns: PATTERNS };
  root.GarbaLanguage = api;
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;

  /* ---------- the page ---------- */
  var KEY = 'garba:lang', ATTRS = ['aria-label', 'placeholder', 'title', 'alt'];
  // Catalogue metadata and the wordmark keep their own words
  var SKIP = '[data-i18n-skip], script, style, noscript, textarea, #songTitle, #songArtist, #title, #artist, .brand';
  var textNodes = new Map(), attrNodes = new Map(), current = 'en', listeners = [];

  function readLang() { try { return localStorage.getItem(KEY) === 'gu' ? 'gu' : 'en'; } catch (e) { return 'en'; } }
  function skipped(el) { return !el || (el.closest && el.closest(SKIP)); }

  function doText(node) {
    var el = node.parentElement; if (skipped(el)) return;
    var now = node.nodeValue, rec = textNodes.get(node);
    if (rec && now === rec.gu) return; // our own write
    var gu = translateText(now);
    if (gu === null) { if (rec) textNodes.delete(node); return; }
    var lead = now.match(/^\s*/)[0], tail = now.match(/\s*$/)[0];
    rec = { en: now, gu: lead + gu + tail }; textNodes.set(node, rec);
    node.nodeValue = rec.gu;
  }
  function doAttrs(el) {
    if (skipped(el)) return;
    ATTRS.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var now = el.getAttribute(a), key = el, recs = attrNodes.get(key) || {}, rec = recs[a];
      if (rec && now === rec.gu) return;
      var gu = translateText(now);
      if (gu === null) { if (rec) delete recs[a]; return; }
      recs[a] = { en: now, gu: gu }; attrNodes.set(key, recs);
      el.setAttribute(a, gu);
    });
  }
  function walk(rootEl) {
    if (!rootEl) return;
    if (rootEl.nodeType === 3) { doText(rootEl); return; }
    if (rootEl.nodeType !== 1) return;
    if (skipped(rootEl)) return;
    doAttrs(rootEl);
    var w = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var n; while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  function restore() {
    textNodes.forEach(function (rec, node) { if (node.nodeValue === rec.gu) node.nodeValue = rec.en; });
    attrNodes.forEach(function (recs, el) { Object.keys(recs).forEach(function (a) { if (el.getAttribute(a) === recs[a].gu) el.setAttribute(a, recs[a].en); }); });
    textNodes.clear(); attrNodes.clear();
  }

  var observer = new MutationObserver(function (list) {
    if (current !== 'gu') return;
    list.forEach(function (m) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
      else m.addedNodes.forEach(walk);
    });
  });

  function syncToggles() {
    document.querySelectorAll('[data-lang-toggle]').forEach(function (b) {
      var gu = current === 'gu';
      b.textContent = gu ? 'EN' : 'ગુ';
      b.setAttribute('lang', gu ? 'en' : 'gu');
      b.setAttribute('aria-label', gu ? 'Show in English' : 'ગુજરાતીમાં બતાવો');
      b.setAttribute('aria-pressed', String(gu));
    });
  }
  function fonts() {
    // Simple's own type has no Gujarati: Anek Gujarati and Rasa come in only when Gujarati is chosen
    if (document.getElementById('garba-gujarati-fonts') || document.querySelector('link[href*="Anek+Gujarati"]')) return;
    var l = document.createElement('link'); l.id = 'garba-gujarati-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700&family=Rasa:wght@400;500;600&display=swap';
    document.head.appendChild(l);
  }
  function apply(lang, save) {
    lang = lang === 'gu' ? 'gu' : 'en';
    var changed = lang !== current; current = lang;
    if (save) { try { localStorage.setItem(KEY, lang); } catch (e) { /* storage unavailable */ } }
    document.documentElement.lang = lang;
    if (lang === 'gu') { fonts(); walk(document.body); } else restore();
    syncToggles();
    if (changed) listeners.forEach(function (fn) { try { fn(lang); } catch (e) { /* a listener's own problem */ } });
  }

  api.get = function () { return current; };
  api.set = function (lang) { apply(lang, true); };
  api.toggle = function () { apply(current === 'gu' ? 'en' : 'gu', true); };
  api.onChange = function (fn) { listeners.push(fn); };

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lang-toggle]');
    if (b) { e.preventDefault(); api.toggle(); }
  });
  // The other player on this device (Simple around Immersive's frame, or the frame inside Simple) follows along
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(e.newValue === 'gu' ? 'gu' : 'en', false); });

  function start() {
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    apply(readLang(), false);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})(typeof window !== 'undefined' ? window : globalThis);
