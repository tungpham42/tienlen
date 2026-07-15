// src/App.tsx
import React, { useState, useEffect } from "react";
import { Layout, Space, Typography, message, Avatar, Badge } from "antd";
import {
  PlayCircleOutlined,
  StepForwardOutlined,
  UserOutlined,
  RobotOutlined,
  SyncOutlined,
  HeartOutlined,
} from "@ant-design/icons";
import axios from "axios";
import {
  Card as GameCard,
  generateDeck,
  shuffleDeck,
  dealCards,
  canPlayCards,
  suggestMove,
} from "./game/logic";
import "./App.css";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const PLAYER_NAMES = ["Tôi (Người)", "Máy 1", "Máy 2", "Máy 3"];

const SUIT_SVGS = {
  Bích: "M12 2c0 0-7 6.46-7 11.5 0 2.48 2.02 4.5 4.5 4.5 1.55 0 2.92-.79 3.71-2h1.58c.79 1.21 2.16 2 3.71 2 2.48 0 4.5-2.02 4.5-4.5C19 8.46 12 2 12 2zm0 18v4h-2v-4h2z",
  Chuồn:
    "M12 2c-1.66 0-3 1.34-3 3 0 1.31.84 2.41 2 2.83v1.34C8.65 9.87 7 11.75 7 14c0 2.21 1.79 4 4 4h1v3h-3v2h6v-2h-3v-3h1c2.21 0 4-1.79 4-4 0-2.25-1.65-4.13-4-4.83V7.83c1.16-.42 2-1.52 2-2.83 0-1.66-1.34-3-3-3z",
  Rô: "M12 2L22 12L12 22L2 12L12 2z",
  Cơ: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
};

const getSuitColor = (suit: string) =>
  suit === "Cơ" || suit === "Rô" ? "#E94F37" : "#2B2D42";

// --- ENGINE ÂM THANH ---
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
};

const playSound = (
  type: "select" | "play" | "pass" | "win" | "error" | "start",
) => {
  const ctx = initAudio();
  const t = ctx.currentTime;

  const playOsc = (
    type: OscillatorType,
    freq: number,
    freqEnd: number | null,
    vol: number,
    start: number,
    duration: number,
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, start + duration);
    }

    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.start(start);
    osc.stop(start + duration);
  };

  switch (type) {
    case "select":
      playOsc("sine", 800, null, 0.05, t, 0.1);
      break;
    case "play":
      playOsc("triangle", 400, 800, 0.08, t, 0.15);
      break;
    case "pass":
      playOsc("square", 200, 100, 0.03, t, 0.2);
      break;
    case "error":
      playOsc("sawtooth", 150, 100, 0.05, t, 0.3);
      break;
    case "start":
      for (let i = 0; i < 5; i++) {
        playOsc("sine", 600 + i * 50, null, 0.05, t + i * 0.05, 0.05);
      }
      break;
    case "win":
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, i) => {
        playOsc("sine", freq, null, 0.08, t + i * 0.1, 0.3);
      });
      break;
  }
};

const CourtGraphic: React.FC<{
  card: GameCard;
  color: string;
  suitSvg: string;
}> = ({ card, color, suitSvg }) => {
  const groupId = `court-${card.id}`;
  const rank = card.rank;

  const cGold = "#DAA520";
  const cBlue = "#4682B4";
  const cRed = "#B22222";
  const cSkin = "#FAD6B1";
  const cHair = "#555555";
  const cWhite = "#FFFFFF";
  const cOutline = color;

  const renderArtwork = () => {
    switch (rank) {
      case "K":
        return (
          <g stroke={cOutline} strokeWidth="1" strokeLinejoin="round">
            <path
              d="M25 70 C25 45 40 40 50 40 C60 40 75 45 75 70 Z"
              fill={cRed}
            />
            <path d="M35 70 V50 C35 50 50 55 65 50 V70 Z" fill={cBlue} />
            <path
              d="M35 50 C45 55 55 55 65 50 C60 40 40 40 35 50 Z"
              fill={cWhite}
            />
            <circle cx="42" cy="48" r="0.8" fill={cOutline} />
            <circle cx="50" cy="50" r="0.8" fill={cOutline} />
            <circle cx="58" cy="48" r="0.8" fill={cOutline} />
            <rect x="68" y="25" width="4" height="45" fill={cWhite} />
            <rect x="62" y="42" width="16" height="4" fill={cGold} />
            <circle cx="70" cy="22" r="3" fill={cGold} />
            <path
              d="M35 40 C30 25 40 15 50 15 C60 15 70 25 65 40 Z"
              fill={cHair}
            />
            <path
              d="M38 35 C38 50 50 60 50 60 C50 60 62 50 62 35 Z"
              fill={cHair}
            />
            <path d="M42 25 V45 C42 45 50 50 58 45 V25 Z" fill={cSkin} />
            <path
              d="M45 32 Q47 30 48 32 M55 32 Q53 30 52 32"
              fill="none"
              strokeWidth="1.5"
            />
            <path d="M46 40 Q50 38 54 40" fill="none" strokeWidth="1.5" />
            <path
              d="M37 25 L35 8 L42 16 L50 6 L58 16 L65 8 L63 25 Z"
              fill={cGold}
            />
            <circle cx="35" cy="8" r="1.5" fill={cRed} />
            <circle cx="50" cy="6" r="1.5" fill={cBlue} />
            <circle cx="65" cy="8" r="1.5" fill={cRed} />
          </g>
        );
      case "Q":
        return (
          <g stroke={cOutline} strokeWidth="1" strokeLinejoin="round">
            <path d="M25 70 C30 40 70 40 75 70 Z" fill={cBlue} />
            <path d="M35 70 C40 50 60 50 65 70 Z" fill={cGold} />
            <path d="M28 45 V70" fill="none" stroke={cSkin} strokeWidth="2" />
            <circle cx="28" cy="40" r="5" fill={cRed} />
            <path d="M28 40 C32 35 32 45 28 40" fill="none" strokeWidth="0.5" />
            <path
              d="M35 45 C30 20 40 10 50 10 C60 10 70 20 65 45 L68 70 H32 Z"
              fill={cWhite}
            />
            <path
              d="M38 20 C38 45 35 55 35 55 H65 C65 55 62 45 62 20 Z"
              fill={cHair}
            />
            <path d="M43 25 V45 C43 45 50 52 57 45 V25 Z" fill={cSkin} />
            <path
              d="M46 32 Q48 30 49 32 M54 32 Q52 30 51 32"
              fill="none"
              strokeWidth="1"
            />
            <path
              d="M48 42 Q50 44 52 42"
              fill="none"
              strokeWidth="1"
              stroke={cRed}
            />
            <path
              d="M40 25 C40 15 50 12 50 12 C50 12 60 15 60 25 Z"
              fill={cGold}
            />
            <path
              d="M42 20 L50 15 L58 20"
              fill="none"
              stroke={cRed}
              strokeWidth="1.5"
            />
            <circle cx="50" cy="12" r="1.5" fill={cBlue} />
            <path
              d="M45 48 C48 51 52 51 55 48"
              fill="none"
              stroke={cGold}
              strokeWidth="2"
            />
          </g>
        );
      case "J":
        return (
          <g stroke={cOutline} strokeWidth="1" strokeLinejoin="round">
            <path d="M30 70 L35 45 H65 L70 70 Z" fill={cRed} />
            <path d="M40 70 V50 H60 V70 Z" fill={cGold} />
            <rect x="25" y="15" width="3" height="55" fill={cSkin} />
            <path d="M28 25 C35 25 35 40 28 40 Z" fill={cWhite} />
            <path d="M25 28 L20 32 L25 36 Z" fill={cWhite} />
            <path
              d="M38 45 C35 30 35 20 50 20 C65 20 65 30 62 45 Z"
              fill={cHair}
            />
            <path d="M43 30 V45 L50 50 L57 45 V30 Z" fill={cSkin} />
            <path
              d="M46 35 Q48 33 49 35 M54 35 Q52 33 51 35"
              fill="none"
              strokeWidth="1.5"
            />
            <path d="M48 44 H52" fill="none" strokeWidth="1.5" />
            <path d="M38 30 C45 15 55 15 62 30 L50 25 Z" fill={cBlue} />
            <path
              d="M38 30 C42 26 58 26 62 30"
              fill="none"
              stroke={cGold}
              strokeWidth="2"
            />
            <path
              d="M35 28 C25 15 35 5 45 18 C35 18 30 22 35 28 Z"
              fill={cWhite}
            />
            <path
              d="M35 18 L40 22"
              fill="none"
              stroke={cOutline}
              strokeWidth="0.5"
            />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <svg
      viewBox="0 0 100 140"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    >
      <defs>
        <g id={groupId}>
          <rect x="20" y="15" width="60" height="55" fill="#fdfBF7" />
          <clipPath id={`clip-${groupId}`}>
            <rect x="20" y="15" width="60" height="55" />
          </clipPath>
          <g clipPath={`url(#clip-${groupId})`}>{renderArtwork()}</g>
          <rect
            x="20"
            y="15"
            width="60"
            height="55"
            fill="none"
            stroke={cOutline}
            strokeWidth="1.5"
          />
          <rect
            x="22"
            y="17"
            width="56"
            height="51"
            fill="none"
            stroke={cOutline}
            strokeWidth="0.5"
          />
          <g transform="translate(25, 20) scale(0.4)">
            <path d={suitSvg} fill={cOutline} />
          </g>
          <g transform="translate(63, 20) scale(0.4)">
            <path d={suitSvg} fill={cOutline} />
          </g>
        </g>
      </defs>
      <use href={`#${groupId}`} />
      <use href={`#${groupId}`} transform="rotate(180 50 70)" />
    </svg>
  );
};

const PlayingCard: React.FC<{
  card: GameCard;
  isHidden?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}> = ({ card, isHidden = false, isSelected = false, onClick, style }) => {
  const color = getSuitColor(card.suit);

  return (
    <div
      onClick={onClick}
      className="playing-card"
      style={{
        background: isHidden
          ? "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)"
          : "#FFFFFF",
        boxShadow: isSelected
          ? "0 0 20px rgba(255, 215, 0, 0.8), 0 10px 20px rgba(0,0,0,0.4)"
          : "0 2px 6px rgba(0,0,0,0.2)",
        border: isSelected ? "2px solid #FFD700" : "1px solid rgba(0,0,0,0.1)",
        transform: isSelected
          ? "translateY(var(--card-lift)) scale(1.05)"
          : "translateY(0) scale(1)",
        transformOrigin: "bottom center",
        transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
        cursor: isHidden ? "default" : "pointer",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        userSelect: "none",
        ...style,
      }}
    >
      {isHidden ? (
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="card-back"
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
              />
              <circle cx="8" cy="8" r="2" fill="rgba(255,255,255,0.4)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#card-back)" />
          <rect
            x="6%"
            y="5%"
            width="88%"
            height="90%"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1"
            rx="4"
          />
        </svg>
      ) : (
        <>
          <div className="card-corner card-corner-top" style={{ color }}>
            <div className="card-rank">{card.rank}</div>
            <svg className="card-suit-small" viewBox="0 0 24 24" fill={color}>
              <path d={SUIT_SVGS[card.suit]} />
            </svg>
          </div>

          {["J", "Q", "K"].includes(card.rank) ? (
            <CourtGraphic
              card={card}
              color={color}
              suitSvg={SUIT_SVGS[card.suit]}
            />
          ) : (
            <>
              <div
                style={{
                  opacity: 0.1,
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <svg
                  className="card-suit-large"
                  viewBox="0 0 24 24"
                  fill={color}
                >
                  <path d={SUIT_SVGS[card.suit]} />
                </svg>
              </div>
              <div className="card-rank-center" style={{ color }}>
                {card.rank}
              </div>
            </>
          )}

          <div className="card-corner card-corner-bottom" style={{ color }}>
            <div className="card-rank">{card.rank}</div>
            <svg className="card-suit-small" viewBox="0 0 24 24" fill={color}>
              <path d={SUIT_SVGS[card.suit]} />
            </svg>
          </div>
        </>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [hands, setHands] = useState<GameCard[][]>([[], [], [], []]);
  const [tableCards, setTableCards] = useState<GameCard[]>([]);
  const [currentTurn, setCurrentTurn] = useState<number>(-1);
  const [lastWinner, setLastWinner] = useState<number>(-1);
  const [selectedCards, setSelectedCards] = useState<GameCard[]>([]);
  const [passedInRound, setPassedInRound] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);

  const startGame = async () => {
    playSound("start");
    const deck = shuffleDeck(generateDeck());
    const newHands = dealCards(deck);
    setHands(newHands);
    setTableCards([]);
    setCurrentTurn(0);
    setLastWinner(-1);
    setSelectedCards([]);
    setPassedInRound([false, false, false, false]);
    message.success("Ván mới bắt đầu!");

    try {
      await axios.get("https://jsonplaceholder.typicode.com/posts/1");
    } catch (error) {}
  };

  const handleRoundEnd = (winnerIdx: number, currentHands: GameCard[][]) => {
    setTableCards([]);
    setPassedInRound([false, false, false, false]);

    if (currentHands[winnerIdx].length > 0) {
      setCurrentTurn(winnerIdx);
    } else {
      let nextStart = -1;
      for (let i = 1; i < 4; i++) {
        const checkIdx = (winnerIdx + i) % 4;
        if (currentHands[checkIdx].length > 0) {
          nextStart = checkIdx;
          break;
        }
      }

      if (nextStart !== -1) {
        setCurrentTurn(nextStart);
        message.success(
          `Hưởng sái! ${PLAYER_NAMES[nextStart]} giành quyền đánh vòng mới.`,
        );
      } else {
        setCurrentTurn(-1);
      }
    }
  };

  const playCards = (playerIndex: number, cardsToPlay: GameCard[]) => {
    if (!canPlayCards(cardsToPlay, tableCards)) {
      playSound("error");
      message.error("Bài không hợp lệ!");
      return;
    }
    setTableCards(cardsToPlay);
    const newHands = [...hands];
    newHands[playerIndex] = newHands[playerIndex].filter(
      (c) => !cardsToPlay.find((played) => played.id === c.id),
    );
    setHands(newHands);
    setSelectedCards([]);
    setLastWinner(playerIndex);

    if (newHands[playerIndex].length === 0) {
      playSound("win");
      message.success(`${PLAYER_NAMES[playerIndex]} đã hết bài!`);

      const activeCount = newHands.filter((h) => h.length > 0).length;
      if (activeCount <= 1) {
        message.success("Ván đấu kết thúc!");
        setCurrentTurn(-1);
        return;
      }
    } else {
      playSound("play");
    }

    let next = -1;
    for (let i = 1; i < 4; i++) {
      const checkIdx = (playerIndex + i) % 4;
      if (newHands[checkIdx].length > 0 && !passedInRound[checkIdx]) {
        next = checkIdx;
        break;
      }
    }

    if (next === -1 || next === playerIndex) {
      handleRoundEnd(playerIndex, newHands);
    } else {
      setCurrentTurn(next);
    }
  };

  const passTurn = (playerIndex: number) => {
    playSound("pass");
    const newPassed = [...passedInRound];
    newPassed[playerIndex] = true;
    setPassedInRound(newPassed);

    let next = -1;
    for (let i = 1; i < 4; i++) {
      const checkIdx = (playerIndex + i) % 4;
      if (hands[checkIdx].length > 0 && !newPassed[checkIdx]) {
        next = checkIdx;
        break;
      }
    }

    if (next === -1 || next === lastWinner) {
      handleRoundEnd(lastWinner, hands);
    } else {
      setCurrentTurn(next);
    }
  };

  useEffect(() => {
    if (currentTurn > 0 && currentTurn <= 3) {
      const aiHand = hands[currentTurn];
      if (aiHand.length === 0) return;

      const timer = setTimeout(() => {
        const bestMove = suggestMove(aiHand, tableCards);

        if (bestMove) {
          playCards(currentTurn, bestMove);
        } else {
          passTurn(currentTurn);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, tableCards, hands, passedInRound, lastWinner]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCardSelection = (card: GameCard) => {
    if (currentTurn !== 0) return;
    playSound("select");
    const isSelected = selectedCards.find((c) => c.id === card.id);
    if (isSelected) {
      setSelectedCards(selectedCards.filter((c) => c.id !== card.id));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  const PlayerArea = ({
    index,
    isVertical,
  }: {
    index: number;
    isVertical: boolean;
  }) => {
    const isActive = currentTurn === index;
    const isPassed = passedInRound[index];
    const isFinished = hands[index].length === 0 && currentTurn !== -1;

    return (
      <div
        className={`bot-area ${isVertical ? "bot-area-vertical" : "bot-area-horizontal"} ${isActive ? "active-turn" : ""}`}
        style={{
          opacity: isPassed ? 0.4 : 1,
        }}
      >
        <Badge count={hands[index].length} showZero>
          <Avatar
            className={`bot-avatar ${isActive ? "active-avatar" : ""}`}
            icon={<RobotOutlined />}
            style={{
              backgroundColor: isActive ? "#b30000" : "#1a1a1a",
            }}
          />
        </Badge>
        <div className="bot-name">
          {isFinished ? (
            <span style={{ color: "#ffd700" }}>🏆 Về Đích</span>
          ) : (
            PLAYER_NAMES[index]
          )}
          {isPassed && !isFinished && (
            <span
              style={{ color: "#ff4d4f", display: "block", fontSize: "10px" }}
            >
              Bỏ vòng
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: isVertical ? "column" : "row",
            marginTop: 4,
          }}
        >
          {hands[index].map((card, i) => (
            <div
              key={card.id}
              style={{
                marginTop: isVertical && i > 0 ? "var(--bot-shift-y)" : 0,
                marginLeft: !isVertical && i > 0 ? "var(--bot-shift-x)" : 0,
                zIndex: i,
              }}
            >
              <PlayingCard card={card} isHidden={true} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const isPlayReady = currentTurn === 0 && selectedCards.length > 0;
  const isStartReady = currentTurn === -1;
  const isPlayerPassed = passedInRound[0];
  const isPlayerFinished = hands[0].length === 0 && currentTurn !== -1;

  return (
    <Layout className="game-layout">
      <Header
        style={{
          background: "transparent",
          textAlign: "center",
          height: "auto",
          padding: "clamp(5px, 2vh, 15px) 10px 0",
        }}
      >
        <Title
          level={4}
          style={{
            color: "#d4af37",
            margin: 0,
            textShadow: "0 2px 5px rgba(0,0,0,0.8)",
            fontWeight: 900,
            letterSpacing: "2px",
          }}
        >
          TIẾN LÊN MIỀN NAM
        </Title>
      </Header>

      <Content
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          flex: 1,
          position: "relative",
          justifyContent: "space-between",
          minHeight: 0,
        }}
      >
        <PlayerArea index={2} isVertical={false} />

        <div className="center-arena">
          <PlayerArea index={1} isVertical={true} />

          <div className="table-zone">
            {tableCards.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {tableCards.map((card, idx) => (
                  <div
                    key={card.id}
                    style={{
                      marginLeft:
                        idx === 0 ? 0 : "calc(var(--player-shift-x) * 0.75)",
                      zIndex: idx,
                      transform: `rotate(${Math.random() * 8 - 4}deg)`,
                    }}
                  >
                    <PlayingCard card={card} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <PlayerArea index={3} isVertical={true} />
        </div>

        {/* Khu vực Người chơi */}
        <div
          className="player-dashboard-area"
          style={{
            opacity: isPlayerPassed ? 0.4 : 1,
            transition: "opacity 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
              marginBottom: 0,
            }}
          >
            <Avatar
              className={`bot-avatar ${currentTurn === 0 ? "active-avatar" : ""}`}
              icon={<UserOutlined />}
              style={{
                backgroundColor: currentTurn === 0 ? "#b30000" : "#1a1a1a",
                transition: "all 0.3s",
              }}
            />
            <Text
              style={{
                color: "#d4af37",
                margin: 0,
                fontWeight: 800,
                fontSize: "clamp(14px, 2vh, 18px)",
                textShadow: "1px 1px 3px #000",
                background: "rgba(0,0,0,0.4)",
                padding: "2px 10px",
                borderRadius: "10px",
              }}
            >
              {isPlayerFinished ? "🏆 Đã Về Đích" : PLAYER_NAMES[0]}
              {isPlayerPassed && !isPlayerFinished && (
                <span style={{ color: "#ff4d4f", marginLeft: 8 }}>
                  {" "}
                  (Bỏ vòng)
                </span>
              )}
            </Text>
          </div>

          <div className="hand-container">
            {hands[0].map((card, idx) => {
              const isSelected = !!selectedCards.find((c) => c.id === card.id);
              let prevSelected = false;

              if (idx > 0) {
                prevSelected = !!selectedCards.find(
                  (c) => c.id === hands[0][idx - 1].id,
                );
              }

              let ml = idx === 0 ? "0px" : "var(--player-shift-x)";
              if (idx > 0) {
                if (isSelected && !prevSelected) {
                  ml = "calc(var(--player-shift-x) + 12px)";
                } else if (!isSelected && prevSelected) {
                  ml = "calc(var(--player-shift-x) + 24px)";
                }
              }

              return (
                <PlayingCard
                  key={card.id}
                  card={card}
                  isSelected={isSelected}
                  onClick={() => toggleCardSelection(card)}
                  style={{
                    marginLeft: ml,
                    zIndex: isSelected ? 100 + idx : idx,
                  }}
                />
              );
            })}
          </div>

          <Space
            wrap
            align="center"
            size="middle"
            style={{ width: "100%", justifyContent: "center", marginTop: 5 }}
          >
            <button
              className={`btn-action btn-play ${isPlayReady ? "is-ready" : ""}`}
              onClick={() => playCards(0, selectedCards)}
              disabled={currentTurn !== 0 || selectedCards.length === 0}
            >
              <PlayCircleOutlined /> ĐÁNH
            </button>
            <button
              className="btn-action btn-pass"
              onClick={() => passTurn(0)}
              disabled={currentTurn !== 0 || tableCards.length === 0}
            >
              <StepForwardOutlined /> BỎ QUA
            </button>
            <button
              className={`btn-action btn-start ${isStartReady ? "is-ready" : ""}`}
              onClick={startGame}
            >
              <SyncOutlined /> {currentTurn === -1 ? "BẮT ĐẦU" : "CHƠI LẠI"}
            </button>
          </Space>
        </div>
      </Content>

      <Footer
        style={{
          textAlign: "center",
          background: "transparent",
          color: "rgba(212, 175, 55, 0.6)",
          padding: "4px",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "1px",
        }}
      >
        MADE WITH <HeartOutlined style={{ color: "#E94F37" }} /> BY TUNG PHAM
      </Footer>
    </Layout>
  );
};

export default App;
