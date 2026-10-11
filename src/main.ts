import { Network } from '@capacitor/network';
import { FacePing, isFacePingError, type EnrollOutcome, type VerifyOutcome } from '@faceping/capacitor';

// Your sandbox key: app.faceping.ai, Developers, Sandbox keys, Create sandbox key. Put it in .env.local as
// VITE_FACEPING_SANDBOX_KEY=fp_test_... (see .env.example), or replace the placeholder here.
const SANDBOX_KEY: string = import.meta.env.VITE_FACEPING_SANDBOX_KEY || 'fp_test_…';

const ID = 'me';

type Tone = 'ink' | 'green' | 'red';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const enrollButton = $<HTMLButtonElement>('enroll');
const verifyButton = $<HTMLButtonElement>('verify');
let offline = false;
let busy = false;
let enrolled = false;
let canEnroll = true;

/** The same app as the MAUI, Android, iOS, Flutter and React Native FaceCheck: enrol your face, then verify it live. */
function show(title: string, note: string, tone: Tone) {
  const t = $('title');
  t.textContent = title;
  t.className = `title ${tone}`;
  $('note').textContent = note;
}

function refreshButtons() {
  enrollButton.disabled = busy || !canEnroll;
  enrollButton.textContent = enrolled ? 'Enrol again' : 'Enrol my face';
  verifyButton.disabled = busy || !enrolled;
}

async function refreshEnrolled() {
  enrolled = (await FacePing.enrolledIds().catch((): string[] => [])).includes(ID);
  refreshButtons();
}

// Whether the phone has a network (the checks never need one).
function showNetwork(connected: boolean) {
  offline = !connected;
  const pill = $('network');
  pill.textContent = offline ? 'Offline' : 'Online';
  pill.classList.toggle('offline', offline);
  pill.setAttribute('aria-label', offline ? 'No network' : 'Network available');
}
Network.getStatus().then((s) => showNetwork(s.connected));
Network.addListener('networkStatusChange', (s) => showNetwork(s.connected));

// Turn FacePing on, then sync: activates the sandbox key on the first run, and a face enrolled earlier may still be on
// the phone (sandbox faces are deleted 24 hours after enrolment).
async function start() {
  try {
    await FacePing.init({ sandboxKey: SANDBOX_KEY });
  } catch (error) {
    show('Sandbox key problem', messageOf(error), 'red');
    canEnroll = false;
    refreshButtons();
    return;
  }
  try {
    await FacePing.sync();
  } catch (error) {
    showError(error);
  }
  await refreshEnrolled();
}

async function run(action: () => Promise<void>) {
  if (busy) return;
  busy = true;
  refreshButtons();
  try {
    await action();
  } catch (error) {
    showError(error);
  } finally {
    busy = false;
    await refreshEnrolled();
  }
}

enrollButton.addEventListener('click', () =>
  run(async () => {
    // Opens the FacePing camera screen; the photo the person takes is enrolled on the phone.
    const result = await FacePing.enroll(ID);
    if (result.isEnrolled) {
      show('Enrolled', offline ? 'No network. Tap Verify.' : 'Now tap Verify.', 'ink');
    } else {
      show('Try again', describe(result.outcome), 'red');
    }
  }),
);

verifyButton.addEventListener('click', () =>
  run(async () => {
    // A live check on the camera screen: matches your face, asks you to turn your head (liveness), then matches again.
    const result = await FacePing.verifyLive(ID);
    const time = `${(result.elapsedMs / 1000).toFixed(2)} s`;
    if (result.isMatch) {
      show('Match', `Live face · ${time} · ${offline ? 'no network used' : 'on the phone'}`, 'green');
    } else {
      show(titleFor(result.outcome), 'Tap Verify to try again.', 'red');
    }
  }),
);

function showError(error: unknown) {
  if (isFacePingError(error, 'canceled')) {
    // The person closed the camera screen.
    show('Look at the camera', enrolled ? 'Tap Verify when you are ready.' : 'Tap Enrol my face to start.', 'ink');
  } else if (isFacePingError(error, 'setup')) {
    // The sandbox key is missing or revoked, or the very first run had no connection.
    show('Sandbox key problem', error.message, 'red');
  } else if (isFacePingError(error, 'model')) {
    // The face models couldn't load on this phone: send people to your normal way in.
    show('Face check unavailable', error.message, 'red');
  } else if (isFacePingError(error, 'camera')) {
    show('Camera unavailable', error.message, 'red');
  } else {
    show('Try again', messageOf(error), 'red');
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function titleFor(outcome: VerifyOutcome): string {
  switch (outcome) {
    case 'noMatch':
      return 'Not a match';
    case 'notEnrolled':
      return 'Not enrolled';
    case 'noFace':
      return 'No face seen';
    case 'livenessFailed':
      return 'Not a live face';
    case 'challengeFailed':
      return 'Head turn not seen';
    case 'expired':
      return 'Enrolment expired';
    case 'leaseExpired':
      return 'Sync needed';
    case 'match':
      return 'Match';
    default:
      return 'Try again';
  }
}

function describe(outcome: EnrollOutcome): string {
  switch (outcome) {
    case 'noFace':
      return 'No face seen. Look at the camera.';
    case 'multipleFaces':
      return 'More than one face. Just you, please.';
    case 'faceTooSmall':
      return 'Move a little closer.';
    case 'notLive':
      return 'That looked like a photo or a screen.';
    case 'limitReached':
      return 'The sandbox is full on this phone.';
    case 'enrolled':
      return 'Enrolled.';
    default:
      return 'Tap Enrol my face to try again.';
  }
}

start();
