import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { playSound } from "../../utils/playSound";
import "./start.css";

export default function Start({
  title = "DICE WAR",
  manifestUrl = "/resource-manifest.json",
  minShowMs = 1200,
  onDone,
}) {
  const nav = useNavigate();

  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("intro");
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [error, setError] = useState(null);

  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [fastComplete, setFastComplete] = useState(false);

  // ⏳ Intro → Loading
  useEffect(() => {
    const t = setTimeout(() => setPhase("loading"), 2000);
    return () => clearTimeout(t);
  }, []);

  // 🌐 Online/offline monitoring
  useEffect(() => {
    const onOff = () => setOffline(true);
    const onOn = () => setOffline(false);
    window.addEventListener("offline", onOff);
    window.addEventListener("online", onOn);
    return () => {
      window.removeEventListener("offline", onOff);
      window.removeEventListener("online", onOn);
    };
  }, []);

  // 📦 Manifest yuklash
  useEffect(() => {
    if (phase !== "loading") return;
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(manifestUrl);
        const files = await res.json();

        // HEAD orqali hajm olish
        const sizes = await Promise.all(
          files.map(async (url) => {
            try {
              const r = await fetch(url, { method: "HEAD" });
              const len = r.headers.get("content-length");
              return len ? parseInt(len, 10) : 0;
            } catch {
              return 0;
            }
          })
        );

        const total = sizes.reduce((a, b) => a + b, 0);
        setTotalBytes(total);
        if (total < 200_000) setFastComplete(true);

        let loaded = 0;
        for (let url of files) {
          const r = await fetch(url);
          const reader = r.body?.getReader();
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              loaded += value.length;
              setLoadedBytes(loaded);
              if (total > 0)
                setProgress(Math.min(100, (loaded / total) * 100));
              await new Promise(requestAnimationFrame);
            }
          } else {
            const buf = await r.arrayBuffer();
            loaded += buf.byteLength;
            setLoadedBytes(loaded);
            if (total > 0)
              setProgress(Math.min(100, (loaded / total) * 100));
            await new Promise(requestAnimationFrame);
          }
        }

        setProgress(100);
        if (!cancelled) {
          setPhase("ready");
          playSound("success.mp3");
          onDone && onDone();
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Yuklashda xatolik yuz berdi.");
          playSound("error.mp3");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [phase, manifestUrl, onDone]);

  const percent = useMemo(() => Math.min(100, Math.round(progress)), [progress]);
  const mbLoaded = (loadedBytes / (1024 * 1024)).toFixed(2);
  const mbTotal =
    totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(2) : null;

  const goNext = () => {
    playSound("click.mp3");
    nav("/login");
  };

  // 💡 Skip (majburiy o'tkazish) tugmasi
  const continueAnyway = () => {
    playSound("click.mp3");
    nav("/login"); // sahifaga o'tadi, ammo yuklash davom etadi
  };

  return (
    <div className="start-wrap">
      {phase === "intro" && (
        <div className="intro-screen">
          <h1 className="intro-title">{title}</h1>
        </div>
      )}

      {phase !== "intro" && (
        <>
          <video className="bg-video" autoPlay muted loop playsInline>
            <source src="/LiveBg/Download-page.mp4" type="video/mp4" />
          </video>

          <div className="loading-ui" role="status" aria-live="polite">
            <div className="brand">
              {title}
              <div className="brand-fill" style={{ width: `${percent}%` }}>
                {title}
              </div>
            </div>

            <div className="nums">
              <span>
                {fastComplete && percent === 100
                  ? "All resources downloaded"
                  : "Loading"}
              </span>
              <b>{percent}%</b>
            </div>
            <div className="hint">
              {offline
                ? "Internet uzildi — yuklash vaqtincha to‘xtatildi."
                : mbTotal
                ? `${mbLoaded} MB / ${mbTotal} MB`
                : `${mbLoaded} MB`}
            </div>

            <div className="bar">
              <div
                className={`bar-fill ${
                  fastComplete && percent === 100 ? "entering" : ""
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>

            {error && <div className="alert">⚠️ {error}</div>}

            <button
              className="btn"
              disabled={phase !== "ready" || offline}
              onClick={goNext}
            >
              {fastComplete ? "Entering…" : "Next"}
            </button>

            {/* 🌟 Majburiy o'tkazish tugmasi */}
            <button className="skip-btn" onClick={continueAnyway}>
              Skip → Continue
            </button>
          </div>
        </>
      )}
    </div>
  );
}
