import { Network } from '@capacitor/network';
import { FacePing, isFacePingError, type EnrollOutcome, type SyncResult, type VerifyOutcome } from '@faceping/capacitor';

// Your sandbox key: app.faceping.ai, Developers, Sandbox keys, Create sandbox key. Put it in .env.local as
// VITE_FACEPING_SANDBOX_KEY=fp_test_... (see .env.example), or replace the placeholder here.
const SANDBOX_KEY: string = import.meta.env.VITE_FACEPING_SANDBOX_KEY || 'fp_test_…';

// To run as a check-in device for your practice list instead, set VITE_FACEPING_DEVICE_TOKEN=fpd_... (from the list's
// Devices tab) and VITE_FACEPING_PERSON_ID to the person you enrolled on the list. A token wins over the key.
const DEVICE_TOKEN: string = import.meta.env.VITE_FACEPING_DEVICE_TOKEN || '';
const DEVICE_MODE = DEVICE_TOKEN.length > 0;

// Who this app verifies: "me" in the sandbox; on a check-in device, the personId you enrolled on the list.
const ID: string = import.meta.env.VITE_FACEPING_PERSON_ID || 'me';

type Tone = 'ink' | 'green' | 'red';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const enrollButton = $<HTMLButtonElement>('enroll');
const verifyButton = $<HTMLButtonElement>('verify');
let offline = false;
let busy = false;
let enrolled = false;
let canEnroll = true;

/**
 * The same app as the other FaceCheck starters: enrol your face, then verify it live. As a check-in device, it gets its
 * people from your practice list instead, and only verifies.
 */
function show(title: string, note: string, tone: Tone) {
  const t = $('title');
  t.textContent = title;
  t.className = `title ${tone}`;
  $('note').textContent = note;
}

// A check-in device gets its people from the server: no enrolling here.
enrollButton.hidden = DEVICE_MODE;

function refreshButtons() {
  enrollButton.disabled = busy || !canEnroll || DEVICE_MODE;
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
// the phone (sandbox faces are deleted 24 hours after enrolment). On a check-in device, sync downloads the list.
async function start() {
  if (DEVICE_MODE) show('Look at the camera', 'Syncing the list…', 'ink');
  try {
    await FacePing.init(DEVICE_MODE ? { deviceToken: DEVICE_TOKEN } : { sandboxKey: SANDBOX_KEY });
  } catch (error) {
    show(DEVICE_MODE ? 'Device token problem' : 'Sandbox key problem', messageOf(error), 'red');
    canEnroll = false;
    refreshButtons();
    return;
  }
  try {
    const sync = await FacePing.sync();
    await refreshEnrolled();
    if (DEVICE_MODE) showSync(sync);
  } catch (error) {
    showError(error);
    await refreshEnrolled();
  }
}

/** On a check-in device: say what the sync found. */
function showSync(sync: SyncResult) {
  switch (sync.status) {
    case 'revoked':
      show('Device token not valid', 'It was revoked or mistyped, or its list was deleted. Add the device again and use the new token.', 'red');
      break;
    case 'gone':
      show('List finished', "This list's faces have been deleted, so there's no one to check.", 'ink');
      break;
    case 'unavailable':
      show("Couldn't sync", 'No connection to FacePing. The people synced before still work until the lease runs out.', 'ink');
      break;
    default:
      show(
        `${sync.enrolled} people synced`,
        enrolled ? `${ID} is here: tap Verify.` : `${ID} isn't on this list yet. Enrol them on your server, then reopen the app.`,
        'ink',
      );
  }
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
    show(DEVICE_MODE ? 'Device token problem' : 'Sandbox key problem', error.message, 'red');
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
