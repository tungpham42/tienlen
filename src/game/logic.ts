// src/game/logic.ts

export type Suit = "Bích" | "Chuồn" | "Rô" | "Cơ";
export type Rank =
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A"
  | "2";

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
  rankValue: number;
  suitValue: number;
  absoluteValue: number;
}

export const SUITS: Suit[] = ["Bích", "Chuồn", "Rô", "Cơ"];
export const RANKS: Rank[] = [
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
  "2",
];

// Khởi tạo bộ bài 52 lá
export const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  RANKS.forEach((rank, rankIndex) => {
    SUITS.forEach((suit, suitIndex) => {
      deck.push({
        id: `${rank}-${suit}`,
        rank,
        suit,
        rankValue: rankIndex + 3,
        suitValue: suitIndex + 1,
        absoluteValue: (rankIndex + 3) * 10 + (suitIndex + 1),
      });
    });
  });
  return deck;
};

// Trộn bài
export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// Chia bài
export const dealCards = (deck: Card[]): Card[][] => {
  const hands: Card[][] = [[], [], [], []];
  deck.forEach((card, index) => {
    hands[index % 4].push(card);
  });
  hands.forEach((hand) =>
    hand.sort((a, b) => a.absoluteValue - b.absoluteValue),
  );
  return hands;
};

type CombinationType =
  | "INVALID"
  | "SINGLE"
  | "PAIR"
  | "TRIPLE"
  | "QUAD"
  | "STRAIGHT"
  | "PAIRS_SEQ";

export interface Combination {
  type: CombinationType;
  highestCard: Card | null;
  count: number;
}

// Nhận dạng tổ hợp bài
export const getCombination = (cards: Card[]): Combination => {
  const n = cards.length;
  if (n === 0) return { type: "INVALID", highestCard: null, count: 0 };

  const sorted = [...cards].sort((a, b) => a.absoluteValue - b.absoluteValue);
  const highestCard = sorted[n - 1];

  if (n === 1) return { type: "SINGLE", highestCard, count: 1 };

  if (n === 2) {
    if (sorted[0].rankValue === sorted[1].rankValue) {
      return { type: "PAIR", highestCard, count: 2 };
    }
    return { type: "INVALID", highestCard: null, count: 0 };
  }

  if (n === 3) {
    if (
      sorted[0].rankValue === sorted[1].rankValue &&
      sorted[1].rankValue === sorted[2].rankValue
    ) {
      return { type: "TRIPLE", highestCard, count: 3 };
    }
  }

  if (n === 4) {
    if (
      sorted[0].rankValue === sorted[1].rankValue &&
      sorted[1].rankValue === sorted[2].rankValue &&
      sorted[2].rankValue === sorted[3].rankValue
    ) {
      return { type: "QUAD", highestCard, count: 4 };
    }
  }

  if (n >= 3) {
    let isStraight = true;
    for (let i = 0; i < n - 1; i++) {
      if (sorted[i + 1].rankValue - sorted[i].rankValue !== 1) {
        isStraight = false;
        break;
      }
    }
    if (isStraight && highestCard.rankValue < 15) {
      return { type: "STRAIGHT", highestCard, count: n };
    }
  }

  if (n >= 6 && n % 2 === 0) {
    let isPairsSeq = true;
    for (let i = 0; i < n; i += 2) {
      if (sorted[i].rankValue !== sorted[i + 1].rankValue) {
        isPairsSeq = false;
        break;
      }
      if (i > 0 && sorted[i].rankValue - sorted[i - 2].rankValue !== 1) {
        isPairsSeq = false;
        break;
      }
    }
    if (isPairsSeq && highestCard.rankValue < 15) {
      return { type: "PAIRS_SEQ", highestCard, count: n / 2 };
    }
  }

  return { type: "INVALID", highestCard: null, count: 0 };
};

// Kiểm tra đè bài hợp lệ
export const canPlayCards = (
  selectedCards: Card[],
  currentTableCards: Card[],
): boolean => {
  const selCombo = getCombination(selectedCards);
  if (selCombo.type === "INVALID") return false;
  if (currentTableCards.length === 0) return true;

  const tblCombo = getCombination(currentTableCards);

  if (selCombo.type === tblCombo.type && selCombo.count === tblCombo.count) {
    return (
      selCombo.highestCard!.absoluteValue > tblCombo.highestCard!.absoluteValue
    );
  }

  const isTableSingleHeo =
    tblCombo.type === "SINGLE" && tblCombo.highestCard!.rankValue === 15;
  const isTablePairHeo =
    tblCombo.type === "PAIR" && tblCombo.highestCard!.rankValue === 15;

  if (isTableSingleHeo && selCombo.type === "PAIRS_SEQ" && selCombo.count === 3)
    return true;
  if (
    selCombo.type === "QUAD" &&
    (isTableSingleHeo ||
      isTablePairHeo ||
      (tblCombo.type === "PAIRS_SEQ" && tblCombo.count === 3))
  )
    return true;
  if (
    selCombo.type === "PAIRS_SEQ" &&
    selCombo.count >= 4 &&
    (isTableSingleHeo ||
      isTablePairHeo ||
      (tblCombo.type === "PAIRS_SEQ" && tblCombo.count === 3) ||
      tblCombo.type === "QUAD")
  )
    return true;

  return false;
};

// ============================================
// BỘ NÃO AI 2.0 (CHẤM ĐIỂM HEURISTIC THÔNG MINH)
// ============================================
export const suggestMove = (
  hand: Card[],
  tableCards: Card[],
): Card[] | null => {
  if (hand.length === 0) return null;
  const sortedHand = [...hand].sort(
    (a, b) => a.absoluteValue - b.absoluteValue,
  );

  // Sinh toàn bộ tổ hợp hợp lệ từ tay bài[cite: 25, 26]
  const rankMap = new Map<number, Card[]>();
  sortedHand.forEach((c) => {
    if (!rankMap.has(c.rankValue)) rankMap.set(c.rankValue, []);
    rankMap.get(c.rankValue)!.push(c);
  });

  const allCombos: Card[][] = [];

  // Rác (Singles)
  sortedHand.forEach((c) => allCombos.push([c]));

  // Đôi, Ba, Tứ Quý
  Array.from(rankMap.values()).forEach((cards) => {
    if (cards.length >= 2) {
      allCombos.push([cards[0], cards[1]]);
      if (cards.length >= 3) {
        allCombos.push([cards[0], cards[2]]);
        allCombos.push([cards[1], cards[2]]);
        allCombos.push([cards[0], cards[1], cards[2]]);
        if (cards.length === 4) {
          allCombos.push([cards[0], cards[3]]);
          allCombos.push([cards[1], cards[3]]);
          allCombos.push([cards[2], cards[3]]);
          allCombos.push([cards[0], cards[1], cards[3]]);
          allCombos.push([cards[0], cards[2], cards[3]]);
          allCombos.push([cards[1], cards[2], cards[3]]);
          allCombos.push([...cards]);
        }
      }
    }
  });

  const uniqueRanks = Array.from(rankMap.keys())
    .filter((r) => r < 15)
    .sort((a, b) => a - b);

  // Sảnh (Straights)
  for (let i = 0; i < uniqueRanks.length; i++) {
    for (let j = i + 2; j < uniqueRanks.length; j++) {
      if (uniqueRanks[j] - uniqueRanks[i] === j - i) {
        const seq = uniqueRanks.slice(i, j + 1);
        const generateStraights = (idx: number, current: Card[]) => {
          if (idx === seq.length) {
            allCombos.push([...current]);
            return;
          }
          for (const c of rankMap.get(seq[idx])!) {
            generateStraights(idx + 1, [...current, c]);
          }
        };
        generateStraights(0, []);
      }
    }
  }

  // Đôi thông (Pair Sequences)
  for (let i = 0; i < uniqueRanks.length; i++) {
    for (let j = i + 2; j < uniqueRanks.length; j++) {
      if (uniqueRanks[j] - uniqueRanks[i] === j - i) {
        let isValid = true;
        for (let k = i; k <= j; k++) {
          if (rankMap.get(uniqueRanks[k])!.length < 2) {
            isValid = false;
            break;
          }
        }
        if (isValid) {
          const seq = uniqueRanks.slice(i, j + 1);
          const generatePairSeqs = (idx: number, current: Card[]) => {
            if (idx === seq.length) {
              allCombos.push([...current]);
              return;
            }
            const cards = rankMap.get(seq[idx])!;
            const pairs = [];
            for (let a = 0; a < cards.length - 1; a++) {
              for (let b = a + 1; b < cards.length; b++) {
                pairs.push([cards[a], cards[b]]);
              }
            }
            for (const p of pairs) {
              generatePairSeqs(idx + 1, [...current, ...p]);
            }
          };
          generatePairSeqs(0, []);
        }
      }
    }
  }

  // --- TRÍ TUỆ ĐỊNH GIÁ (HEURISTIC COST) ---
  const isCardInStraight = (rankVal: number) => {
    if (rankVal >= 15) return false;
    let len = 1;
    let l = rankVal - 1;
    while (rankMap.has(l) && l < 15) {
      len++;
      l--;
    }
    let r = rankVal + 1;
    while (rankMap.has(r) && r < 15) {
      len++;
      r++;
    }
    return len >= 3;
  };

  const getCardCost = (c: Card) => {
    let cost = c.absoluteValue;
    if (c.rankValue === 15) cost += 250; // Hạn chế ra Heo bừa bãi

    const count = rankMap.get(c.rankValue)!.length;
    if (count === 2) cost += 40; // Penalty bẻ Đôi
    if (count === 3) cost += 80; // Penalty bẻ Ba
    if (count === 4) cost += 500; // Penalty xé Tứ Quý

    if (isCardInStraight(c.rankValue)) {
      cost += 50; // Penalty bẻ Sảnh
    }
    return cost;
  };

  // --- CHIẾN THUẬT KHAI CUỘC (Bàn Trống) ---
  if (tableCards.length === 0) {
    const smallestCard = sortedHand[0];
    const initiationCombos = allCombos.filter((combo) =>
      combo.some((c) => c.id === smallestCard.id),
    );

    // AI ém hàng: Không tự nhiên vác Tứ Quý/Đôi Thông ra mở màn trừ khi hết bài
    let safeCombos = initiationCombos.filter((c) => {
      const type = getCombination(c).type;
      return type !== "QUAD" && type !== "PAIRS_SEQ";
    });

    if (safeCombos.length === 0) safeCombos = initiationCombos;

    safeCombos.sort((a, b) => {
      if (a.length !== b.length) return b.length - a.length; // Tẩu tán nhiều lá nhất
      const typeVal = (c: Card[]) => {
        const t = getCombination(c).type;
        if (t === "STRAIGHT") return 4;
        if (t === "TRIPLE") return 3;
        if (t === "PAIR") return 2;
        return 1;
      };
      return typeVal(b) - typeVal(a); // Rác < Đôi < Ba < Sảnh
    });

    return safeCombos[0];
  }

  // --- CHIẾN THUẬT ĐỠ BÀI (Bàn Đang Có Bài) ---
  const validMoves = allCombos.filter((combo) =>
    canPlayCards(combo, tableCards),
  );
  if (validMoves.length === 0) return null;

  const tblCombo = getCombination(tableCards);
  const isTableSingleHeo =
    tblCombo.type === "SINGLE" && tblCombo.highestCard?.rankValue === 15;
  const isTablePairHeo =
    tblCombo.type === "PAIR" && tblCombo.highestCard?.rankValue === 15;

  const getMoveCost = (combo: Card[], cType: CombinationType) => {
    let cost = 0;
    combo.forEach((c) => {
      cost += getCardCost(c);
    });

    // Cảm tử chặt Heo: Âm điểm để đánh lừa thuật toán lập tức ưu tiên[cite: 25]
    if (isTableSingleHeo || isTablePairHeo) {
      if (cType === "PAIRS_SEQ" || cType === "QUAD") {
        return -2000 + cost;
      }
    }

    // Nếu không phải chặt heo thì cấm lãng phí Hàng
    if (cType === "QUAD") cost += 3000;
    if (cType === "PAIRS_SEQ") cost += 3000;

    return cost;
  };

  validMoves.sort((a, b) => {
    const cA = getCombination(a);
    const cB = getCombination(b);
    const costA = getMoveCost(a, cA.type);
    const costB = getMoveCost(b, cB.type);

    if (costA === costB) {
      return (
        (cA.highestCard?.absoluteValue || 0) -
        (cB.highestCard?.absoluteValue || 0)
      );
    }
    return costA - costB;
  });

  return validMoves[0]; // Chọn nước đi tốn ít "Chi phí cấu trúc" nhất
};
