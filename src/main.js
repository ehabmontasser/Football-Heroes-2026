// App shell: screen router and shared state.

import { splashScreen } from './ui/screens/splash.js';
import { homeScreen } from './ui/screens/home.js';
import { teamSelectScreen } from './ui/screens/teamSelect.js';
import { squadScreen } from './ui/screens/squad.js';
import { matchSetupScreen } from './ui/screens/matchSetup.js';
import { matchScreen } from './ui/screens/match.js';
import { fullTimeScreen } from './ui/screens/fullTime.js';

const SCREENS = {
  splash: splashScreen,
  home: homeScreen,
  teamSelect: teamSelectScreen,
  squad: squadScreen,
  matchSetup: matchSetupScreen,
  match: matchScreen,
  fullTime: fullTimeScreen,
};

const params = new URLSearchParams(location.search);
const debugDuration = parseFloat(params.get('duration'));

export const state = {
  homeId: null,
  awayId: null,
  duration: 10,
  difficulty: 'normal',
  // ?duration=0.5 runs a 30-second match for testing.
  debugDuration: Number.isFinite(debugDuration) && debugDuration > 0 ? debugDuration : null,
};

const root = document.getElementById('app');
let current = null;

export function go(name, args = {}) {
  if (current && current.destroy) current.destroy();
  root.replaceChildren();
  current = SCREENS[name]({ go, state, args });
  root.append(current.el);
  root.scrollTop = 0;
  window.scrollTo(0, 0);
  const heading = current.el.querySelector('h1');
  if (heading) heading.setAttribute('tabindex', '-1');
}

go(params.get('screen') && SCREENS[params.get('screen')] ? params.get('screen') : 'splash');
