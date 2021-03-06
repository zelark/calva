import { Disposable } from 'vscode';
import * as vsls from 'vsls';

// Keeps hold of the LiveShare API instance, so that it is requested only once.
let liveShare: vsls.LiveShare = null;

// Keeps hold of the LiveShare listener, to prevent it from being disposed immediately.
let liveShareListener: Disposable = null;

let connectedPort: number = null;
let jackedIn = false;
let sharedPorts: Map<number, Disposable> = new Map();

export async function setupLiveShareListener() {
  if (liveShareListener !== null) { return; }

  liveShare = await vsls.getApi();

  if (liveShare) {
    liveShareListener = liveShare.onDidChangeSession(async (e: vsls.SessionChangeEvent) => {
      if (e.session.role === vsls.Role.Host) {
        await shareReplServerIfPossible();
      }
    });
  }
}

export async function didJackIn() {
  jackedIn = true;
  await shareReplServerIfPossible();
}

export async function didJackOut() {
  await unshareReplServer();
  jackedIn = false;
}

export async function didConnectRepl(port: number) {
  connectedPort = port;
  await shareReplServerIfPossible();
}

export async function didDisconnectRepl() {
  await unshareReplServer();
  connectedPort = null;
}

async function getLiveShare() {
  if (!liveShare) {
    liveShare = await vsls.getApi();
  }
  return liveShare;
}

async function shareReplServerIfPossible() {
  const ls = await getLiveShare();
  if (ls) {
    if (connectedPort !== null && ls.session && ls.session.role === vsls.Role.Host) {
      sharedPorts.set(
        connectedPort,
        await ls.shareServer({ port: connectedPort, displayName: "nREPL server" }));
    }
  }
}

async function unshareReplServer() {
  if (connectedPort !== null) {
    const disposable = sharedPorts.get(connectedPort);
    disposable.dispose();
    sharedPorts.delete(connectedPort);
    connectedPort = null;
  }
}
