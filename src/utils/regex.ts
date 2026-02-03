/**
 * Regex Utilities
 * Consolidated regex helper functions
 */

/**
 * Escape regex special characters in a string
 * Makes the string safe to use in a RegExp constructor
 *
 * @param str - The string to escape
 * @returns The escaped string with all regex special characters preceded by backslash
 *
 * @example
 * escapeRegex("hello.world") // returns "hello\\.world"
 * escapeRegex("foo[bar]")    // returns "foo\\[bar\\]"
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
