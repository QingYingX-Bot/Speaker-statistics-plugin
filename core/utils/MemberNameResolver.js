/**
 * 当前群成员昵称解析工具
 */
export class MemberNameResolver {
  static normalizeId(value) {
    if (value === null || value === undefined) return ''
    return String(value).trim()
  }

  static getMapValue(maybeMap, key) {
    if (!maybeMap || typeof maybeMap.get !== 'function') return null
    const rawKey = this.normalizeId(key)
    if (!rawKey) return null

    const stringValue = maybeMap.get(rawKey)
    if (stringValue) return stringValue

    if (/^\d+$/.test(rawKey)) {
      const numericKey = Number(rawKey)
      if (Number.isSafeInteger(numericKey)) {
        return maybeMap.get(numericKey) || null
      }
    }

    return null
  }

  static cleanName(value, userId = '') {
    const text = this.normalizeId(value)
    if (!text || text === 'undefined' || text === 'null') return ''
    if (userId && text === this.normalizeId(userId)) return ''
    return text.replace(/[^\p{L}\p{N}\p{P}\p{S}\p{Z}]/gu, '').trim()
  }

  static getMemberName(member, userId = '') {
    if (!member || typeof member !== 'object') return ''
    return this.cleanName(
      member.card
      || member.nickname
      || member.name
      || member.user_name
      || member.sender_name
      || member.member_name,
      userId
    )
  }

  static getCurrentGroupId(e, fallback = '') {
    return this.normalizeId(
      fallback
      || e?.group_id
      || e?.group?.group_id
      || e?.group?.id
      || e?.chat_id
      || e?.chat?.id
    )
  }

  static getCachedGroupMemberMap(e, groupId) {
    const normalizedGroupId = this.getCurrentGroupId(e, groupId)
    if (!normalizedGroupId) return null

    const maps = [
      e?.bot?.gml,
      globalThis.Bot?.gml
    ]

    for (const source of maps) {
      const memberMap = this.getMapValue(source, normalizedGroupId)
      if (memberMap && typeof memberMap.get === 'function') return memberMap
    }

    return null
  }

  static async getCurrentGroupMemberMap(e, groupId = '') {
    const normalizedGroupId = this.getCurrentGroupId(e, groupId)
    const cached = this.getCachedGroupMemberMap(e, normalizedGroupId)
    if (!normalizedGroupId) return cached

    if (e?.group?.getMemberMap) {
      try {
        const fresh = await e.group.getMemberMap()
        if (fresh && typeof fresh.get === 'function') return fresh
      } catch {}
    }

    return cached
  }

  static getMemberFromPickers(e, groupId, userId) {
    const normalizedGroupId = this.getCurrentGroupId(e, groupId)
    const normalizedUserId = this.normalizeId(userId)
    if (!normalizedGroupId || !normalizedUserId) return null

    const pickers = [
      () => e?.group?.pickMember?.(normalizedUserId),
      () => e?.bot?.pickMember?.(normalizedGroupId, normalizedUserId),
      () => globalThis.Bot?.pickMember?.(normalizedGroupId, normalizedUserId)
    ]

    for (const pick of pickers) {
      try {
        const member = pick()
        if (member && typeof member === 'object') return member
      } catch {}
    }

    return null
  }

  static resolveDisplayName({ e, groupId = '', userId = '', fallback = '', memberMap = null }) {
    const normalizedGroupId = this.getCurrentGroupId(e, groupId)
    const normalizedUserId = this.normalizeId(userId)
    if (!normalizedUserId) return this.cleanName(fallback) || fallback || ''

    if (String(e?.user_id || e?.sender?.user_id || '') === normalizedUserId) {
      const eventName = this.cleanName(e?.sender?.card || e?.sender?.nickname, normalizedUserId)
      if (eventName) return eventName
    }

    const eventMemberName = this.getMemberName(e?.member, normalizedUserId)
    if (eventMemberName && String(e?.member?.user_id || e?.user_id || '') === normalizedUserId) {
      return eventMemberName
    }

    const map = memberMap || this.getCachedGroupMemberMap(e, normalizedGroupId)
    const memberName = this.getMemberName(this.getMapValue(map, normalizedUserId), normalizedUserId)
    if (memberName) return memberName

    const pickerName = this.getMemberName(
      this.getMemberFromPickers(e, normalizedGroupId, normalizedUserId),
      normalizedUserId
    )
    if (pickerName) return pickerName

    return this.cleanName(fallback, normalizedUserId) || fallback || normalizedUserId
  }

  static applyToUser(user, context = {}) {
    if (!user || typeof user !== 'object') return user
    const nickname = this.resolveDisplayName({
      ...context,
      userId: user.user_id || user.userId || user.id,
      fallback: user.nickname
    })
    return { ...user, nickname }
  }
}

export default MemberNameResolver
