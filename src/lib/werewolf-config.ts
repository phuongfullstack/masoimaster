// =============================================================
// Ma Sói — Role Definitions, Presets & Balance Analyzer
// =============================================================

export interface Role {
  id: string;
  name: string;
  faction: 'wolf' | 'village' | 'neutral';
  description: string;
  category: 'essential' | 'protective' | 'offensive' | 'special';
}

export interface Preset {
  label: string;
  counts: Record<string, number>;
  balanceRating: number;
  difficulty: 'Dễ' | 'Bình thường' | 'Khó' | 'Rất khó';
  notes: string;
}

export interface BalanceWarning {
  level: 'info' | 'warning' | 'danger';
  message: string;
  detail: string;
}

export interface BalanceReport {
  totalPlayers: number;
  wolfCount: number;
  wolfRatio: number;
  villagePowerCount: number;
  villageRatio: number;
  rating: 'excellent' | 'good' | 'acceptable' | 'unbalanced' | 'broken';
  ratingLabel: string;
  ratingColor: string;
  warnings: BalanceWarning[];
  tips: string[];
}

// ---- Role Registry — derive từ nguồn sự thật duy nhất (roles.ts, 18 vai) ----
import { ALL_ROLES } from '@/lib/roles'

export const ROLES: Role[] = ALL_ROLES.map((r) => ({
  id: r.key,
  name: r.nameVi,
  faction: r.faction,
  description: r.noteVi ? `${r.descVi} ${r.noteVi}` : r.descVi,
  category: r.category,
}));

export const WOLF_ROLES = ROLES.filter((r) => r.faction === 'wolf');
export const VILLAGE_ROLES = ROLES.filter((r) => r.faction === 'village');
export const NEUTRAL_ROLES = ROLES.filter((r) => r.faction === 'neutral');

// ---- Pre-balanced Presets ----
export const PRESETS: Record<number, Preset> = {
  6: { label: 'Cơ bản', counts: { werewolf: 2, seer: 1, witch: 1, villager: 2 }, balanceRating: 3, difficulty: 'Khó', notes: 'Tối thiểu để chơi. Không có BV nên Sói khá mạnh.' },
  7: { label: 'Cổ điển', counts: { werewolf: 2, seer: 1, witch: 1, guard: 1, villager: 2 }, balanceRating: 4, difficulty: 'Bình thường', notes: 'Đã có Bảo Vệ, cân bằng tốt hơn nhiều.' },
  8: { label: 'Tiêu chuẩn', counts: { werewolf: 2, seer: 1, witch: 1, guard: 1, hunter: 1, villager: 2 }, balanceRating: 5, difficulty: 'Bình thường', notes: 'Ngưỡng cân bằng lý tưởng nhất — được ưa chuộng nhất.' },
  9: { label: 'Chiến thuật', counts: { werewolf: 2, seer: 1, witch: 1, guard: 1, hunter: 1, cupid: 1, villager: 2 }, balanceRating: 5, difficulty: 'Bình thường', notes: 'Thần Tình Yêu thêm yếu tố chiến thuật phức tạp.' },
  10: { label: 'Giải đấu', counts: { werewolf: 3, seer: 1, witch: 1, guard: 1, hunter: 1, cupid: 1, villager: 2 }, balanceRating: 5, difficulty: 'Bình thường', notes: 'Tournament standard — đủ cho biểu quyết phức tạp.' },
  12: { label: 'Đầy đủ', counts: { werewolf: 4, seer: 1, witch: 1, guard: 1, hunter: 1, cupid: 1, elder: 1, villager: 2 }, balanceRating: 4, difficulty: 'Khó', notes: 'Lão Làng tạo bài toán xử tử rất gay cấn.' },
  15: { label: 'Large Party', counts: { werewolf: 5, seer: 1, witch: 1, guard: 1, hunter: 1, cupid: 1, elder: 1, doctor: 1, villager: 4 }, balanceRating: 4, difficulty: 'Khó', notes: 'Cần người dẫn dắt có kinh nghiệm.' },
  18: { label: 'Full Roster', counts: { werewolf: 6, seer: 1, witch: 1, guard: 1, hunter: 1, cupid: 1, elder: 1, doctor: 1, alpha_wolf: 0, villager: 5 }, balanceRating: 4, difficulty: 'Rất khó', notes: 'Có thể bật Sói Đầu Sỏ để tăng độ khó cho phe Dân.' },
};

export const PLAYER_COUNTS = [6, 7, 8, 9, 10, 12, 15, 18];

// ---- Balance Analyzer ----
export function analyzeBalance(counts: Record<string, number>): BalanceReport {
  const totalPlayers = Object.values(counts).reduce((a, b) => a + b, 0);
  const wolfCount = (counts['werewolf'] || 0) + (counts['alpha_wolf'] || 0);
  const wolfRatio = totalPlayers > 0 ? wolfCount / totalPlayers : 0;

  const villagePowerIds = ['seer', 'witch', 'guard', 'hunter', 'elder', 'doctor'];
  const villagePowerCount = villagePowerIds.reduce((sum, id) => sum + (counts[id] || 0), 0);
  const villageCount = VILLAGE_ROLES.reduce((sum, r) => sum + (counts[r.id] || 0), 0);
  const villageRatio = totalPlayers > 0 ? villageCount / totalPlayers : 0;

  const warnings: BalanceWarning[] = [];
  const tips: string[] = [];

  // Core checks
  if (wolfCount === 0 && totalPlayers > 0) {
    warnings.push({ level: 'danger', message: 'Không có Sói!', detail: 'Trò chơi không thể bắt đầu nếu không có Sói.' });
  }
  if (wolfCount === 1 && totalPlayers > 0) {
    warnings.push({ level: 'danger', message: 'Chỉ có 1 Sói', detail: '1 Sói bị lộ là hết. Sói gần như không có cơ hội thắng.' });
  }
  if (wolfRatio > 0.4) {
    warnings.push({ level: 'danger', message: `Tỷ lệ Sói quá cao (${(wolfRatio * 100).toFixed(0)}%)`, detail: 'Phe Dân bị áp đảo ngay từ đêm đầu, gần như chắc chắn thua.' });
  } else if (wolfRatio > 0.35) {
    warnings.push({ level: 'warning', message: `Tỷ lệ Sói cao (${(wolfRatio * 100).toFixed(0)}%)`, detail: 'Trò chơi có lợi cho Sói hơn, cần Dân rất giỏi mới thắng được.' });
  }
  if (wolfRatio < 0.15 && wolfCount >= 1) {
    warnings.push({ level: 'danger', message: `Tỷ lệ Sói quá thấp (${(wolfRatio * 100).toFixed(0)}%)`, detail: 'Sói quá ít, gần như không thắng được nếu Dân không tự lộn xộn.' });
  } else if (wolfRatio < 0.2 && wolfCount >= 2) {
    warnings.push({ level: 'warning', message: `Tỷ lệ Sói thấp (${(wolfRatio * 100).toFixed(0)}%)`, detail: 'Phe Dân có lợi thế rõ rệt, có thể kết thúc nhanh.' });
  }
  if ((counts['seer'] || 0) === 0 && totalPlayers >= 6) {
    warnings.push({ level: 'warning', message: 'Không có Tiên Tri', detail: 'Tiên Tri là vai trò dò phe quan trọng nhất. Không có TT, Dân rất khó.' });
    tips.push('Nên thêm 1 Tiên Tri để phe Dân có khả năng dò phe.');
  }
  if ((counts['witch'] || 0) === 0 && totalPlayers >= 6) {
    warnings.push({ level: 'info', message: 'Không có Phù Thủy', detail: 'Không có PT, Sói cắn ai người đó chết trừ khi BV bảo vệ.' });
  }
  if ((counts['alpha_wolf'] || 0) >= 1 && wolfCount >= 4) {
    warnings.push({ level: 'warning', message: 'Sói Đầu Sỏ + Nhiều Sói', detail: 'Kết hợp nhiều Sói tạo ra đợt cắn quá mạnh, Dân khó chống lại.' });
  }
  if ((counts['cupid'] || 0) >= 1 && totalPlayers <= 7) {
    warnings.push({ level: 'warning', message: 'Thần Tình Yêu ít người', detail: 'Ở ≤7 người, mất 2 người cùng lúc ảnh hưởng quá lớn đến cân bằng.' });
  }

  const protectiveCount = (counts['guard'] || 0) + (counts['doctor'] || 0) + (counts['witch'] || 0);
  if (protectiveCount >= 4) {
    warnings.push({ level: 'warning', message: 'Quá nhiều vai trò bảo vệ', detail: `${protectiveCount} vai trò bảo vệ khiến Sói rất khó cắn trúng ai. Trò chơi kéo dài rất lâu.` });
  }
  if (villagePowerCount === 0 && villageCount > 0) {
    warnings.push({ level: 'danger', message: 'Phe Dân không có vai trò chức năng', detail: 'Toàn bộ Dân Thường, Sói sẽ thắng dễ dàng.' });
  }

  const plainVillager = counts['villager'] || 0;
  if (plainVillager === 0 && totalPlayers >= 8) {
    warnings.push({ level: 'info', message: 'Không có Dân Thường', detail: 'Mọi người đều có vai trò đặc biệt, Sói khó ngụy trang.' });
  }

  // Duplicate special roles
  const specialRoles = ['seer', 'witch', 'cupid', 'elder'];
  for (const roleId of specialRoles) {
    if ((counts[roleId] || 0) > 1) {
      const role = ROLES.find((r) => r.id === roleId);
      warnings.push({ level: 'warning', message: `${role?.name} xuất hiện >1`, detail: `${role?.name} thường chỉ có 1. Nhiều hơn có thể làm trò chơi mất cân bằng.` });
    }
  }

  // Determine rating
  const dangerCount = warnings.filter((w) => w.level === 'danger').length;
  const warningCount = warnings.filter((w) => w.level === 'warning').length;

  let rating: BalanceReport['rating'];
  let ratingLabel: string;
  let ratingColor: string;

  if (dangerCount >= 2 || wolfCount === 0) {
    rating = 'broken';
    ratingLabel = 'Không thể chơi';
    ratingColor = 'text-red-600';
  } else if (dangerCount >= 1) {
    rating = 'unbalanced';
    ratingLabel = 'Mất cân bằng nghiêm trọng';
    ratingColor = 'text-red-500';
  } else if (warningCount >= 3) {
    rating = 'unbalanced';
    ratingLabel = 'Mất cân bằng';
    ratingColor = 'text-orange-500';
  } else if (warningCount >= 1) {
    rating = 'acceptable';
    ratingLabel = 'Có thể chơi được';
    ratingColor = 'text-yellow-500';
  } else if (wolfRatio >= 0.25 && wolfRatio <= 0.33 && villagePowerCount >= 2 && totalPlayers >= 6) {
    rating = 'excellent';
    ratingLabel = 'Cân bằng xuất sắc';
    ratingColor = 'text-emerald-600';
  } else {
    rating = 'good';
    ratingLabel = 'Cân bằng tốt';
    ratingColor = 'text-emerald-500';
  }

  // Auto tips based on situation
  if (tips.length === 0 && wolfRatio < 0.25 && wolfCount >= 2) {
    tips.push('Tỷ lệ Sói thấp hơn lý tưởng. Có thể thêm 1 Sói để tăng kịch tính.');
  }
  if (tips.length === 0 && wolfRatio > 0.33 && wolfRatio <= 0.35 && totalPlayers >= 8) {
    tips.push('Tỷ lệ Sói hơi cao. Nên thêm 1 vai trò bảo vệ (Bảo Vệ/Bác Sĩ).');
  }

  return {
    totalPlayers,
    wolfCount,
    wolfRatio,
    villagePowerCount,
    villageRatio,
    rating,
    ratingLabel,
    ratingColor,
    warnings,
    tips,
  };
}

// ---- Helper: get counts for a preset ----
export function getPresetCounts(playerCount: number): Record<string, number> {
  const preset = PRESETS[playerCount];
  if (!preset) {
    // Auto-generate reasonable defaults
    const wolfCount = Math.max(2, Math.floor(playerCount / 3));
    const result: Record<string, number> = { werewolf: wolfCount, seer: 1, witch: 1, villager: 0 };
    let assigned = wolfCount + 2; // wolves + seer + witch
    if (playerCount >= 7 && assigned < playerCount) { result.guard = 1; assigned++; }
    if (playerCount >= 8 && assigned < playerCount) { result.hunter = 1; assigned++; }
    if (playerCount >= 10 && assigned < playerCount) { result.cupid = 1; assigned++; }
    if (playerCount >= 12 && assigned < playerCount) { result.elder = 1; assigned++; }
    if (playerCount >= 15 && assigned < playerCount) { result.doctor = 1; assigned++; }
    result.villager = Math.max(0, playerCount - assigned);
    return result;
  }
  return { ...preset.counts };
}
