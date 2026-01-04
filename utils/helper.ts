import { TruncateParams } from '@/utils/type.dt'

export const truncate = ({ text, startChars, endChars, maxLength }: TruncateParams): string => {
  if (text.length > maxLength) {
    let start = text.substring(0, startChars)
    let end = text.substring(text.length - endChars, text.length)
    while (start.length + end.length < maxLength) {
      start = start + '.'
    }
    return start + end
  }
  return text
}

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  return new Intl.DateTimeFormat('en-US', options).format(date)
}

export const timestampToDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  return date.toLocaleDateString('en-US', options)
}

/**
 * Convert game name to URL-friendly slug
 */
export const createSlug = (name: string, id: number): string => {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
  
  // If slug is empty, use game ID
  return slug || `game-${id}`
}

/**
 * Extract game ID from slug (format: slug-id or just id)
 */
export const extractGameIdFromSlug = (slug: string): number | null => {
  // Try to extract ID from slug (e.g., "deneme-1" -> 1)
  const parts = slug.split('-')
  const lastPart = parts[parts.length - 1]
  const id = parseInt(lastPart, 10)
  
  if (!isNaN(id) && id > 0) {
    return id
  }
  
  // If no ID found, try to parse the whole slug as ID
  const wholeId = parseInt(slug, 10)
  if (!isNaN(wholeId) && wholeId > 0) {
    return wholeId
  }
  
  return null
}
