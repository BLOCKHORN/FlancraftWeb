import { useMemo, useState } from "react";
import { cleanNick, ensureDeviceId, resolveVoteSession } from "./vote.shared";

export default function useVoteIdentity() {
  const [guestNick, setGuestNick] = useState(() =>
    cleanNick(window.localStorage.getItem("vw_guest_nick") || "")
  );
  const [guestSaved, setGuestSaved] = useState(false);

  const session = resolveVoteSession();
  const deviceId = useMemo(() => ensureDeviceId(), []);
  const effectiveNick = cleanNick(session.userName || guestNick);
  const identityKey = (session.userUuid || effectiveNick || deviceId || "device").trim();

  return {
    ...session,
    guestNick,
    setGuestNick,
    guestSaved,
    setGuestSaved,
    deviceId,
    effectiveNick,
    identityKey,
    showGuest: !session.userUuid && !session.userName,
  };
}
