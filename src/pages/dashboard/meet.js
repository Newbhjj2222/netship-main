import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import styles from "../../styles/met.module.css";
import {
  FaPaperPlane,
  FaVideo,
  FaStop,
  FaSignOutAlt,
  FaImage,
  FaDesktop,
  FaUsers,
  FaUser,
  FaComments,
  FaTimes,
  FaCamera,
  FaMicrophone,
  FaMicrophoneSlash,
  FaCameraRetro,
  FaHandPaper,
  FaMicrophoneAlt,
  FaExpand,
  FaCompress,
} from "react-icons/fa";
import { db } from "../../components/firebase";
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  where,
  getDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import LinkComponent from "../../components/Link";
import Peer from "peerjs";
import { useI18n } from "@/i18n/I18nProvider";

// -----------------------------------------------------------------
// GET USER FROM COOKIE
// -----------------------------------------------------------------
function getUserFromCookie(cookieString) {
  const cookies = cookieString || "";
  const userCookie = cookies.split(";").find((c) => c.trim().startsWith("user="));
  if (!userCookie) return null;
  try {
    const cookieValue = userCookie.split("=")[1];
    const userData = JSON.parse(decodeURIComponent(cookieValue));
    return userData;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------
export default function Meet({ initialUsername, initialUserData }) {
  const { tr } = useI18n();

  const router = useRouter();
  const [username, setUsername] = useState(initialUsername || "");
  const [userEmail, setUserEmail] = useState(initialUserData?.email || "");
  const [meeting, setMeeting] = useState({
    active: false,
    hostUsername: null,
    speaker: null,
    micPermissions: [],
  });
  const [showChat, setShowChat] = useState(false);

  // Chat
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [privateUser, setPrivateUser] = useState("");
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);

  // Video / Audio
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);

  // Screen share
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [screenShareDuration, setScreenShareDuration] = useState(0);
  const screenTimerRef = useRef(null);

  // PeerJS
  const peerRef = useRef(null);
  const [myPeerId, setMyPeerId] = useState(null);
  const peerInitializedRef = useRef(false);
  const callsRef = useRef({});
  const remoteStreamsRef = useRef({});

  // Firestore
  const meetingDocRef = useMemo(() => doc(db, "meetings", "current"), []);

  // Raise hand
  const [raisedHands, setRaisedHands] = useState([]);
  const [handRaised, setHandRaised] = useState(false);

  // Peer username mapping
  const [peerUsernames, setPeerUsernames] = useState({});

  // Featured video (host only)
  const [featuredPeerId, setFeaturedPeerId] = useState(null);

  // Refs
  const usernameRef = useRef(username);
  const isHostRef = useRef(false);
  const messagesEndRef = useRef(null);

  // -----------------------------------------------------------------
  // UPDATE REFS
  // -----------------------------------------------------------------
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    isHostRef.current = username === meeting.hostUsername;
  }, [username, meeting.hostUsername]);

  // -----------------------------------------------------------------
  // CHECK SESSION
  // -----------------------------------------------------------------
  useEffect(() => {
    const userCookie = Cookies.get("user");
    if (!userCookie) {
      router.replace("/login");
    }
  }, [router]);

  // -----------------------------------------------------------------
  // PEERJS INIT (ONCE) - Mesh topology
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!username || peerInitializedRef.current) return;

    const initPeer = async () => {
      try {
        const p = new Peer(undefined, {
          host: "0.peerjs.com",
          port: 443,
          path: "/",
          secure: true,
        });

        p.on("open", async (id) => {
          console.log(`✅ PeerJS opened: ${id} (${username})`);
          setMyPeerId(id);
          peerRef.current = p;
          peerInitializedRef.current = true;

          try {
            await setDoc(
              doc(db, "meetings", "current", "peers", username),
              { peerId: id, username, updatedAt: serverTimestamp() },
              { merge: true }
            );
            console.log(`✅ Peer ID stored for ${username}`);
          } catch (err) {
            console.error("❌ Failed to store peer ID:", err);
          }

          // Connect to existing peers after registration
          setTimeout(() => connectToAllPeers(), 500);
        });

        p.on("error", (err) => {
          console.error("❌ PeerJS error:", err);
        });

        p.on("disconnected", () => {
          console.log("⚠️ PeerJS disconnected, reconnecting...");
          p.reconnect();
        });

        // Incoming call - answer with local stream
        p.on("call", (call) => {
          const stream = localStreamRef.current;
          if (!stream) {
            console.log("⚠️ No local stream, closing call");
            call.close();
            return;
          }

          console.log(`📞 Incoming call from ${call.peer}`);
          call.answer(stream);
          callsRef.current[call.peer] = call;

          call.on("stream", (remoteStream) => {
            console.log(`📹 Received stream from ${call.peer}`);
            remoteStreamsRef.current[call.peer] = remoteStream;
            setRemoteStreams((prev) => ({ ...prev, [call.peer]: remoteStream }));
          });

          call.on("close", () => {
            console.log(`🔴 Call closed with ${call.peer}`);
            delete callsRef.current[call.peer];
            delete remoteStreamsRef.current[call.peer];
            setRemoteStreams((prev) => {
              const newState = { ...prev };
              delete newState[call.peer];
              return newState;
            });
          });

          call.on("error", (err) => {
            console.error(`❌ Call error with ${call.peer}:`, err);
            delete callsRef.current[call.peer];
            delete remoteStreamsRef.current[call.peer];
            setRemoteStreams((prev) => {
              const newState = { ...prev };
              delete newState[call.peer];
              return newState;
            });
          });
        });
      } catch (err) {
        console.error("❌ Failed to initialize PeerJS:", err);
      }
    };

    initPeer();

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
        peerInitializedRef.current = false;
      }
      Object.values(callsRef.current).forEach((c) => c.close());
      callsRef.current = {};
      remoteStreamsRef.current = {};
      setRemoteStreams({});
    };
  }, [username]);

  // -----------------------------------------------------------------
  // CONNECT TO ALL EXISTING PEERS
  // -----------------------------------------------------------------
  const connectToAllPeers = useCallback(async () => {
    if (!peerRef.current || !localStreamRef.current) {
      console.log("⚠️ Cannot connect: no peer or no stream");
      return;
    }

    try {
      const peersSnap = await getDocs(collection(db, "meetings", "current", "peers"));
      const newPeerUsernames = {};
      peersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const peerName = data.username;
        const peerId = data.peerId;
        if (peerName === username) return;
        newPeerUsernames[peerId] = peerName;

        // Skip if already in a call
        if (callsRef.current[peerId]) return;

        console.log(`📞 Connecting to peer: ${peerName} (${peerId})`);
        try {
          const call = peerRef.current.call(peerId, localStreamRef.current);
          callsRef.current[peerId] = call;

          call.on("stream", (remoteStream) => {
            console.log(`📹 Received stream from ${peerName}`);
            remoteStreamsRef.current[peerId] = remoteStream;
            setRemoteStreams((prev) => ({ ...prev, [peerId]: remoteStream }));
          });

          call.on("close", () => {
            console.log(`🔴 Call closed with ${peerName}`);
            delete callsRef.current[peerId];
            delete remoteStreamsRef.current[peerId];
            setRemoteStreams((prev) => {
              const newState = { ...prev };
              delete newState[peerId];
              return newState;
            });
          });

          call.on("error", (err) => {
            console.error(`❌ Call error with ${peerName}:`, err);
            delete callsRef.current[peerId];
            delete remoteStreamsRef.current[peerId];
            setRemoteStreams((prev) => {
              const newState = { ...prev };
              delete newState[peerId];
              return newState;
            });
          });
        } catch (err) {
          console.error(`❌ Failed to call ${peerName}:`, err);
        }
      });
      setPeerUsernames((prev) => ({ ...prev, ...newPeerUsernames }));
    } catch (err) {
      console.error("❌ Failed to connect to peers:", err);
    }
  }, [username]);

  // Listen for new peers joining and update mapping
  useEffect(() => {
    if (!peerRef.current || !localStreamRef.current) return;

    const peersCol = collection(db, "meetings", "current", "peers");
    const q = query(peersCol, orderBy("updatedAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        const data = change.doc.data();
        const peerName = data.username;
        const peerId = data.peerId;
        if (peerName === username) return;

        if (change.type === "added") {
          // Update mapping
          setPeerUsernames((prev) => ({ ...prev, [peerId]: peerName }));

          // Skip if already in a call
          if (callsRef.current[peerId]) return;

          console.log(`👤 New peer joined: ${peerName} (${peerId})`);
          try {
            const call = peerRef.current.call(peerId, localStreamRef.current);
            callsRef.current[peerId] = call;

            call.on("stream", (remoteStream) => {
              console.log(`📹 Received stream from ${peerName}`);
              remoteStreamsRef.current[peerId] = remoteStream;
              setRemoteStreams((prev) => ({ ...prev, [peerId]: remoteStream }));
            });

            call.on("close", () => {
              console.log(`🔴 Call closed with ${peerName}`);
              delete callsRef.current[peerId];
              delete remoteStreamsRef.current[peerId];
              setRemoteStreams((prev) => {
                const newState = { ...prev };
                delete newState[peerId];
                return newState;
              });
            });

            call.on("error", (err) => {
              console.error(`❌ Call error with ${peerName}:`, err);
              delete callsRef.current[peerId];
              delete remoteStreamsRef.current[peerId];
              setRemoteStreams((prev) => {
                const newState = { ...prev };
                delete newState[peerId];
                return newState;
              });
            });
          } catch (err) {
            console.error(`❌ Failed to call new peer ${peerName}:`, err);
          }
        } else if (change.type === "removed") {
          // Remove from mapping and remote streams
          setPeerUsernames((prev) => {
            const newMap = { ...prev };
            delete newMap[peerId];
            return newMap;
          });
          delete remoteStreamsRef.current[peerId];
          setRemoteStreams((prev) => {
            const newState = { ...prev };
            delete newState[peerId];
            return newState;
          });
          if (callsRef.current[peerId]) {
            callsRef.current[peerId].close();
            delete callsRef.current[peerId];
          }
          // If featured was this peer, clear
          if (featuredPeerId === peerId) setFeaturedPeerId(null);
        }
      });
    });

    return () => unsub();
  }, [username]);

  // -----------------------------------------------------------------
  // REPLACE TRACKS IN ALL ACTIVE CALLS (for screen share)
  // -----------------------------------------------------------------
  const replaceVideoTrackInAllCalls = useCallback((newStream) => {
    const videoTrack = newStream.getVideoTracks()[0];
    if (!videoTrack) {
      console.log("⚠️ No video track to replace");
      return;
    }

    Object.entries(callsRef.current).forEach(([peerId, call]) => {
      try {
        const pc = call.peerConnection;
        if (!pc) return;
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender) {
          videoSender.replaceTrack(videoTrack);
          console.log(`🔄 Replaced video track for peer ${peerId}`);
        }
      } catch (err) {
        console.error(`❌ Failed to replace track for ${peerId}:`, err);
      }
    });
  }, []);

  // -----------------------------------------------------------------
  // CAMERA / MICROPHONE
  // -----------------------------------------------------------------
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Set initial camera state
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        setIsCameraOn(videoTrack.enabled);
      }

      // For non-host, mute audio by default (will be overridden by permissions)
      const isHost = username === meeting.hostUsername;
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        if (!isHost) {
          audioTrack.enabled = false;
          setIsMicOn(false);
        } else {
          audioTrack.enabled = true;
          setIsMicOn(true);
        }
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(() => {});
      }
      console.log("📷 Camera started");

      // Connect to peers after camera is ready
      if (peerRef.current && peerInitializedRef.current) {
        setTimeout(connectToAllPeers, 300);
      }
    } catch (e) {
      console.error("❌ Camera error:", e);
      alert(tr("Camera ntiyabonetse. Reba niba uri hafi ya camera."));
    }
  }, [connectToAllPeers, username, meeting.hostUsername]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsCameraOn(track.enabled);
      console.log(`📷 Camera ${track.enabled ? "on" : "off"}`);
    }
  }, []);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (track) {
      const isHost = username === meeting.hostUsername;
      const hasPerm = meeting.micPermissions?.includes(username) || false;

      // Host can always toggle, others need permission
      if (!isHost && !hasPerm) {
        alert(tr("Ntabwo ubyemerewe kuvugira kuri microphone. Saba host (Raise Hand)."));
        return;
      }

      track.enabled = !track.enabled;
      setIsMicOn(track.enabled);
      console.log(`🎤 Mic ${track.enabled ? "on" : "off"}`);
    }
  }, [username, meeting.hostUsername, meeting.micPermissions]);

  // -----------------------------------------------------------------
  // ENFORCE MIC PERMISSIONS (HOST CONTROLS)
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!localStreamRef.current) return;
    const stream = localStreamRef.current;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    const isHost = username === meeting.hostUsername;
    if (isHost) {
      // Host can always use mic
      return;
    }

    const hasPerm = meeting.micPermissions?.includes(username) || false;
    const amSpeaker = meeting.speaker === username;

    // If not permitted, force mute
    if (!hasPerm && !amSpeaker) {
      if (audioTrack.enabled) {
        audioTrack.enabled = false;
        setIsMicOn(false);
        console.log(`🔇 Mic muted by host permission for ${username}`);
      }
    } else {
      // If permitted and currently muted (maybe by host), unmute
      if (!audioTrack.enabled) {
        audioTrack.enabled = true;
        setIsMicOn(true);
        console.log(`🎤 Mic unmuted by host permission for ${username}`);
      }
    }
  }, [meeting.micPermissions, meeting.speaker, username, meeting.hostUsername]);

  // -----------------------------------------------------------------
  // FIRESTORE LISTENERS
  // -----------------------------------------------------------------
  useEffect(() => {
    const unsub = onSnapshot(
      meetingDocRef,
      (snap) => {
        if (!snap.exists()) {
          setMeeting({ active: false, hostUsername: null, speaker: null, micPermissions: [] });
          return;
        }
        const d = snap.data();
        setMeeting({
          active: d.active || false,
          hostUsername: d.hostUsername || null,
          speaker: d.speaker || null,
          micPermissions: d.micPermissions || [],
        });
      },
      (err) => console.error("❌ Meeting listener error:", err)
    );
    return () => unsub();
  }, [meetingDocRef]);

  // Messages
  useEffect(() => {
    const q = query(
      collection(db, "meetings", "current", "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setMessages(arr);
      const u = arr
        .filter((m) => m.type === "user" && m.username)
        .map((m) => m.username);
      setUsers([...new Set(u)]);
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        50
      );
    });
    return () => unsub();
  }, []);

  // Typing
  useEffect(() => {
    if (!username) return;
    const ref = doc(db, "meetings", "current", "typing", username);
    let t;
    if (msg.trim()) {
      setDoc(ref, { username, typing: true }, { merge: true });
      clearTimeout(t);
      t = setTimeout(() => {
        updateDoc(ref, { typing: false });
      }, 1000);
    }
    return () => clearTimeout(t);
  }, [msg, username]);

  useEffect(() => {
    const col = collection(db, "meetings", "current", "typing");
    const unsub = onSnapshot(col, (snap) => {
      const arr = [];
      snap.forEach((d) => {
        const v = d.data();
        if (v.typing && v.username !== username) arr.push(v.username);
      });
      setTypingUsers(arr);
    });
    return () => unsub();
  }, [username]);

  // Raise hands
  useEffect(() => {
    const q = query(
      collection(db, "meetings", "current", "raiseHand"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setRaisedHands(list);
    });
    return () => unsub();
  }, []);

  // -----------------------------------------------------------------
  // MICROPHONE PERMISSIONS (HOST ONLY)
  // -----------------------------------------------------------------
  const allowMicrophone = useCallback(
    async (user) => {
      if (username !== meeting.hostUsername) return;
      try {
        await updateDoc(meetingDocRef, {
          micPermissions: arrayUnion(user),
        });
        console.log(`🎤 Host allowed mic for ${user}`);
      } catch (err) {
        console.error("❌ Allow mic error:", err);
      }
    },
    [username, meeting.hostUsername, meetingDocRef]
  );

  const removeMicrophone = useCallback(
    async (user) => {
      if (username !== meeting.hostUsername) return;
      try {
        await updateDoc(meetingDocRef, {
          micPermissions: arrayRemove(user),
          speaker: null,
        });
        console.log(`🔇 Host removed mic permission for ${user}`);
      } catch (err) {
        console.error("❌ Remove mic error:", err);
      }
    },
    [username, meeting.hostUsername, meetingDocRef]
  );

  // -----------------------------------------------------------------
  // MAKE LIVE / STOP LIVE (HOST sets speaker)
  // -----------------------------------------------------------------
  const makeLive = useCallback(
    async (user) => {
      if (username !== meeting.hostUsername) return;
      try {
        // Grant mic permission and set speaker
        await updateDoc(meetingDocRef, {
          speaker: user,
          micPermissions: arrayUnion(user),
        });
        // Remove from raised hands
        const q = query(
          collection(db, "meetings", "current", "raiseHand"),
          where("username", "==", user)
        );
        const snap = await getDocs(q);
        snap.forEach((d) => deleteDoc(doc(db, "meetings", "current", "raiseHand", d.id)));
        console.log(`📹 Host made ${user} live`);
      } catch (err) {
        console.error("❌ Make live error:", err);
      }
    },
    [username, meeting.hostUsername, meetingDocRef]
  );

  const stopLive = useCallback(async () => {
    if (username !== meeting.hostUsername) return;
    try {
      await updateDoc(meetingDocRef, { speaker: null });
      console.log(`🛑 Host stopped live`);
    } catch (err) {
      console.error("❌ Stop live error:", err);
    }
  }, [username, meeting.hostUsername, meetingDocRef]);

  // -----------------------------------------------------------------
  // MEETING ACTIONS
  // -----------------------------------------------------------------
  const launchMeeting = useCallback(async () => {
    try {
      await setDoc(
        meetingDocRef,
        {
          active: true,
          hostUsername: username,
          startedAt: serverTimestamp(),
          speaker: username,
          micPermissions: [username], // host has permission by default
        },
        { merge: true }
      );
      setShowChat(true);
      if (!localStreamRef.current) await startCamera();
    } catch (err) {
      console.error("❌ Launch meeting error:", err);
    }
  }, [username, meetingDocRef, startCamera]);

  const joinMeeting = useCallback(async () => {
    try {
      await addDoc(collection(meetingDocRef, "messages"), {
        username: "system",
        text: `${username} yinjiye mu meeting`,
        type: "system",
        createdAt: serverTimestamp(),
      });
      setShowChat(true);
      if (!localStreamRef.current) await startCamera();
    } catch (err) {
      console.error("❌ Join meeting error:", err);
    }
  }, [username, meetingDocRef, startCamera]);

  const leaveMeeting = useCallback(async () => {
    try {
      await addDoc(collection(meetingDocRef, "messages"), {
        username: "system",
        text: `${username} yasohotse mu meeting`,
        type: "system",
        createdAt: serverTimestamp(),
      });
      setShowChat(false);

      if (screenShareActive) {
        stopScreenShare(true);
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }

      await deleteDoc(doc(db, "meetings", "current", "peers", username)).catch(() => {});

      Object.values(callsRef.current).forEach((c) => c.close());
      callsRef.current = {};
      remoteStreamsRef.current = {};
      setRemoteStreams({});
    } catch (err) {
      console.error("❌ Leave meeting error:", err);
    }
  }, [username, meetingDocRef, screenShareActive]);

  const endMeeting = useCallback(async () => {
    if (username !== meeting.hostUsername) return;
    try {
      const snap = await getDocs(collection(meetingDocRef, "messages"));
      snap.forEach((d) => deleteDoc(doc(db, "meetings", "current", "messages", d.id)));
      await updateDoc(meetingDocRef, {
        active: false,
        endedAt: serverTimestamp(),
        speaker: null,
        micPermissions: [],
      });
      setShowChat(false);
      if (screenShareActive) stopScreenShare(true);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }
      Object.values(callsRef.current).forEach((c) => c.close());
      callsRef.current = {};
      remoteStreamsRef.current = {};
      setRemoteStreams({});
    } catch (err) {
      console.error("❌ End meeting error:", err);
    }
  }, [username, meeting.hostUsername, meetingDocRef, screenShareActive]);

  // -----------------------------------------------------------------
  // SCREEN SHARE (HOST ONLY)
  // -----------------------------------------------------------------
  const startScreenShare = useCallback(async () => {
    if (username !== meeting.hostUsername) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play();
      }

      replaceVideoTrackInAllCalls(stream);

      setScreenShareActive(true);
      setScreenShareDuration(0);

      screenTimerRef.current = setInterval(() => {
        setScreenShareDuration((p) => p + 1);
      }, 1000);

      stream.getVideoTracks()[0].onended = () => {
        console.log("🖥️ Screen share ended by user");
        stopScreenShare(false);
      };

      console.log("🖥️ Screen share started");
    } catch (e) {
      console.error("❌ Screen share error:", e);
      alert(tr("Screen share ntiyabonetse."));
    }
  }, [username, meeting.hostUsername, replaceVideoTrackInAllCalls]);

  const stopScreenShare = useCallback(
    async (force = false) => {
      if (localStreamRef.current && screenShareActive) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      clearInterval(screenTimerRef.current);
      setScreenShareActive(false);
      setScreenShareDuration(0);

      if (!force) {
        await startCamera();
        if (localStreamRef.current) {
          replaceVideoTrackInAllCalls(localStreamRef.current);
        }
        console.log("🖥️ Screen share stopped, reverted to camera");
      }
    },
    [screenShareActive, startCamera, replaceVideoTrackInAllCalls]
  );

  // -----------------------------------------------------------------
  // SEND MESSAGE
  // -----------------------------------------------------------------
  const sendMessage = useCallback(
    async (e) => {
      e.preventDefault();
      if (!msg.trim() && !imageBase64) return;
      try {
        await addDoc(collection(meetingDocRef, "messages"), {
          username,
          text: msg,
          image: imageBase64,
          type: privateUser ? "private" : "user",
          to: privateUser || null,
          createdAt: serverTimestamp(),
        });
        setMsg("");
        setImageBase64(null);
        setImagePreview(null);
        setPrivateUser("");
      } catch (err) {
        console.error("❌ Send message error:", err);
      }
    },
    [msg, imageBase64, privateUser, username, meetingDocRef]
  );

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  }, []);

  // -----------------------------------------------------------------
  // RAISE HAND
  // -----------------------------------------------------------------
  const raiseHand = useCallback(async () => {
    try {
      await addDoc(collection(db, "meetings", "current", "raiseHand"), {
        username,
        timestamp: serverTimestamp(),
      });
      setHandRaised(true);
    } catch (err) {
      console.error("❌ Raise hand error:", err);
    }
  }, [username]);

  const lowerHand = useCallback(async () => {
    try {
      const q = query(
        collection(db, "meetings", "current", "raiseHand"),
        where("username", "==", username)
      );
      const snap = await getDocs(q);
      snap.forEach((d) => deleteDoc(doc(db, "meetings", "current", "raiseHand", d.id)));
      setHandRaised(false);
    } catch (err) {
      console.error("❌ Lower hand error:", err);
    }
  }, [username]);

  // -----------------------------------------------------------------
  // FEATURED VIDEO (HOST ONLY)
  // -----------------------------------------------------------------
  const toggleFeatured = useCallback((peerId) => {
    if (username !== meeting.hostUsername) return;
    setFeaturedPeerId((prev) => (prev === peerId ? null : peerId));
  }, [username, meeting.hostUsername]);

  // -----------------------------------------------------------------
  // INITIAL CAMERA
  // -----------------------------------------------------------------
  useEffect(() => {
    // Don't auto-start camera until user joins/launches meeting
    // startCamera will be called from launchMeeting or joinMeeting
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      clearInterval(screenTimerRef.current);
      Object.values(callsRef.current).forEach((c) => c.close());
      callsRef.current = {};
      remoteStreamsRef.current = {};
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
  }, []);

  // -----------------------------------------------------------------
  // HELPERS
  // -----------------------------------------------------------------
  const formatTime = useCallback((seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const isHost = username === meeting.hostUsername;
  const hasMicPermission = meeting.micPermissions?.includes(username) || false;
  const amISpeaker = meeting.speaker === username;

  // -----------------------------------------------------------------
  // RENDER
  // -----------------------------------------------------------------
  return (
    <>
      <LinkComponent />
      <div className={styles.container}>
        {/* HEADER */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <FaVideo className={styles.headerIcon} />
            <h1 className={styles.title}>{tr("Meeting Corner")}</h1>
          </div>
          <div className={styles.userBox}>
            <FaUser className={styles.userIcon} />
            <div className={styles.userInfo}>
              <span className={styles.usernameDisplay}>{username}</span>
              <span className={styles.userEmailDisplay}>{userEmail}</span>
              {myPeerId && (
                <span className={styles.peerIdDisplay}>{tr("ID:")}{" "}{myPeerId.slice(0, 6)}</span>
              )}
            </div>
          </div>
        </header>

        <main className={styles.main}>
          {/* MEETING CARD */}
          <div className={styles.meetingCard}>
            <div className={styles.meetingInfo}>
              {meeting.active ? (
                <>
                  <div className={styles.meetingActive}>
                    <span className={styles.liveDot}></span>
                    <strong>{tr("Live Meeting")}</strong>
                  </div>
                  <div className={styles.meetingHost}>
                    <FaUser />{" "}{tr("Host: {hostUsername}", { hostUsername: meeting.hostUsername })}</div>
                  <div className={styles.meetingUsers}>
                    <FaUsers /> {users.length + 1}{" "}{tr("participants")}</div>
                  {meeting.speaker && (
                    <div className={styles.speakerBadge}>
                      <FaMicrophoneAlt />{" "}{tr("Speaking: {speaker}", { speaker: meeting.speaker })}</div>
                  )}
                  {screenShareActive && (
                    <div className={styles.screenShareBadge}>
                      <FaDesktop />{" "}{tr("Screen sharing active")}</div>
                  )}
                </>
              ) : (
                <div className={styles.noMeeting}>
                  <FaTimes className={styles.noMeetingIcon} />
                  <strong>{tr("No active meeting")}</strong>
                  <span>{tr("No meeting to day")}</span>
                </div>
              )}
            </div>

            <div className={styles.controls}>
              {isHost ? (
                meeting.active ? (
                  <>
                    <button className={styles.endBtn} onClick={endMeeting}>
                      <FaStop />{" "}{tr("End Meeting")}</button>
                    {meeting.speaker && meeting.speaker !== username && (
                      <button className={styles.stopLiveBtn} onClick={stopLive}>
                        <FaStop />{" "}{tr("Stop Live")}</button>
                    )}
                  </>
                ) : (
                  <button className={styles.launchBtn} onClick={launchMeeting}>
                    <FaVideo />{" "}{tr("Launch Meeting")}</button>
                )
              ) : meeting.active ? (
                <>
                  {!showChat ? (
                    <button className={styles.joinBtn} onClick={joinMeeting}>
                      <FaVideo />{" "}{tr("Join Meeting")}</button>
                  ) : (
                    <button className={styles.leaveBtn} onClick={leaveMeeting}>
                      <FaSignOutAlt />{" "}{tr("Leave")}</button>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* VIDEO GRID */}
          {meeting.active && showChat && (
            <div
              className={`${styles.videoGrid} ${
                featuredPeerId ? styles.featuredLayout : ""
              } ${screenShareActive ? styles.screenShareActive : ""}`}
            >
              {/* Local video */}
              <div
                className={`${styles.videoItem} ${
                  featuredPeerId === "local" ? styles.featured : ""
                }`}
                onClick={() => isHost && toggleFeatured("local")}
                style={{ cursor: isHost ? "pointer" : "default" }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={styles.localVideo}
                />
                <div className={styles.videoLabel}>{tr("You")}{" "}{isHost && tr("(Host)")}
                  {screenShareActive && " 🖥️"}
                  {featuredPeerId === "local" && " ★"}
                </div>
                {!isCameraOn && (
                  <div className={styles.cameraOffOverlay}>
                    <FaCameraRetro className={styles.cameraOffIcon} />
                    <span>{tr("Camera off")}</span>
                  </div>
                )}
                <div className={styles.videoControls}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCamera();
                    }}
                    title={isCameraOn ? tr("Turn off camera") : tr("Turn on camera")}
                  >
                    <FaCamera />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMic();
                    }}
                    title={isMicOn ? tr("Mute mic") : tr("Unmute mic")}
                  >
                    {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                  </button>
                </div>
              </div>

              {/* Remote videos */}
              {Object.entries(remoteStreamsRef.current).map(([peerId, stream]) => {
                const displayName = peerUsernames[peerId] || peerId.slice(0, 6);
                const isFeatured = featuredPeerId === peerId;
                const isSpeaker = meeting.speaker === displayName;
                const hasPerm = meeting.micPermissions?.includes(displayName) || false;

                return (
                  <div
                    key={peerId}
                    className={`${styles.videoItem} ${
                      isFeatured ? styles.featured : ""
                    }`}
                    onClick={() => isHost && toggleFeatured(peerId)}
                    style={{ cursor: isHost ? "pointer" : "default" }}
                  >
                    <video
                      ref={(el) => {
                        if (el) {
                          el.srcObject = stream;
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      className={styles.remoteVideo}
                    />
                    <div className={styles.videoLabel}>
                      {displayName}
                      {isSpeaker && " 🎤"}
                      {isFeatured && " ★"}
                    </div>
                    {isHost && (
                      <div className={styles.videoControls}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasPerm) {
                              removeMicrophone(displayName);
                            } else {
                              allowMicrophone(displayName);
                            }
                          }}
                          title={hasPerm ? tr("Mute mic") : tr("Allow mic")}
                        >
                          {hasPerm ? <FaMicrophone /> : <FaMicrophoneSlash />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFeatured(peerId);
                          }}
                          title={tr("Toggle featured")}
                        >
                          {isFeatured ? <FaCompress /> : <FaExpand />}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* CHAT SECTION */}
          {showChat && meeting.active && (
            <section className={styles.chatSection}>
              <div className={styles.chatHeader}>
                <div className={styles.chatHeaderLeft}>
                  <FaComments className={styles.chatIcon} />
                  <h2>{tr("Chat")}</h2>
                </div>
                <select
                  className={styles.privateSelect}
                  value={privateUser}
                  onChange={(e) => setPrivateUser(e.target.value)}
                >
                  <option value="">{tr("🌐 Public")}</option>
                  {users
                    .filter((u) => u !== username)
                    .map((u) => (
                      <option key={u} value={u}>
                        🔒 {u}
                      </option>
                    ))}
                </select>
              </div>

              <div className={styles.messages}>
                {messages.length === 0 && (
                  <div className={styles.emptyChat}>
                    <FaComments className={styles.emptyChatIcon} />
                    <p>{tr("No messages yet. Start the conversation!")}</p>
                  </div>
                )}
                {messages.map((m) => {
                  if (
                    m.type === "private" &&
                    m.to !== username &&
                    m.username !== username
                  )
                    return null;
                  return (
                    <div
                      key={m.id}
                      className={`${styles.msg} ${
                        m.username === username ? styles.myMsg : ""
                      } ${m.type === "system" ? styles.systemMsg : ""}`}
                    >
                      <div className={styles.msgMeta}>
                        <span className={styles.msgUser}>
                          {m.username === "system" ? tr("📢 System") : m.username}
                        </span>
                        {m.type === "private" && (
                          <span className={styles.privateBadge}>{tr("🔒 Private")}</span>
                        )}
                      </div>
                      <div className={styles.msgBody}>
                        {m.text}
                        {m.image && (
                          <img src={m.image} className={styles.msgImage} />
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
                {typingUsers.length > 0 && (
                  <div className={styles.typing}>
                    {typingUsers.join(", ")}{" "}{tr("typing...")}</div>
                )}
              </div>

              <form className={styles.inputRow} onSubmit={sendMessage}>
                <input
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder={tr("Type a message...")}
                  className={styles.chatInput}
                />
                <label className={styles.imageLabel}>
                  <FaImage />
                  <input
                    type="file"
                    onChange={handleImageUpload}
                    accept="image/*"
                  />
                </label>
                {imagePreview && (
                  <div className={styles.imagePreview}>
                    <img src={imagePreview} alt={tr("Preview")} />
                    <button
                      onClick={() => {
                        setImageBase64(null);
                        setImagePreview(null);
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}
                <button className={styles.sendBtn} type="submit">
                  <FaPaperPlane />
                </button>
              </form>

              {/* RAISE HAND */}
              {!isHost && (
                <div className={styles.raiseHandContainer}>
                  <button
                    className={
                      handRaised ? styles.lowerHandBtn : styles.raiseHandBtn
                    }
                    onClick={handRaised ? lowerHand : raiseHand}
                    disabled={!meeting.active}
                  >
                    <FaHandPaper />{" "}
                    {handRaised ? tr("Lower Hand") : tr("Raise Hand")}
                  </button>
                </div>
              )}

              {/* HOST: RAISED HANDS */}
              {isHost && raisedHands.length > 0 && (
                <div className={styles.raisedHandsList}>
                  <h4>{tr("🙋 Raised Hands ({length})", { length: raisedHands.length })}</h4>
                  {raisedHands.map((h) => (
                    <div key={h.id} className={styles.handItem}>
                      <span>{h.username}</span>
                      <button onClick={() => makeLive(h.username)}>{tr("🎤 Make Live")}</button>
                      <button onClick={() => allowMicrophone(h.username)}>{tr("🎤 Allow Mic")}</button>
                    </div>
                  ))}
                </div>
              )}

              {/* HOST: ACTIVE MIC PERMISSIONS */}
              {isHost && meeting.micPermissions?.length > 0 && (
                <div className={styles.micPermissionsList}>
                  <h4>{tr("🎤 Active Mic Permissions")}</h4>
                  {meeting.micPermissions.map((user) => (
                    <div key={user} className={styles.micPermItem}>
                      <span>{user}</span>
                      <button
                        className={styles.micRemoveBtn}
                        onClick={() => removeMicrophone(user)}
                      >{tr("🔇 Remove")}</button>
                    </div>
                  ))}
                </div>
              )}

              {/* NON-HOST MIC STATUS */}
              {!isHost && (
                <div className={styles.micStatus}>
                  {hasMicPermission || amISpeaker ? (
                    <span className={styles.micAllowed}>{tr("🎤 Microphone is allowed by host")}{" "}{amISpeaker && tr("(Speaking)")}
                    </span>
                  ) : (
                    <span className={styles.micDenied}>{tr("🔇 Microphone is muted (ask host for permission)")}</span>
                  )}
                </div>
              )}

              {/* HOST: SCREEN SHARE BUTTON */}
              {isHost && (
                <div className={styles.screenShareContainer}>
                  {!screenShareActive ? (
                    <button
                      className={styles.screenShareBtnBig}
                      onClick={startScreenShare}
                    >
                      <FaDesktop />{" "}{tr("Share Screen")}</button>
                  ) : (
                    <button
                      className={styles.stopShareBtnBig}
                      onClick={() => stopScreenShare(false)}
                    >
                      <FaStop />{" "}{tr("Stop Sharing")}</button>
                  )}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </>
  );
}

// -----------------------------------------------------------------
// SSR
// -----------------------------------------------------------------
export async function getServerSideProps(context) {
  const { req } = context;
  const userData = getUserFromCookie(req.headers.cookie || "");
  if (!userData) {
    return { redirect: { destination: "/login", permanent: false } };
  }
  const username = userData.username;
  const email = userData.email || "";
  if (!username) {
    return { redirect: { destination: "/login", permanent: false } };
  }
  return {
    props: {
      initialUsername: username,
      initialUserData: { email, username },
    },
  };
}
