/**
 * 课题合格性判定：用于 RANDOM / RANGE_RANDOM 的合格候选池。
 * 与 Prisma 类型解耦，便于测试与复用。
 */

export interface TopicRequirement {
  gpaThreshold?: number | null;
  majorRestriction?: string | null;
  requiredSkillIds: number[];
}

export interface StudentEligibility {
  gpa?: number | null;
  major: string;
  skillIds: number[];
}

/** 判断学生是否满足课题的全部要求（GPA / 专业 / 技能）。 */
export function isEligible(
  req: TopicRequirement,
  student: StudentEligibility,
): boolean {
  // GPA 门槛
  if (req.gpaThreshold != null) {
    if (student.gpa == null || student.gpa < req.gpaThreshold) return false;
  }

  // 专业限制（逗号分隔）
  if (req.majorRestriction) {
    const allowed = req.majorRestriction
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    if (allowed.length && !allowed.includes(student.major)) return false;
  }

  // 要求技能：必须全部具备
  if (req.requiredSkillIds.length) {
    const has = new Set(student.skillIds);
    for (const id of req.requiredSkillIds) {
      if (!has.has(id)) return false;
    }
  }

  return true;
}
